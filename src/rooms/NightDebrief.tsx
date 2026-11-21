import { useEffect, useState } from 'react'
import { DecoCard } from '../components/DecoCard'
import { Field, RoomHeader, Scale10, Segmented, Stepper } from '../components/ui'
import { updateDay, db } from '../db/db'
import { useDay } from '../db/hooks'
import { useHouse } from '../app/house'
import { toast } from '../store/ui'
import { addDays } from '../lib/time'
import { chime } from '../lib/sound'
import { useWakeLock } from './Blueprint'
import type { Big3Item, NightLog } from '../db/types'

// NIGHT DEBRIEF — close the day honestly, set up tomorrow, then put the phone down.

function WindDown() {
  const [mins, setMins] = useState(30)
  const [end, setEnd] = useState<number | null>(null)
  const [, force] = useState(0)
  useWakeLock(end !== null)
  useEffect(() => {
    if (end === null) return
    const t = setInterval(() => {
      if (Date.now() >= end) {
        chime()
        setEnd(null)
        toast('Wind-down done. Lights out, sir.')
      }
      force((n) => n + 1)
    }, 1000)
    return () => clearInterval(t)
  }, [end])
  const left = end ? Math.max(0, end - Date.now()) : mins * 60000
  return (
    <div className="text-center">
      <div className="font-num text-[56px] leading-none">
        {String(Math.floor(left / 60000)).padStart(2, '0')}:{String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}
      </div>
      <p className="font-body text-[15px] text-[var(--ink-muted)] mt-2">Phone face-down. Stretch, read, breathe. No screens until the bell.</p>
      {end === null ? (
        <div className="mt-4 flex flex-col gap-3 items-center">
          <Segmented value={mins} onChange={setMins} options={[15, 30, 45, 60].map((v) => ({ value: v, label: `${v}m` }))} />
          <button className="deco-btn px-8" onClick={() => setEnd(Date.now() + mins * 60000)}>Start wind-down</button>
        </div>
      ) : (
        <button className="deco-btn ghost px-8 mt-4" onClick={() => setEnd(null)}>Stop</button>
      )}
    </div>
  )
}

export function NightDebrief() {
  const { today } = useHouse()
  const day = useDay(today)
  const tomorrow = addDays(today, 1)
  const [n, setN] = useState<NightLog>({ gratitudes: ['', '', ''] })
  const [next3, setNext3] = useState<Big3Item[]>([{ text: '', done: false }, { text: '', done: false }, { text: '', done: false }])

  // Load the saved debrief + tomorrow's Big 3 once per day.
  useEffect(() => {
    void db.days.get(today).then((t) => t?.night && setN({ gratitudes: ['', '', ''], ...t.night }))
    void db.days.get(tomorrow).then((t) => t?.big3 && setNext3([0, 1, 2].map((i) => t.big3?.[i] ?? { text: '', done: false })))
  }, [today, tomorrow])

  const up = (p: Partial<NightLog>) => setN((x) => ({ ...x, ...p }))
  const g = n.gratitudes ?? ['', '', '']

  const save = async () => {
    await updateDay(today, (d) => {
      d.night = { ...n, completedAt: Date.now() }
    })
    await updateDay(tomorrow, (d) => {
      d.big3 = next3.map((b) => ({ ...b, text: b.text.trim() }))
    })
    toast('Debrief filed. Tomorrow’s Big 3 is set.')
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="night" subtitle={day.night?.completedAt ? 'Filed for today ✓ — edit anytime' : 'Close the day properly'} />

      <DecoCard title="THE LEDGER">
        <div className="flex flex-col gap-4">
          <Field label="WHAT I WON">
            <textarea className="deco-input w-full min-h-16" value={n.won ?? ''} onChange={(e) => up({ won: e.target.value })} />
          </Field>
          <Field label="WHAT I DODGED">
            <textarea className="deco-input w-full min-h-16" value={n.dodged ?? ''} onChange={(e) => up({ dodged: e.target.value })} placeholder="Be honest. ALFRED roasts excuses, not you." />
          </Field>
          <Field label="ONE LESSON">
            <input className="deco-input w-full" value={n.lesson ?? ''} onChange={(e) => up({ lesson: e.target.value })} />
          </Field>
        </div>
      </DecoCard>

      <DecoCard title="THREE GRATITUDES">
        <div className="flex flex-col gap-2">
          {g.map((v, i) => (
            <input key={i} className="deco-input" value={v} placeholder={`${i + 1}.`} onChange={(e) => up({ gratitudes: g.map((x, j) => (j === i ? e.target.value : x)) })} />
          ))}
        </div>
      </DecoCard>

      <DecoCard title="THE READINGS">
        <div className="flex flex-col gap-4">
          <Field label="MOOD 1–10"><Scale10 value={n.mood} onChange={(mood) => up({ mood })} /></Field>
          <Field label="ENERGY 1–10"><Scale10 value={n.energy} onChange={(energy) => up({ energy })} /></Field>
          <Field label="SCREEN TIME (from Settings → Screen Time)">
            <Stepper value={n.screenTimeH ?? 0} onChange={(screenTimeH) => up({ screenTimeH })} step={0.5} max={24} suffix="h" />
          </Field>
          <Field label="WOULD 30-YEAR-OLD ME BE PROUD OF TODAY?">
            <Segmented<string>
              value={n.proud === undefined ? '' : n.proud ? 'y' : 'n'}
              onChange={(v) => up({ proud: v === 'y' })}
              options={[{ value: 'y', label: 'Yes' }, { value: 'n', label: 'Not yet' }]}
            />
          </Field>
        </div>
      </DecoCard>

      <DecoCard title="TOMORROW’S BIG 3">
        <div className="flex flex-col gap-2">
          {next3.map((b, i) => (
            <input key={i} className="deco-input" value={b.text} placeholder={`Win #${i + 1}`} onChange={(e) => setNext3(next3.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
          ))}
        </div>
      </DecoCard>

      <button className="deco-btn" onClick={save}>File the debrief</button>

      <DecoCard title="WIND-DOWN">
        <WindDown />
      </DecoCard>
    </div>
  )
}
