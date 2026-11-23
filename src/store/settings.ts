import { create } from 'zustand'
import { db } from '../db/db'
import { DEFAULT_PHASES, HOME_LOCATION, LOCATIONS, type LocationId, type LockInPhase } from '../config/lockin'
import type { HabitSet } from '../db/types'

// App-wide settings, saved on-device in db.kv['settings'].
// New fields MUST get a default in DEFAULT_SETTINGS — old saved settings are merged over it,
// so adding a setting never breaks existing data.

export type LayoutMode = 'auto' | 'phone' | 'tablet' | 'desktop'

export interface Settings {
  name: string
  phases: LockInPhase[]
  /** 'auto' follows the lock-in phase; otherwise Travel Mode is forced to a location. */
  location: 'auto' | LocationId
  pinnedPaletteId: string | null
  reducedMotion: boolean
  batterySaver: boolean
  lowGlare: boolean
  sound: boolean
  splash: boolean
  layout: LayoutMode
  /** 5 rooms on the phone bottom bar / number keys on desktop. */
  pinnedRooms: string[]
  hiddenRooms: string[]
  roomNames: Record<string, string>
  waterTargetMl: number
  proteinTargetG: number
  wakeTarget: string // "HH:MM"
  trainingTargetMin: number // per week
  monthlyBudget: number // AUD
  inrPerAud: number
  focusPresets: number[]
  lastExportAt: number | null
  /** Phase 2: swap to the Gold Coast / India skyline when travelling. */
  locationSkin: boolean
  alfredMode: AlfredMode
  delulu: boolean
  alfredLang: 'english' | 'hindi' | 'punjabi' | 'hinglish'
  /** Monthly ALFRED budget in AUD — sending stops at the cap. */
  alfredCapAud: number
  usdToAud: number
  deepaliName: string
  /** Phase 2.5 — voice */
  voiceProvider: 'device' | 'premium'
  /** Name of the on-device voice (blank = best British voice available). */
  deviceVoice: string
  premiumVoice: string
  voiceRate: number
  voicePitch: number
  speakReplies: boolean
  subtitles: boolean
  wakeWord: boolean
  orbSide: 'left' | 'right'
  orbY: number
  /** Push a day snapshot to the server so Siri knows your day. */
  siriSnapshot: boolean
}

export type AlfredMode = 'butler' | 'coach' | 'tutor' | 'strategist' | 'mate' | 'calm'

export const DEFAULT_SETTINGS: Settings = {
  name: 'Krishi',
  phases: DEFAULT_PHASES,
  location: 'auto',
  pinnedPaletteId: null,
  reducedMotion: false,
  batterySaver: false,
  lowGlare: false,
  sound: true,
  splash: true,
  layout: 'auto',
  pinnedRooms: ['lounge', 'rites', 'blueprint', 'patrol', 'vault'],
  hiddenRooms: [],
  roomNames: {},
  waterTargetMl: 3000,
  proteinTargetG: 140,
  wakeTarget: '08:00',
  trainingTargetMin: 420,
  monthlyBudget: 600,
  inrPerAud: 55,
  focusPresets: [25, 50, 90],
  lastExportAt: null,
  locationSkin: true,
  alfredMode: 'butler',
  delulu: true,
  alfredLang: 'english',
  alfredCapAud: 10,
  usdToAud: 1.55,
  deepaliName: 'Deepali',
  voiceProvider: 'device',
  deviceVoice: '',
  premiumVoice: 'fable',
  voiceRate: 1,
  voicePitch: 1,
  speakReplies: true,
  subtitles: true,
  wakeWord: false,
  orbSide: 'right',
  orbY: 0.72,
  siriSnapshot: true,
}

interface SettingsStore extends Settings {
  loaded: boolean
  load: () => Promise<void>
  update: (patch: Partial<Settings>) => void
}

export const useSettings = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,
  load: async () => {
    const row = await db.kv.get('settings')
    const saved = (row?.value ?? {}) as Partial<Settings>
    set({ ...DEFAULT_SETTINGS, ...saved, loaded: true })
  },
  update: (patch) => {
    set(patch)
    const { loaded: _l, load: _a, update: _b, ...rest } = { ...get() }
    void db.kv.put({ key: 'settings', value: rest })
  },
}))

export const getSettings = () => useSettings.getState()

/** Which phase a local day falls in (or null before/after the lock-in). */
export function phaseForDay(phases: LockInPhase[], dayKey: string): LockInPhase | null {
  return phases.find((p) => dayKey >= p.start && dayKey <= p.end) ?? null
}

/** Where am I right now? Auto = the lock-in phase for today (judged in Melbourne time). */
export function currentLocation(s: Pick<Settings, 'phases' | 'location'>, now = new Date()): LocationId {
  if (s.location !== 'auto') return s.location
  const homeDay = new Intl.DateTimeFormat('en-CA', { timeZone: LOCATIONS[HOME_LOCATION].timeZone }).format(now)
  return phaseForDay(s.phases, homeDay)?.location ?? HOME_LOCATION
}

export function habitSetFor(loc: LocationId): HabitSet {
  return loc === 'india' ? 'india' : loc === 'goldcoast' ? 'travel' : 'home'
}

/** Days where the location changes (flights) — streaks are protected on these. */
export function flightDays(phases: LockInPhase[]): Set<string> {
  const s = new Set<string>()
  for (let i = 1; i < phases.length; i++) {
    if (phases[i].location !== phases[i - 1].location) s.add(phases[i].start)
  }
  return s
}
