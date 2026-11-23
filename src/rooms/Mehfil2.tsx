import { useState } from 'react'
import { DecoCard } from '../components/DecoCard'
import { Empty, RoomHeader, Stamp } from '../components/ui'
import { ListCard, useItems } from '../components/ListCard'
import { useHouse } from '../app/house'
import { setHabitValue, useActiveHabits, useLogsForDay } from '../db/hooks'
import { daysBetween } from '../lib/time'

// FAMILY ROOM (India mode) (Deepali's Corner lives in Deepali.tsx).

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
