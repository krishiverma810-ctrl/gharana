import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { useVoice } from '../store/voice'
import { useSettings } from '../store/settings'
import { useUI, toast } from '../store/ui'
import { useFocus } from '../store/focus'
import { addProtein, addWater, db } from '../db/db'
import { navigate } from '../app/router'
import { useHouse } from '../app/house'
import { sendToAlfred } from '../lib/alfred'
import { Icon } from './Icon'
import { toBubbles } from '../rooms/Alfred'

// ── THE GOLD ORB (phone) ─────────────────────────────────────────────
// Hold = talk (release to send) · Tap = conversation mode (tap again to stop / interrupt)
// Double-tap = quick-actions wheel (incl. "Open ALFRED") · Drag = move it (snaps to the edge)

export function Orb() {
  const v = useVoice()
  const side = useSettings((s) => s.orbSide)
  const y = useSettings((s) => s.orbY)
  const update = useSettings((s) => s.update)
  const [hidden, setHidden] = useState(false)
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const press = useRef<{ x: number; y: number; t: number; holdTimer: number; holding: boolean; dragging: boolean } | null>(null)
  const lastTap = useRef(0)
  const tapTimer = useRef<number | null>(null)

  // Hide while typing so it never covers the keyboard.
  useEffect(() => {
    const onIn = (e: FocusEvent) => (e.target as HTMLElement)?.matches?.('input, textarea, select') && setHidden(true)
    const onOut = () => setTimeout(() => !document.activeElement?.matches?.('input, textarea, select') && setHidden(false), 50)
    document.addEventListener('focusin', onIn)
    document.addEventListener('focusout', onOut)
    return () => {
      document.removeEventListener('focusin', onIn)
      document.removeEventListener('focusout', onOut)
    }
  }, [])

  const onDown = (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    const p = { x: e.clientX, y: e.clientY, t: Date.now(), holdTimer: 0, holding: false, dragging: false }
    p.holdTimer = window.setTimeout(() => {
      if (!press.current || press.current.dragging) return
      press.current.holding = true
      v.startHold()
    }, 260)
    press.current = p
  }
  const onMove = (e: React.PointerEvent) => {
    const p = press.current
    if (!p || p.holding) return
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 12) {
      p.dragging = true
      clearTimeout(p.holdTimer)
      setDrag({ x: e.clientX, y: e.clientY })
    }
  }
  const onUp = (e: React.PointerEvent) => {
    const p = press.current
    press.current = null
    if (!p) return
    clearTimeout(p.holdTimer)
    if (p.holding) {
      v.endHold()
      return
    }
    if (p.dragging) {
      setDrag(null)
      update({ orbSide: e.clientX < innerWidth / 2 ? 'left' : 'right', orbY: Math.min(0.86, Math.max(0.12, e.clientY / innerHeight)) })
      return
    }
    // Tap vs double-tap
    const now = Date.now()
    if (now - lastTap.current < 300) {
      if (tapTimer.current) clearTimeout(tapTimer.current)
      tapTimer.current = null
      lastTap.current = 0
      v.setWheel(!v.wheelOpen)
      return
    }
    lastTap.current = now
    tapTimer.current = window.setTimeout(() => {
      tapTimer.current = null
      const s = useVoice.getState()
      if (s.state === 'speaking') s.interrupt()
      else s.toggleConvo()
    }, 300)
  }

  if (hidden) return null
  const style: React.CSSProperties = drag
    ? { left: drag.x - 32, top: drag.y - 32 }
    : { [side]: 14, top: `calc(${y * 100}% - 32px)` }

  return (
    <>
      <button
        className={`orb ${v.state} ${v.convo ? 'convo' : ''}`}
        style={style}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="ALFRED — hold to talk, tap for conversation, double-tap for quick actions"
      >
        <span className="orb-rays" />
        <span className="orb-core"><Icon name="alfred" size={24} /></span>
      </button>
      <QuickWheel side={side} y={y} />
    </>
  )
}

function QuickWheel({ side, y }: { side: 'left' | 'right'; y: number }) {
  const open = useVoice((s) => s.wheelOpen)
  const setWheel = useVoice((s) => s.setWheel)
  const setPalette = useUI((s) => s.setPaletteOpen)
  const start = useFocus((s) => s.start)
  const { today } = useHouse()
  const items = [
    { label: 'ALFRED', icon: 'alfred', run: () => navigate('/alfred') },
    { label: '+250 ml', icon: 'drop', run: () => addWater(today, 250).then(() => toast('+250 ml water', () => addWater(today, -250))) },
    { label: '+25 g', icon: 'bolt', run: () => addProtein(today, 25).then(() => toast('+25 g protein', () => addProtein(today, -25))) },
    { label: 'Focus 25', icon: 'timer', run: () => start(25) },
    { label: 'Idea', icon: 'inbox', run: () => setPalette(true) },
    { label: 'Expense', icon: 'vault', run: () => navigate('/vault#spend') },
  ]
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="wheel-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setWheel(false)}>
          {items.map((it, i) => {
            const angle = (Math.PI / (items.length - 1)) * i - Math.PI / 2
            const r = 118
            const cx = side === 'right' ? innerWidth - 46 : 46
            const cy = y * innerHeight
            const x = cx + (side === 'right' ? -1 : 1) * Math.cos(angle) * r
            const yy = cy + Math.sin(angle) * r
            return (
              <motion.button
                key={it.label}
                className="wheel-item"
                style={{ left: x - 30, top: yy - 30 }}
                initial={{ scale: 0.3, opacity: 0, x: cx - x, y: cy - yy }}
                animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
                exit={{ scale: 0.3, opacity: 0 }}
                transition={{ delay: i * 0.025, type: 'spring', stiffness: 420, damping: 26 }}
                onClick={(e) => {
                  e.stopPropagation()
                  setWheel(false)
                  void it.run()
                }}
              >
                <Icon name={it.icon} size={20} />
                <span>{it.label}</span>
              </motion.button>
            )
          })}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Captions (both shells) ───────────────────────────────────────────
export function Captions() {
  const { state, heard, caption, captionAt, convo, dismissCaption, stopAll } = useVoice()
  const subtitles = useSettings((s) => s.subtitles)
  const [, force] = useState(0)
  useEffect(() => {
    if (state !== 'idle' || !captionAt) return
    const t = setTimeout(() => force((n) => n + 1), 9000)
    return () => clearTimeout(t)
  }, [state, captionAt])
  const fresh = captionAt && Date.now() - captionAt < 9000
  const show = state !== 'idle' || (fresh && subtitles)
  return (
    <AnimatePresence>
      {show && (
        <motion.div className={`captions ${state}`} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} aria-live="polite">
          <div className="flex items-center justify-between gap-2">
            <span className="font-deco text-[10.5px] tracking-[0.3em] text-[var(--accent)] flex items-center gap-2">
              <span className={`cap-dot ${state}`} />
              {state === 'listening' ? 'LISTENING' : state === 'thinking' ? 'ALFRED IS CONSIDERING' : state === 'speaking' ? 'ALFRED' : 'ALFRED'}
              {convo && ' · CONVERSATION'}
            </span>
            <button className="icon-btn" style={{ minHeight: 28, minWidth: 28 }} onClick={() => (state === 'idle' ? dismissCaption() : stopAll())} aria-label="Stop">
              <Icon name="close" size={16} />
            </button>
          </div>
          {heard && (state === 'listening' || state === 'thinking') && <p className="font-body italic text-[16px] text-[var(--ink-muted)]">“{heard}”</p>}
          {subtitles && caption && state !== 'listening' && state !== 'thinking' && <p className="font-body text-[17px] leading-snug">{caption}</p>}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Desktop: hotkeys + the docked ALFRED panel ───────────────────────

/** Hold Right Alt to talk · Ctrl/⌘+Shift+A conversation mode · Esc stops him talking. */
export function useVoiceHotkeys() {
  useEffect(() => {
    let holding = false
    const down = (e: KeyboardEvent) => {
      const v = useVoice.getState()
      if (e.code === 'AltRight' && !e.repeat && !holding) {
        e.preventDefault()
        holding = true
        v.startHold()
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        v.toggleConvo()
      } else if (e.key === 'Escape' && (v.state !== 'idle' || v.convo)) {
        v.stopAll()
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'AltRight' && holding) {
        e.preventDefault()
        holding = false
        useVoice.getState().endHold()
      }
    }
    const blur = () => {
      if (holding) {
        holding = false
        useVoice.getState().endHold()
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])
}

export function AlfredDock() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem('gh-dock') !== '0'
    } catch {
      return true
    }
  })
  const v = useVoice()
  const { today } = useHouse()
  const rec = useLiveQuery(() => db.chats.get(today), [today])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const bubbles = toBubbles(rec).slice(-12)
  useEffect(() => {
    try {
      localStorage.setItem('gh-dock', open ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [open])
  useEffect(() => {
    void end.current?.scrollIntoView({ block: 'end' })
  }, [bubbles.length, open])

  const send = async () => {
    const t = text.trim()
    if (!t || busy) return
    setText('')
    setBusy(true)
    try {
      await sendToAlfred(today, t)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'ALFRED is unavailable')
      setText(t)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button className="dock-tab" onClick={() => setOpen(true)} aria-label="Open ALFRED panel">
        <Icon name="alfred" size={20} />
        <span>ALFRED</span>
      </button>
    )
  }
  return (
    <aside className="dock">
      <div className="flex items-center justify-between">
        <button className="font-display text-[20px] text-[var(--accent)] tracking-[0.1em]" onClick={() => navigate('/alfred')}>ALFRED</button>
        <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Collapse"><Icon name="chevron" size={18} /></button>
      </div>
      <div className={`dock-status ${v.state}`}>
        <span className={`cap-dot ${v.state}`} />
        {v.state === 'listening' ? `Listening… ${v.heard}` : v.state === 'thinking' ? 'Considering…' : v.state === 'speaking' ? 'Speaking — Esc to stop' : 'Hold Right Alt to talk · Ctrl+Shift+A converse'}
      </div>
      <div className="dock-chat">
        {bubbles.map((b) =>
          b.who === 'chip' ? <div key={b.key} className="action-chip">{b.text}</div> : <div key={b.key} className={`bubble ${b.who}`}>{b.text}</div>,
        )}
        {busy && <div className="thinking"><span className="sunburst-spin" /> considering…</div>}
        <div ref={end} />
      </div>
      <div className="flex gap-2">
        <button
          className={`dock-mic ${v.state === 'listening' ? 'on' : ''}`}
          onPointerDown={() => v.startHold()}
          onPointerUp={() => v.endHold()}
          onPointerLeave={() => v.state === 'listening' && !v.convo && v.endHold()}
          aria-label="Hold to talk"
        >
          🎙
        </button>
        <input className="deco-input flex-1 min-w-0" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Type to ALFRED…" />
      </div>
      <button className={`chip mt-2 ${v.convo ? 'on' : ''}`} onClick={() => v.toggleConvo()}>{v.convo ? 'End conversation' : 'Conversation mode'}</button>
    </aside>
  )
}
