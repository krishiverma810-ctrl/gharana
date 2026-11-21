import type { DayLog, Habit, HabitLog, Workout } from '../db/types'
import { isDone } from './streaks'
import { hmToMin } from './time'

// HOUSE SCORE /100 — how well today is going. Weights add to 100.
export const SCORE_WEIGHTS = { habits: 35, big3: 15, fuel: 15, morning: 15, training: 10, night: 10 }

export interface ScoreInput {
  habits: Habit[]
  logs: Map<string, HabitLog>
  day: DayLog
  workouts: Workout[]
  waterTarget: number
  proteinTarget: number
  wakeTarget: string
}

export function houseScore(i: ScoreInput) {
  const W = SCORE_WEIGHTS
  // "X per week" habits aren't expected every day, so they don't count against today.
  const daily = i.habits.filter((h) => h.type !== 'weekly')
  const doneCount = daily.filter((h) => isDone(h, i.logs.get(h.id))).length
  const habits = daily.length ? (doneCount / daily.length) * W.habits : 0

  const b3 = i.day.big3?.filter((b) => b.text.trim()) ?? []
  const big3 = b3.length ? (b3.filter((b) => b.done).length / 3) * W.big3 : 0

  const fuel =
    Math.min(1, i.day.waterMl / i.waterTarget) * (W.fuel / 2) + Math.min(1, i.day.proteinG / i.proteinTarget) * (W.fuel / 2)

  const m = i.day.morning
  let morning = 0
  if (m?.completedAt) morning += 5
  if (m?.wakeTime && hmToMin(m.wakeTime) <= hmToMin(i.wakeTarget)) morning += 5
  if (m?.sleepHours && m.sleepHours >= 7 && m.sleepHours <= 9.5) morning += 5

  const mins = i.workouts.reduce((s, w) => s + w.minutes, 0)
  const training = mins >= 30 ? W.training : mins > 0 ? W.training / 2 : 0
  const night = i.day.night?.completedAt ? W.night : 0

  const parts = { habits, big3, fuel, morning, training, night }
  const total = Math.round(Object.values(parts).reduce((a, b) => a + b, 0))
  return { total, parts, doneCount, habitCount: daily.length }
}

export function scoreWord(n: number) {
  if (n >= 90) return 'LEGENDARY'
  if (n >= 75) return 'ON FORM'
  if (n >= 55) return 'BUILDING'
  if (n >= 30) return 'WARMING UP'
  return 'DOORS OPEN'
}
