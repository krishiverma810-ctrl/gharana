import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DecoCard } from '../components/DecoCard'
import { Empty, Field, RoomHeader, Segmented, Sheet, Stepper } from '../components/ui'
import { Icon } from '../components/Icon'
import { ListCard } from '../components/ListCard'
import { AskAlfred, LineChart, MediaBoard, Records, SessionLog, useItems, useSessions } from '../components/Kit'
import { db, uid } from '../db/db'
import { useHouse } from '../app/house'
import { useSettings } from '../store/settings'
import { celebrate, toast } from '../store/ui'
import { win } from '../lib/sound'
import { addDays, daysBetween, dayNumber, shortDate, weekStart } from '../lib/time'
import { IDEAS, WORDS } from '../config/library'
import type { Assessment, Book, Card, Unit } from '../db/types'

// WING II — THE LIBRARY: The Study, The Dental Wing, The Reading Room, The Skills Forge.

// ══ THE STUDY ═════════════════════════════════════════════════════════

/** SM-2 spaced repetition. q: 1 again · 3 hard · 4 good · 5 easy. */
export function review(c: Card, q: number, today: string): Card {
  let { ease, interval, reps, lapses } = c
  if (q < 3) {
    reps = 0
    interval = 1
    lapses += 1
  } else {
    reps += 1
    interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(interval * ease)
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
  return { ...c, ease, interval, reps, lapses, due: addDays(today, interval) }
}

/** Current mark for a unit: the final mark, or the weighted average of what's marked so far. */
export function unitMark(u: Unit): { mark: number | null; final: boolean; covered: number } {
  if (u.finalMark !== undefined && u.finalMark !== null) return { mark: u.finalMark, final: true, covered: 100 }
  const marked = u.assessments.filter((a) => a.mark !== undefined && a.mark !== null)
  const w = marked.reduce((s, a) => s + a.weight, 0)
  if (!w) return { mark: null, final: false, covered: 0 }
  return { mark: marked.reduce((s, a) => s + (a.mark as number) * a.weight, 0) / w, final: false, covered: w }
}

const gradeOf = (m: number) => (m >= 80 ? 'HD' : m >= 70 ? 'D' : m >= 60 ? 'C' : m >= 50 ? 'P' : 'N')

export function wamGpa(units: Unit[], scale: 7 | 4) {
  let wSum = 0
  let wTot = 0
  let gSum = 0
  let gTot = 0
  for (const u of units) {
    const { mark } = unitMark(u)
    if (mark === null) continue
    const weight = (u.level <= 1 ? 0.5 : 1) * u.credits // Monash-style WAM: first-year units count half
    wSum += mark * weight
    wTot += weight
    const g = gradeOf(mark)
    const pts = scale === 7 ? { HD: 7, D: 6, C: 5, P: 4, N: 0 }[g] : { HD: 4, D: 3, C: 2, P: 1, N: 0 }[g]
    gSum += pts * u.credits
    gTot += u.credits
  }
  return { wam: wTot ? wSum / wTot : null, gpa: gTot ? gSum / gTot : null }
}

function useUnits() {
  return useLiveQuery(() => db.units.orderBy('order').toArray(), []) ?? []
}

function UnitEditor({ unit, onClose }: { unit: Unit | 'new'; onClose: () => void }) {
  const [u, setU] = useState<Unit>(unit === 'new' ? { id: uid(), code: '', name: '', sem: '2027 S1', level: 2, credits: 6, assessments: [], order: Date.now() } : unit)
  const up = (p: Partial<Unit>) => setU((x) => ({ ...x, ...p }))
  const setA = (i: number, p: Partial<Assessment>) => up({ assessments: u.assessments.map((a, j) => (j === i ? { ...a, ...p } : a)) })
  const total = u.assessments.reduce((s, a) => s + a.weight, 0)
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[110px_1fr] gap-2">
        <Field label="CODE"><input className="deco-input w-full font-num" value={u.code} onChange={(e) => up({ code: e.target.value.toUpperCase() })} placeholder="PHY2011" /></Field>
        <Field label="NAME"><input className="deco-input w-full" value={u.name} onChange={(e) => up({ name: e.target.value })} placeholder="Integrated Physiology" /></Field>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="SEMESTER"><input className="deco-input w-full font-num" value={u.sem} onChange={(e) => up({ sem: e.target.value })} /></Field>
        <Field label="LEVEL"><input className="deco-input w-full font-num" inputMode="numeric" value={u.level} onChange={(e) => up({ level: Number(e.target.value) || 1 })} /></Field>
        <Field label="CREDITS"><input className="deco-input w-full font-num" inputMode="numeric" value={u.credits} onChange={(e) => up({ credits: Number(e.target.value) || 6 })} /></Field>
      </div>
      <Field label={`ASSESSMENTS · ${total}% WEIGHTED`}>
        <div className="flex flex-col gap-2">
          {u.assessments.map((a, i) => (
            <div key={a.id} className="grid grid-cols-[1fr_64px_64px_auto] gap-1 items-center">
              <input className="deco-input min-w-0" value={a.name} onChange={(e) => setA(i, { name: e.target.value })} placeholder="Mid-sem test" />
              <input className="deco-input font-num min-w-0" inputMode="decimal" value={a.weight} onChange={(e) => setA(i, { weight: Number(e.target.value) || 0 })} title="Weight %" />
              <input className="deco-input font-num min-w-0" inputMode="decimal" value={a.mark ?? ''} onChange={(e) => setA(i, { mark: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="mark" title="Mark %" />
              <button className="icon-btn" aria-label="Remove" onClick={() => up({ assessments: u.assessments.filter((_, j) => j !== i) })}><Icon name="trash" size={14} /></button>
              <input type="date" className="deco-input font-num col-span-4" value={a.due ?? ''} onChange={(e) => setA(i, { due: e.target.value || undefined })} />
            </div>
          ))}
          <button className="chip self-start" onClick={() => up({ assessments: [...u.assessments, { id: uid(), name: '', weight: 20 }] })}>+ assessment</button>
        </div>
      </Field>
      <Field label="FINAL MARK (WHEN RELEASED)"><input className="deco-input w-28 font-num" inputMode="decimal" value={u.finalMark ?? ''} onChange={(e) => up({ finalMark: e.target.value === '' ? undefined : Number(e.target.value) })} /></Field>
      <div className="flex gap-2">
        <button className="deco-btn flex-1" onClick={async () => { if (!u.code.trim()) return; await db.units.put(u); onClose() }}>Save unit</button>
        {unit !== 'new' && <button className="deco-btn ghost" onClick={async () => { await db.units.delete(u.id); toast(`${u.code} removed`, () => db.units.put(u)); onClose() }}>Delete</button>}
      </div>
    </div>
  )
}

function Flashcards({ decks }: { decks: string[] }) {
  const { today } = useHouse()
  const cards = useLiveQuery(() => db.cards.toArray(), []) ?? []
  const [deck, setDeck] = useState<string>('all')
  const [reviewing, setReviewing] = useState(false)
  const [shown, setShown] = useState(false)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [newDeck, setNewDeck] = useState('')
  const allDecks = [...new Set([...decks, ...cards.map((c) => c.deck)])].filter(Boolean)
  const due = cards.filter((c) => c.due <= today && (deck === 'all' || c.deck === deck)).sort((a, b) => a.due.localeCompare(b.due))
  const current = due[0]
  const targetDeck = (newDeck.trim() || (deck === 'all' ? allDecks[0] : deck) || 'General').trim()

  const grade = async (q: number) => {
    if (!current) return
    await db.cards.put(review(current, q, today))
    setShown(false)
    if (due.length === 1) {
      win()
      celebrate()
      toast('Review queue cleared. The forgetting curve loses today.')
      setReviewing(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" data-noswipe>
        <button className={`chip ${deck === 'all' ? 'on' : ''}`} onClick={() => setDeck('all')}>All · {cards.filter((c) => c.due <= today).length} due</button>
        {allDecks.map((d) => <button key={d} className={`chip ${deck === d ? 'on' : ''}`} onClick={() => setDeck(d)}>{d} · {cards.filter((c) => c.deck === d && c.due <= today).length}</button>)}
      </div>
      {reviewing && current ? (
        <div className="flashcard" onClick={() => setShown(true)}>
          <div className="font-deco text-[10px] tracking-[0.3em] text-[var(--accent)]">{current.deck.toUpperCase()} · {due.length} LEFT</div>
          <p className="font-body text-[21px] leading-snug mt-2 whitespace-pre-wrap">{current.front}</p>
          {shown ? (
            <>
              <div className="room-rule my-3" />
              <p className="font-body text-[18px] leading-snug whitespace-pre-wrap text-[var(--accent)]">{current.back}</p>
              <div className="grid grid-cols-4 gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                <button className="deco-btn ghost danger" onClick={() => grade(1)}>Again</button>
                <button className="deco-btn ghost" onClick={() => grade(3)}>Hard</button>
                <button className="deco-btn" onClick={() => grade(4)}>Good</button>
                <button className="deco-btn ghost" onClick={() => grade(5)}>Easy</button>
              </div>
            </>
          ) : (
            <p className="font-body italic text-[14px] text-[var(--ink-muted)] mt-4">Say the answer out loud first, then tap to reveal.</p>
          )}
        </div>
      ) : (
        <button className="deco-btn" disabled={!due.length} onClick={() => { setReviewing(true); setShown(false) }}>
          {due.length ? `Start review — ${due.length} due` : 'Nothing due. Add cards or come back tomorrow.'}
        </button>
      )}
      <div className="flex flex-col gap-2 mt-2">
        <div className="field-label">NEW CARD → {targetDeck.toUpperCase()}</div>
        <textarea className="deco-input" rows={2} value={front} onChange={(e) => setFront(e.target.value)} placeholder="Question (e.g. What does ADH do at the collecting duct?)" />
        <textarea className="deco-input" rows={2} value={back} onChange={(e) => setBack(e.target.value)} placeholder="Answer" />
        <div className="flex gap-2">
          <input className="deco-input flex-1 min-w-0" value={newDeck} onChange={(e) => setNewDeck(e.target.value)} placeholder="Deck / topic (optional)" />
          <button
            className="deco-btn px-4"
            onClick={async () => {
              if (!front.trim() || !back.trim()) return
              await db.cards.add({ id: uid(), deck: targetDeck, front: front.trim(), back: back.trim(), ease: 2.5, interval: 0, reps: 0, lapses: 0, due: today, createdAt: Date.now() })
              setFront('')
              setBack('')
              toast('Card added')
            }}
          >
            Add
          </button>
        </div>
        <p className="font-body text-[13px] text-[var(--ink-muted)]">{cards.length} cards total. Spaced repetition (SM-2): cards you know come back less often; ones you miss come back tomorrow.</p>
      </div>
    </div>
  )
}

function ExplainItBack({ topics }: { topics: string[] }) {
  const [topic, setTopic] = useState('')
  const [text, setText] = useState('')
  return (
    <div className="flex flex-col gap-2">
      <input className="deco-input" list="study-topics" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic — e.g. the renal countercurrent multiplier" />
      <datalist id="study-topics">{topics.map((t) => <option key={t} value={t} />)}</datalist>
      <textarea className="deco-input" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Explain it like you’re teaching a first-year. No notes." />
      <AskAlfred
        label="Grade my explanation"
        busyLabel="ALFRED is marking…"
        build={() => {
          if (!topic.trim() || text.trim().length < 40) {
            toast('Pick a topic and write at least a few sentences')
            return null
          }
          return `Tutor mode. I'm practising retrieval for my physiology degree. Topic: "${topic.trim()}". Here is my explanation from memory:\n\n"""${text.trim()}"""\n\nGrade it out of 10. Then: what I got right (brief), what's missing or wrong (specific), and ONE question to test me on the weakest part. Don't rewrite the whole thing for me.`
        }}
      />
    </div>
  )
}

export function Study() {
  const { today } = useHouse()
  const units = useUnits()
  const [edit, setEdit] = useState<Unit | 'new' | null>(null)
  const [scale, setScale] = useState<7 | 4>(7)
  const { wam, gpa } = wamGpa(units, scale)
  const deadlines = units
    .flatMap((u) => u.assessments.filter((a) => a.due && a.due >= today && (a.mark === undefined || a.mark === null)).map((a) => ({ u, a })))
    .sort((x, y) => (x.a.due ?? '').localeCompare(y.a.due ?? ''))
  const sems = [...new Set(units.map((u) => u.sem))].sort().reverse()
  const codes = units.map((u) => u.code)
  const cardsDue = useLiveQuery(() => db.cards.where('due').belowOrEqual(today).count(), [today]) ?? 0

  return (
    <div className="flex flex-col gap-5">
      <RoomHeader
        id="study"
        subtitle={`${wam !== null ? `WAM ${wam.toFixed(1)}` : 'WAM —'} · ${gpa !== null ? `GPA ${gpa.toFixed(2)}` : 'GPA —'} · ${cardsDue} card${cardsDue === 1 ? "" : "s"} due`}
        right={<button className="icon-btn" onClick={() => setEdit('new')} aria-label="Add unit"><Icon name="plus" /></button>}
      />
      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          <DecoCard title="RETRIEVAL PRACTICE"><Flashcards decks={codes} /></DecoCard>
          <DecoCard title="EXPLAIN IT BACK"><ExplainItBack topics={codes} /></DecoCard>
          <DecoCard title="STUDY SESSIONS"><SessionLog kind="study" subjects={codes.length ? codes : ['Physiology', 'GAMSAT']} subjectLabel="Unit" withRating /></DecoCard>
        </div>
        <div className="flex flex-col gap-5">
          <DecoCard title="DEADLINES">
            <ul>
              {deadlines.slice(0, 8).map(({ u, a }) => {
                const n = daysBetween(today, a.due!)
                return (
                  <li key={a.id} className="list-row">
                    <span className={`font-num text-[13px] w-14 ${n <= 3 ? 'text-[#e88a74]' : 'text-[var(--accent)]'}`}>{n === 0 ? 'TODAY' : `${n}d`}</span>
                    <span className="flex-1 font-body text-[16px]">{u.code} · {a.name} <span className="text-[var(--ink-muted)]">({a.weight}%)</span></span>
                  </li>
                )
              })}
              {!deadlines.length && <Empty>No upcoming deadlines. Add assessments to your units.</Empty>}
            </ul>
          </DecoCard>
          <DecoCard title="UNITS">
            <div className="flex items-center justify-between mb-2">
              <span className="font-body text-[14px] text-[var(--ink-muted)]">GPA scale</span>
              <Segmented value={scale} onChange={setScale} options={[{ value: 7, label: '7-point' }, { value: 4, label: '4-point' }]} />
            </div>
            {sems.map((sem) => (
              <div key={sem} className="mb-3">
                <div className="field-label">{sem}</div>
                {units.filter((u) => u.sem === sem).map((u) => {
                  const m = unitMark(u)
                  return (
                    <button key={u.id} className="list-row w-full text-left" onClick={() => setEdit(u)}>
                      <span className="font-num text-[14px] w-20">{u.code}</span>
                      <span className="flex-1 font-body text-[16px] truncate">{u.name}</span>
                      <span className="font-num text-[14px]">{m.mark !== null ? `${m.mark.toFixed(0)} ${gradeOf(m.mark)}${m.final ? '' : '*'}` : '—'}</span>
                    </button>
                  )
                })}
              </div>
            ))}
            {!units.length && <Empty>Add your units (tap +). Marks feed your WAM, GPA and the Dental Wing.</Empty>}
            <p className="font-body text-[12px] text-[var(--ink-muted)]">* = running mark from what’s been marked so far. WAM counts first-year units at half weight (Monash style). Always check against your faculty’s official calculator.</p>
          </DecoCard>
          <DecoCard title="SUMMARY SHEETS">
            <Records room="study" kind="summary" titleLabel="Topic" fields={[{ key: 'unit', label: 'Unit', type: 'text', show: true }, { key: 'body', label: 'Summary (big picture → details)', type: 'long' }]} empty="One page per topic: the big picture first, then the details." />
          </DecoCard>
        </div>
      </div>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'NEW UNIT' : 'UNIT'}>
        {edit && <UnitEditor unit={edit} onClose={() => setEdit(null)} />}
      </Sheet>
    </div>
  )
}

// ══ THE DENTAL WING ═══════════════════════════════════════════════════

function InterviewPractice() {
  const questions = useItems('dental', 'interview')
  const [q, setQ] = useState<string>('')
  const [answer, setAnswer] = useState('')
  const pick = () => {
    if (!questions.length) return
    setQ(questions[Math.floor(Math.random() * questions.length)].text)
    setAnswer('')
  }
  return (
    <div className="flex flex-col gap-2">
      <button className="deco-btn ghost" onClick={pick} disabled={!questions.length}>{q ? 'Another question' : 'Give me a question'}</button>
      {q && (
        <>
          <p className="font-display text-[19px] text-[var(--accent)]">{q}</p>
          <textarea className="deco-input" rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Answer as you would in the interview room." />
          <AskAlfred
            label="Get feedback from ALFRED"
            build={() => (answer.trim().length < 30 ? (toast('Write a proper answer first'), null) : `Act as a dental school interviewer (MMI style). Question: "${q}". My answer: """${answer.trim()}""". Score it out of 10 for structure, insight, empathy and authenticity. Give 3 specific improvements and a one-line stronger opening. Be honest but encouraging.`)}
          />
        </>
      )}
    </div>
  )
}

export function DentalWing() {
  const units = useUnits()
  const target = useSettings((s) => s.gpaTarget)
  const update = useSettings((s) => s.update)
  const { gpa, wam } = wamGpa(units, 7)
  const tests = useItems('dental', 'gamsat')
  const exp = useItems('dental', 'experience')
  const expHours = exp.reduce((a, e) => a + Number(e.meta?.hours ?? 0), 0)
  const chart = [...tests].filter((t) => t.meta?.date && t.meta?.overall).sort((a, b) => String(a.meta!.date).localeCompare(String(b.meta!.date))).map((t) => ({ label: shortDate(String(t.meta!.date)).replace(/^\w+ /, ''), value: Number(t.meta!.overall) }))
  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="dental" subtitle="The road to Melbourne DDS" />
      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          <DecoCard title="THE NUMBERS">
            <div className="grid grid-cols-3 text-center">
              <div><div className="font-num text-[26px]">{gpa !== null ? gpa.toFixed(2) : '—'}</div><div className="field-label">GPA (7-PT)</div></div>
              <div><div className="font-num text-[26px] text-[var(--accent)]">{target}</div><div className="field-label">TARGET</div></div>
              <div><div className="font-num text-[26px]">{wam !== null ? wam.toFixed(1) : '—'}</div><div className="field-label">WAM</div></div>
            </div>
            {gpa !== null && <div className="meter mt-3"><div style={{ width: `${Math.min(100, (gpa / target) * 100)}%` }} /></div>}
            <div className="flex items-center gap-2 mt-3">
              <span className="font-body text-[14px] text-[var(--ink-muted)]">Set target GPA</span>
              <Stepper value={target} onChange={(gpaTarget) => update({ gpaTarget })} step={0.1} min={4} max={7} />
            </div>
            <p className="font-body text-[12px] text-[var(--ink-muted)] mt-2">Marks come from The Study. Competitive cut-offs change every year — check the official admissions info.</p>
          </DecoCard>
          <DecoCard title="PREREQUISITES"><ListCard room="dental" kind="prereq" placeholder="Add a requirement" checkable /></DecoCard>
          <DecoCard title="APPLICATION TIMELINE"><ListCard room="dental" kind="timeline" placeholder="GAMSAT registration, sitting, applications open…" withDate checkable /></DecoCard>
          <DecoCard title="INTERVIEW PREP"><InterviewPractice /><div className="mt-4"><ListCard room="dental" kind="interview" placeholder="Add a practice question" /></div></DecoCard>
        </div>
        <div className="flex flex-col gap-5">
          <DecoCard title="GAMSAT — PRACTICE TESTS">
            <LineChart points={chart} />
            <Records room="dental" kind="gamsat" titleLabel="Practice test" fields={[{ key: 'date', label: 'Date', type: 'date', show: true }, { key: 's1', label: 'S1', type: 'number', show: true }, { key: 's2', label: 'S2', type: 'number', show: true }, { key: 's3', label: 'S3', type: 'number', show: true }, { key: 'overall', label: 'Overall', type: 'number', show: true }, { key: 'notes', label: 'What went wrong', type: 'long' }]} sort={(a, b) => String(b.meta?.date ?? '').localeCompare(String(a.meta?.date ?? ''))} empty="Log practice tests to see the trend." />
          </DecoCard>
          <DecoCard title="GAMSAT — WEAK AREAS"><ListCard room="dental" kind="weak" placeholder="Organic chem mechanisms, poetry analysis…" checkable /></DecoCard>
          <DecoCard title="GAMSAT — STUDY TIME"><SessionLog kind="gamsat" subjects={['S1 Humanities', 'S2 Essays', 'S3 Science']} subjectLabel="Section" withRating defaultMinutes={60} /></DecoCard>
          <DecoCard title={`EXPERIENCE LOG · ${expHours} H`}>
            <Records room="dental" kind="experience" titleLabel="Experience" fields={[{ key: 'type', label: 'Type', type: 'select', options: ['Shadowing', 'Volunteering', 'Work', 'Research', 'Leadership'], show: true }, { key: 'date', label: 'Date', type: 'date', show: true }, { key: 'hours', label: 'Hours', type: 'number', show: true }, { key: 'learned', label: 'What I learned (for interviews)', type: 'long' }]} statusKey="type" />
          </DecoCard>
          <DecoCard title="PORTFOLIO OF EVIDENCE"><Records room="dental" kind="portfolio" titleLabel="Evidence" fields={[{ key: 'shows', label: 'What it shows', type: 'text', show: true }, { key: 'link', label: 'Link', type: 'url' }]} /></DecoCard>
        </div>
      </div>
    </div>
  )
}

// ══ THE READING ROOM ══════════════════════════════════════════════════

function BookForm({ book, onClose }: { book: Book | 'new'; onClose: () => void }) {
  const [b, setB] = useState<Book>(book === 'new' ? { id: uid(), title: '', author: '', status: 'toread', pages: 250, pageAt: 0, quotes: [], at: Date.now() } : book)
  const [quote, setQuote] = useState('')
  const up = (p: Partial<Book>) => setB((x) => ({ ...x, ...p }))
  return (
    <div className="flex flex-col gap-3">
      <Field label="TITLE"><input className="deco-input w-full" value={b.title} onChange={(e) => up({ title: e.target.value })} autoFocus /></Field>
      <Field label="AUTHOR"><input className="deco-input w-full" value={b.author} onChange={(e) => up({ author: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="PAGES"><input className="deco-input w-full font-num" inputMode="numeric" value={b.pages} onChange={(e) => up({ pages: Number(e.target.value) || 0 })} /></Field>
        <Field label="ON PAGE"><input className="deco-input w-full font-num" inputMode="numeric" value={b.pageAt} onChange={(e) => up({ pageAt: Number(e.target.value) || 0 })} /></Field>
      </div>
      <Segmented value={b.status} onChange={(status) => up({ status })} options={[{ value: 'toread', label: 'To read' }, { value: 'reading', label: 'Reading' }, { value: 'done', label: 'Done' }]} />
      <Field label="QUOTES">
        <ul className="flex flex-col gap-1 mb-2">{b.quotes.map((q) => <li key={q.id} className="font-body italic text-[15px]">“{q.text}”{q.page ? <span className="font-num not-italic text-[12px] text-[var(--ink-muted)]"> p.{q.page}</span> : null}</li>)}</ul>
        <div className="flex gap-2">
          <input className="deco-input flex-1 min-w-0" value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="A line worth keeping" />
          <button className="deco-btn px-3" onClick={() => { if (quote.trim()) { up({ quotes: [...b.quotes, { id: uid(), text: quote.trim(), page: b.pageAt || undefined }] }); setQuote('') } }}>Save</button>
        </div>
      </Field>
      <div className="flex gap-2">
        <button
          className="deco-btn flex-1"
          onClick={async () => {
            if (!b.title.trim()) return
            const finished = b.status === 'done' && (book === 'new' || book.status !== 'done')
            await db.books.put({ ...b, startedAt: b.startedAt ?? (b.status !== 'toread' ? new Date().toISOString().slice(0, 10) : undefined), finishedAt: finished ? new Date().toISOString().slice(0, 10) : b.finishedAt })
            if (finished) {
              win()
              celebrate()
              toast(`Finished “${b.title}”. Another one for the shelf.`)
            }
            onClose()
          }}
        >
          Save
        </button>
        {book !== 'new' && <button className="deco-btn ghost" onClick={async () => { await db.books.delete(b.id); toast('Book removed', () => db.books.put(b)); onClose() }}>Delete</button>}
      </div>
    </div>
  )
}

export function ReadingRoom() {
  const { today } = useHouse()
  const books = useLiveQuery(() => db.books.toArray(), []) ?? []
  const reading = useSessions('reading')
  const [edit, setEdit] = useState<Book | 'new' | null>(null)
  const idea = IDEAS[((dayNumber(today) % IDEAS.length) + IDEAS.length) % IDEAS.length]
  const ws = weekStart(today)
  const pagesWeek = reading.filter((r) => r.day >= ws).reduce((a, r) => a + (r.num ?? 0), 0)
  const days = Math.max(1, daysBetween(ws, today) + 1)
  const current = books.filter((b) => b.status === 'reading')

  const logPages = async (b: Book, to: number) => {
    const pages = Math.max(0, to - b.pageAt)
    await db.books.update(b.id, { pageAt: Math.min(b.pages, to) })
    if (pages) await db.sessions.add({ id: uid(), day: today, kind: 'reading', subject: b.title, minutes: Math.round(pages * 1.5), num: pages, at: Date.now() })
    if (to >= b.pages) {
      await db.books.update(b.id, { status: 'done', finishedAt: today })
      win()
      celebrate()
      toast(`Finished “${b.title}”.`)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="reading" subtitle={`${pagesWeek} pages this week · ${(pagesWeek / days).toFixed(0)}/day · ${books.filter((b) => b.status === 'done').length} finished`} right={<button className="icon-btn" onClick={() => setEdit('new')} aria-label="Add book"><Icon name="plus" /></button>} />
      <DecoCard title="ONE IDEA A DAY">
        <div className="font-deco text-[11px] tracking-[0.3em] text-[var(--ink-muted)]">{idea.field.toUpperCase()}</div>
        <div className="font-display text-[24px] text-[var(--accent)]">{idea.name}</div>
        <p className="font-body text-[18px] mt-1">{idea.idea}</p>
      </DecoCard>
      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          <DecoCard title="READING NOW">
            {current.map((b) => (
              <div key={b.id} className="mb-4">
                <button className="text-left w-full" onClick={() => setEdit(b)}>
                  <div className="font-body text-[19px]">{b.title}</div>
                  <div className="font-body text-[14px] text-[var(--ink-muted)]">{b.author}</div>
                </button>
                <div className="meter"><div style={{ width: `${b.pages ? (b.pageAt / b.pages) * 100 : 0}%` }} /></div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-num text-[13px] text-[var(--ink-muted)]">p.{b.pageAt} / {b.pages}</span>
                  <div className="flex gap-1">
                    {[5, 10, 25].map((n) => <button key={n} className="mini-btn" onClick={() => logPages(b, b.pageAt + n)}>+{n}</button>)}
                  </div>
                </div>
              </div>
            ))}
            {!current.length && <Empty>Nothing on the go. Pick one from the list.</Empty>}
          </DecoCard>
          <DecoCard title="SAVED QUOTES">
            <ul className="flex flex-col gap-3">
              {books.flatMap((b) => b.quotes.map((q) => ({ b, q }))).slice(-10).reverse().map(({ b, q }) => (
                <li key={q.id}><p className="font-body italic text-[17px]">“{q.text}”</p><p className="font-deco text-[10px] tracking-[0.2em] text-[var(--accent)]">— {b.title.toUpperCase()}</p></li>
              ))}
              {!books.some((b) => b.quotes.length) && <Empty>Save quotes from inside a book.</Empty>}
            </ul>
          </DecoCard>
        </div>
        <div className="flex flex-col gap-5">
          <DecoCard title="THE SHELF">
            {(['toread', 'done'] as const).map((st) => (
              <div key={st} className="mb-3">
                <div className="field-label">{st === 'toread' ? 'TO READ' : 'FINISHED'}</div>
                {books.filter((b) => b.status === st).map((b) => (
                  <button key={b.id} className="list-row w-full text-left" onClick={() => setEdit(b)}>
                    <span className="flex-1 font-body text-[16px]">{b.title} <span className="text-[var(--ink-muted)]">· {b.author}</span></span>
                    {st === 'toread' && <span className="chip" onClick={(e) => { e.stopPropagation(); void db.books.update(b.id, { status: 'reading', startedAt: today }) }}>Start</span>}
                  </button>
                ))}
              </div>
            ))}
            {!books.length && <Empty>Add the books you want to read.</Empty>}
          </DecoCard>
          <DecoCard title="TOPICS TO EXPLORE"><ListCard room="reading" kind="topic" placeholder="Stoicism, behavioural economics, Sikh history…" checkable /></DecoCard>
        </div>
      </div>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'NEW BOOK' : 'BOOK'}>
        {edit && <BookForm book={edit} onClose={() => setEdit(null)} />}
      </Sheet>
    </div>
  )
}

// ══ THE SKILLS FORGE ══════════════════════════════════════════════════

export function SkillsForge() {
  const { today } = useHouse()
  const skills = useItems('forge', 'skill').sort((a, b) => a.at - b.at)
  const sessions = useSessions('skill')
  const hoursOf = (name: string) => sessions.filter((s) => s.subject === name).reduce((a, s) => a + s.minutes, 0) / 60
  const n = dayNumber(today)
  const todays = [WORDS[((n * 2) % WORDS.length + WORDS.length) % WORDS.length], WORDS[((n * 2 + 1) % WORDS.length + WORDS.length) % WORDS.length]]
  const ws = weekStart(today)
  const keysWeek = sessions.filter((s) => s.subject === 'Keyboard' && s.day >= ws).reduce((a, s) => a + s.minutes, 0)
  const names = skills.map((s) => s.text)
  const milestones = useMemo(() => [20, 100], [])

  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="forge" subtitle={`${(sessions.reduce((a, s) => a + s.minutes, 0) / 60).toFixed(1)} hours forged · keys ${keysWeek} min this week`} />
      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          <DecoCard title="THE SKILLS">
            <ul className="flex flex-col gap-3">
              {skills.map((s) => {
                const h = hoursOf(s.text)
                const next = milestones.find((m) => h < m) ?? 100
                return (
                  <li key={s.id}>
                    <div className="flex items-baseline justify-between">
                      <span className="font-body text-[18px]">{s.text}</span>
                      <span className="font-num text-[13px] text-[var(--ink-muted)]">{h.toFixed(1)} / {next} h{h >= 100 ? ' ✦ MASTERED 100' : h >= 20 ? ' ✦ 20 CLEARED' : ''}</span>
                    </div>
                    <div className="meter"><div style={{ width: `${Math.min(100, (h / next) * 100)}%` }} /></div>
                  </li>
                )
              })}
            </ul>
            <div className="mt-3"><ListCard room="forge" kind="skill" placeholder="Add a skill (Photography, Bhangra, Spanish…)" /></div>
            <p className="font-body text-[12px] text-[var(--ink-muted)] mt-2">20 hours gets you past the awkward beginner stage. 100 hours makes it yours.</p>
          </DecoCard>
          <DecoCard title="LOG PRACTICE"><SessionLog kind="skill" subjects={names.length ? names : ['Keyboard', 'Cooking']} subjectLabel="Skill" withRating defaultMinutes={30} /></DecoCard>
          <DecoCard title="LANGUAGE CORNER">
            <div className="grid grid-cols-2 gap-3">
              {todays.map((w) => (
                <div key={w.word} className="text-center">
                  <div className="font-deco text-[10px] tracking-[0.3em] text-[var(--ink-muted)]">{w.script === 'hi' ? 'HINDI' : 'PUNJABI'}</div>
                  <div className="sanskrit !text-[30px]">{w.word}</div>
                  <div className="font-body italic text-[15px] text-[var(--accent)]">{w.translit}</div>
                  <div className="font-body text-[15px]">{w.meaning}</div>
                </div>
              ))}
            </div>
          </DecoCard>
        </div>
        <div className="flex flex-col gap-5">
          <DecoCard title="KEYBOARD — SONGS I’M LEARNING"><ListCard room="forge" kind="song" placeholder="Song" subPlaceholder="Artist · which part" checkable /></DecoCard>
          <DecoCard title="COOK SOMETHING NEW">
            <Records room="forge" kind="cooked" titleLabel="Dish" fields={[{ key: 'date', label: 'Date', type: 'date', show: true }, { key: 'rating', label: 'Rating /10', type: 'number', show: true }, { key: 'notes', label: 'What I’d change', type: 'long' }]} sort={(a, b) => String(b.meta?.date ?? '').localeCompare(String(a.meta?.date ?? ''))} empty="Log every new dish." />
            <div className="mt-3"><MediaBoard room="forge" kind="food" empty="Food photos go here." /></div>
          </DecoCard>
          <DecoCard title="RECIPE BANK"><Records room="forge" kind="recipe" titleLabel="Recipe" fields={[{ key: 'protein', label: 'Protein (g / serve)', type: 'number', show: true }, { key: 'time', label: 'Time (min)', type: 'number', show: true }, { key: 'ingredients', label: 'Ingredients', type: 'long' }, { key: 'method', label: 'Method', type: 'long' }]} /></DecoCard>
          <DecoCard title="KITCHEN WINS"><ListCard room="forge" kind="win" placeholder="First time making perfect rotis…" withDate /></DecoCard>
        </div>
      </div>
    </div>
  )
}
