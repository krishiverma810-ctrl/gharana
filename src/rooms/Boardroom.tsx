import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DecoCard } from '../components/DecoCard'
import { Empty, Field, RoomHeader, Sheet } from '../components/ui'
import { Icon } from '../components/Icon'
import { ListCard } from '../components/ListCard'
import { AskAlfred, LineChart, MediaBoard, NotesPad, Records, useItems } from '../components/Kit'
import { db, uid } from '../db/db'
import { useHouse } from '../app/house'
import { celebrate, toast } from '../store/ui'
import { win } from '../lib/sound'
import { daysBetween, dayNumber, shortDate } from '../lib/time'
import { CHANGELOG, TACTICS } from '../config/library'
import type { Deal, DealStage } from '../db/types'

// WING IV — THE BOARDROOM: Closer, NAZARA HQ, K.S. VOL. 1 Studio, App Lab, Job Desk, MPA Desk.

// ── THE CLOSER ────────────────────────────────────────────────────────
const STAGES: { id: DealStage; name: string }[] = [
  { id: 'radar', name: 'ON THE RADAR' },
  { id: 'table', name: 'AT THE TABLE' },
  { id: 'closing', name: 'CLOSING' },
  { id: 'won', name: 'WON' },
]
const DEAL_CATS = ['NAZARA', 'K.S. VOL. 1', 'Job', 'Study', 'Licence', 'Money', 'Personal', 'MPA']

async function moveDeal(d: Deal, stage: DealStage) {
  const before = { ...d }
  await db.deals.update(d.id, { stage, closedAt: stage === 'won' || stage === 'lost' ? Date.now() : undefined })
  if (stage === 'won' && d.stage !== 'won') {
    // A plaque on the Wins Wall — forever.
    await db.items.add({ id: uid(), room: 'trophy', kind: 'win', text: d.title, sub: d.category, date: new Date().toISOString().slice(0, 10), at: Date.now() })
    win()
    celebrate()
    toast(`CLOSED: ${d.title}. A plaque goes on the Wins Wall.`)
  } else toast(`${d.title} → ${STAGES.find((s) => s.id === stage)?.name ?? 'LOST'}`, () => db.deals.put(before))
}

function DealForm({ deal, onClose }: { deal: Deal | 'new'; onClose: () => void }) {
  const [d, setD] = useState<Deal>(deal === 'new' ? { id: uid(), title: '', category: 'NAZARA', stage: 'radar', order: Date.now(), createdAt: Date.now() } : deal)
  const up = (p: Partial<Deal>) => setD((x) => ({ ...x, ...p }))
  return (
    <div className="flex flex-col gap-3">
      <Field label="THE DEAL"><input className="deco-input w-full" value={d.title} onChange={(e) => up({ title: e.target.value })} placeholder="Get the GYG shift lead role, NAZARA drop 2…" autoFocus /></Field>
      <Field label="CATEGORY"><div className="flex flex-wrap gap-2">{DEAL_CATS.map((c) => <button key={c} className={`chip ${d.category === c ? 'on' : ''}`} onClick={() => up({ category: c })}>{c}</button>)}</div></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="DEADLINE"><input type="date" className="deco-input w-full font-num" value={d.due ?? ''} onChange={(e) => up({ due: e.target.value || undefined })} /></Field>
        <Field label="VALUE ($, OPTIONAL)"><input className="deco-input w-full font-num" inputMode="decimal" value={d.value ?? ''} onChange={(e) => up({ value: e.target.value ? Number(e.target.value) : undefined })} /></Field>
      </div>
      <Field label="NEXT MOVE / NOTES"><textarea className="deco-input w-full" rows={4} value={d.notes ?? ''} onChange={(e) => up({ notes: e.target.value })} /></Field>
      <div className="flex gap-2">
        <button className="deco-btn flex-1" onClick={async () => { if (!d.title.trim()) return; await db.deals.put({ ...d, title: d.title.trim() }); onClose() }}>Save</button>
        {deal !== 'new' && d.stage !== 'lost' && <button className="deco-btn ghost" onClick={async () => { await moveDeal(d, 'lost'); onClose() }}>Mark lost</button>}
        {deal !== 'new' && <button className="deco-btn ghost danger" onClick={async () => { await db.deals.delete(d.id); toast('Deal deleted', () => db.deals.put(d)); onClose() }}>Delete</button>}
      </div>
    </div>
  )
}

export function Closer() {
  const { today } = useHouse()
  const deals = useLiveQuery(() => db.deals.orderBy('order').toArray(), []) ?? []
  const wins = useItems('trophy', 'win').sort((a, b) => b.at - a.at)
  const [edit, setEdit] = useState<Deal | 'new' | null>(null)
  const [drag, setDrag] = useState<string | null>(null)
  const [showLost, setShowLost] = useState(false)
  const tactic = TACTICS[((dayNumber(today) % TACTICS.length) + TACTICS.length) % TACTICS.length]
  const open = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost')

  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="closer" subtitle={`${open.length} deals in play · ${wins.length} closed`} right={<button className="icon-btn" onClick={() => setEdit('new')} aria-label="New deal"><Icon name="plus" /></button>} />
      <DecoCard title="TODAY’S TACTIC">
        <div className="font-display text-[22px] text-[var(--accent)]">{tactic.name}</div>
        <p className="font-body text-[17px] mt-1">{tactic.how}</p>
      </DecoCard>
      <div className="kanban" data-noswipe>
        {STAGES.map((s) => {
          const col = deals.filter((d) => d.stage === s.id)
          return (
            <section
              key={s.id}
              className={`kanban-col ${drag ? 'droppable' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                const d = deals.find((x) => x.id === drag)
                if (d && d.stage !== s.id) void moveDeal(d, s.id)
                setDrag(null)
              }}
            >
              <h3 className="kanban-head">{s.name} <span className="font-num">{col.length}</span></h3>
              {col.map((d) => {
                const idx = STAGES.findIndex((x) => x.id === d.stage)
                const late = d.due && d.due < today && d.stage !== 'won'
                return (
                  <article key={d.id} className={`deal ${d.stage === 'won' ? 'won' : ''}`} draggable onDragStart={() => setDrag(d.id)} onDragEnd={() => setDrag(null)}>
                    <button className="text-left w-full" onClick={() => setEdit(d)}>
                      <div className="font-deco text-[9.5px] tracking-[0.2em] text-[var(--accent)]">{d.category.toUpperCase()}</div>
                      <div className="font-body text-[17px] leading-tight">{d.title}</div>
                      {(d.due || d.value) && (
                        <div className={`font-num text-[12px] mt-1 ${late ? 'text-[#e88a74]' : 'text-[var(--ink-muted)]'}`}>
                          {d.due ? (late ? `overdue ${shortDate(d.due)}` : `${daysBetween(today, d.due)}d · ${shortDate(d.due)}`) : ''}
                          {d.value ? ` · $${d.value.toLocaleString()}` : ''}
                        </div>
                      )}
                    </button>
                    {d.stage !== 'won' && (
                      <div className="flex justify-between mt-2">
                        <button className="mini-btn" disabled={idx === 0} onClick={() => moveDeal(d, STAGES[idx - 1].id)} aria-label="Move back">◀</button>
                        <button className="mini-btn" onClick={() => moveDeal(d, STAGES[idx + 1].id)} aria-label="Move forward">{STAGES[idx + 1].id === 'won' ? 'CLOSE ★' : '▶'}</button>
                      </div>
                    )}
                  </article>
                )
              })}
              {!col.length && <p className="font-body italic text-[13px] text-[var(--ink-muted)] text-center py-2">—</p>}
            </section>
          )
        })}
      </div>
      <button className="chip self-start" onClick={() => setShowLost(!showLost)}>{showLost ? 'Hide' : 'Show'} lost deals ({deals.filter((d) => d.stage === 'lost').length})</button>
      {showLost && (
        <ul>{deals.filter((d) => d.stage === 'lost').map((d) => <li key={d.id} className="list-row"><span className="flex-1 font-body">{d.title}</span><button className="chip" onClick={() => moveDeal(d, 'radar')}>Revive</button></li>)}</ul>
      )}
      <DecoCard title="THE WINS WALL">
        <div className="plaques">
          {wins.map((w) => (
            <div key={w.id} className="plaque">
              <div className="font-deco text-[9px] tracking-[0.3em]">{(w.sub ?? 'WIN').toUpperCase()}</div>
              <div className="font-display text-[17px] leading-tight mt-1">{w.text}</div>
              <div className="font-num text-[11px] mt-1 opacity-80">{w.date ? shortDate(w.date) : ''}</div>
            </div>
          ))}
          {!wins.length && <Empty>Close your first deal to hang a plaque.</Empty>}
        </div>
      </DecoCard>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'NEW DEAL' : 'THE DEAL'}>
        {edit && <DealForm deal={edit} onClose={() => setEdit(null)} />}
      </Sheet>
    </div>
  )
}

// ── NAZARA HQ ─────────────────────────────────────────────────────────
export function NazaraHQ() {
  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="nazara" subtitle="Heritage streetwear · with Sidak" />
      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          <DecoCard title="DROPS ROADMAP">
            <Records
              room="nazara" kind="drop" titleLabel="Drop"
              fields={[{ key: 'date', label: 'Release date', type: 'date', show: true }, { key: 'status', label: 'Status', type: 'select', options: ['Idea', 'Designing', 'Sampling', 'Production', 'Live', 'Sold out'] }, { key: 'pieces', label: 'Pieces', type: 'text', show: true }, { key: 'notes', label: 'Notes', type: 'long' }]}
              statusKey="status" sort={(a, b) => String(a.meta?.date ?? '9').localeCompare(String(b.meta?.date ?? '9'))} empty="Plan the next drop."
            />
          </DecoCard>
          <DecoCard title="TO-DOS WITH SIDAK"><ListCard room="nazara" kind="todo" placeholder="Order samples, shoot lookbook…" subPlaceholder="Who: Krishi / Sidak / both" checkable /></DecoCard>
          <DecoCard title="CONTENT CALENDAR"><ListCard room="nazara" kind="content" placeholder="Post / reel idea" withDate checkable /></DecoCard>
          <DecoCard title="SALES + ORDERS">
            <Records
              room="nazara" kind="order" titleLabel="Order"
              fields={[{ key: 'date', label: 'Date', type: 'date', show: true }, { key: 'amount', label: '$', type: 'number', show: true }, { key: 'qty', label: 'Qty', type: 'number', show: true }, { key: 'channel', label: 'Channel', type: 'select', options: ['Instagram', 'Website', 'In person', 'Market', 'Other'] }]}
              summary={(items) => {
                const total = items.reduce((a, i) => a + Number(i.meta?.amount ?? 0), 0)
                const qty = items.reduce((a, i) => a + Number(i.meta?.qty ?? 0), 0)
                return <div className="font-body text-[16px]">Total sales <span className="font-num text-[var(--accent)]">${total.toLocaleString()}</span> · <span className="font-num">{qty}</span> pieces · <span className="font-num">{items.length}</span> orders</div>
              }}
            />
          </DecoCard>
        </div>
        <div className="flex flex-col gap-5">
          <DecoCard title="DESIGN IDEAS"><MediaBoard room="nazara" kind="design" empty="Upload sketches, mockups, references." /></DecoCard>
          <DecoCard title="INSPO MOODBOARD"><MediaBoard room="nazara" kind="mood" empty="Phulkari, deco, old Punjab photos…" /></DecoCard>
          <DecoCard title="SUPPLIERS + CONTACTS"><ListCard room="nazara" kind="contact" placeholder="Name / business" subPlaceholder="What they do · phone / IG" /></DecoCard>
          <DecoCard title="“UNDER THE GAZE” — BRAND NOTES"><NotesPad k="nazara-brand" placeholder="The story, the values, the voice, the customer…" rows={10} /></DecoCard>
        </div>
      </div>
    </div>
  )
}

// ── K.S. VOL. 1 STUDIO ────────────────────────────────────────────────
export function KSStudio() {
  const posts = useItems('ksvol1', 'post')
  const growth = useMemo(() => {
    const sorted = [...posts].filter((p) => p.meta?.date).sort((a, b) => String(a.meta!.date).localeCompare(String(b.meta!.date)))
    let follows = 0
    return sorted.map((p) => {
      follows += Number(p.meta?.follows ?? 0)
      return { label: shortDate(String(p.meta!.date)).replace(/^\w+ /, ''), value: follows }
    })
  }, [posts])
  const totals = posts.reduce((a, p) => ({ views: a.views + Number(p.meta?.views ?? 0), likes: a.likes + Number(p.meta?.likes ?? 0), follows: a.follows + Number(p.meta?.follows ?? 0) }), { views: 0, likes: 0, follows: 0 })
  const best = [...posts].sort((a, b) => Number(b.meta?.views ?? 0) - Number(a.meta?.views ?? 0))[0]
  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="ksvol1" subtitle={`${posts.length} posts · ${totals.views.toLocaleString()} views · +${totals.follows} follows`} />
      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          <DecoCard title="GROWTH (FOLLOWS FROM POSTS)">
            <LineChart points={growth} />
            {best && <p className="font-body text-[15px] text-[var(--ink-muted)] mt-2">Best so far: <span className="text-[var(--ink)]">{best.text}</span> — {Number(best.meta?.views ?? 0).toLocaleString()} views</p>}
          </DecoCard>
          <DecoCard title="POSTED VIDEOS">
            <Records
              room="ksvol1" kind="post" titleLabel="Video"
              fields={[{ key: 'date', label: 'Posted', type: 'date', show: true }, { key: 'views', label: 'Views', type: 'number', show: true }, { key: 'likes', label: 'Likes', type: 'number', show: true }, { key: 'follows', label: 'Follows', type: 'number', show: true }, { key: 'url', label: 'Link', type: 'url' }, { key: 'hook', label: 'Hook used', type: 'text' }]}
              sort={(a, b) => String(b.meta?.date ?? '').localeCompare(String(a.meta?.date ?? ''))} empty="Log every video — the numbers tell you what works."
            />
          </DecoCard>
          <DecoCard title="POSTING CALENDAR"><ListCard room="ksvol1" kind="schedule" placeholder="What’s going up" withDate checkable /></DecoCard>
        </div>
        <div className="flex flex-col gap-5">
          <DecoCard title="IDEAS BANK"><ListCard room="ksvol1" kind="idea" placeholder="Video idea" subPlaceholder="Format / who’s in it" checkable /></DecoCard>
          <DecoCard title="HOOKS BANK"><ListCard room="ksvol1" kind="hook" placeholder="“Nobody tells you this about…”" /></DecoCard>
          <DecoCard title="TRENDS TO TRY"><ListCard room="ksvol1" kind="trend" placeholder="Trend / sound" subPlaceholder="Link or how it goes" checkable /></DecoCard>
          <DecoCard title="SCRIPTS + SHOT LISTS">
            <Records room="ksvol1" kind="script" titleLabel="Script" fields={[{ key: 'script', label: 'Script', type: 'long' }, { key: 'shots', label: 'Shot list', type: 'long' }, { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Ready', 'Filmed', 'Posted'] }]} statusKey="status" />
          </DecoCard>
          <DecoCard title="TRAVEL CONTENT — GOLD COAST + INDIA"><ListCard room="ksvol1" kind="travel" placeholder="Beach POV, market walk, wedding prep…" subPlaceholder="Gold Coast / India" checkable /></DecoCard>
          <DecoCard title="STRATEGY WITH ALFRED">
            <AskAlfred label="Ask ALFRED for 5 video ideas" build={() => `Switch to strategist mode for this one. Based on my K.S. VOL. 1 TikTok stats (${posts.length} posts, ${totals.views} total views, best: "${best?.text ?? 'n/a'}"), give me 5 specific video ideas with a hook line each. Keep it tight.`} />
          </DecoCard>
        </div>
      </div>
    </div>
  )
}

// ── THE APP LAB ───────────────────────────────────────────────────────
export function AppLab() {
  const requests = useItems('applab', 'feature')
  const open = requests.filter((r) => !r.done)
  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="applab" subtitle="The Scroll App + GHARANA’s own workshop" />
      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          <DecoCard title="SCROLL APP — FEATURES"><ListCard room="applab" kind="scroll-feature" placeholder="Feature" subPlaceholder="Why it matters" checkable /></DecoCard>
          <DecoCard title="SCROLL APP — SCREENS"><ListCard room="applab" kind="scroll-screen" placeholder="Screen (Feed, Topic picker…)" subPlaceholder="What’s on it" /></DecoCard>
          <DecoCard title="SCROLL APP — TO-DO"><ListCard room="applab" kind="scroll-todo" placeholder="Next step" checkable /></DecoCard>
          <DecoCard title="SCROLL APP — NOTES"><NotesPad k="scroll-app" placeholder="The vision, the audience, the business model…" /></DecoCard>
        </div>
        <div className="flex flex-col gap-5">
          <DecoCard title="GHARANA — FEATURE REQUESTS">
            <ListCard room="applab" kind="feature" placeholder="What should the house do next?" checkable />
            <button
              className="deco-btn w-full mt-3"
              disabled={!open.length}
              onClick={() => {
                const text = `Read GHARANA_v3_BUILD_PROMPT.md, then build these feature requests from the App Lab:\n${open.map((r, i) => `${i + 1}. ${r.text}`).join('\n')}`
                void navigator.clipboard?.writeText(text).then(() => toast('Copied — paste it to Claude Code'))
              }}
            >
              Copy as a request for Claude Code ({open.length})
            </button>
          </DecoCard>
          <DecoCard title="CHANGELOG">
            <ol className="flex flex-col gap-3">
              {[...CHANGELOG].reverse().map((c) => (
                <li key={c.phase}>
                  <div className="font-deco text-[11px] tracking-[0.25em] text-[var(--accent)]">{c.phase.toUpperCase()} · {c.date.toUpperCase()}</div>
                  <p className="font-body text-[16px]">{c.notes}</p>
                </li>
              ))}
            </ol>
          </DecoCard>
        </div>
      </div>
    </div>
  )
}

// ── THE JOB DESK ──────────────────────────────────────────────────────
const APP_STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected', 'Ghosted', 'Accepted']

export function JobDesk() {
  const { today } = useHouse()
  const apps = useItems('jobs', 'application')
  const followUps = apps.filter((a) => a.meta?.followUp && String(a.meta.followUp) <= today && !['Rejected', 'Accepted'].includes(String(a.meta.status)))
  const driving = useLiveQuery(() => db.sessions.where('kind').equals('driving').toArray(), []) ?? []
  const hours = driving.reduce((a, s) => a + s.minutes, 0) / 60
  const night = driving.filter((s) => s.night).reduce((a, s) => a + s.minutes, 0) / 60
  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="jobs" subtitle={`${apps.length} applications · ${hours.toFixed(1)} logbook hours`} />
      {followUps.length > 0 && (
        <DecoCard title="FOLLOW UP TODAY">
          <ul>{followUps.map((a) => <li key={a.id} className="font-body text-[17px]">→ {a.text} <span className="text-[var(--ink-muted)]">({String(a.meta?.company ?? '')})</span></li>)}</ul>
        </DecoCard>
      )}
      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          <DecoCard title="APPLICATIONS">
            <Records
              room="jobs" kind="application" titleLabel="Role"
              fields={[{ key: 'company', label: 'Company', type: 'text', show: true }, { key: 'date', label: 'Applied', type: 'date', show: true }, { key: 'status', label: 'Status', type: 'select', options: APP_STATUSES }, { key: 'followUp', label: 'Follow up on', type: 'date' }, { key: 'url', label: 'Link', type: 'url' }, { key: 'notes', label: 'Notes', type: 'long' }]}
              statusKey="status" sort={(a, b) => String(b.meta?.date ?? '').localeCompare(String(a.meta?.date ?? ''))}
              summary={(items) => <div className="flex flex-wrap gap-2">{APP_STATUSES.map((s) => <span key={s} className="chip">{s} <span className="font-num ml-1">{items.filter((i) => i.meta?.status === s).length}</span></span>)}</div>}
            />
          </DecoCard>
          <DecoCard title="INTERVIEW LOG"><Records room="jobs" kind="interview" titleLabel="Interview" fields={[{ key: 'date', label: 'Date', type: 'date', show: true }, { key: 'company', label: 'Company', type: 'text', show: true }, { key: 'questions', label: 'Questions they asked', type: 'long' }, { key: 'lessons', label: 'What to do better', type: 'long' }]} /></DecoCard>
          <DecoCard title="RESUME VERSIONS"><Records room="jobs" kind="resume" titleLabel="Version" fields={[{ key: 'date', label: 'Updated', type: 'date', show: true }, { key: 'target', label: 'Tailored for', type: 'text', show: true }, { key: 'link', label: 'Link (Drive / iCloud)', type: 'url' }, { key: 'changes', label: 'What changed', type: 'long' }]} /></DecoCard>
          <DecoCard title="COVER LETTER BANK"><Records room="jobs" kind="cover" titleLabel="Letter" fields={[{ key: 'for', label: 'Used for', type: 'text', show: true }, { key: 'body', label: 'Letter', type: 'long' }]} /></DecoCard>
        </div>
        <div className="flex flex-col gap-5">
          <DecoCard title="P LICENCE — LOGBOOK">
            <div className="grid grid-cols-2 text-center mb-3">
              <div><div className="font-num text-[26px]">{hours.toFixed(1)}</div><div className="field-label">TOTAL HOURS</div></div>
              <div><div className="font-num text-[26px]">{night.toFixed(1)}</div><div className="field-label">NIGHT HOURS</div></div>
            </div>
            <p className="font-body text-[13px] text-[var(--ink-muted)] mb-3">Check your exact hour requirements with VicRoads — they depend on your age.</p>
            <LogbookLogger />
          </DecoCard>
          <DecoCard title="LICENCE CHECKLIST"><ListCard room="jobs" kind="licence" placeholder="Add a step" checkable /></DecoCard>
          <DecoCard title="TEST BOOKINGS"><ListCard room="jobs" kind="booking" placeholder="Hazard Perception / Drive test" subPlaceholder="Where + time" withDate /></DecoCard>
        </div>
      </div>
    </div>
  )
}

function LogbookLogger() {
  const { today } = useHouse()
  const [mins, setMins] = useState(60)
  const [nightDrive, setNight] = useState(false)
  const [sup, setSup] = useState('')
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <input className="deco-input w-24 font-num" inputMode="numeric" value={mins} onChange={(e) => setMins(Number(e.target.value) || 0)} />
        <span className="font-body text-[var(--ink-muted)]">min</span>
        <button className={`chip ${nightDrive ? 'on' : ''}`} onClick={() => setNight(!nightDrive)}>Night</button>
        <input className="deco-input flex-1 min-w-0" value={sup} onChange={(e) => setSup(e.target.value)} placeholder="Supervisor" />
      </div>
      <button className="deco-btn" onClick={async () => { if (mins <= 0) return; const s = { id: uid(), day: today, kind: 'driving', subject: sup.trim() || 'Drive', minutes: mins, night: nightDrive, at: Date.now() }; await db.sessions.add(s); toast(`${mins} min drive logged`, () => db.sessions.delete(s.id)) }}>Log drive</button>
    </div>
  )
}

// ── MPA DESK ──────────────────────────────────────────────────────────
export function MpaDesk() {
  const queue = useItems('mpa', 'poster')
  const { today } = useHouse()
  const due = queue.filter((q) => q.meta?.status !== 'Delivered' && q.meta?.due && String(q.meta.due) >= today).length
  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="mpa" subtitle={`Melbourne Punjabi Association · ${due} posters due`} />
      <div className="bp-layout">
        <DecoCard title="DESIGN QUEUE">
          <Records
            room="mpa" kind="poster" titleLabel="Poster / event"
            fields={[{ key: 'due', label: 'Due', type: 'date', show: true }, { key: 'event', label: 'Event date', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: ['Brief', 'Designing', 'Review', 'Delivered'] }, { key: 'brief', label: 'Brief / text to include', type: 'long' }, { key: 'contact', label: 'Contact', type: 'text', show: true }]}
            statusKey="status" sort={(a, b) => String(a.meta?.due ?? '9').localeCompare(String(b.meta?.due ?? '9'))} empty="No posters in the queue."
          />
        </DecoCard>
        <DecoCard title="FINISHED DESIGNS"><MediaBoard room="mpa" kind="gallery" empty="Upload finished posters for your portfolio." /></DecoCard>
      </div>
    </div>
  )
}
