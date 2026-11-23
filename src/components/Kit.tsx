import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, uid } from '../db/db'
import type { Item, Media, Session } from '../db/types'
import { toast } from '../store/ui'
import { useHouse } from '../app/house'
import { Icon } from './Icon'
import { Dots, Empty, Sheet, Stepper } from './ui'
import { shortDate, weekStart } from '../lib/time'
import { addItem, removeItem, useItems } from './ListCard'

// Shared building blocks for the Boardroom + Library rooms.

// ── Image boards (design ideas, moodboards, cooking photos, posters) ──

/** Shrink an image to a ~1000px JPEG data URL so boards stay light and export cleanly. */
export async function fileToDataUrl(file: File, max = 1000): Promise<string> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.8)
}

export function MediaBoard({ room, kind, empty }: { room: string; kind: string; empty?: string }) {
  const media = useLiveQuery(() => db.media.where('[room+kind]').equals([room, kind]).reverse().sortBy('at'), [room, kind]) ?? []
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState<Media | null>(null)
  const add = async (files: FileList | null) => {
    if (!files) return
    for (const f of Array.from(files).slice(0, 8)) {
      try {
        await db.media.add({ id: uid(), room, kind, data: await fileToDataUrl(f), at: Date.now() })
      } catch {
        toast(`Couldn't read ${f.name}`)
      }
    }
  }
  return (
    <div>
      <div className="media-grid">
        <button className="media-add" onClick={() => input.current?.click()} aria-label="Add images">
          <Icon name="plus" size={26} />
          <span>Add</span>
        </button>
        {media.map((m) => (
          <button key={m.id} className="media-tile" onClick={() => setOpen(m)}>
            <img src={m.data} alt={m.caption ?? ''} loading="lazy" />
            {m.caption && <span>{m.caption}</span>}
          </button>
        ))}
      </div>
      {!media.length && <Empty>{empty ?? 'No images yet.'}</Empty>}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { void add(e.target.files); e.target.value = '' }} />
      <Sheet open={!!open} onClose={() => setOpen(null)} title="IMAGE">
        {open && (
          <div className="flex flex-col gap-3">
            <img src={open.data} alt="" className="w-full max-h-[60vh] object-contain" />
            <input className="deco-input" defaultValue={open.caption} placeholder="Caption" onBlur={(e) => db.media.update(open.id, { caption: e.target.value })} />
            <button
              className="deco-btn ghost danger"
              onClick={async () => {
                const m = open
                await db.media.delete(m.id)
                setOpen(null)
                toast('Image removed', () => db.media.put(m))
              }}
            >
              Delete image
            </button>
          </div>
        )}
      </Sheet>
    </div>
  )
}

// ── A single saved notes pad ──────────────────────────────────────────
export function NotesPad({ k, placeholder, rows = 8 }: { k: string; placeholder?: string; rows?: number }) {
  const [text, setText] = useState<string | null>(null)
  useEffect(() => {
    void db.kv.get(`notes:${k}`).then((r) => setText((r?.value as string) ?? ''))
  }, [k])
  useEffect(() => {
    if (text === null) return
    const t = setTimeout(() => void db.kv.put({ key: `notes:${k}`, value: text }), 500)
    return () => clearTimeout(t)
  }, [k, text])
  if (text === null) return null
  return <textarea className="deco-input w-full" rows={rows} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
}

// ── Time logger (study, skills, reading, driving…) ────────────────────
export function useSessions(kind: string): Session[] {
  return useLiveQuery(() => db.sessions.where('kind').equals(kind).reverse().sortBy('at'), [kind]) ?? []
}

interface SessionLogProps {
  kind: string
  subjects: string[]
  subjectLabel?: string
  withRating?: boolean
  withNum?: string // label for an extra number (e.g. "pages")
  withNight?: boolean
  defaultMinutes?: number
}

export function SessionLog({ kind, subjects, subjectLabel = 'Subject', withRating, withNum, withNight, defaultMinutes = 45 }: SessionLogProps) {
  const { today } = useHouse()
  const sessions = useSessions(kind)
  const [subject, setSubject] = useState(subjects[0] ?? '')
  const [custom, setCustom] = useState('')
  const [minutes, setMinutes] = useState(defaultMinutes)
  const [rating, setRating] = useState(3)
  const [num, setNum] = useState(0)
  const [night, setNight] = useState(false)
  const [notes, setNotes] = useState('')
  useEffect(() => {
    if (!subject && subjects[0]) setSubject(subjects[0])
  }, [subjects, subject])
  const ws = weekStart(today)
  const week = sessions.filter((s) => s.day >= ws)
  const add = async () => {
    const subj = (custom.trim() || subject).trim()
    if (!subj || minutes <= 0) return
    const s: Session = { id: uid(), day: today, kind, subject: subj, minutes, rating: withRating ? rating : undefined, num: withNum ? num : undefined, night: withNight ? night : undefined, notes: notes.trim() || undefined, at: Date.now() }
    await db.sessions.add(s)
    setCustom('')
    setNotes('')
    toast(`${minutes} min of ${subj} logged`, () => db.sessions.delete(s.id))
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" data-noswipe>
        {subjects.map((s) => <button key={s} className={`chip ${subject === s && !custom ? 'on' : ''}`} onClick={() => { setSubject(s); setCustom('') }}>{s}</button>)}
        <input className="deco-input w-36" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={`Other ${subjectLabel.toLowerCase()}`} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Stepper value={minutes} onChange={setMinutes} step={5} min={5} suffix="min" />
        {withNum && <Stepper value={num} onChange={setNum} step={1} min={0} suffix={withNum} />}
        {withRating && (
          <div className="flex items-center gap-2"><span className="field-label !mb-0">FOCUS</span><Dots value={rating} onChange={setRating} /></div>
        )}
        {withNight && <button className={`chip ${night ? 'on' : ''}`} onClick={() => setNight(!night)}>Night</button>}
      </div>
      <input className="deco-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
      <button className="deco-btn" onClick={add}>Log it</button>
      <div className="font-body text-[15px] text-[var(--ink-muted)]">
        This week: <span className="font-num text-[var(--ink)]">{(week.reduce((a, s) => a + s.minutes, 0) / 60).toFixed(1)} h</span> · All time: <span className="font-num text-[var(--ink)]">{(sessions.reduce((a, s) => a + s.minutes, 0) / 60).toFixed(1)} h</span>
      </div>
      <ul>
        {sessions.slice(0, 8).map((s) => (
          <li key={s.id} className="list-row">
            <span className="font-num text-[12px] text-[var(--ink-muted)] w-16">{s.day === today ? 'Today' : shortDate(s.day).replace(/^\w+ /, '')}</span>
            <span className="flex-1 font-body text-[16px] truncate">{s.subject}{s.notes ? ` · ${s.notes}` : ''}{s.night ? ' · night' : ''}</span>
            <span className="font-num text-[14px]">{s.minutes}m{s.num ? ` · ${s.num} ${withNum ?? ''}` : ''}</span>
            <button className="icon-btn" aria-label="Delete" onClick={async () => { await db.sessions.delete(s.id); toast('Removed', () => db.sessions.put(s)) }}><Icon name="trash" size={14} /></button>
          </li>
        ))}
        {!sessions.length && <Empty>Nothing logged yet.</Empty>}
      </ul>
    </div>
  )
}

// ── Records: a list with structured fields (applications, posts, orders…) ──
export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'url' | 'long'
  options?: string[]
  /** Shown in the row's second line. */
  show?: boolean
}

interface RecordsProps {
  room: string
  kind: string
  titleLabel: string
  fields: FieldDef[]
  empty?: string
  /** Colour-code rows by the value of this select field. */
  statusKey?: string
  sort?: (a: Item, b: Item) => number
  summary?: (items: Item[]) => React.ReactNode
}

export function Records({ room, kind, titleLabel, fields, empty, statusKey, sort, summary }: RecordsProps) {
  const items = useItems(room, kind)
  const [edit, setEdit] = useState<Item | 'new' | null>(null)
  const sorted = [...items].sort(sort ?? ((a, b) => b.at - a.at))
  return (
    <div className="flex flex-col gap-3">
      {summary?.(items)}
      <button className="deco-btn ghost" onClick={() => setEdit('new')}>Add {titleLabel.toLowerCase()}</button>
      <ul>
        {sorted.map((it) => (
          <li key={it.id}>
            <button className="list-row w-full text-left" onClick={() => setEdit(it)}>
              {statusKey && it.meta?.[statusKey] && <span className={`status-pill s-${String(it.meta[statusKey]).toLowerCase().replace(/\s+/g, '-')}`}>{String(it.meta[statusKey])}</span>}
              <span className="flex-1 min-w-0">
                <span className="block font-body text-[17px] truncate">{it.text}</span>
                <span className="block font-body text-[13px] text-[var(--ink-muted)] truncate">
                  {fields.filter((f) => f.show && it.meta?.[f.key] !== undefined && it.meta?.[f.key] !== '').map((f) => (f.type === 'date' ? shortDate(String(it.meta![f.key])) : `${f.type === 'number' ? `${f.label} ` : ''}${it.meta![f.key]}`)).join(' · ')}
                </span>
              </span>
              <Icon name="chevron" size={14} />
            </button>
          </li>
        ))}
        {!items.length && <Empty>{empty ?? 'Nothing yet.'}</Empty>}
      </ul>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? `NEW ${titleLabel.toUpperCase()}` : titleLabel.toUpperCase()}>
        {edit && <RecordForm room={room} kind={kind} item={edit} titleLabel={titleLabel} fields={fields} onClose={() => setEdit(null)} />}
      </Sheet>
    </div>
  )
}

function RecordForm({ room, kind, item, titleLabel, fields, onClose }: { room: string; kind: string; item: Item | 'new'; titleLabel: string; fields: FieldDef[]; onClose: () => void }) {
  const [text, setText] = useState(item === 'new' ? '' : item.text)
  const [meta, setMeta] = useState<Record<string, string | number | boolean | undefined>>(item === 'new' ? Object.fromEntries(fields.filter((f) => f.type === 'select').map((f) => [f.key, f.options?.[0]])) : { ...item.meta })
  const set = (k: string, v: string | number | undefined) => setMeta((m) => ({ ...m, [k]: v }))
  const save = async () => {
    if (!text.trim()) return
    if (item === 'new') await addItem(room, kind, { text: text.trim(), meta, date: typeof meta.date === 'string' ? meta.date : undefined })
    else await db.items.update(item.id, { text: text.trim(), meta, date: typeof meta.date === 'string' ? meta.date : item.date })
    onClose()
  }
  return (
    <div className="flex flex-col gap-3">
      <label className="block"><span className="field-label">{titleLabel.toUpperCase()}</span><input className="deco-input w-full" value={text} onChange={(e) => setText(e.target.value)} autoFocus /></label>
      {fields.map((f) => (
        <label key={f.key} className="block">
          <span className="field-label">{f.label.toUpperCase()}</span>
          {f.type === 'select' ? (
            <div className="flex flex-wrap gap-2">{f.options!.map((o) => <button type="button" key={o} className={`chip ${meta[f.key] === o ? 'on' : ''}`} onClick={() => set(f.key, o)}>{o}</button>)}</div>
          ) : f.type === 'long' ? (
            <textarea className="deco-input w-full" rows={6} value={String(meta[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)} />
          ) : (
            <input
              className={`deco-input w-full ${f.type === 'number' || f.type === 'date' ? 'font-num' : ''}`}
              type={f.type === 'number' ? 'text' : f.type === 'date' ? 'date' : f.type === 'url' ? 'url' : 'text'}
              inputMode={f.type === 'number' ? 'decimal' : undefined}
              value={String(meta[f.key] ?? '')}
              onChange={(e) => set(f.key, f.type === 'number' ? (e.target.value === '' ? undefined : Number(e.target.value)) : e.target.value)}
            />
          )}
        </label>
      ))}
      <div className="flex gap-2">
        <button className="deco-btn flex-1" onClick={save}>Save</button>
        {item !== 'new' && <button className="deco-btn ghost" onClick={async () => { await removeItem(item); onClose() }}>Delete</button>}
      </div>
    </div>
  )
}

// ── Line chart (growth, scores, weight…) ──────────────────────────────
export function LineChart({ points, height = 140, unit = '' }: { points: { label: string; value: number }[]; height?: number; unit?: string }) {
  if (points.length < 2) return <Empty>Needs at least two data points for a chart.</Empty>
  const W = 600
  const H = height
  const pad = 26
  const max = Math.max(...points.map((p) => p.value))
  const min = Math.min(0, ...points.map((p) => p.value))
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2)
  const y = (v: number) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2)
  const d = points.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p.value)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Chart">
      <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke="currentColor" strokeOpacity={0.15} />
      <path d={`${d} L ${x(points.length - 1)} ${H - pad} L ${x(0)} ${H - pad} Z`} fill="var(--accent)" fillOpacity={0.12} />
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth={2.2} />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r={3} fill="var(--accent)" />)}
      <text x={W - pad} y={y(points[points.length - 1].value) - 8} textAnchor="end" className="font-num" fontSize="13" fill="var(--ink)">{points[points.length - 1].value.toLocaleString()}{unit}</text>
      <text x={pad} y={H - 6} className="font-num" fontSize="11" fill="var(--ink-muted)">{points[0].label}</text>
      <text x={W - pad} y={H - 6} textAnchor="end" className="font-num" fontSize="11" fill="var(--ink-muted)">{points[points.length - 1].label}</text>
    </svg>
  )
}

/** Small "Ask ALFRED" helper button + reply box used by several rooms. */
export function AskAlfred({ label, build, busyLabel = 'ALFRED is thinking…' }: { label: string; build: () => string | null; busyLabel?: string }) {
  const [busy, setBusy] = useState(false)
  const [reply, setReply] = useState('')
  return (
    <div className="flex flex-col gap-2">
      <button
        className="deco-btn"
        disabled={busy}
        onClick={async () => {
          const prompt = build()
          if (!prompt) return
          setBusy(true)
          setReply('')
          try {
            const { askOnce } = await import('../lib/alfred')
            setReply(await askOnce(prompt))
          } catch (e) {
            toast(e instanceof Error ? e.message : 'ALFRED is unavailable')
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? busyLabel : label}
      </button>
      {reply && <div className="bubble alfred !max-w-full whitespace-pre-wrap">{reply.replace(/\*\*(.+?)\*\*/g, '$1')}</div>}
    </div>
  )
}

export { addItem, removeItem, useItems }
