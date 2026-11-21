import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { DecoCard } from '../components/DecoCard'
import { Field, RoomHeader, Sheet, Toggle } from '../components/ui'
import { Icon } from '../components/Icon'
import { db, uid, updateDay } from '../db/db'
import { autoTemplateId, useDay, useTemplates } from '../db/hooks'
import { useHouse } from '../app/house'
import { useFocus } from '../store/focus'
import { useSettings } from '../store/settings'
import { toast } from '../store/ui'
import { addDays, hmToMin, prettyHm, shortDate, weekStart } from '../lib/time'
import { blockLength, covers, sortBlocks } from '../lib/blueprint'
import { CATEGORY_COLORS } from '../config/defaults'
import type { Block, BlockCategory, Shift, Template } from '../db/types'

// BLUEPRINT — the hour-by-hour plan, the focus timer, and GYG shifts.

/** Keep the screen awake while `on` (focus timer, boxing rounds). */
export function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const get = () =>
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (cancelled) void l.release()
          else lock = l
        })
        .catch(() => {})
    void get()
    const vis = () => document.visibilityState === 'visible' && get()
    document.addEventListener('visibilitychange', vis)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', vis)
      void lock?.release()
    }
  }, [on])
}

const CATS: BlockCategory[] = ['sleep', 'body', 'mind', 'work', 'create', 'social', 'fuel', 'admin', 'free']

function BlockEditor({ tpl, block, onClose }: { tpl: Template; block: Block | 'new'; onClose: () => void }) {
  const [b, setB] = useState<Block>(block === 'new' ? { id: uid(), start: '09:00', end: '10:00', title: '', category: 'mind' } : block)
  const up = (p: Partial<Block>) => setB((x) => ({ ...x, ...p }))
  const save = async () => {
    if (!b.title.trim()) return
    const blocks = block === 'new' ? [...tpl.blocks, b] : tpl.blocks.map((x) => (x.id === b.id ? b : x))
    await db.templates.put({ ...tpl, blocks: sortBlocks(blocks) })
    onClose()
  }
  const remove = async () => {
    const before = tpl
    await db.templates.put({ ...tpl, blocks: tpl.blocks.filter((x) => x.id !== b.id) })
    toast(`Removed ${b.title}`, () => db.templates.put(before))
    onClose()
  }
  return (
    <div className="flex flex-col gap-4">
      <Field label="WHAT">
        <input className="deco-input w-full" value={b.title} onChange={(e) => up({ title: e.target.value })} autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="START"><input type="time" className="deco-input w-full font-num" value={b.start} onChange={(e) => up({ start: e.target.value })} /></Field>
        <Field label="END"><input type="time" className="deco-input w-full font-num" value={b.end} onChange={(e) => up({ end: e.target.value })} /></Field>
      </div>
      <Field label="CATEGORY">
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button key={c} className={`chip ${b.category === c ? 'on' : ''}`} style={{ borderColor: CATEGORY_COLORS[c] }} onClick={() => up({ category: c })}>
              <span className="inline-block w-2 h-2 mr-1.5" style={{ background: CATEGORY_COLORS[c] }} />
              {c}
            </button>
          ))}
        </div>
      </Field>
      <div className="flex gap-2">
        <button className="deco-btn flex-1" onClick={save}>Save</button>
        {block !== 'new' && <button className="deco-btn ghost" onClick={remove}>Delete</button>}
      </div>
      <p className="text-[13px] font-body text-[var(--ink-muted)]">Edits change the “{tpl.name}” template for every day that uses it.</p>
    </div>
  )
}

function Timeline({ tpl, minute, onEdit }: { tpl: Template; minute: number; onEdit: (b: Block) => void }) {
  const blocks = sortBlocks(tpl.blocks)
  return (
    <ol className="timeline">
      {blocks.map((b) => {
        const now = covers(b, minute)
        const past = !now && hmToMin(b.end) <= minute && hmToMin(b.start) < hmToMin(b.end)
        return (
          <li key={b.id}>
            <button className={`tl-block ${now ? 'now' : ''} ${past ? 'past' : ''}`} style={{ ['--cat' as string]: CATEGORY_COLORS[b.category], minHeight: Math.min(110, 44 + blockLength(b) / 6) }} onClick={() => onEdit(b)}>
              <span className="tl-time font-num">{prettyHm(b.start)}</span>
              <span className="tl-bar" />
              <span className="flex-1 text-left">
                <span className="block font-body text-[18px] leading-tight">{b.title}</span>
                <span className="block font-num text-[12px] text-[var(--ink-muted)]">
                  {prettyHm(b.start)}–{prettyHm(b.end)} · {b.category}
                </span>
              </span>
              {now && <span className="now-pin font-deco">NOW</span>}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function FocusCard() {
  const f = useFocus()
  const presets = useSettings((s) => s.focusPresets)
  const { today } = useHouse()
  const [custom, setCustom] = useState(40)
  const [pomo, setPomo] = useState(false)
  const [label, setLabel] = useState(f.label)
  const sessions = useLiveQuery(() => db.focus.where('day').between(weekStart(today), today, true, true).toArray(), [today]) ?? []
  const todayMin = sessions.filter((s) => s.day === today).reduce((a, s) => a + s.minutes, 0)
  const weekMin = sessions.reduce((a, s) => a + s.minutes, 0)

  if (f.status !== 'idle') {
    return (
      <div className="text-center">
        <FocusDigits big={false} />
        <div className="flex gap-2 mt-3 justify-center">
          {f.status === 'running' ? <button className="deco-btn px-5" onClick={f.pause}>Pause</button> : <button className="deco-btn px-5" onClick={f.resume}>Resume</button>}
          <button className="deco-btn ghost px-5" onClick={() => f.stop(true, today)}>End</button>
          <button className="deco-btn ghost px-4" onClick={() => f.setFullscreen(true)} aria-label="Full screen"><Icon name="expand" size={18} /></button>
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <Field label="WORKING ON">
        <input className="deco-input w-full" value={label} onChange={(e) => setLabel(e.target.value)} />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        {presets.map((m) => (
          <button key={m} className="deco-btn" onClick={() => f.start(m, label, pomo)}>{m} min</button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input className="deco-input w-24 text-center font-num" inputMode="numeric" value={custom} onChange={(e) => setCustom(Number(e.target.value) || 0)} />
        <span className="font-body text-[var(--ink-muted)]">min</span>
        <button className="deco-btn ghost flex-1" disabled={custom < 1} onClick={() => f.start(custom, label, pomo)}>Start custom</button>
      </div>
      <Toggle label="Pomodoro cycles" hint="Focus → 5-min break, ×4, then a 15-min long break" on={pomo} onChange={setPomo} />
      <div className="flex justify-around text-center">
        <div><div className="font-num text-[22px]">{todayMin}</div><div className="field-label">MIN TODAY</div></div>
        <div><div className="font-num text-[22px]">{(weekMin / 60).toFixed(1)}</div><div className="field-label">HRS THIS WEEK</div></div>
        <div><div className="font-num text-[22px]">{sessions.length}</div><div className="field-label">SESSIONS</div></div>
      </div>
    </div>
  )
}

function FocusDigits({ big }: { big: boolean }) {
  const f = useFocus()
  const [, force] = useState(0)
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 250)
    return () => clearInterval(t)
  }, [])
  const ms = f.status === 'paused' ? f.remainingMs : Math.max(0, f.endsAt - Date.now())
  const total = (f.phase === 'focus' ? f.minutes : f.pomodoro.cycle % f.pomodoro.cycles === 0 ? f.pomodoro.longBreakMin : f.pomodoro.breakMin) * 60000
  return (
    <div>
      <div className="font-deco text-[12px] tracking-[0.35em] text-[var(--accent)]">
        {f.phase === 'break' ? 'BREAK' : f.label.toUpperCase()}
        {f.pomodoro.on && ` · ${f.pomodoro.cycle}/${f.pomodoro.cycles}`}
      </div>
      <div className={`font-num ${big ? 'text-[min(26vw,200px)]' : 'text-[64px]'} leading-none mt-2`}>
        {String(Math.floor(ms / 60000)).padStart(2, '0')}:{String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}
      </div>
      <div className="meter mt-4 max-w-md mx-auto"><div style={{ width: `${100 - Math.round((ms / total) * 100)}%` }} /></div>
    </div>
  )
}

/** Full-screen focus mode: giant digits, screen stays awake. Mounted globally. */
export function FocusFullscreen() {
  const f = useFocus()
  const { today } = useHouse()
  useWakeLock(f.fullscreen && f.status === 'running')
  return (
    <AnimatePresence>
      {f.fullscreen && f.status !== 'idle' && (
        <motion.div className="fullscreen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <FocusDigits big />
          <div className="flex gap-3 mt-10">
            {f.status === 'running' ? <button className="deco-btn px-8" onClick={f.pause}>Pause</button> : <button className="deco-btn px-8" onClick={f.resume}>Resume</button>}
            <button className="deco-btn ghost px-8" onClick={() => f.stop(true, today)}>End</button>
          </div>
          <button className="absolute top-[calc(env(safe-area-inset-top)+16px)] right-4 icon-btn" onClick={() => f.setFullscreen(false)} aria-label="Exit full screen">
            <Icon name="close" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Shifts() {
  const { today } = useHouse()
  const shifts = useLiveQuery(() => db.shifts.where('day').aboveOrEqual(addDays(today, -14)).sortBy('day'), [today]) ?? []
  const [s, setS] = useState<Shift>({ id: '', day: today, start: '12:00', end: '18:00' })
  const hours = (x: Shift) => (hmToMin(x.end) - hmToMin(x.start) + 1440) % 1440 / 60
  const ws = weekStart(today)
  const thisWeek = shifts.filter((x) => x.day >= ws && x.day < addDays(ws, 7)).reduce((a, x) => a + hours(x), 0)
  const upcoming = shifts.filter((x) => x.day >= today)
  const add = async () => {
    const row = { ...s, id: uid() }
    await db.shifts.add(row)
    toast(`Shift added · ${shortDate(s.day)}`, () => db.shifts.delete(row.id))
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <input type="date" className="deco-input font-num col-span-3" value={s.day} onChange={(e) => setS({ ...s, day: e.target.value })} />
        <input type="time" className="deco-input font-num" value={s.start} onChange={(e) => setS({ ...s, start: e.target.value })} />
        <input type="time" className="deco-input font-num" value={s.end} onChange={(e) => setS({ ...s, end: e.target.value })} />
        <button className="deco-btn" onClick={add}>Add</button>
      </div>
      <div className="font-body text-[16px] text-[var(--ink-muted)]">
        This week: <span className="font-num text-[var(--ink)]">{thisWeek.toFixed(1)} h</span> at GYG
      </div>
      <ul className="flex flex-col gap-1">
        {upcoming.map((x) => (
          <li key={x.id} className="flex items-center justify-between font-body text-[17px]">
            <span>{x.day === today ? 'Today' : shortDate(x.day)} · <span className="font-num">{prettyHm(x.start)}–{prettyHm(x.end)}</span></span>
            <button
              className="icon-btn"
              aria-label="Delete shift"
              onClick={async () => {
                await db.shifts.delete(x.id)
                toast('Shift removed', () => db.shifts.put(x))
              }}
            >
              <Icon name="trash" size={17} />
            </button>
          </li>
        ))}
        {!upcoming.length && <li className="font-body italic text-[var(--ink-muted)]">No upcoming shifts.</li>}
      </ul>
      <p className="text-[13px] font-body text-[var(--ink-muted)]">On a shift day, the Blueprint switches to the GYG Shift template automatically.</p>
    </div>
  )
}

export function Blueprint() {
  const { today, location, minuteOfDay } = useHouse()
  const day = useDay(today)
  const templates = useTemplates()
  const hasShift = (useLiveQuery(() => db.shifts.where('day').equals(today).count(), [today]) ?? 0) > 0
  const autoId = autoTemplateId(today, location, hasShift)
  const tid = day.templateId ?? autoId
  const tpl = templates.find((t) => t.id === tid) ?? templates[0]
  const [edit, setEdit] = useState<Block | 'new' | null>(null)

  if (!tpl) return <RoomHeader id="blueprint" />

  return (
    <div className="flex flex-col gap-5">
      <RoomHeader
        id="blueprint"
        subtitle={`${tpl.name}${day.templateId ? ' (chosen)' : ' (auto)'} · ${shortDate(today)}`}
        right={<button className="icon-btn" onClick={() => setEdit('new')} aria-label="Add block"><Icon name="plus" /></button>}
      />
      <div className="overflow-x-auto -mx-1 px-1" data-noswipe>
        <div className="flex gap-2 w-max">
          {templates.map((t) => (
            <button
              key={t.id}
              className={`chip ${t.id === tid ? 'on' : ''}`}
              onClick={() =>
                updateDay(today, (d) => {
                  d.templateId = t.id === autoId ? undefined : t.id
                })
              }
            >
              {t.name}
              {t.id === autoId && ' ·auto'}
            </button>
          ))}
        </div>
      </div>
      <div className="bp-layout">
        <DecoCard title="TODAY">
          <Timeline tpl={tpl} minute={minuteOfDay} onEdit={setEdit} />
        </DecoCard>
        <div className="flex flex-col gap-5">
          <DecoCard title="FOCUS TIMER"><FocusCard /></DecoCard>
          <DecoCard title="GYG SHIFTS"><Shifts /></DecoCard>
        </div>
      </div>
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'NEW BLOCK' : 'EDIT BLOCK'}>
        {edit && <BlockEditor tpl={tpl} block={edit} onClose={() => setEdit(null)} />}
      </Sheet>
    </div>
  )
}

