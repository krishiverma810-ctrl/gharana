import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DecoCard } from '../components/DecoCard'
import { Empty, Field, RoomHeader, Segmented, Sheet, Stamp, Stepper } from '../components/ui'
import { Icon } from '../components/Icon'
import { ListCard } from '../components/ListCard'
import { LineChart, MediaBoard, NotesPad, Records, addItem, fileToDataUrl, useItems } from '../components/Kit'
import { addProtein, db, uid, updateDay } from '../db/db'
import { setHabitValue, useDay } from '../db/hooks'
import { useHouse } from '../app/house'
import { useSettings } from '../store/settings'
import { celebrate, toast } from '../store/ui'
import { useTrophies } from '../store/trophies'
import { win } from '../lib/sound'
import { addDays, daysBetween, dayNumber, shortDate } from '../lib/time'
import { shareCard } from '../lib/sharecard'
import { titleFor } from '../lib/stats'
import { ACHIEVEMENTS } from '../config/achievements'
import { SOCIAL_REPS, SOHBAT } from '../config/people'
import { QUICK_FOODS, VEG_IDEAS } from '../config/food'
import type { Challenge, Circle, Person } from '../db/types'

// PHASE 4 — THE FULL HOUSE
const idx = (n: number, len: number) => ((n % len) + len) % len

// ══ MEHFIL ════════════════════════════════════════════════════════════

const CIRCLES: { id: Circle; name: string }[] = [
  { id: 'family', name: 'FAMILY' },
  { id: 'partner', name: 'PARTNER' },
  { id: 'mates', name: 'THE BOYS' },
  { id: 'mentors', name: 'MENTORS' },
  { id: 'work', name: 'WORK + NETWORK' },
]

function nextBirthday(b: string | undefined, today: string): number | null {
  if (!b) return null
  const md = b.slice(5)
  let occ = `${today.slice(0, 4)}-${md}`
  if (occ < today) occ = `${Number(today.slice(0, 4)) + 1}-${md}`
  return daysBetween(today, occ)
}

async function logContact(p: Person, today: string, how = 'Caught up') {
  const before = { ...p }
  await db.people.update(p.id, { lastContact: today })
  const it = await addItem('mehfil', 'contact', { text: how, sub: p.name, date: today, meta: { personId: p.id } })
  toast(`${p.name} — logged`, async () => {
    await db.people.put(before)
    await db.items.delete(it.id)
  })
}

function PersonSheet({ person, onClose }: { person: Person | 'new'; onClose: () => void }) {
  const { today } = useHouse()
  const [p, setP] = useState<Person>(person === 'new' ? { id: uid(), name: '', relation: '', circle: 'mates', freqDays: 14, order: Date.now() } : person)
  const up = (x: Partial<Person>) => setP((v) => ({ ...v, ...x }))
  const history = useItems('mehfil', 'contact').filter((c) => c.meta?.personId === p.id).sort((a, b) => b.at - a.at)
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="NAME"><input className="deco-input w-full" value={p.name} onChange={(e) => up({ name: e.target.value })} autoFocus={person === 'new'} /></Field>
        <Field label="WHO THEY ARE"><input className="deco-input w-full" value={p.relation} onChange={(e) => up({ relation: e.target.value })} /></Field>
      </div>
      <Field label="CIRCLE"><div className="flex flex-wrap gap-2">{CIRCLES.map((c) => <button key={c.id} className={`chip ${p.circle === c.id ? 'on' : ''}`} onClick={() => up({ circle: c.id })}>{c.name}</button>)}</div></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="CHECK IN EVERY (DAYS)"><Stepper value={p.freqDays} onChange={(freqDays) => up({ freqDays })} min={1} max={90} /></Field>
        <Field label="BIRTHDAY"><input type="date" className="deco-input w-full font-num" value={p.birthday ?? ''} onChange={(e) => up({ birthday: e.target.value || undefined })} /></Field>
      </div>
      <Field label="WHAT’S GOING ON WITH THEM"><textarea className="deco-input w-full" rows={2} value={p.going ?? ''} onChange={(e) => up({ going: e.target.value })} placeholder="Exams, new job, family stuff…" /></Field>
      <Field label="GIFT IDEAS"><input className="deco-input w-full" value={p.gifts ?? ''} onChange={(e) => up({ gifts: e.target.value })} /></Field>
      <Field label="NOTES"><textarea className="deco-input w-full" rows={2} value={p.notes ?? ''} onChange={(e) => up({ notes: e.target.value })} /></Field>
      <div className="flex gap-2">
        <button className="deco-btn flex-1" onClick={async () => { if (!p.name.trim()) return; await db.people.put(p); onClose() }}>Save</button>
        {person !== 'new' && <button className="deco-btn ghost" onClick={async () => { await db.people.put(p); await logContact(p, today); onClose() }}>Talked today</button>}
        {person !== 'new' && <button className="deco-btn ghost danger" onClick={async () => { await db.people.delete(p.id); toast(`${p.name} removed`, () => db.people.put(p)); onClose() }}>Remove</button>}
      </div>
      {history.length > 0 && (
        <div>
          <div className="field-label">HISTORY</div>
          {history.slice(0, 8).map((h) => <div key={h.id} className="font-body text-[15px]"><span className="font-num text-[12px] text-[var(--accent)] mr-2">{h.date ? shortDate(h.date) : ''}</span>{h.text}</div>)}
        </div>
      )}
    </div>
  )
}

function SocialRep() {
  const { today } = useHouse()
  const level = useSettings((s) => s.socialLevel)
  const update = useSettings((s) => s.update)
  const reps = useItems('mehfil', 'rep')
  const pool = SOCIAL_REPS.filter((r) => r.level === level)
  const rep = pool[idx(dayNumber(today), pool.length)]
  const doneToday = reps.some((r) => r.date === today)
  const atLevel = reps.filter((r) => Number(r.meta?.level) === level).length
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-deco text-[11px] tracking-[0.3em] text-[var(--accent)]">LEVEL {level} · {['', 'EASY', 'WARMING UP', 'BOLD', 'BRAVE', 'FEARLESS'][level]}</span>
        <span className="font-num text-[12px] text-[var(--ink-muted)]">{atLevel}/8 to level up</span>
      </div>
      <p className="font-display text-[20px] leading-snug">{rep.text}</p>
      {doneToday ? (
        <p className="font-body text-[16px] text-[var(--accent)]">Done today ✓ — that’s a rep.</p>
      ) : (
        <button className="deco-btn" onClick={async () => { await addItem('mehfil', 'rep', { text: rep.text, date: today, meta: { level } }); win(); toast('Rep logged. Confidence is just evidence.') }}>I did it</button>
      )}
      {atLevel >= 8 && level < 5 && <button className="deco-btn ghost" onClick={() => { update({ socialLevel: level + 1 }); celebrate(); toast(`Level ${level + 1} unlocked`) }}>Level up → {level + 1}</button>}
      {level > 1 && <button className="chip self-start" onClick={() => update({ socialLevel: level - 1 })}>Step down a level</button>}
    </div>
  )
}

export function Mehfil() {
  const { today } = useHouse()
  const people = useLiveQuery(() => db.people.orderBy('order').toArray(), []) ?? []
  const [edit, setEdit] = useState<Person | 'new' | null>(null)
  // Nobody starts cold: until you log a first check-in, a person just isn't tracked yet.
  const status = (p: Person) => {
    const d = p.lastContact ? daysBetween(p.lastContact, today) : 999
    const tracked = !!p.lastContact
    return { d, cold: tracked && d > p.freqDays, warm: tracked && d > p.freqDays * 0.7 && d <= p.freqDays }
  }
  const cold = people.filter((p) => status(p).cold)
  const birthdays = people.map((p) => ({ p, n: nextBirthday(p.birthday, today) })).filter((x) => x.n !== null && x.n <= 30).sort((a, b) => a.n! - b.n!)
  const line = SOHBAT[idx(dayNumber(today), SOHBAT.length)]
  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="mehfil" subtitle={`${people.length} in the circle · ${cold.length} gone cold`} right={<button className="icon-btn" onClick={() => setEdit('new')} aria-label="Add person"><Icon name="plus" /></button>} />
      <DecoCard><p className="font-body italic text-[19px] text-center">“{line}”</p><p className="font-deco text-[10px] tracking-[0.3em] text-[var(--accent)] text-center mt-2">SOHBAT</p></DecoCard>
      {(cold.length > 0 || birthdays.length > 0) && (
        <DecoCard title="NEEDS YOU">
          {birthdays.map(({ p, n }) => <div key={p.id} className="font-body text-[17px]">🎂 {p.name}’s birthday {n === 0 ? <b className="text-[var(--accent)]">TODAY</b> : `in ${n} days`}{p.gifts ? <span className="text-[var(--ink-muted)]"> · gift idea: {p.gifts}</span> : null}</div>)}
          {cold.map((p) => (
            <div key={p.id} className="list-row">
              <span className="flex-1 font-body text-[17px]">❄ {p.name} <span className="text-[var(--ink-muted)] text-[14px]">· {status(p).d > 500 ? 'never logged' : `${status(p).d} days`}</span></span>
              <button className="chip" onClick={() => logContact(p, today)}>Talked today</button>
            </div>
          ))}
        </DecoCard>
      )}
      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          {CIRCLES.map((c) => {
            const list = people.filter((p) => p.circle === c.id)
            if (!list.length) return null
            return (
              <DecoCard key={c.id} title={c.name}>
                <div className="people-grid">
                  {list.map((p) => {
                    const st = status(p)
                    return (
                      <div key={p.id} className={`person ${st.cold ? 'cold' : st.warm ? 'warm' : ''}`}>
                        <button className="text-left w-full" onClick={() => setEdit(p)}>
                          <div className="font-display text-[19px] leading-tight">{p.name}</div>
                          <div className="font-body text-[13px] text-[var(--ink-muted)] truncate">{p.relation}</div>
                          <div className="font-num text-[11px] mt-1">{st.d > 500 ? "tap ✓ next time you talk" : st.d === 0 ? "today" : `${st.d}d ago`} · every {p.freqDays}d</div>
                          {p.going && <div className="font-body text-[13px] mt-1 line-clamp-2">↳ {p.going}</div>}
                        </button>
                        <button className="mini-btn w-full mt-2" onClick={() => logContact(p, today)}>✓ Talked</button>
                      </div>
                    )
                  })}
                </div>
              </DecoCard>
            )
          })}
        </div>
        <div className="flex flex-col gap-5">
          <DecoCard title="TODAY’S SOCIAL REP"><SocialRep /></DecoCard>
          <DecoCard title="RECENT CHECK-INS">
            <ul>{useItems('mehfil', 'contact').sort((a, b) => b.at - a.at).slice(0, 8).map((c) => <li key={c.id} className="font-body text-[15px]"><span className="font-num text-[12px] text-[var(--accent)] mr-2">{c.date ? shortDate(c.date) : ''}</span>{c.sub} — {c.text}</li>)}</ul>
          </DecoCard>
        </div>
      </div>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'ADD TO THE CIRCLE' : edit ? edit.name.toUpperCase() : ''}>
        {edit && <PersonSheet person={edit} onClose={() => setEdit(null)} />}
      </Sheet>
    </div>
  )
}

// ══ THE MENTOR'S STUDY ════════════════════════════════════════════════

export function MentorStudy() {
  const { today } = useHouse()
  const day = useDay(today)
  const recent = useLiveQuery(() => db.days.where('day').between(addDays(today, -13), today, true, true).toArray(), [today]) ?? []
  const letters = useItems('mentor', 'letter').sort((a, b) => b.at - a.at)
  const [writing, setWriting] = useState(false)
  const proud = day.proud ?? day.night?.proud
  const setProud = (v: boolean) => updateDay(today, (d) => { d.proud = v })
  const sections = [
    { k: 'career', t: 'CAREER — THE DENTIST' },
    { k: 'body', t: 'BODY — THE BUILD' },
    { k: 'aesthetics', t: 'AESTHETICS — THE LOOK' },
    { k: 'relationships', t: 'RELATIONSHIPS — THE FAMILY MAN' },
    { k: 'money', t: 'MONEY — FREEDOM + THE GARAGE' },
  ]
  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="mentor" subtitle="Future self at 30 — the man you needed at 14" />
      <DecoCard title="WOULD 30-YEAR-OLD ME BE PROUD OF TODAY?">
        <div className="grid grid-cols-2 gap-2">
          <button className={`deco-btn ${proud === true ? '' : 'ghost'}`} onClick={() => setProud(true)}>Yes</button>
          <button className={`deco-btn ${proud === false ? '' : 'ghost'}`} onClick={() => setProud(false)}>Not yet</button>
        </div>
        <div className="flex gap-1 mt-3 justify-center" aria-label="Last 14 days">
          {Array.from({ length: 14 }, (_, i) => addDays(today, i - 13)).map((d) => {
            const r = recent.find((x) => x.day === d)
            const v = r?.proud ?? r?.night?.proud
            return <span key={d} title={d} className={`proud-dot ${v === true ? 'yes' : v === false ? 'no' : ''}`} />
          })}
        </div>
      </DecoCard>
      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          {sections.map((s) => (
            <DecoCard key={s.k} title={s.t}>
              <NotesPad k={`mentor-${s.k}`} rows={5} placeholder="Who is he at 30? What does his day look like? What did he do at 20 to get there?" />
            </DecoCard>
          ))}
        </div>
        <div className="flex flex-col gap-5">
          <DecoCard title="VISION BOARD"><MediaBoard room="mentor" kind="vision" empty="Penthouse, the garage, New York, the family — pin it here." /></DecoCard>
          <DecoCard title="LETTER FROM FUTURE ME">
            <button
              className="deco-btn w-full"
              disabled={writing}
              onClick={async () => {
                setWriting(true)
                try {
                  const { askOnce } = await import('../lib/alfred')
                  const notes = await Promise.all(sections.map(async (s) => `${s.t}: ${((await db.kv.get(`notes:mentor-${s.k}`))?.value as string) || '(blank)'}`))
                  const text = await askOnce(`Write a short letter (250–350 words) to me, from me at 30 years old. Use my vision notes below and the facts in the snapshot (my habits, streaks, money, study). Warm, proud, honest — reference specific things I'm doing right and one thing I need to stop doing. Sign it "— K, age 30". No headings.\n\n${notes.join('\n')}`)
                  await addItem('mentor', 'letter', { text: text.slice(0, 4000), date: today })
                } catch (e) {
                  toast(e instanceof Error ? e.message : 'ALFRED is unavailable')
                } finally {
                  setWriting(false)
                }
              }}
            >
              {writing ? 'Writing across time…' : 'Ask ALFRED to write today’s letter'}
            </button>
            {letters.slice(0, 3).map((l) => (
              <div key={l.id} className="letter mt-4">
                <div className="font-deco text-[10px] tracking-[0.3em] text-[var(--accent)]">{l.date ? shortDate(l.date).toUpperCase() : ''}</div>
                <p className="font-body text-[17px] whitespace-pre-wrap mt-2">{l.text}</p>
              </div>
            ))}
          </DecoCard>
        </div>
      </div>
    </div>
  )
}

// ══ THE TROPHY HALL ═══════════════════════════════════════════════════

export function TrophyHall() {
  const { today } = useHouse()
  const t = useTrophies()
  const phases = useSettings((s) => s.phases)
  const wins = useItems('trophy', 'win').sort((a, b) => b.at - a.at)
  const rewards = useItems('trophy', 'reward')
  const [filter, setFilter] = useState<'all' | 'won' | 'locked'>('all')
  const [winText, setWinText] = useState('')
  const [rewardFor, setRewardFor] = useState<string | null>(null)
  const [rewardText, setRewardText] = useState('')
  useEffect(() => void t.refresh(), [])
  const list = ACHIEVEMENTS.filter((a) => (filter === 'all' ? true : filter === 'won' ? !!t.unlocked[a.id] : !t.unlocked[a.id]))
  const unlockedCount = ACHIEVEMENTS.filter((a) => t.unlocked[a.id]).length
  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="trophy" subtitle={`Level ${t.level.level} · ${t.xp.toLocaleString()} XP · ${unlockedCount}/${ACHIEVEMENTS.length} achievements`} />
      <DecoCard>
        <div className="text-center">
          <div className="level-badge mx-auto"><span className="font-num">{t.level.level}</span></div>
          <div className="font-display text-[26px] text-[var(--accent)] mt-3">{titleFor(t.level.level).toUpperCase()}</div>
          <div className="meter mt-3"><div style={{ width: `${(t.level.into / t.level.span) * 100}%` }} /></div>
          <div className="font-num text-[13px] text-[var(--ink-muted)] mt-1">{t.level.into.toLocaleString()} / {t.level.span.toLocaleString()} XP to level {t.level.level + 1}</div>
          <button className="deco-btn ghost mt-3" onClick={() => shareCard({ kicker: 'The house rises', big: `LVL ${t.level.level}`, title: titleFor(t.level.level), lines: [`${t.xp.toLocaleString()} XP`, `${unlockedCount} achievements unlocked`, `Best streak: ${t.stats?.bestStreak ?? 0} day${(t.stats?.bestStreak ?? 0) === 1 ? "" : "s"}`] }, 'gharana-level.png')}>Share my level</button>
        </div>
      </DecoCard>
      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          <DecoCard title="THE WINS WALL">
            <div className="flex gap-2 mb-3">
              <input className="deco-input flex-1 min-w-0" value={winText} onChange={(e) => setWinText(e.target.value)} placeholder="Add a win worth remembering" />
              <button className="deco-btn px-3" onClick={async () => { if (!winText.trim()) return; await addItem('trophy', 'win', { text: winText.trim(), sub: 'Win', date: today }); setWinText(''); win(); celebrate() }}><Icon name="plus" size={18} /></button>
            </div>
            <div className="plaques">
              {wins.map((w) => (
                <button key={w.id} className="plaque" onClick={() => shareCard({ kicker: 'A plaque on the wall', big: 'WON', title: w.text, lines: [w.sub ?? '', w.date ? shortDate(w.date) : ''] }, 'gharana-win.png')} title="Share">
                  <div className="font-deco text-[9px] tracking-[0.3em]">{(w.sub ?? 'WIN').toUpperCase()}</div>
                  <div className="font-display text-[17px] leading-tight mt-1">{w.text}</div>
                  <div className="font-num text-[11px] mt-1 opacity-80">{w.date ? shortDate(w.date) : ''}</div>
                </button>
              ))}
              {!wins.length && <Empty>Close a deal or add a win.</Empty>}
            </div>
          </DecoCard>
          <DecoCard title="SEASON PASS — THE LOCK-IN">
            <ol className="flex flex-col gap-3">
              {phases.map((p) => {
                const total = daysBetween(p.start, p.end) + 1
                const done = Math.min(total, Math.max(0, daysBetween(p.start, today) + 1))
                const over = today > p.end
                const rs = rewards.filter((r) => r.meta?.phaseId === p.id)
                return (
                  <li key={p.id} className="season">
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-[18px]">{p.numeral} · {p.name}</span>
                      <span className="font-num text-[12px] text-[var(--ink-muted)]">{over ? 'COMPLETE' : `${done}/${total} days`}</span>
                    </div>
                    <div className="meter"><div style={{ width: `${(done / total) * 100}%` }} /></div>
                    {rs.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 mt-1">
                        <span className={`font-body text-[15px] flex-1 ${r.done ? 'line-through text-[var(--ink-muted)]' : ''}`}>🎁 {r.text}</span>
                        {over && !r.done && <button className="chip on" onClick={async () => { await db.items.update(r.id, { done: true }); win(); celebrate(); toast(`Reward claimed: ${r.text}`) }}>Claim</button>}
                        {!over && <span className="font-deco text-[10px] text-[var(--ink-muted)]">LOCKED</span>}
                      </div>
                    ))}
                    <button className="chip mt-1" onClick={() => { setRewardFor(p.id); setRewardText('') }}>+ reward</button>
                  </li>
                )
              })}
            </ol>
          </DecoCard>
        </div>
        <DecoCard title="ACHIEVEMENTS">
          <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'won', label: `Unlocked ${unlockedCount}` }, { value: 'locked', label: 'Locked' }]} />
          <div className="ach-grid mt-3">
            {list.map((a) => {
              const got = t.unlocked[a.id]
              const prog = t.stats ? a.progress(t.stats) : 0
              return (
                <button key={a.id} className={`ach ${got ? 'got' : ''}`} onClick={() => got && shareCard({ kicker: 'Achievement unlocked', big: a.glyph, title: a.name, lines: [a.desc, `Unlocked ${shortDate(got)}`] }, 'gharana-achievement.png')}>
                  <span className="ach-glyph">{a.glyph}</span>
                  <span className="font-display text-[14px] leading-tight">{a.name}</span>
                  <span className="font-body text-[11.5px] text-[var(--ink-muted)] leading-tight">{a.desc}</span>
                  {!got && <span className="ach-bar"><i style={{ width: `${prog * 100}%` }} /></span>}
                </button>
              )
            })}
          </div>
        </DecoCard>
      </div>
      <Sheet open={!!rewardFor} onClose={() => setRewardFor(null)} title="PHASE REWARD">
        <div className="flex flex-col gap-3">
          <input className="deco-input" value={rewardText} onChange={(e) => setRewardText(e.target.value)} placeholder="New fit, a proper dinner, the cologne on the wishlist…" autoFocus />
          <button className="deco-btn" onClick={async () => { if (!rewardText.trim() || !rewardFor) return; await addItem('trophy', 'reward', { text: rewardText.trim(), meta: { phaseId: rewardFor }, done: false }); setRewardFor(null) }}>Add reward</button>
        </div>
      </Sheet>
    </div>
  )
}

// ══ THE CHALLENGE BOARD ═══════════════════════════════════════════════

const CHALLENGE_TEMPLATES = [
  { name: 'No-sugar week', rule: 'No added sugar, no soft drinks, no lollies.', days: 7 },
  { name: '30 days of boxing', rule: 'At least 15 minutes of boxing every day.', days: 30 },
  { name: '10k steps × 30', rule: '10,000 steps every day.', days: 30 },
  { name: 'Cold showers × 30', rule: 'Finish every shower with 60 seconds cold.', days: 30 },
  { name: 'Read 10 pages × 30', rule: 'Ten pages of a real book, daily.', days: 30 },
  { name: 'No phone first hour', rule: 'No phone for the first hour after waking.', days: 30 },
  { name: '75-day discipline', rule: 'Two workouts, 3L water, 10 pages, follow your eating plan, progress photo — every day for 75 days. Miss one, restart.', days: 75 },
]

function ChallengeCard({ c }: { c: Challenge }) {
  const { today } = useHouse()
  const day = Math.min(c.days, daysBetween(c.start, today) + 1)
  const checked = new Set(c.checks)
  const toggle = async (d: string) => {
    if (d > today) return
    const checks = checked.has(d) ? c.checks.filter((x) => x !== d) : [...c.checks, d]
    const done = checks.length >= c.days
    await db.challenges.update(c.id, { checks, status: done ? 'done' : 'active' })
    if (done && c.status !== 'done') {
      win()
      celebrate()
      toast(`CHALLENGE COMPLETE: ${c.name}`)
      await addItem('trophy', 'win', { text: c.name, sub: 'Challenge', date: today })
    }
  }
  return (
    <DecoCard title={c.name.toUpperCase()}>
      <p className="font-body text-[15px] text-[var(--ink-muted)]">{c.rule}{c.mate ? ` · vs ${c.mate}` : ''}</p>
      <div className="flex items-baseline justify-between mt-2">
        <span className="font-num text-[13px]">Day {Math.max(1, day)} of {c.days}</span>
        <span className="font-num text-[13px] text-[var(--accent)]">{c.checks.length} ✓</span>
      </div>
      <div className="ch-grid" data-noswipe>
        {Array.from({ length: c.days }, (_, i) => addDays(c.start, i)).map((d, i) => (
          <button key={d} className={`ch-cell ${checked.has(d) ? 'on' : ''} ${d === today ? 'today' : ''} ${d > today ? 'future' : ''} ${d < today && !checked.has(d) ? 'miss' : ''}`} onClick={() => toggle(d)} title={d}>
            {i + 1}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-3 flex-wrap">
        <button className="deco-btn ghost" onClick={() => shareCard({ kicker: c.mate ? `Challenge vs ${c.mate}` : 'The challenge board', big: `${c.checks.length}/${c.days}`, title: c.name, lines: [c.rule, `Day ${Math.max(1, day)} of ${c.days}`] }, 'gharana-challenge.png')}>Share progress</button>
        <button className="chip" onClick={async () => { await db.challenges.update(c.id, { status: 'failed' }); toast('Challenge closed. Restart when ready.') }}>Give up</button>
        <button className="chip" onClick={async () => { await db.challenges.update(c.id, { start: today, checks: [], status: 'active' }); toast('Restarted from today') }}>Restart</button>
      </div>
    </DecoCard>
  )
}

export function ChallengeBoard() {
  const { today } = useHouse()
  const all = useLiveQuery(() => db.challenges.toArray(), []) ?? []
  const [form, setForm] = useState(false)
  const [c, setC] = useState({ name: '', rule: '', days: 30, mate: '' })
  const active = all.filter((x) => x.status === 'active')
  const past = all.filter((x) => x.status !== 'active')
  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="challenges" subtitle={`${active.length} active · ${past.filter((p) => p.status === 'done').length} completed`} right={<button className="icon-btn" onClick={() => setForm(true)} aria-label="New challenge"><Icon name="plus" /></button>} />
      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          {active.map((x) => <ChallengeCard key={x.id} c={x} />)}
          {!active.length && <DecoCard><Empty>No active challenge. Pick one →</Empty></DecoCard>}
        </div>
        <div className="flex flex-col gap-5">
          <DecoCard title="START ONE">
            <ul className="flex flex-col gap-2">
              {CHALLENGE_TEMPLATES.map((t) => (
                <li key={t.name} className="list-row">
                  <span className="flex-1"><span className="block font-body text-[17px]">{t.name}</span><span className="block font-body text-[13px] text-[var(--ink-muted)]">{t.days} days · {t.rule}</span></span>
                  <button className="chip on" onClick={async () => { await db.challenges.add({ id: uid(), ...t, start: today, checks: [], status: 'active', createdAt: Date.now() }); toast(`${t.name} — day 1 starts now`) }}>Start</button>
                </li>
              ))}
            </ul>
            <button className="deco-btn ghost w-full mt-3" onClick={() => setForm(true)}>Custom / challenge a mate</button>
          </DecoCard>
          <DecoCard title="THE RECORD">
            <ul>{past.map((p) => <li key={p.id} className="list-row"><span className="flex-1 font-body">{p.name}</span><span className={`status-pill ${p.status === 'done' ? 's-accepted' : 's-rejected'}`}>{p.status === 'done' ? 'DONE' : 'ENDED'}</span></li>)}</ul>
            {!past.length && <Empty>Finished challenges land here.</Empty>}
          </DecoCard>
        </div>
      </div>
      <Sheet open={form} onClose={() => setForm(false)} title="NEW CHALLENGE">
        <div className="flex flex-col gap-3">
          <input className="deco-input" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="Name" autoFocus />
          <textarea className="deco-input" rows={3} value={c.rule} onChange={(e) => setC({ ...c, rule: e.target.value })} placeholder="The rule, in one line" />
          <Segmented value={c.days} onChange={(days) => setC({ ...c, days })} options={[7, 14, 30, 60, 75].map((d) => ({ value: d, label: `${d}d` }))} />
          <input className="deco-input" value={c.mate} onChange={(e) => setC({ ...c, mate: e.target.value })} placeholder="Challenging a mate? Their name (optional)" />
          <button className="deco-btn" onClick={async () => { if (!c.name.trim()) return; await db.challenges.add({ id: uid(), name: c.name.trim(), rule: c.rule.trim(), days: c.days, mate: c.mate.trim() || undefined, start: today, checks: [], status: 'active', createdAt: Date.now() }); setForm(false); setC({ name: '', rule: '', days: 30, mate: '' }) }}>Start today</button>
          <p className="font-body text-[13px] text-[var(--ink-muted)]">Challenging a mate? Share your progress card from the challenge — they can track theirs in their own GHARANA (or just screenshot back).</p>
        </div>
      </Sheet>
    </div>
  )
}

// ══ THE JUKEBOX ═══════════════════════════════════════════════════════

export function Jukebox() {
  const { today } = useHouse()
  const sotd = useItems('jukebox', 'sotd').sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  const todays = sotd.find((s) => s.date === today)
  const [song, setSong] = useState('')
  const [link, setLink] = useState('')
  const open = (url?: string) => url && window.open(url, '_blank', 'noopener')
  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="jukebox" subtitle="Lock-in soundtrack" />
      <DecoCard title="SONG OF THE DAY">
        {todays ? (
          <div className="text-center">
            <div className="font-display text-[24px] text-[var(--accent)]">{todays.text}</div>
            {todays.meta?.url && <button className="deco-btn ghost mt-3" onClick={() => open(String(todays.meta!.url))}>▶ Play</button>}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <input className="deco-input" value={song} onChange={(e) => setSong(e.target.value)} placeholder="Song — Artist" />
            <input className="deco-input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Spotify / YouTube link (optional)" />
            <button className="deco-btn" onClick={async () => { if (!song.trim()) return; await addItem('jukebox', 'sotd', { text: song.trim(), date: today, meta: { url: link.trim() || undefined } }); setSong(''); setLink('') }}>Set today’s song</button>
          </div>
        )}
        {sotd.length > 1 && <div className="mt-3 font-body text-[14px] text-[var(--ink-muted)]">Recently: {sotd.filter((s) => s.date !== today).slice(0, 5).map((s) => s.text).join(' · ')}</div>}
      </DecoCard>
      <div className="bp-layout">
        <DecoCard title="LOCK-IN PLAYLISTS">
          <PlaylistList kind="playlist" placeholder="Gym, Deep study, Gold Coast drives…" />
        </DecoCard>
        <DecoCard title="FOCUS MUSIC">
          <PlaylistList kind="focus" placeholder="Lo-fi, jazz piano, rain…" />
          <p className="font-body text-[13px] text-[var(--ink-muted)] mt-2">Playback opens in Spotify / YouTube. (Voice control of Spotify needs Spotify Premium + an integration — on the list for later.)</p>
        </DecoCard>
      </div>
    </div>
  )
}

function PlaylistList({ kind, placeholder }: { kind: string; placeholder: string }) {
  const items = useItems('jukebox', kind)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  return (
    <div className="flex flex-col gap-2">
      <input className="deco-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={placeholder} />
      <div className="flex gap-2">
        <input className="deco-input flex-1 min-w-0" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste the link" />
        <button className="deco-btn px-3" onClick={async () => { if (!name.trim()) return; await addItem('jukebox', kind, { text: name.trim(), meta: { url: url.trim() || undefined } }); setName(''); setUrl('') }}><Icon name="plus" size={18} /></button>
      </div>
      <ul>
        {items.map((p) => (
          <li key={p.id} className="list-row">
            <span className="flex-1 font-body text-[17px]">{p.text}</span>
            {p.meta?.url && <button className="chip on" onClick={() => window.open(String(p.meta!.url), '_blank', 'noopener')}>▶ Play</button>}
            <button className="icon-btn" aria-label="Delete" onClick={async () => { await db.items.delete(p.id); toast('Removed', () => db.items.put(p)) }}><Icon name="trash" size={14} /></button>
          </li>
        ))}
        {!items.length && <Empty>Nothing yet.</Empty>}
      </ul>
    </div>
  )
}

// ══ THE GROOMING ROOM ═════════════════════════════════════════════════

function Routine({ kind, label }: { kind: 'am' | 'pm'; label: string }) {
  const { today, habitSet } = useHouse()
  const day = useDay(today)
  const steps = useItems('grooming', kind).sort((a, b) => a.at - b.at)
  const done = new Set(day.groom ?? [])
  const toggle = async (id: string) => {
    await updateDay(today, (d) => {
      const s = new Set(d.groom ?? [])
      if (s.has(id)) s.delete(id)
      else s.add(id)
      d.groom = [...s]
    })
    const after = new Set(done)
    if (after.has(id)) after.delete(id)
    else after.add(id)
    if (steps.length && steps.every((s) => after.has(s.id))) {
      const h = (await db.habits.toArray()).find((x) => x.id === 'skincare' && x.sets.includes(habitSet))
      if (h && kind === 'am') await setHabitValue(h, today, 1, { quiet: true })
      toast(`${label} routine done${kind === 'am' ? ' — Skincare ticked' : ''}`)
    }
  }
  return (
    <div className="flex flex-col gap-1">
      {steps.map((s) => (
        <button key={s.id} className={`list-row text-left ${done.has(s.id) ? 'done' : ''}`} onClick={() => toggle(s.id)}>
          <span className="habit-check" style={{ width: 30, height: 30 }}><Stamp show={done.has(s.id)} /></span>
          <span className="flex-1 font-body text-[17px]">{s.text}</span>
        </button>
      ))}
      <ListCard room="grooming" kind={kind} placeholder={`Add a ${label} step`} />
    </div>
  )
}

function FitCheck() {
  const [busy, setBusy] = useState(false)
  const [reply, setReply] = useState('')
  return (
    <div className="flex flex-col gap-2">
      <label className="deco-btn text-center cursor-pointer">
        {busy ? 'ALFRED is looking…' : 'Rate my fit (photo)'}
        <input
          type="file"
          accept="image/*"
          hidden
          disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            setBusy(true)
            setReply('')
            try {
              const data = await fileToDataUrl(f, 1100)
              await db.media.add({ id: uid(), room: 'grooming', kind: 'fit', data, at: Date.now() })
              const { askOnce } = await import('../lib/alfred')
              setReply(await askOnce('Rate this outfit out of 10 for fit, colour, proportion and occasion. Be specific and honest but kind. Give two concrete upgrades (one free, one under $50). Keep it short.', [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: data.split(',')[1] } }]))
            } catch (err) {
              toast(err instanceof Error ? err.message : 'ALFRED is unavailable')
            } finally {
              setBusy(false)
            }
          }}
        />
      </label>
      {reply && <div className="bubble alfred !max-w-full whitespace-pre-wrap">{reply.replace(/\*\*(.+?)\*\*/g, '$1')}</div>}
    </div>
  )
}

export function GroomingRoom() {
  const { today } = useHouse()
  const day = useDay(today)
  const cuts = useItems('grooming', 'haircut').filter((c) => c.date).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  const scents = useItems('grooming', 'scent')
  const sinceCut = cuts[0]?.date ? daysBetween(cuts[0].date, today) : null
  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="grooming" subtitle={`${sinceCut !== null ? `Haircut ${sinceCut} days ago` : 'No haircut logged'}${day.scent ? ` · wearing ${day.scent}` : ''}`} />
      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          <DecoCard title="SKINCARE — AM"><Routine kind="am" label="AM" /></DecoCard>
          <DecoCard title="SKINCARE — PM"><Routine kind="pm" label="PM" /></DecoCard>
          <DecoCard title="FIT CHECK"><FitCheck /><div className="mt-3"><MediaBoard room="grooming" kind="fit" empty="Fit pics you’ve had rated." /></div></DecoCard>
        </div>
        <div className="flex flex-col gap-5">
          <DecoCard title="FRAGRANCE — TODAY">
            <div className="flex flex-wrap gap-2">
              {scents.map((s) => <button key={s.id} className={`chip ${day.scent === s.text ? 'on' : ''}`} onClick={() => updateDay(today, (d) => { d.scent = d.scent === s.text ? undefined : s.text })}>{s.text}</button>)}
              {!scents.length && <Empty>Add your collection below.</Empty>}
            </div>
          </DecoCard>
          <DecoCard title="THE COLLECTION"><ListCard room="grooming" kind="scent" placeholder="Fragrance name" subPlaceholder="Notes · best for (day / night / summer)" /></DecoCard>
          <DecoCard title="FRAGRANCE WISHLIST"><ListCard room="grooming" kind="scent-wish" placeholder="Next bottle" subPlaceholder="Why / price" checkable /></DecoCard>
          <DecoCard title={`HAIRCUTS${sinceCut !== null ? ` · ${sinceCut} DAYS SINCE` : ''}`}>
            {sinceCut !== null && sinceCut >= 28 && <p className="font-body text-[16px] text-[var(--accent)] mb-2">Four weeks in — book the barber.</p>}
            <ListCard room="grooming" kind="haircut" placeholder="Barber / style" withDate />
          </DecoCard>
        </div>
      </div>
    </div>
  )
}

// ══ THE BULK LEDGER ═══════════════════════════════════════════════════

export function BulkLedger() {
  const { today, location } = useHouse()
  const s = useSettings()
  const day = useDay(today)
  const logs = useLiveQuery(() => db.body.orderBy('day').toArray(), []) ?? []
  const meals = useItems('bulk', 'meal')
  const [weight, setWeight] = useState('')
  const [m, setM] = useState({ waist: '', chest: '', arm: '', thigh: '' })
  const weights = logs.filter((l) => l.weight)
  const first = weights[0]?.weight
  const last = weights[weights.length - 1]?.weight
  const gaining = s.goalWeight >= (first ?? 0)
  const delta = first !== undefined && last !== undefined ? last - first : 0
  const good = gaining ? delta >= 0 : delta <= 0
  const foods = useMemo(() => [...QUICK_FOODS].sort((a, b) => Number(!!b.india && location === 'india') - Number(!!a.india && location === 'india')), [location])
  const addFood = async (protein: number, calories: number, name: string) => {
    await addProtein(today, protein)
    await updateDay(today, (d) => { d.calories = (d.calories ?? 0) + calories })
    toast(`${name}: +${protein} g protein, +${calories} kcal`, async () => {
      await addProtein(today, -protein)
      await updateDay(today, (d) => { d.calories = Math.max(0, (d.calories ?? 0) - calories) })
    })
  }
  const logBody = async () => {
    const n = (v: string) => (v.trim() ? Number(v) : undefined)
    const row = { id: uid(), day: today, weight: n(weight), waist: n(m.waist), chest: n(m.chest), arm: n(m.arm), thigh: n(m.thigh), at: Date.now() }
    if (Object.values(row).filter((v) => typeof v === 'number').length <= 1) return toast('Enter a weight or a measurement')
    await db.body.add(row)
    setWeight('')
    setM({ waist: '', chest: '', arm: '', thigh: '' })
    toast('Logged to the ledger', () => db.body.delete(row.id))
  }
  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="bulk" subtitle={last ? `${last} kg · goal ${s.goalWeight} kg` : `Goal ${s.goalWeight} kg`} />
      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          <DecoCard title="WEIGHT">
            <div className="grid grid-cols-3 text-center mb-2">
              <div><div className="font-num text-[24px]">{last ?? '—'}</div><div className="field-label">NOW (KG)</div></div>
              <div><div className={`font-num text-[24px] ${delta ? (good ? 'text-[#7fc48a]' : 'text-[#e88a74]') : ''}`}>{delta > 0 ? '+' : ''}{delta.toFixed(1)}</div><div className="field-label">SINCE START</div></div>
              <div><div className="font-num text-[24px] text-[var(--accent)]">{s.goalWeight}</div><div className="field-label">GOAL</div></div>
            </div>
            <LineChart points={weights.map((w) => ({ label: shortDate(w.day).replace(/^\w+ /, ''), value: w.weight! }))} unit=" kg" />
            <div className="flex items-center gap-2 mt-3">
              <span className="font-body text-[14px] text-[var(--ink-muted)]">Goal</span>
              <Stepper value={s.goalWeight} onChange={(goalWeight) => s.update({ goalWeight })} step={0.5} min={40} max={150} suffix="kg" />
            </div>
          </DecoCard>
          <DecoCard title="LOG WEIGHT + MEASUREMENTS">
            <div className="grid grid-cols-2 gap-2">
              <input className="deco-input font-num col-span-2" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight (kg)" />
              {(['waist', 'chest', 'arm', 'thigh'] as const).map((k) => <input key={k} className="deco-input font-num" inputMode="decimal" value={m[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} placeholder={`${k} (cm)`} />)}
            </div>
            <button className="deco-btn w-full mt-2" onClick={logBody}>Log</button>
            <ul className="mt-3">
              {[...logs].reverse().slice(0, 6).map((l) => (
                <li key={l.id} className="list-row font-num text-[13px]">
                  <span className="w-16 text-[var(--ink-muted)]">{shortDate(l.day).replace(/^\w+ /, '')}</span>
                  <span className="flex-1">{[l.weight && `${l.weight} kg`, l.waist && `waist ${l.waist}`, l.chest && `chest ${l.chest}`, l.arm && `arm ${l.arm}`, l.thigh && `thigh ${l.thigh}`].filter(Boolean).join(' · ')}</span>
                  <button className="icon-btn" aria-label="Delete" onClick={async () => { await db.body.delete(l.id); toast('Removed', () => db.body.put(l)) }}><Icon name="trash" size={14} /></button>
                </li>
              ))}
            </ul>
          </DecoCard>
          <DecoCard title="PROGRESS PHOTOS (PRIVATE)"><MediaBoard room="bulk" kind="progress" blur empty="Stored only on this device. Thumbnails stay blurred." /></DecoCard>
        </div>
        <div className="flex flex-col gap-5">
          <DecoCard title="TODAY’S FUEL">
            <div className="grid grid-cols-2 text-center">
              <div><div className="font-num text-[24px]">{day.proteinG}<small className="text-[var(--ink-muted)] text-[13px]">/{s.proteinTargetG} g</small></div><div className="field-label">PROTEIN</div></div>
              <div><div className="font-num text-[24px]">{day.calories ?? 0}<small className="text-[var(--ink-muted)] text-[13px]">/{s.calorieTarget}</small></div><div className="field-label">KCAL</div></div>
            </div>
            <div className="meter mt-2"><div style={{ width: `${Math.min(100, (day.proteinG / s.proteinTargetG) * 100)}%` }} /></div>
            <div className="meter"><div style={{ width: `${Math.min(100, ((day.calories ?? 0) / s.calorieTarget) * 100)}%` }} /></div>
            <div className="field-label mt-3">QUICK ADD {location === 'india' ? '· INDIA MEALS FIRST' : ''}</div>
            <div className="flex flex-wrap gap-2" data-noswipe>
              {foods.map((f) => <button key={f.name} className="chip" onClick={() => addFood(f.protein, f.calories, f.name)}>{f.name} <span className="font-num text-[11px] ml-1 text-[var(--accent)]">{f.protein}g</span></button>)}
            </div>
            <p className="font-body text-[12px] text-[var(--ink-muted)] mt-2">Rough estimates — simple tracking, not obsessive tracking.</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="font-body text-[14px] text-[var(--ink-muted)]">Calorie target</span>
              <Stepper value={s.calorieTarget} onChange={(calorieTarget) => s.update({ calorieTarget })} step={100} min={1500} max={5000} />
            </div>
          </DecoCard>
          <DecoCard title="MY MEALS">
            <div className="flex flex-wrap gap-2 mb-3">{meals.map((ml) => <button key={ml.id} className="chip on" onClick={() => addFood(Number(ml.meta?.protein ?? 0), Number(ml.meta?.calories ?? 0), ml.text)}>{ml.text}</button>)}</div>
            <Records room="bulk" kind="meal" titleLabel="Meal template" fields={[{ key: 'protein', label: 'Protein g', type: 'number', show: true }, { key: 'calories', label: 'kcal', type: 'number', show: true }]} empty="Save your usual meals for one-tap logging." />
          </DecoCard>
          <DecoCard title="VEGETARIAN-FRIENDLY IDEAS"><ul className="font-body text-[16px]">{VEG_IDEAS.map((v) => <li key={v}>· {v}</li>)}</ul></DecoCard>
        </div>
      </div>
    </div>
  )
}

// ══ INBOX ═════════════════════════════════════════════════════════════

const DEST_NAMES: Record<string, string> = { inbox: 'INBOX', nazara: 'NAZARA', ksvol1: 'K.S. VOL. 1', scrollapp: 'SCROLL APP' }

export function Inbox() {
  const { today } = useHouse()
  const all = useLiveQuery(() => db.captures.orderBy('at').reverse().toArray(), []) ?? []
  const [showSorted, setShowSorted] = useState(false)
  const list = all.filter((c) => !!c.sorted === showSorted)
  const route = async (c: (typeof all)[number], to: string) => {
    if (to === 'nazara') await addItem('nazara', 'todo', { text: c.text, done: false })
    if (to === 'ksvol1') await addItem('ksvol1', 'idea', { text: c.text, done: false })
    if (to === 'scrollapp') await addItem('applab', 'scroll-feature', { text: c.text, done: false })
    if (to === 'deal') await db.deals.add({ id: uid(), title: c.text, category: 'Personal', stage: 'radar', order: Date.now(), createdAt: Date.now() })
    if (to === 'calendar') await addItem('calendar', 'event', { text: c.text, date: today })
    if (to === 'reading') await addItem('reading', 'topic', { text: c.text, done: false })
    await db.captures.update(c.id, { sorted: true })
    toast('Filed', () => db.captures.update(c.id, { sorted: false }))
  }
  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="inbox" subtitle={`${all.filter((c) => !c.sorted).length} to sort`} />
      <Segmented value={showSorted ? 'done' : 'todo'} onChange={(v) => setShowSorted(v === 'done')} options={[{ value: 'todo', label: 'To sort' }, { value: 'done', label: 'Filed' }]} />
      <DecoCard>
        <ul className="flex flex-col gap-3">
          {list.map((c) => (
            <li key={c.id} className="inbox-item">
              <div className="font-deco text-[10px] tracking-[0.25em] text-[var(--accent)]">{DEST_NAMES[c.dest] ?? c.dest} · {new Date(c.at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</div>
              <p className="font-body text-[18px]">{c.text}</p>
              {!c.sorted && (
                <div className="flex flex-wrap gap-2 mt-2" data-noswipe>
                  {[['nazara', 'NAZARA'], ['ksvol1', 'K.S.'], ['scrollapp', 'Scroll App'], ['deal', 'Deal'], ['calendar', 'Today’s calendar'], ['reading', 'Reading topic']].map(([k, l]) => <button key={k} className="chip" onClick={() => route(c, k)}>→ {l}</button>)}
                  <button className="chip" onClick={async () => { await db.captures.update(c.id, { sorted: true }) }}>✓ Done</button>
                  <button className="chip" onClick={async () => { await db.captures.delete(c.id); toast('Deleted', () => db.captures.put(c)) }}>Delete</button>
                </div>
              )}
            </li>
          ))}
          {!list.length && <Empty>{showSorted ? 'Nothing filed yet.' : 'Inbox zero. Capture ideas from the Lounge, the search bar or ALFRED.'}</Empty>}
        </ul>
      </DecoCard>
    </div>
  )
}
