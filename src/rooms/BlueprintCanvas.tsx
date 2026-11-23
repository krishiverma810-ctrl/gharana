import { useEffect, useRef, useState } from 'react'
import { db } from '../db/db'
import { hmToMin, minToHm, prettyHm } from '../lib/time'
import { sortBlocks } from '../lib/blueprint'
import { CATEGORY_COLORS } from '../config/defaults'
import { Toggle } from '../components/ui'
import type { Block, Template } from '../db/types'

// BLUEPRINT · DAY VIEW — the day drawn to scale. With "Edit layout" on:
// drag a block to move it, drag its top or bottom edge to change start / end. Snaps to 15 min.

const PX = 1.1 // pixels per minute
const SNAP = 15
const MIN_LEN = 15
const snap = (m: number) => Math.round(m / SNAP) * SNAP
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

type Seg = { b: Block; s: number; e: number; draggable: boolean; lane: number; lanes: number }

/** Split overnight blocks into two pieces and give overlapping blocks side-by-side lanes. */
function layout(blocks: Block[]): Seg[] {
  const segs: Omit<Seg, 'lane' | 'lanes'>[] = []
  for (const b of blocks) {
    const s = hmToMin(b.start)
    const e = hmToMin(b.end)
    if (s < e) segs.push({ b, s, e, draggable: true })
    else if (e === 0) segs.push({ b, s, e: 1440, draggable: true }) // ends at midnight
    else {
      segs.push({ b, s, e: 1440, draggable: false })
      if (e > 0) segs.push({ b, s: 0, e, draggable: false })
    }
  }
  segs.sort((a, b) => a.s - b.s || b.e - a.e)
  const out: Seg[] = []
  let group: Seg[] = []
  let groupEnd = -1
  const flush = () => {
    const n = Math.max(1, ...group.map((g) => g.lane + 1))
    group.forEach((g) => (g.lanes = n))
    out.push(...group)
    group = []
  }
  for (const sg of segs) {
    if (sg.s >= groupEnd && group.length) flush()
    const used = new Set(group.filter((g) => g.e > sg.s).map((g) => g.lane))
    let lane = 0
    while (used.has(lane)) lane++
    group.push({ ...sg, lane, lanes: 1 })
    groupEnd = Math.max(groupEnd, sg.e)
  }
  if (group.length) flush()
  return out
}

interface Drag {
  id: string
  mode: 'move' | 'start' | 'end'
  y0: number
  s0: number
  e0: number
  s: number
  e: number
  moved: boolean
}

export function DayCanvas({ tpl, minute, onEdit }: { tpl: Template; minute: number; onEdit: (b: Block) => void }) {
  const [editing, setEditing] = useState(false)
  const [drag, setDrag] = useState<Drag | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Open scrolled to an hour before now.
    const el = scroller.current
    if (el) el.scrollTop = Math.max(0, (minute - 60) * PX)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const blocks = tpl.blocks.map((b) => (drag && b.id === drag.id ? { ...b, start: minToHm(drag.s), end: drag.e >= 1440 ? '00:00' : minToHm(drag.e) } : b))
  const segs = layout(blocks)

  const begin = (e: React.PointerEvent, sg: Seg, mode: Drag['mode']) => {
    if (!editing || !sg.draggable) return
    e.preventDefault()
    e.stopPropagation()
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* pointer already gone — moves still reach the canvas */
    }
    setDrag({ id: sg.b.id, mode, y0: e.clientY, s0: sg.s, e0: sg.e, s: sg.s, e: sg.e, moved: false })
  }
  const move = (e: React.PointerEvent) => {
    if (!drag) return
    const dm = (e.clientY - drag.y0) / PX
    const moved = drag.moved || Math.abs(e.clientY - drag.y0) > 4
    if (drag.mode === 'move') {
      const len = drag.e0 - drag.s0
      const s = clamp(snap(drag.s0 + dm), 0, 1440 - len)
      setDrag({ ...drag, s, e: s + len, moved })
    } else if (drag.mode === 'start') setDrag({ ...drag, s: clamp(snap(drag.s0 + dm), 0, drag.e0 - MIN_LEN), moved })
    else setDrag({ ...drag, e: clamp(snap(drag.e0 + dm), drag.s0 + MIN_LEN, 1440), moved })
  }
  const end = async () => {
    if (!drag) return
    const d = drag
    setDrag(null)
    const b = tpl.blocks.find((x) => x.id === d.id)
    if (!b) return
    if (!d.moved) return onEdit(b)
    const next = { ...b, start: minToHm(d.s), end: d.e >= 1440 ? '00:00' : minToHm(d.e) }
    await db.templates.put({ ...tpl, blocks: sortBlocks(tpl.blocks.map((x) => (x.id === b.id ? next : x))) })
  }

  return (
    <div className="flex flex-col gap-3">
      <Toggle label="Edit layout" hint={editing ? 'Drag a block to move it · drag its top/bottom edge to resize · tap to edit' : 'Turn on to drag blocks around'} on={editing} onChange={setEditing} />
      <div ref={scroller} className="day-canvas-scroll" data-noswipe>
        <div className="day-canvas" style={{ height: 1440 * PX }} onPointerMove={move} onPointerUp={end} onPointerCancel={() => setDrag(null)}>
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="dc-hour" style={{ top: h * 60 * PX }}>
              <span className="font-num">{prettyHm(minToHm(h * 60)).replace(':00', '')}</span>
            </div>
          ))}
          <div className="dc-now" style={{ top: minute * PX }} aria-hidden />
          {segs.map((sg) => {
            const live = drag?.id === sg.b.id
            return (
              <div
                key={`${sg.b.id}-${sg.s}`}
                className={`dc-block ${editing && sg.draggable ? 'editable' : ''} ${live ? 'dragging' : ''}`}
                style={{
                  ['--cat' as string]: CATEGORY_COLORS[sg.b.category],
                  top: sg.s * PX,
                  height: Math.max(18, (sg.e - sg.s) * PX - 2),
                  left: `calc(54px + (100% - 58px) * ${sg.lane / sg.lanes})`,
                  width: `calc((100% - 58px) / ${sg.lanes} - 3px)`,
                }}
                onPointerDown={(e) => (editing && sg.draggable ? begin(e, sg, 'move') : undefined)}
                onClick={() => !editing && onEdit(sg.b)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onEdit(sg.b)}
                aria-label={`${sg.b.title}, ${prettyHm(sg.b.start)} to ${prettyHm(sg.b.end)}`}
              >
                {editing && sg.draggable && <span className="dc-handle top" onPointerDown={(e) => begin(e, sg, 'start')} />}
                <span className="dc-title font-body">{sg.b.title}</span>
                {(sg.e - sg.s) * PX > 34 && <span className="dc-time font-num">{prettyHm(sg.b.start)}–{prettyHm(sg.b.end)}</span>}
                {editing && sg.draggable && <span className="dc-handle bottom" onPointerDown={(e) => begin(e, sg, 'end')} />}
              </div>
            )
          })}
        </div>
      </div>
      {editing && <p className="font-body text-[13px] text-[var(--ink-muted)]">Overnight blocks (like sleep) can’t be dragged — tap them to edit. Changes save to the “{tpl.name}” template.</p>}
    </div>
  )
}
