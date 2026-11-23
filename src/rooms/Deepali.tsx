import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { DecoCard } from '../components/DecoCard'
import { Empty, Field, RoomHeader, Segmented, Stepper } from '../components/ui'
import { ListCard, addItem, removeItem, useItems } from '../components/ListCard'
import { AskAlfred, MediaBoard, Records } from '../components/Kit'
import { Icon } from '../components/Icon'
import { useHouse } from '../app/house'
import { useSettings } from '../store/settings'
import { useNow } from '../store/useClock'
import { toast } from '../store/ui'
import { addDays, dayNumber, daysBetween, formatTime, hmToMin, minToHm, prettyHm, shortDate, zonedParts } from '../lib/time'
import { LOCATIONS } from '../config/lockin'
import { nextOccurrence, useFollowUps } from '../lib/deepali'
import { DISTANCE_DATES, GIFT_LEAD_DAYS, HER_ZONES, LOCAL_DATES, MILESTONES, PROFILE_GROUPS, QUESTIONS, TOUCHES } from '../config/deepali'

// DEEPALI'S CORNER — everything about her and the two of you, in five tabs:
// TODAY (clocks, touches, calls, follow-ups) · HER (the dossier) · US (story, memories)
// PLANS (dates, Bali) · GIFTS (occasions with lead-time warnings, ideas, history).

const ROOM = 'deepali'

// ── Profile (kv `deepali:profile`) ───────────────────────────────────
export interface HerProfile {
  tz?: string
  wake?: string // HH:MM her time
  sleep?: string
  since?: string // together since, YYYY-MM-DD
  next?: string // next time you see each other
  [k: string]: string | undefined
}
const PROFILE_KEY = 'deepali:profile'
export function useProfile(): [HerProfile, (p: Partial<HerProfile>) => void] {
  const p = (useLiveQuery(() => db.kv.get(PROFILE_KEY), [])?.value as HerProfile | undefined) ?? {}
  const set = (patch: Partial<HerProfile>) => void db.kv.get(PROFILE_KEY).then((r) => db.kv.put({ key: PROFILE_KEY, value: { ...((r?.value as HerProfile) ?? {}), ...patch } }))
  return [p, set]
}
const herTzOf = (p: HerProfile) => p.tz || 'Australia/Melbourne'

/** Offset of a zone from UTC in hours, right now (handles daylight saving + half-hour zones). */
function offsetHours(tz: string, now: Date) {
  const z = zonedParts(now, tz)
  return (Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute) - Math.floor(now.getTime() / 60000) * 60000) / 3600000
}
const fmtH = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 || h === 24 ? 'am' : 'pm'}`
const inWindow = (min: number, from: number, to: number) => (from <= to ? min >= from && min < to : min >= from || min < to)

// ── TODAY ────────────────────────────────────────────────────────────

function HerClock({ name, p, set }: { name: string; p: HerProfile; set: (x: Partial<HerProfile>) => void }) {
  const now = useNow(30_000)
  const { timeZone, location, hour } = useHouse()
  const herTz = herTzOf(p)
  const diff = offsetHours(herTz, now) - offsetHours(timeZone, now)
  const wake = hmToMin(p.wake || '07:30')
  const sleep = hmToMin(p.sleep || '23:30')
  const her = zonedParts(now, herTz)
  const herMin = her.hour * 60 + her.minute
  const status = !inWindow(herMin, wake, sleep)
    ? { t: 'Probably asleep', c: 'var(--ink-muted)' }
    : inWindow(herMin, wake, wake + 60)
      ? { t: 'Just waking up — good-morning time', c: 'var(--accent)' }
      : inWindow(herMin, sleep - 60, sleep)
        ? { t: 'Winding down — good-night time', c: 'var(--accent)' }
        : { t: 'Awake', c: 'var(--ink)' }
  const hours = useMemo(
    () =>
      Array.from({ length: 24 }, (_, h) => {
        const hersMin = ((((h + diff) * 60) % 1440) + 1440) % 1440
        return h >= 8 && h < 23 && inWindow(hersMin, wake, sleep - 30)
      }),
    [diff, wake, sleep],
  )
  const windows: string[] = []
  let start = -1
  hours.forEach((ok, h) => {
    if (ok && start < 0) start = h
    if ((!ok || h === 23) && start >= 0) {
      windows.push(`${fmtH(start)}–${fmtH(ok ? 24 : h)}`)
      start = -1
    }
  })
  const [conv, setConv] = useState('21:00')
  const convMine = minToHm((((hmToMin(conv) - diff * 60) % 1440) + 1440) % 1440)
  const sameClock = Math.abs(diff) < 0.01
  const zoneLabel = HER_ZONES.find((z) => z.tz === herTz)?.label ?? herTz
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2 text-center">
        <div>
          <div className="field-label">YOU · {LOCATIONS[location].name.toUpperCase()}</div>
          <div className="font-num text-[26px]">{formatTime(now, timeZone)}</div>
        </div>
        <div>
          <div className="field-label">{name.toUpperCase()} · {zoneLabel.toUpperCase()}</div>
          <div className="font-num text-[26px]">{formatTime(now, herTz)}</div>
        </div>
      </div>
      <p className="font-body text-[16px] text-center" style={{ color: status.c }}>{status.t}{!sameClock && ` · she’s ${Math.abs(diff)} h ${diff > 0 ? 'ahead' : 'behind'}`}</p>
      {!sameClock && (
        <>
          <div className="tz-bar" aria-label="Good call hours">
            {hours.map((ok, h) => <span key={h} className={`${ok ? 'ok' : ''} ${h === hour ? 'now' : ''}`} title={fmtH(h)} />)}
          </div>
          <div className="flex justify-between font-num text-[11px] text-[var(--ink-muted)]"><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span></div>
          <p className="font-body text-[16px]">Good call windows (your time): <span className="text-[var(--accent)]">{windows.join(', ') || 'tight today — send a voice note'}</span></p>
          <div className="flex items-center gap-2 flex-wrap font-body text-[16px]">
            <span>When it’s</span>
            <input type="time" className="deco-input font-num w-[120px]" value={conv} onChange={(e) => e.target.value && setConv(e.target.value)} aria-label="Her time" />
            <span>for her, it’s <span className="text-[var(--accent)] font-num">{prettyHm(convMine)}</span> for you.</span>
          </div>
        </>
      )}
      {sameClock && location === 'melbourne' && <p className="font-body text-[16px]">Same city, same clock. Go see her.</p>}
      <details className="font-body text-[15px]">
        <summary className="cursor-pointer text-[var(--ink-muted)]">Her time zone + sleep hours</summary>
        <div className="flex flex-col gap-2 mt-2">
          <select className="deco-input" value={herTz} onChange={(e) => set({ tz: e.target.value })} aria-label="Her time zone">
            {HER_ZONES.map((z) => <option key={z.tz} value={z.tz}>{z.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <label><span className="field-label">SHE WAKES</span><input type="time" className="deco-input font-num w-full" value={p.wake || '07:30'} onChange={(e) => set({ wake: e.target.value })} /></label>
            <label><span className="field-label">SHE SLEEPS</span><input type="time" className="deco-input font-num w-full" value={p.sleep || '23:30'} onChange={(e) => set({ sleep: e.target.value })} /></label>
          </div>
        </div>
      </details>
    </div>
  )
}

function Together({ name, p, set }: { name: string; p: HerProfile; set: (x: Partial<HerProfile>) => void }) {
  const { today } = useHouse()
  const together = p.since ? daysBetween(p.since, today) : null
  const nextMs = together !== null ? MILESTONES.find((m) => m > together) : undefined
  const untilNext = p.next && p.next >= today ? daysBetween(today, p.next) : null
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 text-center gap-2">
        <div>
          <div className="font-display text-[34px] text-[var(--accent)]">{untilNext === null ? '—' : untilNext === 0 ? 'TODAY' : untilNext}</div>
          <div className="field-label">{untilNext === 0 ? `YOU SEE ${name.toUpperCase()}` : 'DAYS TILL YOU SEE HER'}</div>
        </div>
        <div>
          <div className="font-display text-[34px] text-[var(--accent)]">{together ?? '—'}</div>
          <div className="field-label">DAYS TOGETHER</div>
        </div>
      </div>
      {together !== null && nextMs && (
        <p className="font-body text-[15px] text-[var(--ink-muted)] text-center">
          Day {nextMs} is {shortDate(addDays(p.since!, nextMs))} — {nextMs - together} days away. {nextMs - together <= 14 ? 'Plan something.' : ''}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <label><span className="field-label">NEXT TIME TOGETHER</span><input type="date" className="deco-input font-num w-full" value={p.next ?? ''} onChange={(e) => set({ next: e.target.value })} /></label>
        <label><span className="field-label">TOGETHER SINCE</span><input type="date" className="deco-input font-num w-full" value={p.since ?? ''} onChange={(e) => set({ since: e.target.value })} /></label>
      </div>
    </div>
  )
}

const touchKey = (d: string) => `deepali:touch:${d}`
function Touches() {
  const { today } = useHouse()
  const rows = useLiveQuery(() => db.kv.where('key').startsWith('deepali:touch:').toArray(), []) ?? []
  const map = new Map(rows.map((r) => [r.key.slice(14), (r.value as string[]) ?? []]))
  const todays = map.get(today) ?? []
  let streak = 0
  let d = todays.length === TOUCHES.length ? today : addDays(today, -1)
  while ((map.get(d)?.length ?? 0) >= TOUCHES.length) {
    streak++
    d = addDays(d, -1)
  }
  const toggle = (id: string) => db.kv.put({ key: touchKey(today), value: todays.includes(id) ? todays.filter((x) => x !== id) : [...todays, id] })
  return (
    <div className="flex flex-col gap-1">
      {TOUCHES.map((t) => (
        <button key={t.id} className={`list-row w-full text-left ${todays.includes(t.id) ? 'done' : ''}`} onClick={() => toggle(t.id)}>
          <span className={`mini-check ${todays.includes(t.id) ? 'on' : ''}`}>{todays.includes(t.id) ? '✓' : ''}</span>
          <span className="flex-1 font-body text-[16px]">{t.label}</span>
        </button>
      ))}
      <p className="font-body text-[14px] text-[var(--ink-muted)] mt-1">{todays.length}/{TOUCHES.length} today{streak ? ` · ${streak}-day streak of all three` : ''}. Small, daily, consistent beats big and rare.</p>
    </div>
  )
}

const CALL_TYPES = ['Call', 'Video', 'Voice notes', 'In person']
function CallLog() {
  const { today, away } = useHouse()
  const calls = useItems(ROOM, 'call').sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || b.at - a.at)
  const [mins, setMins] = useState(30)
  const [type, setType] = useState(away ? 'Call' : 'In person')
  const [note, setNote] = useState('')
  const last = calls[0]
  const since = last?.date ? daysBetween(last.date, today) : null
  const week = calls.filter((c) => c.date && daysBetween(c.date, today) < 7)
  return (
    <div className="flex flex-col gap-3">
      <p className="font-body text-[16px] text-[var(--ink-muted)]">
        {last ? (
          <>
            Last: <span className={since !== null && since >= 2 && away ? 'text-[var(--danger,#e07a6a)]' : 'text-[var(--ink)]'}>{since === 0 ? 'today' : since === 1 ? 'yesterday' : `${since} days ago`}</span> · {week.length} this week / {week.reduce((a, c) => a + (c.num ?? 0), 0)} min
          </>
        ) : (
          'Nothing logged yet.'
        )}
      </p>
      <div className="flex flex-wrap gap-2">{CALL_TYPES.map((t) => <button key={t} className={`chip ${type === t ? 'on' : ''}`} onClick={() => setType(t)}>{t}</button>)}</div>
      <div className="flex gap-2 items-center">
        <Stepper value={mins} onChange={setMins} step={5} min={5} suffix="min" />
        <input className="deco-input flex-1 min-w-0" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you talked about" />
      </div>
      <button className="deco-btn" onClick={async () => { await addItem(ROOM, 'call', { text: type, sub: note.trim() || undefined, date: today, num: mins }); setNote(''); toast('Logged') }}>Log it</button>
      <ul>
        {calls.slice(0, 5).map((c) => (
          <li key={c.id} className="list-row">
            <span className="font-num text-[13px] text-[var(--accent)] w-16">{c.date ? shortDate(c.date) : ''}</span>
            <span className="flex-1 font-body text-[15px] min-w-0">{c.text.replace(/^\d+ min call$/, 'Call')} · {c.num} min{c.sub ? ` · ${c.sub}` : ''}</span>
            <button className="icon-btn" aria-label="Delete" onClick={() => removeItem(c)}><Icon name="trash" size={14} /></button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FollowUps() {
  const { today } = useHouse()
  const due = useFollowUps(today)
  const promises = useItems(ROOM, 'promise').filter((p) => !p.done)
  if (!due.length && !promises.length) return <Empty>Nothing to follow up. Add her exams, interviews and big days under HER — the day after, this card reminds you to ask how it went.</Empty>
  return (
    <ul>
      {due.map((e) => (
        <li key={e.id} className="list-row">
          <button className="mini-check" aria-label="Asked" onClick={() => db.items.update(e.id, { done: true })} />
          <span className="flex-1 font-body text-[16px]">Ask how <b>{e.text}</b> went{e.sub ? ` — ${e.sub}` : ''}</span>
          <span className="font-num text-[12px] text-[var(--ink-muted)]">{e.date === today ? 'today' : shortDate(e.date!)}</span>
        </li>
      ))}
      {promises.map((pr) => (
        <li key={pr.id} className="list-row">
          <button className="mini-check" aria-label="Kept" onClick={() => db.items.update(pr.id, { done: true })} />
          <span className="flex-1 font-body text-[16px]">You promised: {pr.text}</span>
        </li>
      ))}
    </ul>
  )
}

function Question() {
  const { today } = useHouse()
  const [n, setN] = useState(0)
  const q = QUESTIONS[(dayNumber(today) + n) % QUESTIONS.length]
  return (
    <div className="flex flex-col gap-3 text-center">
      <p className="font-display text-[20px] leading-snug">“{q}”</p>
      <button className="deco-btn ghost" onClick={() => setN(n + 1)}>Another one</button>
    </div>
  )
}

function TodayTab({ name, p, set }: { name: string; p: HerProfile; set: (x: Partial<HerProfile>) => void }) {
  return (
    <div className="bp-layout">
      <div className="flex flex-col gap-5">
        <DecoCard title="HER CLOCK"><HerClock name={name} p={p} set={set} /></DecoCard>
        <DecoCard title="COUNTDOWN"><Together name={name} p={p} set={set} /></DecoCard>
        <DecoCard title="TODAY’S THREE TOUCHES"><Touches /></DecoCard>
      </div>
      <div className="flex flex-col gap-5">
        <DecoCard title="FOLLOW UP"><FollowUps /></DecoCard>
        <DecoCard title="QUESTION FOR TONIGHT"><Question /></DecoCard>
        <DecoCard title="CALLS + TIME TOGETHER"><CallLog /></DecoCard>
      </div>
    </div>
  )
}

// ── HER ──────────────────────────────────────────────────────────────

function Dossier({ p, set }: { p: HerProfile; set: (x: Partial<HerProfile>) => void }) {
  const all = PROFILE_GROUPS.flatMap((g) => g.fields)
  const filled = all.filter((f) => p[f.key]?.trim()).length
  const [open, setOpen] = useState<string | null>(PROFILE_GROUPS[0].title)
  return (
    <div className="flex flex-col gap-3">
      <p className="font-body text-[15px] text-[var(--ink-muted)]">{filled}/{all.length} filled. The things a great partner just <i>knows</i> — ALFRED uses these for gift and date ideas.</p>
      <div className="h-[6px] bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]"><div className="h-full bg-[var(--accent)]" style={{ width: `${(filled / all.length) * 100}%` }} /></div>
      {PROFILE_GROUPS.map((g) => (
        <div key={g.title}>
          <button className="list-row w-full text-left" onClick={() => setOpen(open === g.title ? null : g.title)}>
            <span className="flex-1 font-deco text-[12px] tracking-[0.2em]">{g.title}</span>
            <span className="font-num text-[12px] text-[var(--ink-muted)]">{g.fields.filter((f) => p[f.key]?.trim()).length}/{g.fields.length}</span>
            <Icon name="chevron" size={14} />
          </button>
          {open === g.title && (
            <div className="flex flex-col gap-2 py-2">
              {g.fields.map((f) => (
                <label key={f.key} className="block">
                  <span className="field-label">{f.label.toUpperCase()}</span>
                  {f.long ? (
                    <textarea className="deco-input w-full" rows={3} defaultValue={p[f.key] ?? ''} placeholder={f.hint} onBlur={(e) => e.target.value !== (p[f.key] ?? '') && set({ [f.key]: e.target.value })} />
                  ) : (
                    <input className="deco-input w-full" defaultValue={p[f.key] ?? ''} placeholder={f.hint} onBlur={(e) => e.target.value !== (p[f.key] ?? '') && set({ [f.key]: e.target.value })} />
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function HerTab({ name, p, set }: { name: string; p: HerProfile; set: (x: Partial<HerProfile>) => void }) {
  const update = useSettings((s) => s.update)
  return (
    <div className="bp-layout">
      <div className="flex flex-col gap-5">
        <DecoCard title={`THE ${name.toUpperCase()} FILE`}><Dossier p={p} set={set} /></DecoCard>
        <Field label="HER NAME (AS SHOWN IN THE APP)">
          <input className="deco-input w-full" defaultValue={name} onBlur={(e) => update({ deepaliName: e.target.value.trim() || 'Deepali' })} />
        </Field>
      </div>
      <div className="flex flex-col gap-5">
        <DecoCard title="HER BIG DAYS">
          <p className="font-body text-[14px] text-[var(--ink-muted)] mb-2">Exams, interviews, shifts, a hard appointment. The day it happens, TODAY reminds you to ask how it went.</p>
          <ListCard room={ROOM} kind="herevent" placeholder="Pharmacology exam, job interview…" subPlaceholder="What to ask / say" withDate checkable empty="Nothing coming up for her." />
        </DecoCard>
        <DecoCard title="THINGS SHE’S MENTIONED"><ListCard room={ROOM} kind="mentioned" placeholder="That café, the perfume she liked…" empty="Write them down the moment she says them — this is where great gifts come from." /></DecoCard>
        <DecoCard title="HER PEOPLE">
          <Records
            room={ROOM}
            kind="herpeople"
            titleLabel="Person"
            fields={[
              { key: 'relation', label: 'Who they are', type: 'text', show: true },
              { key: 'date', label: 'Birthday', type: 'date', show: true },
              { key: 'notes', label: 'Remember', type: 'long' },
            ]}
            empty="Her mum, sister, best friends — names, birthdays, what to remember before you meet them."
          />
        </DecoCard>
        <DecoCard title="PROMISES YOU’VE MADE"><ListCard room={ROOM} kind="promise" placeholder="“I’ll take you to that ramen place”" checkable empty="She remembers every one. Now so do you." /></DecoCard>
      </div>
    </div>
  )
}

// ── US ───────────────────────────────────────────────────────────────

function OnThisDay() {
  const { today } = useHouse()
  const moments = useItems(ROOM, 'moment').filter((m) => m.date && m.date.slice(5) === today.slice(5) && m.date < today)
  if (!moments.length) return null
  return (
    <DecoCard title="ON THIS DAY">
      {moments.map((m) => <p key={m.id} className="font-body text-[16px]">{Number(today.slice(0, 4)) - Number(m.date!.slice(0, 4))} year(s) ago: {m.text}</p>)}
    </DecoCard>
  )
}

function UsTab() {
  return (
    <div className="bp-layout">
      <div className="flex flex-col gap-5">
        <OnThisDay />
        <DecoCard title="MEMORIES"><MediaBoard room={ROOM} kind="memory" empty="Photos of the two of you." /></DecoCard>
        <DecoCard title="FIRSTS + MOMENTS"><ListCard room={ROOM} kind="moment" placeholder="First date, first “I love you”…" subPlaceholder="Where / the detail you’ll forget" withDate empty="Write your story down — dates included, so ON THIS DAY can bring them back." /></DecoCard>
        <DecoCard title="REASONS I LOVE HER"><ListCard room={ROOM} kind="reason" placeholder="The way she…" empty="Add one a week. On a bad day, read her the list." /></DecoCard>
      </div>
      <div className="flex flex-col gap-5">
        <DecoCard title="OUR BUCKET LIST"><ListCard room={ROOM} kind="bucket" placeholder="See the northern lights, Europe trip…" checkable empty="Things to do together, one day." /></DecoCard>
        <DecoCard title="INSIDE JOKES + NICKNAMES"><ListCard room={ROOM} kind="joke" placeholder="The joke" subPlaceholder="Where it came from" empty="So they never get lost." /></DecoCard>
        <DecoCard title="AFTER A FIGHT">
          <p className="font-body text-[14px] text-[var(--ink-muted)] mb-2">Private. What happened and what you learned, so the same fight doesn’t happen twice.</p>
          <ListCard room={ROOM} kind="repair" placeholder="What it was about" subPlaceholder="What I learned / what she needed" withDate empty="Hopefully stays empty." />
        </DecoCard>
      </div>
    </div>
  )
}

// ── PLANS ────────────────────────────────────────────────────────────

function SurpriseMe() {
  const { away } = useHouse()
  const mine = useItems(ROOM, 'dateidea').filter((d) => !d.done)
  const [mode, setMode] = useState<'distance' | 'local'>(away ? 'distance' : 'local')
  const [pick, setPick] = useState<string | null>(null)
  const pool = [...(mode === 'distance' ? DISTANCE_DATES : LOCAL_DATES), ...mine.map((m) => m.text)]
  return (
    <div className="flex flex-col gap-3">
      <Segmented value={mode} onChange={(v) => { setMode(v); setPick(null) }} options={[{ value: 'distance', label: 'Long-distance' }, { value: 'local', label: 'In person' }]} />
      <div className="slot"><p className="font-display text-[20px] text-center">{pick ?? 'Tap for tonight’s date.'}</p></div>
      <div className="grid grid-cols-2 gap-2">
        <button className="deco-btn" onClick={() => setPick(pool[Math.floor(Math.random() * pool.length)])}>Surprise me</button>
        <button className="deco-btn ghost" disabled={!pick || mine.some((m) => m.text === pick)} onClick={async () => { await addItem(ROOM, 'dateidea', { text: pick! }); toast('Saved to your ideas') }}>Save idea</button>
      </div>
    </div>
  )
}

function PlansTab({ name, p }: { name: string; p: HerProfile }) {
  const { away, today } = useHouse()
  const mentioned = useItems(ROOM, 'mentioned')
  const past = useItems(ROOM, 'datelog')
  return (
    <div className="bp-layout">
      <div className="flex flex-col gap-5">
        <DecoCard title="DATE NIGHT"><SurpriseMe /></DecoCard>
        <DecoCard title="ASK ALFRED">
          <AskAlfred
            label="Plan our next date"
            build={() =>
              `Plan one specific, memorable date for me and my girlfriend ${name}. ${away ? `We're long-distance right now (she's in ${HER_ZONES.find((z) => z.tz === herTzOf(p))?.label ?? 'Melbourne'}), so it must work over video call or be something I arrange to her door.` : 'We are both in Melbourne.'} Today is ${today}. What I know about her: ${profileSummary(p)}. Things she's mentioned: ${mentioned.map((m) => m.text).join('; ') || 'none logged'}. Dates we've done (avoid repeats): ${past.map((d) => d.text).join('; ') || 'none logged'}. Give: the plan, timing, rough cost in AUD, and the one detail that will make her feel seen. Keep it under 150 words.`
            }
          />
        </DecoCard>
        <DecoCard title="MY DATE IDEAS"><ListCard room={ROOM} kind="dateidea" placeholder="Rooftop dinner, pottery class…" checkable empty="Your own ideas — Surprise me draws from these too." /></DecoCard>
      </div>
      <div className="flex flex-col gap-5">
        <DecoCard title="DATES WE’VE BEEN ON">
          <Records
            room={ROOM}
            kind="datelog"
            titleLabel="Date"
            fields={[
              { key: 'date', label: 'When', type: 'date', show: true },
              { key: 'rating', label: 'How it went', type: 'select', options: ['★★★★★', '★★★★', '★★★', '★★', '★'], show: true },
              { key: 'notes', label: 'What made it good (or not)', type: 'long' },
            ]}
            sort={(a, b) => (b.date ?? '').localeCompare(a.date ?? '')}
            empty="Log your dates — you’ll learn what she loves most."
          />
        </DecoCard>
        <DecoCard title="BALI — MID 2027"><ListCard room={ROOM} kind="bali" placeholder="Ubud, Uluwatu, budget, flights…" checkable /></DecoCard>
      </div>
    </div>
  )
}

// ── GIFTS ────────────────────────────────────────────────────────────

function Occasions() {
  const { today, away } = useHouse()
  const lead = away ? GIFT_LEAD_DAYS.away : GIFT_LEAD_DAYS.home
  const dates = useItems(ROOM, 'special')
  const rows = dates
    .filter((d) => d.date)
    .map((d) => {
      const occ = nextOccurrence(d.date!, today)
      const k = `sorted:${occ.slice(0, 4)}`
      return { d, occ, k, days: daysBetween(today, occ), sorted: !!d.meta?.[k] }
    })
    .sort((a, b) => a.days - b.days)
  const toggle = (r: (typeof rows)[number]) => db.items.update(r.d.id, { meta: { ...r.d.meta, [r.k]: !r.sorted } })
  return (
    <div className="flex flex-col gap-3">
      {rows.slice(0, 5).map((r) => (
        <div key={r.d.id} className="list-row">
          <button className={`mini-check ${r.sorted ? 'on' : ''}`} aria-label="Gift sorted" onClick={() => toggle(r)}>{r.sorted ? '✓' : ''}</button>
          <span className="flex-1 min-w-0">
            <span className="block font-body text-[17px]">{r.d.text}</span>
            <span className={`block font-body text-[13px] ${!r.sorted && r.days <= lead ? 'text-[var(--accent)]' : 'text-[var(--ink-muted)]'}`}>
              {r.sorted ? 'Gift sorted ✓' : r.days <= lead ? `Sort the gift now${away ? ' — overseas delivery takes time' : ''}` : 'Tick when the gift is sorted'}
            </span>
          </span>
          <span className="font-num text-[var(--accent)]">{r.days === 0 ? 'TODAY' : `${r.days} d`}</span>
        </div>
      ))}
      <ListCard room={ROOM} kind="special" placeholder="Her birthday, anniversary, Valentine’s…" withDate empty="Add the dates that matter — they repeat every year, and warn you early." />
    </div>
  )
}

function GiftsTab({ name, p }: { name: string; p: HerProfile }) {
  const { today, away } = useHouse()
  const mentioned = useItems(ROOM, 'mentioned')
  const given = useItems(ROOM, 'given')
  const occasions = useItems(ROOM, 'special')
  const [budget, setBudget] = useState(80)
  const [msg, setMsg] = useState('')
  const upcoming = occasions
    .filter((d) => d.date)
    .map((d) => ({ d, occ: nextOccurrence(d.date!, today) }))
    .sort((a, b) => a.occ.localeCompare(b.occ))[0]
  return (
    <div className="bp-layout">
      <div className="flex flex-col gap-5">
        <DecoCard title="OCCASIONS"><Occasions /></DecoCard>
        <DecoCard title="ASK ALFRED FOR GIFT IDEAS">
          <div className="flex items-center gap-2 mb-3"><span className="field-label !mb-0">BUDGET</span><Stepper value={budget} onChange={setBudget} step={10} min={10} suffix="AUD" /></div>
          <AskAlfred
            label="Find the perfect gift"
            build={() =>
              `Suggest 5 specific gift ideas for my girlfriend ${name}, budget about ${budget} AUD${upcoming ? ` for ${upcoming.d.text} on ${upcoming.occ}` : ''}. ${away ? `I'm overseas (not in Melbourne), so each idea must be orderable for delivery to her in ${HER_ZONES.find((z) => z.tz === herTzOf(p))?.label ?? 'Melbourne'} — name the shop.` : 'We are both in Melbourne.'} What I know: ${profileSummary(p)}. Things she's mentioned: ${mentioned.map((m) => m.text).join('; ') || 'none'}. Gifts I've already given (don't repeat): ${given.map((g) => g.text).join('; ') || 'none'}. One line each: the gift, where to get it, and why it fits her.`
            }
          />
        </DecoCard>
        <DecoCard title="GIFT IDEAS"><ListCard room={ROOM} kind="gift" placeholder="Gift idea" subPlaceholder="Why / where to get it" checkable /></DecoCard>
      </div>
      <div className="flex flex-col gap-5">
        <DecoCard title="HELP ME SAY IT">
          <textarea className="deco-input w-full mb-2" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="A birthday card, an apology, a good-luck text before her exam, a letter for the plane…" />
          <AskAlfred
            label="Write it with me"
            build={() =>
              msg.trim()
                ? `Help me write this for my girlfriend ${name}: ${msg.trim()}. Write it in my voice — warm, a little funny, not cheesy, Australian-Indian 20-year-old, no clichés. Use real details where they fit: ${profileSummary(p)}. Give one version, then one shorter text-message version.`
                : (toast('Say what it’s for first'), null)
            }
          />
        </DecoCard>
        <DecoCard title="SEND SOMETHING">
          <ListCard room={ROOM} kind="send" placeholder="Voice note, flowers, a meme, a letter…" withDate checkable empty="Little reminders to send something while you’re away." />
        </DecoCard>
        <DecoCard title="GIFTS GIVEN">
          <ListCard room={ROOM} kind="given" placeholder="What you gave" subPlaceholder="The occasion · how she liked it" withDate empty="Your history — so you never repeat yourself." />
        </DecoCard>
      </div>
    </div>
  )
}

/** Short summary of the dossier for ALFRED prompts. */
export function profileSummary(p: HerProfile) {
  const parts = PROFILE_GROUPS.flatMap((g) => g.fields)
    .filter((f) => p[f.key]?.trim())
    .map((f) => `${f.label}: ${p[f.key]!.trim()}`)
  return parts.length ? parts.join('; ') : 'not much filled in yet'
}

// ── Room ─────────────────────────────────────────────────────────────

type Tab = 'today' | 'her' | 'us' | 'plans' | 'gifts'
const TAB_KEY = 'gharana:deepaliTab'

export function DeepaliCorner() {
  const name = useSettings((s) => s.deepaliName)
  const { away, today } = useHouse()
  const [p, set] = useProfile()
  const [tab, setTab] = useState<Tab>(() => {
    try {
      return (localStorage.getItem(TAB_KEY) as Tab) || 'today'
    } catch {
      return 'today'
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab)
    } catch {
      /* private mode */
    }
  }, [tab])
  const untilNext = p.next && p.next >= today ? daysBetween(today, p.next) : null
  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="deepali" subtitle={untilNext !== null ? (untilNext === 0 ? `You see ${name} today` : `${untilNext} days till you see ${name}`) : away ? 'Long-distance mode · keep her close' : 'Everything about her, and the two of you'} />
      <div className="overflow-x-auto -mx-1 px-1">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'today', label: 'Today' }, { value: 'her', label: 'Her' }, { value: 'us', label: 'Us' }, { value: 'plans', label: 'Plans' }, { value: 'gifts', label: 'Gifts' }]} />
      </div>
      {tab === 'today' && <TodayTab name={name} p={p} set={set} />}
      {tab === 'her' && <HerTab name={name} p={p} set={set} />}
      {tab === 'us' && <UsTab />}
      {tab === 'plans' && <PlansTab name={name} p={p} />}
      {tab === 'gifts' && <GiftsTab name={name} p={p} />}
    </div>
  )
}

