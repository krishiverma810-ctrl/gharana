import { useLiveQuery } from 'dexie-react-hooks'
import { db, emptyDay, updateDay } from './db'
import type { DayLog, Habit, HabitLog, HabitSet, Template } from './types'
import { toast, celebrate } from '../store/ui'
import { tick, win } from '../lib/sound'
import { isDone } from '../lib/streaks'
import { weekdayOf } from '../lib/time'
import type { LocationId } from '../config/lockin'

// Live data hooks — components re-render automatically when the database changes.

export function useDay(day: string): DayLog {
  return useLiveQuery(() => db.days.get(day), [day]) ?? emptyDay(day)
}

export function useAllHabits(): Habit[] | undefined {
  return useLiveQuery(() => db.habits.orderBy('order').toArray(), [])
}

export function useActiveHabits(set: HabitSet): Habit[] {
  const all = useAllHabits() ?? []
  return all.filter((h) => !h.archived && h.sets.includes(set))
}

export function useLogsForDay(day: string): Map<string, HabitLog> {
  const logs = useLiveQuery(() => db.habitLogs.where('day').equals(day).toArray(), [day]) ?? []
  return new Map(logs.map((l) => [l.habitId, l]))
}

export function useAllHabitLogs(): HabitLog[] {
  return useLiveQuery(() => db.habitLogs.toArray(), []) ?? []
}

export function useTemplates(): Template[] {
  return useLiveQuery(() => db.templates.orderBy('order').toArray(), []) ?? []
}

// ── Habit actions ─────────────────────────────────────────────────────

export async function setHabitValue(h: Habit, day: string, value: number, opts: { quiet?: boolean; activeIds?: string[] } = {}) {
  const id = `${h.id}|${day}`
  const prev = await db.habitLogs.get(id)
  if (value <= 0) {
    await db.habitLogs.delete(id)
  } else {
    const log: HabitLog = { id, habitId: h.id, day, value, status: 'done', at: Date.now() }
    log.status = isDone(h, log) ? 'done' : 'partial'
    await db.habitLogs.put(log)
    if (log.status === 'done' && !isDone(h, prev)) {
      tick()
      if (opts.activeIds) await checkFullHouse(day, opts.activeIds)
    }
  }
  if (!opts.quiet && prev && value <= 0) {
    toast(`${h.name} unticked`, () => db.habitLogs.put(prev))
  }
}

export async function skipHabit(h: Habit, day: string, reason: string) {
  const id = `${h.id}|${day}`
  const prev = await db.habitLogs.get(id)
  await db.habitLogs.put({ id, habitId: h.id, day, value: 0, status: 'skip', reason, at: Date.now() })
  toast(`Skipped ${h.name}`, async () => {
    if (prev) await db.habitLogs.put(prev)
    else await db.habitLogs.delete(id)
  })
}

/** All Big Five done today → full-house celebration (once per day). */
async function checkFullHouse(day: string, activeIds: string[]) {
  const big5 = (await db.habits.toArray()).filter((h) => h.group === 'big5' && !h.archived && activeIds.includes(h.id))
  if (!big5.length) return
  const logs = await db.habitLogs.where('day').equals(day).toArray()
  const map = new Map(logs.map((l) => [l.habitId, l]))
  if (big5.every((h) => isDone(h, map.get(h.id)) || (h.type === 'weekly' && map.get(h.id)?.value))) {
    const key = `fullhouse:${day}`
    if (await db.kv.get(key)) return
    await db.kv.put({ key, value: Date.now() })
    win()
    celebrate()
    toast('FULL HOUSE — all Big Five done. The house is proud.')
  }
}

// ── Blueprint template for a day ──────────────────────────────────────

export function autoTemplateId(day: string, location: LocationId, hasShift: boolean, dayLog?: DayLog): string {
  if (dayLog?.templateId) return dayLog.templateId
  if (location === 'india') return 'india'
  if (location === 'goldcoast') return 'travel'
  if (hasShift) return 'shift'
  const wd = weekdayOf(day)
  return wd === 0 || wd === 6 ? 'weekend' : 'weekday'
}

export async function setBig3(day: string, items: DayLog['big3']) {
  await updateDay(day, (d) => {
    d.big3 = items
  })
}
