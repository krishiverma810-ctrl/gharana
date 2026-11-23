import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DecoCard } from '../components/DecoCard'
import { Empty, Field, RoomHeader, Segmented, Sheet } from '../components/ui'
import { Icon } from '../components/Icon'
import { addItem, useItems } from '../components/ListCard'
import { db, uid } from '../db/db'
import { useHouse } from '../app/house'
import { useSettings } from '../store/settings'
import { celebrate, toast } from '../store/ui'
import { win } from '../lib/sound'
import { addDays, daysBetween, shortDate, zonedParts } from '../lib/time'
import { LOCATIONS, type LocationId } from '../config/lockin'
import { BEACH_PACKING, INDIA_PACKING, REENTRY_PROTOCOL } from '../config/travel'
import type { PackItem, SharedCost, Trip } from '../db/types'

// THE CONCIERGE — travel mode, trips, flights, packing, documents, shared costs, jet lag, re-entry.

const aud = (n: number) => `$${(Math.round(n * 100) / 100).toLocaleString('en-AU')}`

/** Hours between Melbourne and a destination on a given day (positive = destination is ahead). */
function tzDiffHours(location: LocationId, day: string): number {
  const d = new Date(`${day}T12:00:00Z`)
  const mins = (tz: string) => {
    const p = zonedParts(d, tz)
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) / 60000
  }
  return (mins(LOCATIONS[location].timeZone) - mins(LOCATIONS.melbourne.timeZone)) / 60
}

function JetLag({ trip }: { trip: Trip }) {
  const diff = tzDiffHours(trip.location, trip.start)
  if (Math.abs(diff) < 1.5) {
    return (
      <p className="font-body text-[16px] text-[var(--ink-muted)]">
        {LOCATIONS[trip.location].name} is {Math.abs(diff)} h {diff < 0 ? 'behind' : 'ahead of'} Melbourne — no jet lag plan needed. Keep your normal wake time and get morning sun on day one.
      </p>
    )
  }
  const steps = Math.min(4, Math.ceil(Math.abs(diff) / 1.5))
  const later = diff < 0 // flying west → stay up later
  return (
    <div className="flex flex-col gap-2 font-body text-[16px]">
      <p className="text-[var(--ink-muted)]">
        {LOCATIONS[trip.location].name} is <span className="font-num text-[var(--ink)]">{Math.abs(diff)} h</span> {diff < 0 ? 'behind' : 'ahead of'} Melbourne. Start shifting {steps} days out:
      </p>
      <ol className="flex flex-col gap-1">
        {Array.from({ length: steps }, (_, i) => (
          <li key={i}>
            <span className="font-num text-[var(--accent)] mr-2">{shortDate(addDays(trip.start, i - steps))}</span>
            Bed + wake {30 * (i + 1)} min {later ? 'later' : 'earlier'}.
          </li>
        ))}
        <li><span className="font-num text-[var(--accent)] mr-2">Flight</span>Water every hour, no alcohol, sleep only when it’s night at the destination.</li>
        <li><span className="font-num text-[var(--accent)] mr-2">Day 1</span>Sunlight within an hour of local morning, stay up until 9pm local, short walk instead of a nap.</li>
      </ol>
    </div>
  )
}

function Checklist({ items, onChange, addPlaceholder, template }: { items: PackItem[]; onChange: (next: PackItem[]) => void; addPlaceholder: string; template?: PackItem[] }) {
  const [text, setText] = useState('')
  const cats = [...new Set(items.map((i) => i.cat))]
  const done = items.filter((i) => i.done).length
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between font-num text-[14px] text-[var(--ink-muted)]">
        <span>{done}/{items.length} packed</span>
        {template && (
          <button className="chip" onClick={() => { const before = items; onChange(template.map((t) => ({ ...t, id: uid(), done: false }))); toast('List reset to template', () => onChange(before)) }}>Reset to template</button>
        )}
      </div>
      <div className="meter"><div style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} /></div>
      {cats.map((c) => (
        <div key={c}>
          <div className="field-label mt-2">{c.toUpperCase()}</div>
          <ul>
            {items.filter((i) => i.cat === c).map((i) => (
              <li key={i.id} className={`list-row ${i.done ? 'done' : ''}`}>
                <button className={`mini-check ${i.done ? 'on' : ''}`} onClick={() => onChange(items.map((x) => (x.id === i.id ? { ...x, done: !x.done } : x)))} aria-label={i.done ? 'Unpack' : 'Pack'}>
                  {i.done ? '✓' : ''}
                </button>
                <span className="flex-1 font-body text-[17px]">{i.text}</span>
                <button className="icon-btn" aria-label="Remove" onClick={() => onChange(items.filter((x) => x.id !== i.id))}><Icon name="trash" size={14} /></button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="flex gap-2">
        <input className="deco-input flex-1 min-w-0" value={text} onChange={(e) => setText(e.target.value)} placeholder={addPlaceholder}
          onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { onChange([...items, { id: uid(), text: text.trim(), cat: 'Extras', done: false }]); setText('') } }} />
        <button className="deco-btn px-3" aria-label="Add" onClick={() => { if (text.trim()) { onChange([...items, { id: uid(), text: text.trim(), cat: 'Extras', done: false }]); setText('') } }}><Icon name="plus" size={18} /></button>
      </div>
    </div>
  )
}

/** Who owes who: settle-up with the fewest transfers. */
function settle(costs: SharedCost[]) {
  const bal = new Map<string, number>()
  for (const c of costs) {
    const share = c.amount / Math.max(1, c.splitWith.length)
    bal.set(c.paidBy, (bal.get(c.paidBy) ?? 0) + c.amount)
    for (const p of c.splitWith) bal.set(p, (bal.get(p) ?? 0) - share)
  }
  const debtors = [...bal].filter(([, v]) => v < -0.01).map(([n, v]) => ({ n, v: -v })).sort((a, b) => b.v - a.v)
  const creditors = [...bal].filter(([, v]) => v > 0.01).map(([n, v]) => ({ n, v })).sort((a, b) => b.v - a.v)
  const out: { from: string; to: string; amount: number }[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i].v, creditors[j].v)
    out.push({ from: debtors[i].n, to: creditors[j].n, amount: amt })
    debtors[i].v -= amt
    creditors[j].v -= amt
    if (debtors[i].v < 0.01) i++
    if (creditors[j].v < 0.01) j++
  }
  return out
}

function Costs({ trip, save }: { trip: Trip; save: (t: Partial<Trip>) => void }) {
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(trip.crew[0] ?? 'Krishi')
  const [split, setSplit] = useState<string[]>(trip.crew)
  const [newMate, setNewMate] = useState('')
  const transfers = settle(trip.costs)
  const total = trip.costs.reduce((a, c) => a + c.amount, 0)
  const add = () => {
    const n = Number(amount)
    if (!desc.trim() || !(n > 0) || !split.length) return
    save({ costs: [...trip.costs, { id: uid(), desc: desc.trim(), amount: n, paidBy, splitWith: split }] })
    setDesc('')
    setAmount('')
  }
  return (
    <div className="flex flex-col gap-3">
      <Field label="THE CREW">
        <div className="flex flex-wrap gap-2">
          {trip.crew.map((c) => <span key={c} className="chip on">{c}</span>)}
          <input className="deco-input w-28" value={newMate} onChange={(e) => setNewMate(e.target.value)} placeholder="+ mate"
            onKeyDown={(e) => { if (e.key === 'Enter' && newMate.trim() && !trip.crew.includes(newMate.trim())) { save({ crew: [...trip.crew, newMate.trim()] }); setSplit([...split, newMate.trim()]); setNewMate('') } }} />
        </div>
      </Field>
      <div className="grid grid-cols-[1fr_90px] gap-2">
        <input className="deco-input min-w-0" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Airbnb, dinner, Uber…" />
        <input className="deco-input font-num min-w-0" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$" />
      </div>
      <Field label="PAID BY">
        <div className="flex flex-wrap gap-2">{trip.crew.map((c) => <button key={c} className={`chip ${paidBy === c ? 'on' : ''}`} onClick={() => setPaidBy(c)}>{c}</button>)}</div>
      </Field>
      <Field label="SPLIT BETWEEN">
        <div className="flex flex-wrap gap-2">{trip.crew.map((c) => <button key={c} className={`chip ${split.includes(c) ? 'on' : ''}`} onClick={() => setSplit(split.includes(c) ? split.filter((x) => x !== c) : [...split, c])}>{c}</button>)}</div>
      </Field>
      <button className="deco-btn" onClick={add}>Add cost</button>
      <ul>
        {trip.costs.map((c) => (
          <li key={c.id} className="list-row">
            <span className="flex-1 font-body text-[16px]">{c.desc} <span className="text-[var(--ink-muted)] text-[13px]">· {c.paidBy} paid · split {c.splitWith.length}</span></span>
            <span className="font-num">{aud(c.amount)}</span>
            <button className="icon-btn" aria-label="Delete" onClick={() => { const before = trip.costs; save({ costs: trip.costs.filter((x) => x.id !== c.id) }); toast('Cost removed', () => save({ costs: before })) }}><Icon name="trash" size={14} /></button>
          </li>
        ))}
      </ul>
      {trip.costs.length > 0 && (
        <div className="font-body text-[16px]">
          <div className="field-label">SETTLE UP · TOTAL {aud(total)}</div>
          {transfers.length ? transfers.map((t, i) => <div key={i}><b>{t.from}</b> → <b>{t.to}</b> <span className="font-num text-[var(--accent)]">{aud(t.amount)}</span></div>) : <div className="text-[var(--ink-muted)]">All square.</div>}
        </div>
      )}
    </div>
  )
}

function Reentry({ trip }: { trip: Trip }) {
  const ticks = useItems('concierge', `reentry:${trip.id}`)
  const done = new Set(ticks.map((t) => t.text))
  return (
    <ol className="flex flex-col">
      {REENTRY_PROTOCOL.map((r) => {
        const key = String(r.day)
        const on = done.has(key)
        return (
          <li key={r.day} className={`list-row ${on ? 'done' : ''}`}>
            <button
              className={`mini-check ${on ? 'on' : ''}`}
              onClick={async () => {
                const it = ticks.find((t) => t.text === key)
                if (it) await db.items.delete(it.id)
                else await addItem('concierge', `reentry:${trip.id}`, { text: key, date: addDays(trip.end, r.day) })
              }}
            >
              {on ? '✓' : ''}
            </button>
            <span className="flex-1 font-body text-[16px]"><span className="font-num text-[var(--accent)] mr-2">D{r.day} · {shortDate(addDays(trip.end, r.day))}</span>{r.text}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function Concierge() {
  const house = useHouse()
  const s = useSettings()
  const trips = useLiveQuery(() => db.trips.orderBy('start').toArray(), []) ?? []
  const upcoming = trips.find((t) => t.end >= house.today) ?? trips[trips.length - 1]
  const [sel, setSel] = useState<string | null>(null)
  const trip = trips.find((t) => t.id === sel) ?? upcoming
  const [flightOpen, setFlightOpen] = useState(false)
  const [newTrip, setNewTrip] = useState(false)
  const [it, setIt] = useState({ day: house.today, text: '' })
  const itinerary = useMemo(() => [...(trip?.itinerary ?? [])].sort((a, b) => a.day.localeCompare(b.day)), [trip])

  const save = (patch: Partial<Trip>) => trip && db.trips.update(trip.id, patch)

  if (!trip) return <RoomHeader id="concierge" subtitle="No trips yet" />

  const daysTo = daysBetween(house.today, trip.start)
  const dayN = daysBetween(trip.start, house.today) + 1
  const len = daysBetween(trip.start, trip.end) + 1
  const status = daysTo > 0 ? `Leaves in ${daysTo} ${daysTo === 1 ? 'day' : 'days'}` : house.today <= trip.end ? `Day ${dayN} of ${len}` : `Back home · ${daysBetween(trip.end, house.today)} days ago`

  const changeEnd = (end: string) => {
    save({ end })
    // Keep the lock-in phase in sync (e.g. coming back from India early).
    const phase = s.phases.find((p) => p.location === trip.location && p.start <= trip.start && p.end >= trip.start)
    if (phase && end >= phase.start) {
      const idx = s.phases.indexOf(phase)
      // This phase ends on the new date; the next phase starts the day after.
      const next = s.phases.map((p, i) => (i === idx ? { ...p, end } : i === idx + 1 ? { ...p, start: addDays(end, 1) } : p))
      s.update({ phases: next })
      toast(`Return date set to ${shortDate(end)} — lock-in phases updated`)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="concierge" subtitle={`${LOCATIONS[house.location].name} · Travel Mode ${s.location === 'auto' ? 'auto' : 'manual'}`} right={<button className="icon-btn" onClick={() => setNewTrip(true)} aria-label="New trip"><Icon name="plus" /></button>} />

      <DecoCard title="TRAVEL MODE">
        <Segmented<'auto' | LocationId>
          value={s.location}
          onChange={(location) => { s.update({ location }); toast(location === 'auto' ? 'Travel Mode follows your lock-in dates' : `Travel Mode: ${LOCATIONS[location].name}`) }}
          options={[{ value: 'auto', label: 'Auto' }, { value: 'melbourne', label: 'Home' }, { value: 'goldcoast', label: 'Gold Coast' }, { value: 'india', label: 'India' }]}
        />
        <p className="font-body text-[14px] text-[var(--ink-muted)] mt-2">Switches the time zone, habit set, Blueprint and skyline skin in one tap. Auto flips on the flight day.</p>
      </DecoCard>

      <div className="overflow-x-auto" data-noswipe>
        <div className="flex gap-2 w-max">
          {trips.map((t) => <button key={t.id} className={`chip ${t.id === trip.id ? 'on' : ''}`} onClick={() => setSel(t.id)}>{t.name}</button>)}
        </div>
      </div>

      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          <DecoCard title={trip.name.toUpperCase()}>
            <div className="text-center">
              <div className="font-display text-[30px] text-[var(--accent)]">{status}</div>
              <div className="font-num text-[14px] text-[var(--ink-muted)]">{shortDate(trip.start)} → {shortDate(trip.end)} · {len} days · {LOCATIONS[trip.location].name}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Field label="DEPART"><input type="date" className="deco-input w-full font-num" value={trip.start} onChange={(e) => save({ start: e.target.value })} /></Field>
              <Field label="RETURN (EARLY? CHANGE IT)"><input type="date" className="deco-input w-full font-num" value={trip.end} onChange={(e) => changeEnd(e.target.value)} /></Field>
            </div>
            <Field label="STAYING AT"><input className="deco-input w-full mt-1" defaultValue={trip.stay} key={trip.id + 'stay'} onBlur={(e) => save({ stay: e.target.value })} placeholder="Address, host, check-in time…" /></Field>
          </DecoCard>

          <DecoCard title="FLIGHTS">
            <ul>
              {trip.flights.map((f) => (
                <li key={f.id} className="list-row">
                  <Icon name="plane" size={18} className="text-[var(--accent)]" />
                  <div className="flex-1">
                    <div className="font-body text-[17px]">{f.label} · <span className="font-num">{f.number}</span></div>
                    <div className="font-num text-[13px] text-[var(--ink-muted)]">{shortDate(f.date)} {f.time} · {f.from} → {f.to}</div>
                  </div>
                  <button className="icon-btn" aria-label="Delete" onClick={() => save({ flights: trip.flights.filter((x) => x.id !== f.id) })}><Icon name="trash" size={14} /></button>
                </li>
              ))}
              {!trip.flights.length && <Empty>No flights saved yet.</Empty>}
            </ul>
            <button className="deco-btn ghost w-full mt-2" onClick={() => setFlightOpen(true)}>Add flight</button>
          </DecoCard>

          <DecoCard title="ITINERARY">
            <div className="flex gap-2">
              <input type="date" className="deco-input font-num w-[150px]" value={it.day} onChange={(e) => setIt({ ...it, day: e.target.value })} />
              <input className="deco-input flex-1 min-w-0" value={it.text} onChange={(e) => setIt({ ...it, text: e.target.value })} placeholder="Surfers Paradise, Burleigh…" />
              <button className="deco-btn px-3" aria-label="Add" onClick={() => { if (it.text.trim()) { save({ itinerary: [...trip.itinerary, { id: uid(), day: it.day, text: it.text.trim(), done: false }] }); setIt({ ...it, text: '' }) } }}><Icon name="plus" size={18} /></button>
            </div>
            <ul className="mt-2">
              {itinerary.map((x) => (
                <li key={x.id} className={`list-row ${x.done ? 'done' : ''}`}>
                  <button className={`mini-check ${x.done ? 'on' : ''}`} onClick={() => save({ itinerary: trip.itinerary.map((y) => (y.id === x.id ? { ...y, done: !y.done } : y)) })}>{x.done ? '✓' : ''}</button>
                  <span className="flex-1 font-body text-[16px]"><span className="font-num text-[var(--accent)] mr-2">{shortDate(x.day)}</span>{x.text}</span>
                  <button className="icon-btn" aria-label="Delete" onClick={() => save({ itinerary: trip.itinerary.filter((y) => y.id !== x.id) })}><Icon name="trash" size={14} /></button>
                </li>
              ))}
            </ul>
          </DecoCard>

          <DecoCard title="JET LAG"><JetLag trip={trip} /></DecoCard>
          <DecoCard title="RE-ENTRY PROTOCOL — THE WEEK AFTER">
            <Reentry trip={trip} />
          </DecoCard>
        </div>

        <div className="flex flex-col gap-5">
          <DecoCard title="PACKING">
            <Checklist
              items={trip.packing}
              onChange={(packing) => {
                const wasDone = trip.packing.length > 0 && trip.packing.every((p) => p.done)
                save({ packing })
                if (!wasDone && packing.length && packing.every((p) => p.done)) { win(); celebrate(); toast('Fully packed. Ready to fly.') }
              }}
              addPlaceholder="Add something to pack"
              template={trip.location === 'india' ? INDIA_PACKING : BEACH_PACKING}
            />
          </DecoCard>
          <DecoCard title="DOCUMENTS"><Checklist items={trip.docs} onChange={(docs) => save({ docs })} addPlaceholder="Add a document" /></DecoCard>
          <DecoCard title="SHARED COSTS"><Costs trip={trip} save={save} /></DecoCard>
          <DecoCard title="NOTES">
            <textarea className="deco-input w-full min-h-24" key={trip.id + 'notes'} defaultValue={trip.notes} onBlur={(e) => save({ notes: e.target.value })} placeholder="Restaurants to try, things to film, who to visit…" />
          </DecoCard>
          <button
            className="deco-btn ghost danger"
            onClick={async () => {
              await db.trips.delete(trip.id)
              toast(`Deleted ${trip.name}`, () => db.trips.put(trip))
              setSel(null)
            }}
          >
            Delete this trip
          </button>
        </div>
      </div>

      <Sheet open={flightOpen} onClose={() => setFlightOpen(false)} title="ADD FLIGHT">
        <FlightForm onSave={(f) => { save({ flights: [...trip.flights, f] }); setFlightOpen(false) }} defaultDate={trip.start} />
      </Sheet>
      <Sheet open={newTrip} onClose={() => setNewTrip(false)} title="NEW TRIP">
        <NewTrip onDone={(id) => { setSel(id); setNewTrip(false) }} today={house.today} />
      </Sheet>
    </div>
  )
}

function FlightForm({ onSave, defaultDate }: { onSave: (f: Trip['flights'][number]) => void; defaultDate: string }) {
  const [f, setF] = useState({ id: uid(), label: 'Outbound', date: defaultDate, time: '', number: '', from: 'MEL', to: '' })
  return (
    <div className="flex flex-col gap-3">
      <Segmented value={f.label} onChange={(label) => setF({ ...f, label })} options={[{ value: 'Outbound', label: 'Outbound' }, { value: 'Connection', label: 'Connection' }, { value: 'Return', label: 'Return' }]} />
      <div className="grid grid-cols-2 gap-2">
        <input type="date" className="deco-input font-num" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <input type="time" className="deco-input font-num" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
        <input className="deco-input font-num" value={f.number} onChange={(e) => setF({ ...f, number: e.target.value.toUpperCase() })} placeholder="Flight no. (JQ 440)" />
        <div className="flex gap-1 items-center">
          <input className="deco-input font-num w-full min-w-0" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value.toUpperCase() })} placeholder="MEL" />
          <span>→</span>
          <input className="deco-input font-num w-full min-w-0" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value.toUpperCase() })} placeholder="OOL" />
        </div>
      </div>
      <button className="deco-btn" onClick={() => onSave(f)}>Save flight</button>
    </div>
  )
}

function NewTrip({ onDone, today }: { onDone: (id: string) => void; today: string }) {
  const [t, setT] = useState({ name: '', location: 'goldcoast' as LocationId, start: today, end: addDays(today, 7) })
  return (
    <div className="flex flex-col gap-3">
      <input className="deco-input" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} placeholder="Trip name" autoFocus />
      <Segmented value={t.location} onChange={(location) => setT({ ...t, location })} options={(Object.keys(LOCATIONS) as LocationId[]).map((l) => ({ value: l, label: LOCATIONS[l].name }))} />
      <div className="grid grid-cols-2 gap-2">
        <input type="date" className="deco-input font-num" value={t.start} onChange={(e) => setT({ ...t, start: e.target.value })} />
        <input type="date" className="deco-input font-num" value={t.end} onChange={(e) => setT({ ...t, end: e.target.value })} />
      </div>
      <button
        className="deco-btn"
        onClick={async () => {
          if (!t.name.trim()) return
          const id = uid()
          await db.trips.add({ id, name: t.name.trim(), location: t.location, start: t.start, end: t.end, flights: [], stay: '', itinerary: [], packing: (t.location === 'india' ? INDIA_PACKING : BEACH_PACKING).map((p) => ({ ...p, id: uid() })), docs: [], costs: [], crew: ['Krishi'], notes: '', createdAt: Date.now() })
          onDone(id)
        }}
      >
        Create trip
      </button>
    </div>
  )
}

