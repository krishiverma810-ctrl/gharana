import { create } from 'zustand'
import { db, uid } from '../db/db'
import { chime } from '../lib/sound'
import { toast } from './ui'

// Focus timer + Pomodoro. Stores an end timestamp (not a countdown), so it keeps correct
// time even if the phone locks or the app is closed and reopened.

export interface FocusState {
  status: 'idle' | 'running' | 'paused'
  phase: 'focus' | 'break'
  label: string
  minutes: number
  endsAt: number
  remainingMs: number
  pomodoro: { on: boolean; cycle: number; cycles: number; breakMin: number; longBreakMin: number }
  startedAt: number
  fullscreen: boolean
}

interface FocusStore extends FocusState {
  start: (minutes: number, label?: string, pomodoro?: boolean) => void
  pause: () => void
  resume: () => void
  stop: (log?: boolean, day?: string) => void
  setFullscreen: (v: boolean) => void
  check: (day: string) => void
}

const KEY = 'gh-focus'
const IDLE: FocusState = {
  status: 'idle',
  phase: 'focus',
  label: 'Deep Study',
  minutes: 25,
  endsAt: 0,
  remainingMs: 0,
  pomodoro: { on: false, cycle: 1, cycles: 4, breakMin: 5, longBreakMin: 15 },
  startedAt: 0,
  fullscreen: false,
}

function load(): FocusState {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...IDLE, ...JSON.parse(raw), fullscreen: false } : IDLE
  } catch {
    return IDLE
  }
}

export const useFocus = create<FocusStore>((set, get) => {
  const save = () => {
    try {
      const { start: _1, pause: _2, resume: _3, stop: _4, setFullscreen: _5, check: _6, ...s } = get()
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      /* ignore */
    }
  }
  return {
    ...load(),
    start: (minutes, label = get().label, pomodoro = false) => {
      set({
        status: 'running',
        phase: 'focus',
        label,
        minutes,
        startedAt: Date.now(),
        endsAt: Date.now() + minutes * 60_000,
        pomodoro: { ...get().pomodoro, on: pomodoro, cycle: 1 },
      })
      save()
    },
    pause: () => {
      set({ status: 'paused', remainingMs: Math.max(0, get().endsAt - Date.now()) })
      save()
    },
    resume: () => {
      set({ status: 'running', endsAt: Date.now() + get().remainingMs })
      save()
    },
    stop: (log = true, day) => {
      const s = get()
      if (log && s.phase === 'focus' && s.status !== 'idle') {
        const done = Math.round((Date.now() - s.startedAt) / 60_000)
        if (done >= 5) void logSession(s, done, day)
      }
      set({ status: 'idle', fullscreen: false })
      save()
    },
    setFullscreen: (fullscreen) => set({ fullscreen }),
    check: (day) => {
      const s = get()
      if (s.status !== 'running' || Date.now() < s.endsAt) return
      chime()
      if (s.phase === 'focus') {
        void logSession(s, s.minutes, day)
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('GHARANA', { body: `${s.label} — ${s.minutes} min done. Well played, sir.` })
          } catch {
            /* iOS may refuse outside service worker */
          }
        }
        if (s.pomodoro.on && s.pomodoro.cycle <= s.pomodoro.cycles) {
          const long = s.pomodoro.cycle % s.pomodoro.cycles === 0
          const br = long ? s.pomodoro.longBreakMin : s.pomodoro.breakMin
          set({ phase: 'break', endsAt: Date.now() + br * 60_000, startedAt: Date.now() })
          toast(`Focus done. ${br}-minute break.`)
        } else {
          set({ status: 'idle' })
          toast(`${s.minutes} minutes of focus logged.`)
        }
      } else {
        const p = s.pomodoro
        if (p.cycle >= p.cycles) {
          set({ status: 'idle', phase: 'focus' })
          toast('Pomodoro set complete.')
        } else {
          set({ phase: 'focus', startedAt: Date.now(), endsAt: Date.now() + s.minutes * 60_000, pomodoro: { ...p, cycle: p.cycle + 1 } })
          toast(`Back to it — cycle ${p.cycle + 1} of ${p.cycles}.`)
        }
      }
      save()
    },
  }
})

async function logSession(s: FocusState, minutes: number, day?: string) {
  const d = day ?? new Date(s.startedAt).toISOString().slice(0, 10)
  await db.focus.add({ id: uid(), day: d, startedAt: s.startedAt, minutes, label: s.label, kind: s.pomodoro.on ? 'pomodoro' : 'focus' })
}
