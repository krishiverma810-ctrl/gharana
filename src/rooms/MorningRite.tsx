import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DecoCard } from '../components/DecoCard'
import { Field, RoomHeader, Scale10, Stepper, Toggle } from '../components/ui'
import { addWater, db, updateDay } from '../db/db'
import { setBig3, setHabitValue, useActiveHabits, useDay } from '../db/hooks'
import { useHouse } from '../app/house'
import { navigate } from '../app/router'
import { useSettings } from '../store/settings'
import { celebrate, toast } from '../store/ui'
import { win } from '../lib/sound'
import { addDays, dayNumber, hmToMin, minToHm, prettyHm } from '../lib/time'
import { VERSES } from '../config/verses'
import type { Big3Item, MorningLog } from '../db/types'

// MORNING RITE — a guided wake-up, one step at a time.

const STEPS = ['RISE', 'BODY', 'BIG 3', 'THE VERSE', 'INTENTION']

export function useWakeStreak(today: string, target: string) {
  const rows = useLiveQuery(() => db.days.where('day').belowOrEqual(today).reverse().limit(120).toArray(), [today]) ?? []
  const map = new Map(rows.map((r) => [r.day, r]))
  let n = 0
  // today counts if already logged; otherwise start from yesterday
  let d = map.get(today)?.morning?.wakeTime ? today : addDays(today, -1)
  for (;;) {
    const w = map.get(d)?.morning?.wakeTime
    if (!w || hmToMin(w) > hmToMin(target)) break
    n++
    d = addDays(d, -1)
  }
  return n
}

export function MorningRite() {
  const { today, minuteOfDay, habitSet } = useHouse()
  const day = useDay(today)
  const target = useSettings((s) => s.wakeTarget)
  const habits = useActiveHabits(habitSet)
  const streak = useWakeStreak(today, target)
  const [step, setStep] = useState(0)
  const [m, setM] = useState<MorningLog>({})
  const [big3, setB3] = useState<Big3Item[]>([])
  const verse = VERSES[((dayNumber(today) % VERSES.length) + VERSES.length) % VERSES.length]

  // Fill the form once the day's saved data has loaded (undefined = loading, null = no row yet).
  const row = useLiveQuery(() => db.days.get(today).then((r) => r ?? null), [today])
  const loaded = row !== undefined
  useEffect(() => {
    if (!loaded) return
    setM({ wakeTime: minToHm(minuteOfDay), sleepHours: 8, ...row?.morning })
    setB3([0, 1, 2].map((i) => row?.big3?.[i] ?? { text: '', done: false }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, loaded])

  const up = (p: Partial<MorningLog>) => setM((x) => ({ ...x, ...p }))
  const tickHabit = (id: string, on: boolean) => {
    const h = habits.find((x) => x.id === id)
    if (h) void setHabitValue(h, today, on ? 1 : 0, { quiet: true, activeIds: habits.map((x) => x.id) })
  }

  const finish = async () => {
    await updateDay(today, (d) => {
      d.morning = { ...m, completedAt: Date.now() }
    })
    await setBig3(today, big3)
    const early = m.wakeTime && hmToMin(m.wakeTime) <= hmToMin(target)
    if (early) {
      win()
      celebrate()
    }
    toast(early ? `Up before ${prettyHm(target)}. The house is awake.` : 'Morning Rite logged. Now go win the day.')
    navigate('/')
  }

  const done = !!day.morning?.completedAt

  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="morning" subtitle={`Wake target ${prettyHm(target)} · early-rise streak ${streak}d`} />
      {done && step === 0 && (
        <DecoCard>
          <p className="text-center font-body text-[18px]">Already done today ✓ — woke at <span className="font-num">{day.morning?.wakeTime}</span>. You can redo it below.</p>
        </DecoCard>
      )}

      <div className="flex gap-1" aria-label="Progress">
        {STEPS.map((s, i) => (
          <button key={s} className={`step-pip ${i <= step ? 'on' : ''}`} onClick={() => setStep(i)} aria-label={s} />
        ))}
      </div>

      <DecoCard title={STEPS[step]}>
        {step === 0 && (
          <div className="flex flex-col gap-5">
            <Field label="WOKE UP AT">
              <input type="time" className="deco-input w-full font-num text-[22px]" value={m.wakeTime ?? ''} onChange={(e) => up({ wakeTime: e.target.value })} />
            </Field>
            <Field label="HOURS OF SLEEP">
              <Stepper value={m.sleepHours ?? 8} onChange={(sleepHours) => up({ sleepHours })} step={0.5} max={16} suffix="h" />
            </Field>
            <Field label="ENERGY 1–10">
              <Scale10 value={m.energy} onChange={(energy) => up({ energy })} />
            </Field>
          </div>
        )}
        {step === 1 && (
          <div className="flex flex-col">
            <Toggle label="Sunlight in the eyes" hint="5–10 min outside, no sunglasses" on={!!m.sunlight} onChange={(v) => { up({ sunlight: v }); tickHabit('sunlight', v) }} />
            <Toggle label="500 ml water" hint="Logs to the Fuel Station" on={!!m.water} onChange={(v) => { up({ water: v }); void addWater(today, v ? 500 : -500) }} />
            <Toggle label="Cold face wash" on={!!m.faceWash} onChange={(v) => { up({ faceWash: v }); tickHabit('facewash', v) }} />
            <Toggle label="Skincare (AM)" on={!!m.skincare} onChange={(v) => { up({ skincare: v }); tickHabit('skincare', v) }} />
          </div>
        )}
        {step === 2 && (
          <div className="flex flex-col gap-3">
            <p className="font-body text-[15px] text-[var(--ink-muted)]">The three things that make today a win.</p>
            {big3.map((b, i) => (
              <input key={i} className="deco-input" value={b.text} placeholder={`Win #${i + 1}`} onChange={(e) => setB3(big3.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
            ))}
          </div>
        )}
        {step === 3 && (
          <div className="text-center">
            <div className="font-deco text-[11px] tracking-[0.3em] text-[var(--accent)]">GITA {verse.ref}</div>
            <p className="sanskrit mt-3">{verse.sanskrit}</p>
            <p className="font-body italic text-[14px] text-[var(--ink-muted)] whitespace-pre-line mt-2">{verse.translit}</p>
            <p className="font-body text-[18px] mt-3">{verse.english}</p>
            <p className="font-body italic text-[15px] text-[var(--accent)] mt-2">→ {verse.apply}</p>
            <div className="mt-4">
              <Toggle label="Read it. Got it." on={!!m.verseRead} onChange={(verseRead) => up({ verseRead })} />
            </div>
          </div>
        )}
        {step === 4 && (
          <Field label="ONE LINE OF INTENTION">
            <textarea className="deco-input w-full min-h-24" value={m.intention ?? ''} onChange={(e) => up({ intention: e.target.value })} placeholder="Today I am the man who…" />
          </Field>
        )}
      </DecoCard>

      <div className="flex gap-2">
        {step > 0 && <button className="deco-btn ghost flex-1" onClick={() => setStep(step - 1)}>Back</button>}
        {step < STEPS.length - 1 ? (
          <button className="deco-btn flex-[2]" onClick={() => setStep(step + 1)}>Next</button>
        ) : (
          <button className="deco-btn flex-[2]" onClick={finish}>Complete the Rite</button>
        )}
      </div>
    </div>
  )
}
