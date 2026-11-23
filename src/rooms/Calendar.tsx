import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DecoCard } from '../components/DecoCard'
import { Empty, RoomHeader, Segmented } from '../components/ui'
import { ListCard } from '../components/ListCard'
import { Icon } from '../components/Icon'
import { db } from '../db/db'
import { useHouse } from '../app/house'
import { useSettings } from '../store/settings'
import { toast } from '../store/ui'
import { addDays, daysBetween, shortDate, weekdayOf } from '../lib/time'
import type { LockInPhase } from '../config/lockin'

// THE CALENDAR ROOM — month + agenda views, lock-in phases as bands, countdowns, .ics export.

const PHASE_COLORS = ['#d4af37', '#3ab0b0', '#8c9ad6', '#e8902a', '#4f9a6a', '#c0573e', '#b08ad0']

interface CalEvent {
  date: string
  end?: string
  title: string
  kind: 'event' | 'family' | 'special' | 'trip' | 'flight' | 'shift' | 'phase' | 'study' | 'deal'
  yearly?: boolean
}

function useAllEvents(phases: LockInPhase[]): CalEvent[] {
  const items = useLiveQuery(() => db.items.where('date').above('').toArray(), []) ?? []
  const trips = useLiveQuery(() => db.trips.toArray(), []) ?? []
  const shifts = useLiveQuery(() => db.shifts.toArray(), []) ?? []
  const units = useLiveQuery(() => db.units.toArray(), []) ?? []
  const deals = useLiveQuery(() => db.deals.toArray(), []) ?? []
  return useMemo(() => {
    const ev: CalEvent[] = []
    for (const it of items) {
      if (!it.date) continue
      if (it.room === 'calendar' && it.kind === 'event') ev.push({ date: it.date, title: it.text, kind: 'event' })
      if (it.room === 'family' && it.kind === 'event') ev.push({ date: it.date, title: it.text, kind: 'family' })
      if (it.room === 'deepali' && it.kind === 'special') ev.push({ date: it.date, title: it.text, kind: 'special', yearly: true })
    }
    for (const t of trips) {
      ev.push({ date: t.start, end: t.end, title: t.name, kind: 'trip' })
      for (const f of t.flights) ev.push({ date: f.date, title: `✈ ${f.number || f.label} ${f.from}→${f.to} ${f.time}`, kind: 'flight' })
    }
    for (const s of shifts) ev.push({ date: s.day, title: `GYG ${s.start}–${s.end}`, kind: 'shift' })
    for (const u of units) for (const a of u.assessments) if (a.due) ev.push({ date: a.due, title: `📚 ${u.code} ${a.name} (${a.weight}%)`, kind: 'study' })
    for (const d of deals) if (d.due && d.stage !== 'won' && d.stage !== 'lost') ev.push({ date: d.due, title: `★ ${d.title}`, kind: 'deal' })
    phases.forEach((p) => ev.push({ date: p.start, end: p.end, title: `Phase ${p.numeral}: ${p.name}`, kind: 'phase' }))
    return ev
  }, [items, trips, shifts, phases, units, deals])
}

/** Does this event land on `day`? (Handles multi-day ranges and yearly dates.) */
function on(e: CalEvent, day: string) {
  if (e.yearly) return e.date.slice(5) === day.slice(5)
  return e.end ? day >= e.date && day <= e.end : e.date === day
}

function nextOccurrence(e: CalEvent, today: string) {
  if (!e.yearly) return e.date
  let occ = `${today.slice(0, 4)}${e.date.slice(4)}`
  if (occ < today) occ = `${Number(today.slice(0, 4)) + 1}${e.date.slice(4)}`
  return occ
}

// ── .ics export ──────────────────────────────────────────────────────
function icsDate(d: string) {
  return d.replace(/-/g, '')
}
function esc(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}
function buildICS(events: CalEvent[]) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GHARANA//The Estate//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:GHARANA']
  events
    .forEach((e, i) => {
      lines.push(
        'BEGIN:VEVENT',
        `UID:gharana-${i}-${icsDate(e.date)}-${e.kind}@gharana.app`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${icsDate(e.date)}`,
        `DTEND;VALUE=DATE:${icsDate(addDays(e.end ?? e.date, 1))}`,
        `SUMMARY:${esc(e.title)}`,
        ...(e.yearly ? ['RRULE:FREQ=YEARLY'] : []),
        'END:VEVENT',
      )
    })
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

function downloadICS(events: CalEvent[]) {
  const blob = new Blob([buildICS(events)], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'gharana-calendar.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function CalendarRoom() {
  const { today } = useHouse()
  const phases = useSettings((s) => s.phases)
  const events = useAllEvents(phases)
  const [view, setView] = useState<'month' | 'agenda'>('month')
  const [month, setMonth] = useState(today.slice(0, 7))
  const [picked, setPicked] = useState<string>(today)

  const first = `${month}-01`
  const lead = (weekdayOf(first) + 6) % 7 // Monday-first grid
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()
  const cells = Array.from({ length: Math.ceil((lead + daysInMonth) / 7) * 7 }, (_, i) => (i < lead || i >= lead + daysInMonth ? null : addDays(first, i - lead)))
  const shiftMonth = (n: number) => {
    const d = new Date(`${month}-01T00:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() + n)
    setMonth(d.toISOString().slice(0, 7))
  }
  const phaseOf = (d: string) => phases.findIndex((p) => d >= p.start && d <= p.end)

  const countdowns = events
    .filter((e) => ['event', 'family', 'special', 'trip', 'flight', 'study', 'deal'].includes(e.kind) || e.kind === 'phase')
    .map((e) => ({ e, when: nextOccurrence(e, today) }))
    .filter((x) => x.when >= today)
    .sort((a, b) => a.when.localeCompare(b.when))
    .slice(0, 8)
  const sem1 = addDays(phases[phases.length - 1]?.end ?? today, 1)

  const agenda = Array.from({ length: 45 }, (_, i) => addDays(today, i))
    .map((d) => ({ d, ev: events.filter((e) => on(e, d) && (e.kind !== 'phase' || e.date === d) && (e.kind !== 'trip' || e.date === d || e.end === d)) }))
    .filter((x) => x.ev.length)

  return (
    <div className="flex flex-col gap-5">
      <RoomHeader
        id="calendar"
        subtitle={`Sem 1 in ${daysBetween(today, sem1)} days`}
        right={
          <button className="icon-btn" aria-label="Export to Apple Calendar" onClick={() => { downloadICS(events); toast('Calendar file saved — open it to add everything to your calendar') }}>
            <Icon name="calendar" />
          </button>
        }
      />
      <Segmented value={view} onChange={setView} options={[{ value: 'month', label: 'Month' }, { value: 'agenda', label: 'Agenda' }]} />

      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          {view === 'month' ? (
            <DecoCard>
              <div className="flex items-center justify-between mb-3">
                <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month"><Icon name="back" /></button>
                <span className="font-display text-[22px] text-[var(--accent)]">{new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase()}</span>
                <button className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month"><Icon name="chevron" /></button>
              </div>
              <div className="cal-grid font-deco text-[10px] text-[var(--ink-muted)] mb-1">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="text-center">{d}</span>)}
              </div>
              <div className="cal-grid">
                {cells.map((d, i) => {
                  if (!d) return <span key={i} />
                  const pi = phaseOf(d)
                  const evs = events.filter((e) => on(e, d) && e.kind !== 'phase')
                  return (
                    <button
                      key={d}
                      className={`cal-day ${d === today ? 'today' : ''} ${d === picked ? 'picked' : ''}`}
                      style={pi >= 0 ? { ['--band' as string]: PHASE_COLORS[pi % PHASE_COLORS.length] } : undefined}
                      onClick={() => setPicked(d)}
                    >
                      <span className="font-num text-[13px]">{Number(d.slice(8))}</span>
                      {pi >= 0 && <span className="band" />}
                      {evs.length > 0 && <span className="dots">{evs.slice(0, 3).map((_, j) => <i key={j} />)}</span>}
                    </button>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                {phases.map((p, i) => (
                  <span key={p.id} className="flex items-center gap-1.5 font-body text-[13px] text-[var(--ink-muted)]">
                    <i className="inline-block w-3 h-1.5" style={{ background: PHASE_COLORS[i % PHASE_COLORS.length] }} /> {p.numeral} {p.name}
                  </span>
                ))}
              </div>
              <div className="mt-4">
                <div className="field-label">{shortDate(picked).toUpperCase()}</div>
                <ul>
                  {events.filter((e) => on(e, picked)).map((e, i) => <li key={i} className="font-body text-[16px]">· {e.title}</li>)}
                  {!events.some((e) => on(e, picked)) && <Empty>Nothing on.</Empty>}
                </ul>
              </div>
            </DecoCard>
          ) : (
            <DecoCard title="NEXT 45 DAYS">
              <ul className="flex flex-col gap-2">
                {agenda.map(({ d, ev }) => (
                  <li key={d}>
                    <div className={`font-num text-[13px] ${d === today ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)]'}`}>{d === today ? 'TODAY' : shortDate(d)}</div>
                    {ev.map((e, i) => <div key={i} className="font-body text-[17px]">{e.title}{e.kind === 'trip' && e.end === d && e.date !== d ? ' — fly home' : ''}</div>)}
                  </li>
                ))}
              </ul>
            </DecoCard>
          )}
        </div>
        <div className="flex flex-col gap-5">
          <DecoCard title="COUNTDOWNS">
            <ul className="flex flex-col gap-2">
              {countdowns.map(({ e, when }, i) => {
                const n = daysBetween(today, when)
                return (
                  <li key={i} className="flex items-baseline justify-between gap-3">
                    <span className="font-body text-[17px]">{e.title}</span>
                    <span className="font-num text-[var(--accent)] whitespace-nowrap">{n === 0 ? 'TODAY' : `${n}d`}</span>
                  </li>
                )
              })}
              <li className="flex items-baseline justify-between">
                <span className="font-body text-[17px]">Semester 1 starts</span>
                <span className="font-num text-[var(--accent)]">{daysBetween(today, sem1)}d</span>
              </li>
            </ul>
          </DecoCard>
          <DecoCard title="ADD A DATE">
            <ListCard room="calendar" kind="event" placeholder="Exam, NAZARA drop, birthday…" withDate empty="Your own events show here and in the countdowns." />
          </DecoCard>
          <DecoCard title="SYNC TO YOUR PHONE">
            <p className="font-body text-[15px] text-[var(--ink-muted)]">Exports phases, trips, flights, family events, special dates and shifts as one calendar file. On iPhone: tap the file, then <b>Add All</b>.</p>
            <button className="deco-btn w-full mt-3" onClick={() => { downloadICS(events); toast('Calendar file saved') }}>Export .ics</button>
          </DecoCard>
        </div>
      </div>
    </div>
  )
}
