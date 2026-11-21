import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useUI, toast } from '../store/ui'
import { useSettings } from '../store/settings'
import { useFocus } from '../store/focus'
import { navigate } from './router'
import { ROOMS } from '../config/rooms'
import { Icon } from '../components/Icon'
import { addProtein, addWater, db, uid } from '../db/db'
import { useActiveHabits, useLogsForDay, setHabitValue } from '../db/hooks'
import { useHouse } from './house'
import type { CaptureDest } from '../db/types'

// Command palette: jump to any room, run any action, quick-capture an idea.
// Desktop: Ctrl/Cmd+K or "/". Phone: pull down from the top, or the search button.

interface Cmd {
  id: string
  label: string
  hint?: string
  icon: string
  run: () => void | Promise<void>
}

const DESTS: { id: CaptureDest; label: string }[] = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'nazara', label: 'NAZARA' },
  { id: 'ksvol1', label: 'K.S. VOL. 1' },
  { id: 'scrollapp', label: 'Scroll App' },
]

export async function capture(text: string, dest: CaptureDest) {
  const id = uid()
  await db.captures.add({ id, text, dest, at: Date.now() })
  toast(`Captured to ${DESTS.find((d) => d.id === dest)?.label}`, () => db.captures.delete(id))
}

export function CommandPalette() {
  const open = useUI((s) => s.paletteOpen)
  const setOpen = useUI((s) => s.setPaletteOpen)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const house = useHouse()
  const hidden = useSettings((s) => s.hiddenRooms)
  const names = useSettings((s) => s.roomNames)
  const presets = useSettings((s) => s.focusPresets)
  const habits = useActiveHabits(house.habitSet)
  const logs = useLogsForDay(house.today)
  const startFocus = useFocus((s) => s.start)

  useEffect(() => {
    if (open) {
      setQ('')
      setSel(0)
      setTimeout(() => input.current?.focus(), 50)
    }
  }, [open])

  const cmds = useMemo<Cmd[]>(() => {
    const t = house.today
    const list: Cmd[] = [
      { id: 'w250', label: 'Log 250 ml water', icon: 'drop', run: () => addWater(t, 250).then(() => toast('+250 ml', () => addWater(t, -250))) },
      { id: 'w500', label: 'Log 500 ml water', icon: 'drop', run: () => addWater(t, 500).then(() => toast('+500 ml', () => addWater(t, -500))) },
      { id: 'p20', label: 'Log 20 g protein', icon: 'bolt', run: () => addProtein(t, 20).then(() => toast('+20 g protein', () => addProtein(t, -20))) },
      { id: 'p40', label: 'Log 40 g protein', icon: 'bolt', run: () => addProtein(t, 40).then(() => toast('+40 g protein', () => addProtein(t, -40))) },
      ...presets.map((m) => ({ id: `f${m}`, label: `Start ${m}-min focus`, icon: 'timer', run: () => { startFocus(m); navigate('/blueprint') } })),
      { id: 'pomo', label: 'Start Pomodoro (25/5 ×4)', icon: 'timer', run: () => { startFocus(25, undefined, true); navigate('/blueprint') } },
      { id: 'workout', label: 'Log a workout', icon: 'patrol', run: () => navigate('/patrol#log') },
      { id: 'expense', label: 'Log an expense', icon: 'vault', run: () => navigate('/vault#spend') },
      { id: 'boxing', label: 'Boxing round timer', icon: 'timer', run: () => navigate('/patrol#rounds') },
      ...habits
        .filter((h) => h.type === 'check' || h.type === 'weekly')
        .map((h) => ({
          id: `h-${h.id}`,
          label: `${logs.get(h.id)?.value ? 'Untick' : 'Tick'} ${h.name}`,
          icon: 'rites',
          run: () => setHabitValue(h, t, logs.get(h.id)?.value ? 0 : 1, { activeIds: habits.map((x) => x.id) }),
        })),
      ...ROOMS.filter((r) => !hidden.includes(r.id)).map((r) => ({
        id: `r-${r.id}`,
        label: names[r.id] || r.name,
        hint: r.phase > 1 ? `Phase ${r.phase}` : r.blurb,
        icon: r.icon,
        run: () => navigate(r.path),
      })),
      { id: 'corridor', label: 'THE CORRIDOR', hint: 'All rooms', icon: 'corridor', run: () => navigate('/corridor') },
    ]
    return list
  }, [house.today, presets, habits, logs, hidden, names, startFocus])

  const query = q.trim().toLowerCase()
  const filtered = query ? cmds.filter((c) => c.label.toLowerCase().includes(query) || c.hint?.toLowerCase().includes(query)) : cmds.slice(0, 12)
  const captures: Cmd[] = q.trim()
    ? DESTS.map((d) => ({ id: `cap-${d.id}`, label: `Capture to ${d.label}: “${q.trim()}”`, icon: 'inbox', run: () => capture(q.trim(), d.id) }))
    : []
  const results = [...filtered.slice(0, 10), ...captures]

  const run = async (c?: Cmd) => {
    if (!c) return
    setOpen(false)
    await c.run()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="palette-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div className="palette" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-[color-mix(in_srgb,var(--accent)_35%,transparent)] pb-2">
              <Icon name="search" size={20} className="text-[var(--accent)]" />
              <input
                ref={input}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setSel(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)) }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)) }
                  if (e.key === 'Enter') void run(results[sel])
                  if (e.key === 'Escape') setOpen(false)
                }}
                placeholder="Go anywhere, do anything, or type an idea…"
                className="flex-1 bg-transparent outline-none font-body text-[18px] text-[var(--ink)] placeholder:text-[var(--ink-muted)] py-2"
              />
            </div>
            <ul className="mt-2 max-h-[60vh] overflow-y-auto">
              {results.map((c, i) => (
                <li key={c.id}>
                  <button className={`palette-item ${i === sel ? 'on' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => void run(c)}>
                    <Icon name={c.icon} size={18} />
                    <span className="flex-1 text-left truncate">{c.label}</span>
                    {c.hint && <span className="text-[12px] text-[var(--ink-muted)] font-deco tracking-widest">{c.hint}</span>}
                  </button>
                </li>
              ))}
              {!results.length && <li className="p-3 text-[var(--ink-muted)] font-body italic">Nothing matches.</li>}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
