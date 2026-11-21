import type { Habit, HabitLog } from '../db/types'
import { addDays, daysBetween, weekStart } from './time'

// Streak engine. Computed fresh from the logs every time (nothing stored that can drift).
//  • done           → streak +1 (every 7 in a row earns a streak freeze, max 3)
//  • skip + reason  → uses a freeze if you have one (streak holds), otherwise it breaks
//  • travel/flight day, or habit not in that day's set → holds (never breaks for a flight)
//  • today, not done yet → holds (the day isn't over)

export interface StreakInfo {
  current: number
  best: number
  freezes: number
}

export function isDone(h: Habit, log?: HabitLog): boolean {
  if (!log || log.status === 'skip') return false
  if (h.type === 'number' || h.type === 'check' || h.type === 'weekly') return log.value >= 1
  return log.value >= h.target
}

export function dailyStreak(
  h: Habit,
  logs: HabitLog[],
  today: string,
  isHoldDay: (day: string) => boolean,
): StreakInfo {
  if (h.type === 'weekly') return weeklyStreak(h, logs, today)
  const byDay = new Map(logs.map((l) => [l.day, l]))
  const first = logs.reduce((m, l) => (l.day < m ? l.day : m), today)
  let cur = 0
  let best = 0
  let freezes = 0
  const span = daysBetween(first, today)
  for (let i = 0; i <= span; i++) {
    const day = addDays(first, i)
    const log = byDay.get(day)
    if (isDone(h, log)) {
      cur++
      if (cur % 7 === 0) freezes = Math.min(3, freezes + 1)
    } else if (log?.status === 'skip' && freezes > 0) {
      freezes--
    } else if (day === today || isHoldDay(day)) {
      // hold
    } else {
      cur = 0
    }
    best = Math.max(best, cur)
  }
  return { current: cur, best, freezes }
}

/** "X times per week" habits: streak counts consecutive weeks where the target was hit. */
function weeklyStreak(h: Habit, logs: HabitLog[], today: string): StreakInfo {
  const perWeek = new Map<string, number>()
  for (const l of logs) if (isDone(h, l)) perWeek.set(weekStart(l.day), (perWeek.get(weekStart(l.day)) ?? 0) + 1)
  const thisWeek = weekStart(today)
  let cur = 0
  let best = 0
  const weeks = [...perWeek.keys()].sort()
  if (!weeks.length) return { current: 0, best: 0, freezes: 0 }
  for (let w = weeks[0]; w <= thisWeek; w = addDays(w, 7)) {
    const hit = (perWeek.get(w) ?? 0) >= h.target
    if (hit) cur++
    else if (w !== thisWeek) cur = 0
    best = Math.max(best, cur)
  }
  return { current: cur, best, freezes: 0 }
}

/** Estimated 1-rep max (Epley). */
export const epley = (weight: number, reps: number) => (reps <= 1 ? weight : Math.round(weight * (1 + reps / 30) * 10) / 10)
