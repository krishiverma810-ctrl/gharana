// Every record GHARANA stores on the device. Optional fields = safe to add later without migrations.

export type HabitType = 'check' | 'count' | 'duration' | 'number' | 'weekly'
export type HabitGroup = 'big5' | 'maintenance' | 'minimum' | 'custom'
/** Which habit set a habit belongs to: home timetable, light travel set, or India family set. */
export type HabitSet = 'home' | 'travel' | 'india'

export interface Habit {
  id: string
  name: string
  type: HabitType
  /** check: 1 · count: n · duration: minutes · number: value · weekly: times per week */
  target: number
  unit?: string
  group: HabitGroup
  sets: HabitSet[]
  order: number
  archived?: boolean
  createdAt: number
}

export interface HabitLog {
  id: string // `${habitId}|${day}`
  habitId: string
  day: string
  value: number
  status: 'done' | 'partial' | 'skip'
  reason?: string
  at: number
}

export interface Big3Item {
  text: string
  done: boolean
}

export interface MorningLog {
  wakeTime?: string // "07:40"
  sleepHours?: number
  energy?: number
  sunlight?: boolean
  water?: boolean
  faceWash?: boolean
  skincare?: boolean
  verseRead?: boolean
  intention?: string
  completedAt?: number
}

export interface NightLog {
  won?: string
  dodged?: string
  lesson?: string
  gratitudes?: string[]
  mood?: number
  energy?: number
  screenTimeH?: number
  proud?: boolean
  completedAt?: number
}

export interface DayLog {
  day: string
  waterMl: number
  proteinG: number
  big3?: Big3Item[]
  morning?: MorningLog
  night?: NightLog
  /** Blueprint template chosen for this day (overrides the automatic pick). */
  templateId?: string
  /** Marked as a travel/flight day: streaks are protected. */
  travelDay?: boolean
  updatedAt: number
}

export type BlockCategory = 'sleep' | 'body' | 'mind' | 'work' | 'create' | 'social' | 'fuel' | 'admin' | 'free'

export interface Block {
  id: string
  start: string // "HH:MM"
  end: string
  title: string
  category: BlockCategory
}

export interface Template {
  id: string
  name: string
  blocks: Block[]
  order: number
}

export interface Shift {
  id: string
  day: string
  start: string
  end: string
  note?: string
}

export interface FocusSession {
  id: string
  day: string
  startedAt: number
  minutes: number
  label: string
  kind: 'focus' | 'pomodoro'
}

export type WorkoutType = 'gym' | 'boxing' | 'sport' | 'run' | 'swim' | 'walk' | 'mobility' | 'other'

export interface Workout {
  id: string
  day: string
  type: WorkoutType
  minutes: number
  intensity: number // 1–5
  notes?: string
  at: number
}

export interface LiftSet {
  id: string
  day: string
  lift: string
  weight: number // kg
  reps: number
  e1rm: number // estimated 1-rep max (Epley)
  at: number
}

export interface Goal {
  id: string
  name: string
  emoji: string
  target: number // AUD
  order: number
  archived?: boolean
}

export interface Txn {
  id: string
  day: string
  /** Always stored in AUD, positive. */
  amount: number
  kind: 'income' | 'expense' | 'saving'
  category: string
  note?: string
  goalId?: string
  /** If entered in rupees, the original amount. */
  inr?: number
  /** Where you were when it happened (for travel budgets). */
  place?: 'melbourne' | 'goldcoast' | 'india'
  at: number
}

export interface Wish {
  id: string
  name: string
  price: number
  secured: boolean
  at: number
}

export type CaptureDest = 'inbox' | 'nazara' | 'ksvol1' | 'scrollapp'

export interface Capture {
  id: string
  text: string
  dest: CaptureDest
  at: number
  sorted?: boolean
}

export interface Backup {
  id?: number
  at: number
  reason: string
  data: string
}
