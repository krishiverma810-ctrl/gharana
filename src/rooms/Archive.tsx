import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DecoCard } from '../components/DecoCard'
import { Empty, RoomHeader, Segmented } from '../components/ui'
import { LineChart } from '../components/Kit'
import { db } from '../db/db'
import { useHouse } from '../app/house'
import { useSettings } from '../store/settings'
import { useTrophies } from '../store/trophies'
import { isDone } from '../lib/streaks'
import { houseScore } from '../lib/score'
import { addDays, daysBetween, formatLongDate, monthKey, shortDate, weekStart } from '../lib/time'
import { shareCard } from '../lib/sharecard'
import { SundayReview } from './SundayReview'

// THE ARCHIVE — every past day as a page, weekly / monthly reports, the lock-in report card.

function useEverything() {
  const days = useLiveQuery(() => db.days.toArray(), []) ?? []
  const logs = useLiveQuery(() => db.habitLogs.toArray(), []) ?? []
  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? []
  const workouts = useLiveQuery(() => db.workouts.toArray(), []) ?? []
  const focus = useLiveQuery(() => db.focus.toArray(), []) ?? []
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? []
  const txns = useLiveQuery(() => db.txns.toArray(), []) ?? []
  const body = useLiveQuery(() => db.body.orderBy('day').toArray(), []) ?? []
  return { days, logs, habits, workouts, focus, sessions, txns, body }
}

function Bars({ data, unit = '' }: { data: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="bars">
      {data.map((d, i) => (
        <div key={i} className="bar">
          <span className="font-num text-[10px] text-[var(--ink-muted)]">{d.value ? `${Math.round(d.value)}${unit}` : ''}</span>
          <i style={{ height: `${(d.value / max) * 100}%` }} />
          <span className="font-deco text-[9px] text-[var(--ink-muted)]">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function DayPage({ day, all }: { day: string; all: ReturnType<typeof useEverything> }) {
  const s = useSettings()
  const d = all.days.find((x) => x.day === day)
  const logs = new Map(all.logs.filter((l) => l.day === day).map((l) => [l.habitId, l]))
  const habits = all.habits.filter((h) => logs.has(h.id) || !h.archived)
  const done = habits.filter((h) => isDone(h, logs.get(h.id)))
  const workouts = all.workouts.filter((w) => w.day === day)
  const focusMin = all.focus.filter((f) => f.day === day).reduce((a, f) => a + f.minutes, 0)
  const spent = all.txns.filter((t) => t.day === day && t.kind === 'expense').reduce((a, t) => a + t.amount, 0)
  const score = d ? houseScore({ habits: habits.filter((h) => logs.has(h.id) || h.sets.includes('home')), logs, day: d, workouts, waterTarget: s.waterTargetMl, proteinTarget: s.proteinTargetG, wakeTarget: s.wakeTarget }).total : 0
  return (
    <div className="flex flex-col gap-3 font-body text-[16px]">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-[22px] text-[var(--accent)]">{formatLongDate(new Date(`${day}T12:00:00Z`), 'UTC')}</span>
        <span className="font-num text-[20px]">{score}<small className="text-[var(--ink-muted)]">/100</small></span>
      </div>
      {!d && !done.length && !workouts.length && <Empty>Nothing was logged this day.</Empty>}
      {done.length > 0 && <div><span className="field-label">RITES</span>{done.map((h) => h.name).join(' · ')}</div>}
      {d && <div><span className="field-label">FUEL</span>{(d.waterMl / 1000).toFixed(1)} L water · {d.proteinG} g protein{d.calories ? ` · ${d.calories} kcal` : ''}</div>}
      {d?.big3?.some((b) => b.text) && <div><span className="field-label">BIG 3</span>{d.big3.filter((b) => b.text).map((b) => `${b.done ? '✓' : '○'} ${b.text}`).join(' · ')}</div>}
      {d?.morning?.completedAt && <div><span className="field-label">MORNING</span>Woke {d.morning.wakeTime} · slept {d.morning.sleepHours} h · energy {d.morning.energy ?? '?'}/10{d.morning.intention ? ` · “${d.morning.intention}”` : ''}</div>}
      {workouts.length > 0 && <div><span className="field-label">PATROL</span>{workouts.map((w) => `${w.type} ${w.minutes}m`).join(' · ')}</div>}
      {focusMin > 0 && <div><span className="field-label">FOCUS</span>{focusMin} min</div>}
      {spent > 0 && <div><span className="field-label">SPENT</span>${spent.toFixed(2)}</div>}
      {d?.night?.completedAt && (
        <div>
          <span className="field-label">DEBRIEF</span>
          {d.night.won && <div>Won: {d.night.won}</div>}
          {d.night.dodged && <div>Dodged: {d.night.dodged}</div>}
          {d.night.lesson && <div>Lesson: {d.night.lesson}</div>}
          {d.night.gratitudes?.filter(Boolean).length ? <div>Grateful for: {d.night.gratitudes.filter(Boolean).join(', ')}</div> : null}
        </div>
      )}
      {(d?.proud ?? d?.night?.proud) !== undefined && <div><span className="field-label">30-YEAR-OLD ME</span>{(d?.proud ?? d?.night?.proud) ? 'Proud ✓' : 'Not yet'}</div>}
    </div>
  )
}

function rangeDays(start: string, end: string) {
  return Array.from({ length: daysBetween(start, end) + 1 }, (_, i) => addDays(start, i))
}

function Report({ start, end, label, all }: { start: string; end: string; label: string; all: ReturnType<typeof useEverything> }) {
  const range = rangeDays(start, end)
  const inR = (d: string) => d >= start && d <= end
  const habitPct = range.map((day) => {
    const logs = all.logs.filter((l) => l.day === day)
    const active = all.habits.filter((h) => !h.archived && h.type !== 'weekly')
    const done = active.filter((h) => isDone(h, logs.find((l) => l.habitId === h.id))).length
    return { label: shortDate(day).slice(0, 2), value: active.length ? (done / active.length) * 100 : 0 }
  })
  const train = range.map((day) => ({ label: shortDate(day).slice(0, 2), value: all.workouts.filter((w) => w.day === day).reduce((a, w) => a + w.minutes, 0) }))
  const studyH = (all.sessions.filter((x) => inR(x.day) && (x.kind === 'study' || x.kind === 'gamsat')).reduce((a, x) => a + x.minutes, 0) + all.focus.filter((f) => inR(f.day)).reduce((a, f) => a + f.minutes, 0)) / 60
  const saved = all.txns.filter((t) => inR(t.day) && t.kind === 'saving').reduce((a, t) => a + t.amount, 0)
  const spent = all.txns.filter((t) => inR(t.day) && t.kind === 'expense').reduce((a, t) => a + t.amount, 0)
  const weights = all.body.filter((b) => inR(b.day) && b.weight)
  const avgHabit = habitPct.reduce((a, d) => a + d.value, 0) / Math.max(1, habitPct.length)
  const trainTotal = train.reduce((a, d) => a + d.value, 0)
  const compact = range.length > 10
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div><div className="font-num text-[22px]">{avgHabit.toFixed(0)}%</div><div className="field-label">RITES DONE</div></div>
        <div><div className="font-num text-[22px]">{trainTotal}</div><div className="field-label">TRAINING MIN</div></div>
        <div><div className="font-num text-[22px]">{studyH.toFixed(1)}</div><div className="field-label">STUDY HOURS</div></div>
        <div><div className="font-num text-[22px] text-[var(--accent)]">${saved.toFixed(0)}</div><div className="field-label">SAVED</div></div>
      </div>
      <div><div className="field-label">RITES % PER DAY</div><Bars data={compact ? habitPct.map((d, i) => ({ ...d, label: i % 5 === 0 ? String(i + 1) : '' })) : habitPct} unit="%" /></div>
      <div><div className="field-label">TRAINING MINUTES</div><Bars data={compact ? train.map((d, i) => ({ ...d, label: i % 5 === 0 ? String(i + 1) : '' })) : train} /></div>
      {weights.length > 1 && <div><div className="field-label">WEIGHT</div><LineChart points={weights.map((w) => ({ label: shortDate(w.day).replace(/^\w+ /, ''), value: w.weight! }))} unit=" kg" /></div>}
      <p className="font-body text-[14px] text-[var(--ink-muted)]">Spent ${spent.toFixed(0)} · {all.days.filter((d) => inR(d.day) && d.night?.completedAt).length} debriefs · {all.days.filter((d) => inR(d.day) && d.morning?.completedAt).length} morning rites</p>
      <button className="deco-btn ghost" onClick={() => shareCard({ kicker: label, big: `${avgHabit.toFixed(0)}%`, title: 'of rites done', lines: [`${trainTotal} minutes trained`, `${studyH.toFixed(1)} hours of study + focus`, `$${saved.toFixed(0)} saved`] }, 'gharana-report.png')}>Share this report</button>
    </div>
  )
}

export function Archive() {
  const { today } = useHouse()
  const all = useEverything()
  const phases = useSettings((s) => s.phases)
  const t = useTrophies()
  const [tab, setTab] = useState<'days' | 'week' | 'month' | 'lockin' | 'review'>('days')
  const [day, setDay] = useState(addDays(today, -1))
  const [offset, setOffset] = useState(0)
  const dayList = useMemo(() => [...new Set([...all.days.map((d) => d.day), ...all.logs.map((l) => l.day)])].filter((d) => d <= today).sort().reverse(), [all.days, all.logs, today])
  const ws = addDays(weekStart(today), offset * 7)
  const monthStart = (() => {
    const d = new Date(`${monthKey(today)}-01T00:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() + offset)
    return d.toISOString().slice(0, 10)
  })()
  const monthEnd = addDays(new Date(Date.UTC(Number(monthStart.slice(0, 4)), Number(monthStart.slice(5, 7)), 1)).toISOString().slice(0, 10), -1)
  const lockStart = phases[0]?.start ?? today
  const lockEnd = phases[phases.length - 1]?.end ?? today
  const lockTo = today < lockEnd ? today : lockEnd

  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="archive" subtitle={`${dayList.length} day${dayList.length === 1 ? "" : "s"} on record`} />
      <div className="overflow-x-auto" data-noswipe>
        <Segmented value={tab} onChange={(v) => { setTab(v); setOffset(0) }} options={[{ value: 'days', label: 'Days' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'lockin', label: 'Lock-in' }, { value: 'review', label: 'Sunday Review' }]} />
      </div>
      {tab === 'days' && (
        <div className="bp-layout">
          <DecoCard>
            <DayPage day={day} all={all} />
            <div className="flex justify-between mt-4">
              <button className="deco-btn ghost px-4" onClick={() => setDay(addDays(day, -1))}>◀ Older</button>
              <button className="deco-btn ghost px-4" disabled={day >= today} onClick={() => setDay(addDays(day, 1))}>Newer ▶</button>
            </div>
          </DecoCard>
          <DecoCard title="EVERY DAY">
            <ul className="max-h-[480px] overflow-y-auto">
              {dayList.map((d) => <li key={d}><button className={`list-row w-full text-left ${d === day ? 'text-[var(--accent)]' : ''}`} onClick={() => setDay(d)}><span className="font-num text-[14px]">{shortDate(d)}</span><span className="flex-1" /><span className="font-num text-[12px] text-[var(--ink-muted)]">{all.logs.filter((l) => l.day === d && l.status === 'done').length} ✓</span></button></li>)}
              {!dayList.length && <Empty>Your history starts today.</Empty>}
            </ul>
          </DecoCard>
        </div>
      )}
      {(tab === 'week' || tab === 'month') && (
        <DecoCard title={tab === 'week' ? `WEEK OF ${shortDate(ws).toUpperCase()}` : new Date(`${monthStart}T00:00:00Z`).toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase()}>
          <div className="flex justify-between mb-3">
            <button className="chip" onClick={() => setOffset(offset - 1)}>◀ Previous</button>
            <button className="chip" disabled={offset >= 0} onClick={() => setOffset(offset + 1)}>Next ▶</button>
          </div>
          {tab === 'week' ? <Report start={ws} end={addDays(ws, 6)} label="The weekly report" all={all} /> : <Report start={monthStart} end={monthEnd} label="The monthly report" all={all} />}
        </DecoCard>
      )}
      {tab === 'lockin' && (
        <DecoCard title="THE LOCK-IN REPORT CARD">
          <p className="font-body text-[15px] text-[var(--ink-muted)] mb-3">{shortDate(lockStart)} → {shortDate(lockEnd)} · {today > lockEnd ? 'final' : `so far (day ${Math.max(1, daysBetween(lockStart, today) + 1)})`}</p>
          <Report start={lockStart} end={lockTo} label="The lock-in report card" all={all} />
          <div className="grid grid-cols-3 gap-3 text-center mt-4">
            <div><div className="font-num text-[22px]">{t.stats?.bestStreak ?? 0}</div><div className="field-label">BEST STREAK</div></div>
            <div><div className="font-num text-[22px]">{t.level.level}</div><div className="field-label">LEVEL</div></div>
            <div><div className="font-num text-[22px]">{t.stats?.dealsWon ?? 0}</div><div className="field-label">DEALS WON</div></div>
          </div>
        </DecoCard>
      )}
      {tab === 'review' && <SundayReview />}
    </div>
  )
}
