import { create } from 'zustand'
import { chime } from '../lib/sound'
import { toast } from './ui'

// Quick timers / reminders ("remind me in 20 minutes to take the chicken out").
// Stored with an end time, so they survive the app being closed; checked every second while open.

export interface Reminder {
  id: string
  label: string
  endsAt: number
}

const KEY = 'gh-reminders'
const load = (): Reminder[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}
const save = (r: Reminder[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(r))
  } catch {
    /* ignore */
  }
}

interface Store {
  reminders: Reminder[]
  add: (minutes: number, label: string) => void
  remove: (id: string) => void
  check: (onFire?: (r: Reminder) => void) => void
}

export const useReminders = create<Store>((set, get) => ({
  reminders: load(),
  add: (minutes, label) => {
    const r = { id: Math.random().toString(36).slice(2), label, endsAt: Date.now() + minutes * 60_000 }
    const next = [...get().reminders, r]
    save(next)
    set({ reminders: next })
  },
  remove: (id) => {
    const next = get().reminders.filter((r) => r.id !== id)
    save(next)
    set({ reminders: next })
  },
  check: (onFire) => {
    const due = get().reminders.filter((r) => r.endsAt <= Date.now())
    if (!due.length) return
    for (const r of due) {
      chime()
      toast(`⏰ ${r.label}`)
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('GHARANA', { body: `⏰ ${r.label}` })
        } catch {
          /* ignore */
        }
      }
      onFire?.(r)
    }
    const next = get().reminders.filter((r) => r.endsAt > Date.now())
    save(next)
    set({ reminders: next })
  },
}))

export const addReminder = (minutes: number, label: string) => useReminders.getState().add(minutes, label)
