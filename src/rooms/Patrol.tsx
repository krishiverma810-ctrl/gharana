import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { DecoCard } from '../components/DecoCard'
import { Dots, Empty, Field, RoomHeader, Segmented, Sheet, Stepper } from '../components/ui'
import { Icon } from '../components/Icon'
import { db, uid } from '../db/db'
import { setHabitValue } from '../db/hooks'
import { useHouse } from '../app/house'
import { useSettings } from '../store/settings'
import { celebrate, toast } from '../store/ui'
import { bell, win } from '../lib/sound'
import { addDays, shortDate, weekStart } from '../lib/time'
import { epley } from '../lib/streaks'
import { COMMON_LIFTS, TRAVEL_WORKOUTS } from '../config/workouts'
import { useWakeLock } from './Blueprint'
import type { Workout, WorkoutType } from '../db/types'

// PATROL — training log, weekly minutes, PR vault, boxing rounds, travel workouts.

const TYPES: { value: WorkoutType; label: string }[] = [
  { value: 'gym', label: 'Gym' },
  { value: 'boxing', label: 'Boxing' },
  { value: 'sport', label: 'Sport' },
  { value: 'run', label: 'Run' },
  { value: 'swim', label: 'Swim' },
  { value: 'walk', label: 'Walk' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'other', label: 'Other' },
]

/** Logging a session also ticks the matching habit (boxing → Boxing, gym/sport → Sport / Gym, anything → Move 20). */
export async function syncHabits(w: Workout) {
  const habits = await db.habits.toArray()
  const get = (id: string) => habits.find((h) => h.id === id && !h.archived)
  const sameDay = await db.workouts.where('day').equals(w.day).toArray()
  const mins = (t?: WorkoutType[]) => sameDay.filter((x) => !t || t.includes(x.type)).reduce((a, x) => a + x.minutes, 0)
  const boxing = get('boxing')
  if (boxing && w.type === 'boxing') await setHabitValue(boxing, w.day, mins(['boxing']), { quiet: true })
  const sport = get('sport')
  if (sport && ['gym', 'sport', 'run', 'swim'].includes(w.type)) await setHabitValue(sport, w.day, 1, { quiet: true })
  const move = get('min-move')
  if (move) await setHabitValue(move, w.day, mins(), { quiet: true })
}

function LogWorkout({ onClose }: { onClose: () => void }) {
  const { today } = useHouse()
  const [w, setW] = useState<Workout>({ id: uid(), day: today, type: 'gym', minutes: 60, intensity: 3, at: Date.now() })
  const up = (p: Partial<Workout>) => setW((x) => ({ ...x, ...p }))
  const save = async () => {
    await db.workouts.add(w)
    await syncHabits(w)
    toast(`${w.minutes} min ${w.type} logged`, () => db.workouts.delete(w.id))
    onClose()
  }
  return (
    <div className="flex flex-col gap-4">
      <Field label="TYPE">
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button key={t.value} className={`chip ${w.type === t.value ? 'on' : ''}`} onClick={() => up({ type: t.value })}>{t.label}</button>
          ))}
        </div>
      </Field>
      <Field label="MINUTES"><Stepper value={w.minutes} onChange={(minutes) => up({ minutes })} step={5} min={5} suffix="min" /></Field>
      <Field label="INTENSITY"><Dots value={w.intensity} onChange={(intensity) => up({ intensity })} /></Field>
      <Field label="DATE"><input type="date" className="deco-input w-full font-num" value={w.day} onChange={(e) => up({ day: e.target.value })} /></Field>
      <Field label="NOTES"><input className="deco-input w-full" value={w.notes ?? ''} onChange={(e) => up({ notes: e.target.value })} placeholder="Push day, 6 rounds on the bag…" /></Field>
      <button className="deco-btn" onClick={save}>Log session</button>
    </div>
  )
}

function PRVault() {
  const { today } = useHouse()
  const lifts = useLiveQuery(() => db.lifts.toArray(), []) ?? []
  const [lift, setLift] = useState(COMMON_LIFTS[0])
  const [weight, setWeight] = useState(60)
  const [reps, setReps] = useState(8)
  const best = new Map<string, (typeof lifts)[number]>()
  for (const l of lifts) if (!best.has(l.lift) || l.e1rm > best.get(l.lift)!.e1rm) best.set(l.lift, l)
  const names = [...new Set([...COMMON_LIFTS, ...lifts.map((l) => l.lift)])]

  const log = async () => {
    const e1rm = epley(weight, reps)
    const prev = best.get(lift)
    const row = { id: uid(), day: today, lift, weight, reps, e1rm, at: Date.now() }
    await db.lifts.add(row)
    if (!prev || e1rm > prev.e1rm) {
      win()
      celebrate()
      toast(prev ? `NEW PR — ${lift} e1RM ${e1rm} kg (was ${prev.e1rm})` : `First ${lift} on the board: e1RM ${e1rm} kg`, () => db.lifts.delete(row.id))
    } else {
      toast(`${lift} ${weight}×${reps} logged`, () => db.lifts.delete(row.id))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto" data-noswipe>
        <div className="flex gap-2 w-max">
          {names.map((n) => (
            <button key={n} className={`chip ${lift === n ? 'on' : ''}`} onClick={() => setLift(n)}>{n}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="KG"><Stepper value={weight} onChange={setWeight} step={2.5} /></Field>
        <Field label="REPS"><Stepper value={reps} onChange={setReps} min={1} /></Field>
      </div>
      <button className="deco-btn" onClick={log}>Log set · e1RM {epley(weight, reps)} kg</button>
      <ul className="flex flex-col gap-1">
        {[...best.values()].sort((a, b) => b.e1rm - a.e1rm).map((b) => (
          <li key={b.lift} className="pr-row">
            <span className="font-body text-[17px]">{b.lift}</span>
            <span className="font-num text-[15px] text-[var(--ink-muted)]">{b.weight}×{b.reps}</span>
            <span className="font-num text-[17px] text-[var(--accent)]">{b.e1rm} kg</span>
          </li>
        ))}
        {!best.size && <Empty>No lifts yet. Your first set is your first PR.</Empty>}
      </ul>
    </div>
  )
}

/** Boxing round timer with bells — full screen, screen stays awake. */
function RoundTimer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { today } = useHouse()
  const [cfg, setCfg] = useState({ rounds: 6, round: 180, rest: 60 })
  const [run, setRun] = useState<{ round: number; phase: 'work' | 'rest'; endsAt: number; paused?: number } | null>(null)
  const [, force] = useState(0)
  useWakeLock(open && !!run)

  useEffect(() => {
    if (!run || run.paused) return
    const t = setInterval(() => {
      const left = run.endsAt - Date.now()
      if (left <= 10_000 && left > 9_750 && run.phase === 'work') bell(1) // 10-second warning clap
      if (left <= 0) {
        if (run.phase === 'work') {
          if (run.round >= cfg.rounds) {
            bell(3)
            setRun(null)
            void db.workouts.add({ id: uid(), day: today, type: 'boxing', minutes: Math.round((cfg.rounds * (cfg.round + cfg.rest)) / 60), intensity: 4, notes: `${cfg.rounds} rounds`, at: Date.now() }).then(async () => {
              const h = await db.habits.get('boxing')
              const all = await db.workouts.where('day').equals(today).toArray()
              if (h) await setHabitValue(h, today, all.filter((w) => w.type === 'boxing').reduce((a, w) => a + w.minutes, 0), { quiet: true })
            })
            toast(`${cfg.rounds} rounds done. Session logged.`)
            celebrate()
          } else {
            bell(1)
            setRun({ ...run, phase: 'rest', endsAt: Date.now() + cfg.rest * 1000 })
          }
        } else {
          bell(2)
          setRun({ round: run.round + 1, phase: 'work', endsAt: Date.now() + cfg.round * 1000 })
        }
      }
      force((n) => n + 1)
    }, 250)
    return () => clearInterval(t)
  }, [run, cfg, today])

  const left = run ? Math.max(0, (run.paused ?? run.endsAt) - (run.paused ? 0 : Date.now())) : cfg.round * 1000
  const mm = Math.floor(left / 60000)
  const ss = Math.floor((left % 60000) / 1000)

  return (
    <AnimatePresence>
      {open && (
        <motion.div className={`fullscreen ${run?.phase === 'rest' ? 'rest' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="font-deco text-[14px] tracking-[0.4em] text-[var(--accent)]">
            {run ? `${run.phase === 'work' ? 'ROUND' : 'REST'} ${run.round} / ${cfg.rounds}` : 'BOXING ROUNDS'}
          </div>
          <div className="font-num text-[min(30vw,220px)] leading-none mt-3">{mm}:{String(ss).padStart(2, '0')}</div>
          {!run ? (
            <div className="flex flex-col gap-4 mt-8 items-center w-full max-w-sm">
              <Field label="ROUNDS"><Stepper value={cfg.rounds} onChange={(rounds) => setCfg({ ...cfg, rounds })} min={1} max={20} /></Field>
              <Field label="ROUND LENGTH"><Segmented value={cfg.round} onChange={(round) => setCfg({ ...cfg, round })} options={[{ value: 120, label: '2:00' }, { value: 180, label: '3:00' }, { value: 240, label: '4:00' }]} /></Field>
              <Field label="REST"><Segmented value={cfg.rest} onChange={(rest) => setCfg({ ...cfg, rest })} options={[{ value: 30, label: '0:30' }, { value: 60, label: '1:00' }, { value: 90, label: '1:30' }]} /></Field>
              <button className="deco-btn w-full mt-2" onClick={() => { bell(1); setRun({ round: 1, phase: 'work', endsAt: Date.now() + cfg.round * 1000 }) }}>Ding ding — start</button>
            </div>
          ) : (
            <div className="flex gap-3 mt-10">
              {run.paused ? (
                <button className="deco-btn px-8" onClick={() => setRun({ ...run, endsAt: Date.now() + (run.paused ?? 0), paused: undefined })}>Resume</button>
              ) : (
                <button className="deco-btn px-8" onClick={() => setRun({ ...run, paused: Math.max(0, run.endsAt - Date.now()) })}>Pause</button>
              )}
              <button className="deco-btn ghost px-8" onClick={() => setRun(null)}>Stop</button>
            </div>
          )}
          <button className="absolute top-[calc(env(safe-area-inset-top)+16px)] right-4 icon-btn" onClick={() => { setRun(null); onClose() }} aria-label="Close">
            <Icon name="close" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Patrol() {
  const { today, away } = useHouse()
  const target = useSettings((s) => s.trainingTargetMin)
  const ws = weekStart(today)
  const week = useLiveQuery(() => db.workouts.where('day').between(ws, addDays(ws, 6), true, true).toArray(), [ws]) ?? []
  const recent = useLiveQuery(() => db.workouts.orderBy('day').reverse().limit(12).toArray(), []) ?? []
  const [logOpen, setLogOpen] = useState(location.hash === '#log')
  const [rounds, setRounds] = useState(location.hash === '#rounds')
  const [openW, setOpenW] = useState<string | null>(null)
  const mins = week.reduce((a, w) => a + w.minutes, 0)
  const pct = Math.min(100, Math.round((mins / target) * 100))
  const perDay = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(ws, i)
    return { d, m: week.filter((w) => w.day === d).reduce((a, w) => a + w.minutes, 0) }
  })
  const maxDay = Math.max(60, ...perDay.map((p) => p.m))

  useEffect(() => {
    if (location.hash) history.replaceState(null, '', location.pathname)
  }, [])

  return (
    <div className="flex flex-col gap-5">
      <RoomHeader
        id="patrol"
        subtitle={`${mins} / ${target} min this week`}
        right={<button className="icon-btn" onClick={() => setLogOpen(true)} aria-label="Log session"><Icon name="plus" /></button>}
      />
      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          <DecoCard title="THIS WEEK">
            <div className="flex items-end justify-between gap-2 h-32">
              {perDay.map((p) => (
                <div key={p.d} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="font-num text-[11px] text-[var(--ink-muted)]">{p.m || ''}</span>
                  <div className="w-full" style={{ height: `${(p.m / maxDay) * 100}%`, minHeight: 2, background: p.d === today ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 55%, transparent)' }} />
                  <span className={`font-deco text-[10px] ${p.d === today ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)]'}`}>{'MTWTFSS'[perDay.indexOf(p)]}</span>
                </div>
              ))}
            </div>
            <div className="meter mt-4"><div style={{ width: `${pct}%` }} /></div>
            <div className="mt-1 text-right font-num text-[13px] text-[var(--ink-muted)]">{pct}% of {target} min</div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button className="deco-btn" onClick={() => setLogOpen(true)}>Log session</button>
              <button className="deco-btn ghost" onClick={() => setRounds(true)}>Boxing rounds</button>
            </div>
          </DecoCard>
          <DecoCard title="RECENT PATROLS">
            <ul className="flex flex-col gap-2">
              {recent.map((w) => (
                <li key={w.id} className="flex items-center gap-3">
                  <span className="font-num text-[13px] text-[var(--ink-muted)] w-20">{w.day === today ? 'Today' : shortDate(w.day)}</span>
                  <span className="flex-1 font-body text-[17px] capitalize">{w.type}{w.notes ? ` · ${w.notes}` : ''}</span>
                  <span className="font-num text-[15px]">{w.minutes}m</span>
                  <Dots value={w.intensity} />
                  <button className="icon-btn" aria-label="Delete" onClick={async () => { await db.workouts.delete(w.id); toast('Session removed', () => db.workouts.put(w)) }}>
                    <Icon name="trash" size={16} />
                  </button>
                </li>
              ))}
              {!recent.length && <Empty>No sessions yet. The first one is the hardest.</Empty>}
            </ul>
          </DecoCard>
        </div>
        <div className="flex flex-col gap-5">
          <DecoCard title="THE PR VAULT"><PRVault /></DecoCard>
          <DecoCard title={away ? 'TRAVEL WORKOUTS — FOR WHERE YOU ARE' : 'NO-EQUIPMENT WORKOUTS'}>
            <ul className="flex flex-col gap-2">
              {TRAVEL_WORKOUTS.map((t) => (
                <li key={t.id} className="tw-row">
                  <button className="w-full flex items-center justify-between text-left" onClick={() => setOpenW(openW === t.id ? null : t.id)}>
                    <span className="font-body text-[17px]">{t.name}</span>
                    <span className="font-num text-[13px] text-[var(--ink-muted)]">{t.minutes}m · {t.where}</span>
                  </button>
                  {openW === t.id && (
                    <div className="mt-2">
                      <ul className="font-body text-[15px] text-[var(--ink-muted)] list-none">
                        {t.moves.map((m, i) => <li key={i}>· {m}</li>)}
                      </ul>
                      <button
                        className="deco-btn ghost w-full mt-2"
                        onClick={async () => {
                          const w: Workout = { id: uid(), day: today, type: 'other', minutes: t.minutes, intensity: 3, notes: t.name, at: Date.now() }
                          await db.workouts.add(w)
                          await syncHabits(w)
                          toast(`${t.name} logged`, () => db.workouts.delete(w.id))
                        }}
                      >
                        Done it — log {t.minutes} min
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </DecoCard>
        </div>
      </div>
      <Sheet open={logOpen} onClose={() => setLogOpen(false)} title="LOG A PATROL">
        <LogWorkout onClose={() => setLogOpen(false)} />
      </Sheet>
      <RoundTimer open={rounds} onClose={() => setRounds(false)} />
    </div>
  )
}
