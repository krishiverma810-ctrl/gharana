import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { DecoCard } from '../components/DecoCard'
import { RoomHeader, Toggle } from '../components/ui'
import { Icon } from '../components/Icon'
import { db } from '../db/db'
import { useHouse } from '../app/house'
import { navigate } from '../app/router'
import { useSettings, type AlfredMode } from '../store/settings'
import { toast } from '../store/ui'
import { AlfredError, flushQueue, getHouseKey, getQueue, getUsage, imageToBlock, queueMessage, sendToAlfred } from '../lib/alfred'
import type { ChatRecord } from '../db/types'
import { ListCard } from '../components/ListCard'
import { useVoice } from '../store/voice'

// ALFRED — the butler. Chat, photos, modes, DELULU, spend meter, offline queue.

const MODES: { id: AlfredMode; label: string }[] = [
  { id: 'butler', label: 'Butler' },
  { id: 'coach', label: 'Coach' },
  { id: 'tutor', label: 'Tutor' },
  { id: 'strategist', label: 'Strategist' },
  { id: 'mate', label: 'Mate' },
  { id: 'calm', label: 'Calm' },
]

const QUICK = [
  { label: 'Brief me', text: 'Brief me on today — under 90 seconds of reading: Big 3, what’s next on the Blueprint, streaks at risk, fuel, countdowns, and the verse.' },
  { label: 'What’s left?', text: 'What’s left for me to do today? Prioritise it.' },
  { label: 'Debrief me', text: 'Run my night debrief: ask me the questions one at a time — what I won, what I dodged, one lesson, three gratitudes — then summarise.' },
  { label: 'Roast my excuses', text: 'Look at what I’ve skipped today and roast my excuses (DELULU style), then give me the one thing to do right now.' },
]

interface Bubble {
  key: string
  who: 'me' | 'alfred' | 'chip'
  text?: string
  images?: string[]
}

type Msg = { role: string; content: unknown }

/** Light markdown clean-up for display: **bold**, headings, bullets. */
const tidy = (t: string) => t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,6}\s*/gm, '').replace(/^\s*[-*]\s+/gm, '• ')

export function toBubbles(rec?: ChatRecord): Bubble[] {
  if (!rec) return []
  const out: Bubble[] = []
  ;(rec.messages as Msg[]).forEach((m, i) => {
    if (m.role === 'system') return
    if (typeof m.content === 'string') {
      out.push({ key: `${i}`, who: m.role === 'user' ? 'me' : 'alfred', text: m.content })
      return
    }
    const blocks = (m.content as { type: string; text?: string; id?: string; source?: { data?: string } }[]) ?? []
    if (m.role === 'user') {
      const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
      const images = blocks.filter((b) => b.type === 'image').map((b) => `data:image/jpeg;base64,${b.source?.data ?? ''}`)
      if (text || images.length) out.push({ key: `${i}`, who: 'me', text, images })
    } else {
      blocks.forEach((b, j) => {
        if (b.type === 'text' && b.text?.trim()) out.push({ key: `${i}-${j}`, who: 'alfred', text: tidy(b.text) })
        if (b.type === 'tool_use' && b.id && rec.chips[b.id]) out.push({ key: `${i}-${j}`, who: 'chip', text: rec.chips[b.id] })
      })
    }
  })
  for (const [k, v] of Object.entries(rec.chips)) if (k.startsWith('refusal-')) out.push({ key: k, who: 'alfred', text: v })
  return out
}

function speak(text: string) {
  try {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text.replace(/[*_#>`]/g, ''))
    const voice = speechSynthesis.getVoices().find((v) => /en-GB/i.test(v.lang))
    if (voice) u.voice = voice
    u.rate = 1.02
    speechSynthesis.speak(u)
  } catch {
    /* not supported */
  }
}

export function Alfred() {
  const { today } = useHouse()
  const s = useSettings()
  const [n, setN] = useState(1)
  const chatId = n === 1 ? today : `${today}#${n}`
  const rec = useLiveQuery(() => db.chats.get(chatId), [chatId])
  const [live, setLive] = useState<ChatRecord | null>(null)
  const [text, setText] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const [queue, setQueue] = useState(0)
  const [spend, setSpend] = useState(0)
  const file = useRef<HTMLInputElement>(null)
  const end = useRef<HTMLDivElement>(null)
  const hasKey = !!getHouseKey()
  const voice = useVoice()

  const refreshMeta = async () => {
    setQueue((await getQueue()).length)
    setSpend((await getUsage()).usd * s.usdToAud)
  }
  useEffect(() => {
    void refreshMeta()
    const online = async () => {
      const sent = await flushQueue()
      if (sent) toast(`Back online — sent ${sent} queued message${sent > 1 ? 's' : ''} to ALFRED`)
      void refreshMeta()
    }
    window.addEventListener('online', online)
    return () => window.removeEventListener('online', online)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const bubbles = toBubbles(live ?? rec)
  useEffect(() => {
    // Block body on purpose: newer browsers return a Promise from scrollIntoView, and React
    // treats any returned value as a cleanup function.
    void end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [bubbles.length, busy])

  const send = async (msg?: string) => {
    const body = (msg ?? text).trim()
    if ((!body && !images.length) || busy) return
    setBusy(true)
    setPending(body || '📷')
    setText('')
    const imgs = images
    setImages([])
    try {
      const content = imgs.length ? [...(await Promise.all(imgs.map(imageToBlock))), { type: 'text' as const, text: body || 'What do you think?' }] : body
      await sendToAlfred(chatId, content, setLive)
    } catch (e) {
      if (e instanceof AlfredError && e.code === 'offline' && !imgs.length) {
        await queueMessage(chatId, body)
        toast('Offline — queued. ALFRED will get it when you’re back online.')
      } else {
        toast(e instanceof Error ? e.message : 'ALFRED is unavailable')
        if (!msg) setText(body)
      }
    } finally {
      setLive(null)
      setPending(null)
      setBusy(false)
      void refreshMeta()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RoomHeader
        id="alfred"
        subtitle={`$${spend.toFixed(2)} of $${s.alfredCapAud} this month${queue ? ` · ${queue} queued` : ''}`}
        right={<button className="icon-btn" aria-label="New conversation" onClick={() => setN(n + 1)}><Icon name="plus" /></button>}
      />

      {!hasKey && (
        <DecoCard title="ALFRED NEEDS A KEY">
          <p className="font-body text-[17px]">ALFRED runs on Claude through your own server. Once the server is set up, add your house key in Settings → ALFRED and he’ll be at your service.</p>
          <button className="deco-btn w-full mt-3" onClick={() => navigate('/settings#alfred')}>Open Settings</button>
        </DecoCard>
      )}

      <div className="overflow-x-auto" data-noswipe>
        <div className="flex gap-2 w-max items-center">
          {MODES.map((m) => <button key={m.id} className={`chip ${s.alfredMode === m.id ? 'on' : ''}`} onClick={() => s.update({ alfredMode: m.id })}>{m.label}</button>)}
          <button className={`chip ${s.delulu ? 'on' : ''}`} onClick={() => s.update({ delulu: !s.delulu })}>DELULU {s.delulu ? 'ON' : 'OFF'}</button>
        </div>
      </div>

      <div className="chat">
        {!bubbles.length && !pending && (
          <div className="text-center py-8">
            <div className="alfred-sigil mx-auto"><Icon name="alfred" size={34} /></div>
            <p className="font-display text-[22px] text-[var(--accent)] mt-4">At your service, sir.</p>
            <p className="font-body text-[16px] text-[var(--ink-muted)] mt-1">Ask anything, send a fit pic, or tell me what to log.</p>
          </div>
        )}
        {bubbles.map((b) =>
          b.who === 'chip' ? (
            <div key={b.key} className="action-chip">{b.text}</div>
          ) : (
            <div key={b.key} className={`bubble ${b.who}`}>
              {b.images?.map((src, i) => <img key={i} src={src} alt="Sent photo" className="bubble-img" />)}
              {b.text && <div className="whitespace-pre-wrap">{b.text}</div>}
              {b.who === 'alfred' && b.text && (
                <button className="speak" aria-label="Read aloud" onClick={() => speak(b.text!)}>🔊</button>
              )}
            </div>
          ),
        )}
        {pending && !live && <div className="bubble me opacity-70">{pending}</div>}
        <AnimatePresence>
          {busy && (
            <motion.div className="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <span className="sunburst-spin" /> ALFRED is considering…
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={end} />
      </div>

      <div className="flex gap-2 flex-wrap" data-noswipe>
        {QUICK.map((q) => <button key={q.label} className="chip" disabled={busy} onClick={() => send(q.text)}>{q.label}</button>)}
      </div>

      <div className="composer">
        {images.length > 0 && (
          <div className="flex gap-2 mb-2">
            {images.map((f, i) => (
              <span key={i} className="chip on">📷 {f.name.slice(0, 14)} <button className="ml-2" onClick={() => setImages(images.filter((_, j) => j !== i))} aria-label="Remove photo">×</button></span>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <button className="icon-btn" aria-label="Add a photo" onClick={() => file.current?.click()}><Icon name="camera" /></button>
          <button
            className={`icon-btn ${voice.state === 'listening' ? 'text-[var(--accent)]' : ''}`}
            aria-label="Hold to talk"
            onPointerDown={() => voice.startHold()}
            onPointerUp={() => voice.endHold()}
            onContextMenu={(e) => e.preventDefault()}
          >
            🎙
          </button>
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setImages([...images, f].slice(0, 3)); e.target.value = '' }} />
          <textarea
            className="deco-input flex-1 min-w-0 min-h-[46px] max-h-40"
            rows={1}
            value={text}
            placeholder="Speak to ALFRED…"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
          />
          <button className="deco-btn px-4" onClick={() => send()} disabled={busy || (!text.trim() && !images.length)} aria-label="Send">Send</button>
        </div>
      </div>

      <button className={`deco-btn ${voice.convo ? '' : 'ghost'}`} onClick={() => voice.toggleConvo()}>
        {voice.convo ? 'End conversation' : 'Talk to ALFRED (conversation mode)'}
      </button>

      <DecoCard title="MEMORY BANK">
        <p className="font-body text-[14px] text-[var(--ink-muted)] mb-3">What ALFRED remembers about you. Say “remember…” or “forget that…”, or edit here. He sees these with every message.</p>
        <ListCard room="alfred" kind="memory" placeholder="e.g. I want to be up before 7 by January" empty="Nothing remembered yet." />
      </DecoCard>

      <DecoCard title="HOUSE RULES FOR ALFRED">
        <Toggle label="DELULU" hint="Roasts your excuses — never you. Drops the bit if you’re genuinely down." on={s.delulu} onChange={(delulu) => s.update({ delulu })} />
        <div className="mt-3 flex flex-wrap gap-2">
          {(['english', 'hinglish', 'hindi', 'punjabi'] as const).map((l) => (
            <button key={l} className={`chip ${s.alfredLang === l ? 'on' : ''}`} onClick={() => s.update({ alfredLang: l })}>{l[0].toUpperCase() + l.slice(1)}</button>
          ))}
        </div>
        <p className="font-body text-[13px] text-[var(--ink-muted)] mt-3">
          Each message sends ALFRED a short snapshot of your day (habits, fuel, Big 3, plan, money totals) so he can actually help. Nothing else leaves your phone. Conversations reset daily; tap + for a fresh one.
        </p>
      </DecoCard>
    </div>
  )
}
