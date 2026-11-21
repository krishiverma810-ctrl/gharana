import { create } from 'zustand'
import { DEFAULT_PHASES, HOME_TIME_ZONE, type LockInPhase } from '../config/lockin'

// App-wide settings. Phase 0 keeps them in memory with sensible defaults;
// Phase 1 persists them to the on-device database and adds the Settings room.

interface SettingsState {
  name: string
  phases: LockInPhase[]
  /** null = follow the lock-in phase automatically */
  timeZoneOverride: string | null
  pinnedPaletteId: string | null
  reducedMotion: boolean
  batterySaver: boolean
}

export const useSettings = create<SettingsState>(() => ({
  name: 'Krishi',
  phases: DEFAULT_PHASES,
  timeZoneOverride: null,
  pinnedPaletteId: null,
  reducedMotion: false,
  batterySaver: false,
}))

/** Which phase a local day falls in (or null before/after the lock-in). */
export function phaseForDay(phases: LockInPhase[], dayKey: string): LockInPhase | null {
  return phases.find((p) => dayKey >= p.start && dayKey <= p.end) ?? null
}

export function currentTimeZone(phases: LockInPhase[], override: string | null, now = new Date()): string {
  if (override) return override
  // Decide the day in home time first, then use that phase's zone.
  const homeDay = new Intl.DateTimeFormat('en-CA', { timeZone: HOME_TIME_ZONE }).format(now)
  return phaseForDay(phases, homeDay)?.timeZone ?? HOME_TIME_ZONE
}
