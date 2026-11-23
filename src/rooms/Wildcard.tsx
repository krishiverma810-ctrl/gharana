import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { DecoCard } from '../components/DecoCard'
import { Empty, RoomHeader, Segmented } from '../components/ui'
import { addItem, removeItem, useItems } from '../components/ListCard'
import { useHouse } from '../app/house'
import { db } from '../db/db'
import { celebrate, toast } from '../store/ui'
import { tick, win } from '../lib/sound'
import { shortDate } from '../lib/time'
import { MISSIONS, SUITS, type Mission, type Where } from '../config/missions'
import { askAlfredForMissions } from '../lib/alfred'

// WILDCARD — pick a suit, pull the lever, get a mission.

const WHERE_FOR: Record<string, Where> = { melbourne: 'h', goldcoast: 'g', india: 'i' }

export function Wildcard() {
  const { today, location } = useHouse()
  const [suit, setSuit] = useState<string>('any')
  const [maxMin, setMaxMin] = useState<number>(0)
  const [spinning, setSpinning] = useState(false)
  const [reel, setReel] = useState<Mission | null>(null)
  const [asking, setAsking] = useState(false)
  const timer = useRef<number | null>(null)
  const custom = useItems('wildcard', 'custom')
  const active = useItems('wildcard', 'active')
  const done = useItems('wildcard', 'done').sort((a, b) => b.at - a.at)
  const todayActive = active.find((a) => a.date === today)
  const here = WHERE_FOR[location]

  const pool = useMemo(() => {
    const customMissions: Mission[] = custom.map((c) => ({ id: c.id, suit: c.sub ?? 'mind', text: c.text, where: (c.tags?.[0] as Where) ?? 'a', min: c.num ?? 20 }))
    return [...MISSIONS, ...customMissions].filter(
      (m) => (suit === 'any' || m.suit === suit) && (m.where === 'a' || m.where === here) && (!maxMin || m.min <= maxMin),
    )
  }, [custom, suit, here, maxMin])

  const spin = () => {
    if (!pool.length || spinning) return
    setSpinning(true)
    let delay = 40
    const step = () => {
      setReel(pool[Math.floor(Math.random() * pool.length)])
      tick()
      delay *= 1.18
      if (delay < 420) timer.current = window.setTimeout(step, delay)
      else setSpinning(false)
    }
    step()
  }

  const accept = async () => {
    if (!reel) return
    if (todayActive) await db.items.delete(todayActive.id)
    await addItem('wildcard', 'active', { text: reel.text, sub: reel.suit, date: today, num: reel.min })
    toast('Mission accepted. Make it count.')
    setReel(null)
  }

  const complete = async () => {
    if (!todayActive) return
    await db.items.delete(todayActive.id)
    await addItem('wildcard', 'done', { text: todayActive.text, sub: todayActive.sub, date: today })
    win()
    celebrate()
    toast('MISSION COMPLETE. The house salutes you.')
  }

  const suitOf = (id?: string) => SUITS.find((s) => s.id === id)
  const counts = SUITS.map((s) => ({ s, n: done.filter((d) => d.sub === s.id).length }))

  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="wildcard" subtitle={`${pool.length} missions available for ${location === 'melbourne' ? 'home' : location === 'goldcoast' ? 'the Gold Coast' : 'India'}`} />

      {todayActive && (
        <DecoCard title="TODAY’S MISSION">
          <div className="text-center">
            <div className="font-deco text-[12px] tracking-[0.3em]" style={{ color: suitOf(todayActive.sub)?.color }}>{suitOf(todayActive.sub)?.glyph} {suitOf(todayActive.sub)?.name}</div>
            <p className="font-display text-[24px] leading-tight mt-2">{todayActive.text}</p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button className="deco-btn" onClick={complete}>Done it</button>
              <button className="deco-btn ghost" onClick={() => removeItem(todayActive)}>Drop it</button>
            </div>
          </div>
        </DecoCard>
      )}

      <DecoCard title="PICK A SUIT">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" data-noswipe>
          <button className={`suit ${suit === 'any' ? 'on' : ''}`} style={{ ['--suit' as string]: 'var(--accent)' }} onClick={() => setSuit('any')}>
            <span className="text-[22px]">✸</span>WILD
          </button>
          {SUITS.map((s) => (
            <button key={s.id} className={`suit ${suit === s.id ? 'on' : ''}`} style={{ ['--suit' as string]: s.color }} onClick={() => setSuit(s.id)}>
              <span className="text-[22px]">{s.glyph}</span>
              {s.name}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Segmented value={maxMin} onChange={setMaxMin} options={[{ value: 0, label: 'Any time' }, { value: 15, label: '≤15m' }, { value: 30, label: '≤30m' }, { value: 60, label: '≤1h' }]} />
        </div>
      </DecoCard>

      <DecoCard title="THE MACHINE">
        <div className="slot">
          <motion.div key={reel?.id ?? 'empty'} initial={{ y: spinning ? -24 : 0, opacity: spinning ? 0.4 : 1 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.08 }} className="text-center">
            {reel ? (
              <>
                <div className="font-deco text-[11px] tracking-[0.3em]" style={{ color: suitOf(reel.suit)?.color }}>{suitOf(reel.suit)?.glyph} {suitOf(reel.suit)?.name} · {reel.min ? `${reel.min} MIN` : 'ALL DAY'}</div>
                <p className="font-display text-[22px] leading-tight mt-2">{reel.text}</p>
              </>
            ) : (
              <p className="font-body italic text-[var(--ink-muted)]">Pull the lever.</p>
            )}
          </motion.div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button className="deco-btn" onClick={spin} disabled={spinning || !pool.length}>{spinning ? 'Spinning…' : reel ? 'Spin again' : 'SPIN'}</button>
          <button className="deco-btn ghost" onClick={accept} disabled={!reel || spinning}>{todayActive ? 'Swap in' : 'Accept'}</button>
        </div>
      </DecoCard>

      <div className="bp-layout">
        <DecoCard title="THE RECORD">
          <div className="grid grid-cols-4 gap-2 text-center mb-3">
            {counts.map(({ s, n }) => (
              <div key={s.id}><div className="font-num text-[18px]" style={{ color: s.color }}>{n}</div><div className="font-deco text-[8.5px] tracking-[0.1em] text-[var(--ink-muted)]">{s.name.split(' ')[0]}</div></div>
            ))}
          </div>
          <ul>
            {done.slice(0, 8).map((d) => (
              <li key={d.id} className="list-row">
                <span style={{ color: suitOf(d.sub)?.color }}>{suitOf(d.sub)?.glyph}</span>
                <span className="flex-1 font-body text-[16px]">{d.text}</span>
                <span className="font-num text-[12px] text-[var(--ink-muted)]">{d.date ? shortDate(d.date) : ''}</span>
              </li>
            ))}
            {!done.length && <Empty>No missions completed yet.</Empty>}
          </ul>
        </DecoCard>
        <DecoCard title="FRESH MISSIONS FROM ALFRED">
          <p className="font-body text-[15px] text-[var(--ink-muted)]">ALFRED reads your week and writes 10 new missions for where you are. {custom.length} custom missions in the deck.</p>
          <button
            className="deco-btn w-full mt-3"
            disabled={asking}
            onClick={async () => {
              setAsking(true)
              try {
                const n = await askAlfredForMissions()
                toast(n ? `${n} new missions added to the deck` : 'ALFRED had nothing new this time')
              } catch (e) {
                toast(e instanceof Error ? e.message : 'ALFRED is unavailable right now')
              } finally {
                setAsking(false)
              }
            }}
          >
            {asking ? 'ALFRED is writing…' : 'Ask ALFRED for 10 new missions'}
          </button>
        </DecoCard>
      </div>
    </div>
  )
}
