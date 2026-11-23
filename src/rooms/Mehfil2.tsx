import { useMemo, useState } from 'react'
import { DecoCard } from '../components/DecoCard'
import { Empty, Field, RoomHeader, Stamp, Stepper } from '../components/ui'
import { ListCard, addItem, removeItem, useItems } from '../components/ListCard'
import { Icon } from '../components/Icon'
import { useHouse } from '../app/house'
import { useSettings } from '../store/settings'
import { useNow } from '../store/useClock'
import { setHabitValue, useActiveHabits, useLogsForDay } from '../db/hooks'
import { daysBetween, formatTime, shortDate, zonedParts } from '../lib/time'
import { LOCATIONS } from '../config/lockin'

// FAMILY ROOM (India mode) + DEEPALI'S CORNER (long-distance mode).

// ── FAMILY ROOM ──────────────────────────────────────────────────────

function RelativeQuiz() {
  const relatives = useItems('family', 'relative')
  const [idx, setIdx] = useState(0)
  const [show, setShow] = useState(false)
  const withRel = relatives.filter((r) => r.sub)
  if (withRel.length < 2) return <Empty>Add a few relatives with their relation and you can quiz yourself before the wedding.</Empty>
  const r = withRel[idx % withRel.length]
  return (
    <div className="text-center">
      <p className="font-body text-[15px] text-[var(--ink-muted)]">Who is…</p>
      <p className="font-display text-[24px] text-[var(--ink)] mt-1">{r.sub}</p>
      <button className="deco-btn ghost px-6 mt-3" onClick={() => setShow(true)}>{show ? r.text : 'Reveal'}</button>
      <button className="deco-btn px-6 mt-3 ml-2" onClick={() => { setShow(false); setIdx(Math.floor(Math.random() * 1e6)) }}>Next</button>
    </div>
  )
}

export function FamilyRoom() {
  const { today, habitSet } = useHouse()
  const habits = useActiveHabits(habitSet)
  const logs = useLogsForDay(today)
  const family = habits.find((h) => h.id === 'family')
  const done = !!logs.get('family')?.value
  const events = useItems('family', 'event')
  const nextEvent = events.filter((e) => (e.date ?? '') >= today).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))[0]

  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="family" subtitle={nextEvent ? `Next: ${nextEvent.text} · ${nextEvent.date === today ? 'today' : `in ${daysBetween(today, nextEvent.date!)} days`}` : 'Family time counts — it’s a habit, not a failure'} />
      <DecoCard title="FAMILY TIME TODAY">
        <div className="flex items-center gap-4">
          <button
            className="habit-check"
            style={{ width: 54, height: 54 }}
            onClick={() => family && setHabitValue(family, today, done ? 0 : 1, { activeIds: habits.map((h) => h.id) })}
            disabled={!family}
            aria-label="Tick family time"
          >
            <Stamp show={done} />
          </button>
          <p className="font-body text-[17px] flex-1">
            {family ? (done ? 'Logged. Being present with family is the work today.' : 'Spent real time with family today? Tick it — it counts toward your House Score.') : 'The Family Time habit is part of the India set — it shows up automatically in India mode.'}
          </p>
        </div>
      </DecoCard>
      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          <DecoCard title="WHO’S WHO">
            <ListCard room="family" kind="relative" placeholder="Name (e.g. Gurpreet)" subPlaceholder="Relation — mum’s younger sister, Ludhiana" empty="Add relatives so you never blank at a wedding again 😭" />
          </DecoCard>
          <DecoCard title="QUICK QUIZ"><RelativeQuiz /></DecoCard>
        </div>
        <div className="flex flex-col gap-5">
          <DecoCard title="EVENTS + WEDDINGS">
            <ListCard room="family" kind="event" placeholder="Event (Simran’s wedding — sangeet)" subPlaceholder="Where · what to wear" withDate empty="Add the weddings and functions you’re going to." />
          </DecoCard>
          <DecoCard title="GIFTS TO GIVE">
            <ListCard room="family" kind="gift" placeholder="Gift" subPlaceholder="For whom" checkable empty="Who needs a gift?" />
          </DecoCard>
          <DecoCard title="BRING BACK TO MELBOURNE">
            <ListCard room="family" kind="bringback" placeholder="Kurtas, spices, mithai for the boys…" checkable empty="Start the bring-back list." />
          </DecoCard>
        </div>
      </div>
    </div>
  )
}

// ── DEEPALI'S CORNER ─────────────────────────────────────────────────

/** Hours of my local day when both of us are between 8am and 11pm. */
function overlapHours(myTz: string, herTz: string, now: Date): boolean[] {
  const offset = (tz: string) => {
    const p = zonedParts(now, tz)
    return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - now.getTime()) / 3600000
  }
  const diff = offset(herTz) - offset(myTz)
  return Array.from({ length: 24 }, (_, h) => {
    const hers = (((h + diff) % 24) + 24) % 24
    return h >= 8 && h < 23 && hers >= 8 && hers < 23
  })
}

function TimeZones({ name }: { name: string }) {
  const now = useNow(30_000)
  const { timeZone, location, hour } = useHouse()
  const herTz = LOCATIONS.melbourne.timeZone
  const hours = useMemo(() => overlapHours(timeZone, herTz, now), [timeZone, herTz, now])
  const windows: string[] = []
  let start = -1
  hours.forEach((ok, h) => {
    if (ok && start < 0) start = h
    if ((!ok || h === 23) && start >= 0) {
      const end = ok ? 24 : h
      windows.push(`${fmtH(start)}–${fmtH(end)}`)
      start = -1
    }
  })
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 text-center">
        <div>
          <div className="field-label">YOU · {LOCATIONS[location].name.toUpperCase()}</div>
          <div className="font-num text-[26px]">{formatTime(now, timeZone)}</div>
        </div>
        <div>
          <div className="field-label">{name.toUpperCase()} · MELBOURNE</div>
          <div className="font-num text-[26px]">{formatTime(now, herTz)}</div>
        </div>
      </div>
      <div className="tz-bar" aria-label="Good call hours">
        {hours.map((ok, h) => <span key={h} className={`${ok ? 'ok' : ''} ${h === hour ? 'now' : ''}`} title={fmtH(h)} />)}
      </div>
      <div className="flex justify-between font-num text-[11px] text-[var(--ink-muted)]"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span></div>
      <p className="font-body text-[16px]">
        {location === 'melbourne' ? 'Same city, same clock. Go see her.' : <>Good call windows (your time): <span className="text-[var(--accent)]">{windows.join(', ') || 'tight today — try a voice note'}</span></>}
      </p>
    </div>
  )
}
const fmtH = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 || h === 24 ? 'am' : 'pm'}`

function CallLog() {
  const { today } = useHouse()
  const calls = useItems('deepali', 'call').sort((a, b) => b.at - a.at)
  const [mins, setMins] = useState(20)
  const [note, setNote] = useState('')
  const last = calls[0]
  const week = calls.filter((c) => c.date && daysBetween(c.date, today) < 7)
  return (
    <div className="flex flex-col gap-3">
      <p className="font-body text-[16px] text-[var(--ink-muted)]">
        {last ? <>Last call: <span className="text-[var(--ink)]">{last.date === today ? 'today' : `${daysBetween(last.date ?? today, today)} days ago`}</span> · {week.length} calls / {week.reduce((a, c) => a + (c.num ?? 0), 0)} min this week</> : 'No calls logged yet.'}
      </p>
      <div className="flex gap-2 items-center">
        <Stepper value={mins} onChange={setMins} step={5} min={5} suffix="min" />
        <input className="deco-input flex-1 min-w-0" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you talked about" />
      </div>
      <button className="deco-btn" onClick={async () => { await addItem('deepali', 'call', { text: `${mins} min call`, sub: note.trim() || undefined, date: today, num: mins }); setNote('') }}>Log call</button>
      <ul>
        {calls.slice(0, 6).map((c) => (
          <li key={c.id} className="list-row">
            <span className="font-num text-[13px] text-[var(--accent)] w-20">{c.date ? shortDate(c.date) : ''}</span>
            <span className="flex-1 font-body text-[16px]">{c.num} min{c.sub ? ` · ${c.sub}` : ''}</span>
            <button className="icon-btn" aria-label="Delete" onClick={() => removeItem(c)}><Icon name="trash" size={14} /></button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SpecialDates() {
  const { today } = useHouse()
  const dates = useItems('deepali', 'special')
  const next = dates
    .filter((d) => d.date)
    .map((d) => {
      // yearly: next occurrence of the month-day
      const md = d.date!.slice(5)
      let occ = `${today.slice(0, 4)}-${md}`
      if (occ < today) occ = `${Number(today.slice(0, 4)) + 1}-${md}`
      return { d, occ, days: daysBetween(today, occ) }
    })
    .sort((a, b) => a.days - b.days)
  return (
    <div className="flex flex-col gap-3">
      {next.slice(0, 3).map(({ d, days }) => (
        <div key={d.id} className="flex items-baseline justify-between">
          <span className="font-body text-[17px]">{d.text}</span>
          <span className="font-num text-[var(--accent)]">{days === 0 ? 'TODAY' : `${days} days`}</span>
        </div>
      ))}
      <ListCard room="deepali" kind="special" placeholder="Her birthday, anniversary…" withDate empty="Add the dates that matter (they repeat every year)." />
    </div>
  )
}

export function DeepaliCorner() {
  const name = useSettings((s) => s.deepaliName)
  const update = useSettings((s) => s.update)
  const { away } = useHouse()
  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="deepali" subtitle={away ? 'Long-distance mode · keep her close' : 'Dates, gifts and the little things'} />
      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          <DecoCard title="TIME ZONES"><TimeZones name={name} /></DecoCard>
          <DecoCard title="CALL LOG"><CallLog /></DecoCard>
          <DecoCard title="SEND SOMETHING">
            <ListCard room="deepali" kind="send" placeholder="Voice note, flowers, a meme, a letter…" withDate checkable empty="Little reminders to send something while you’re away." />
          </DecoCard>
          <DecoCard title="SPECIAL DATES"><SpecialDates /></DecoCard>
        </div>
        <div className="flex flex-col gap-5">
          <DecoCard title="DATE IDEAS"><ListCard room="deepali" kind="dateidea" placeholder="Rooftop dinner, pottery class…" checkable empty="The date-ideas bank is empty." /></DecoCard>
          <DecoCard title="GIFT IDEAS"><ListCard room="deepali" kind="gift" placeholder="Gift idea" subPlaceholder="Why / where to get it" checkable /></DecoCard>
          <DecoCard title="THINGS SHE’S MENTIONED"><ListCard room="deepali" kind="mentioned" placeholder="That café, the perfume she liked…" empty="Write them down the moment she says them." /></DecoCard>
          <DecoCard title="BALI — MID 2027"><ListCard room="deepali" kind="bali" placeholder="Ubud, Uluwatu, budget, flights…" checkable /></DecoCard>
          <Field label="HER NAME (AS SHOWN IN THE APP)">
            <input className="deco-input w-full" defaultValue={name} onBlur={(e) => update({ deepaliName: e.target.value.trim() || 'Deepali' })} />
          </Field>
        </div>
      </div>
    </div>
  )
}
