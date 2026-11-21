// Default lock-in plan. These are only the starting values: from Phase 1 they are copied
// into the on-device database and edited in Settings, so nothing here is final.

export interface LockInPhase {
  id: string
  numeral: string
  name: string
  start: string // YYYY-MM-DD, inclusive
  end: string // YYYY-MM-DD, inclusive
  place: string
  timeZone: string
  mode: 'full' | 'travel' | 'reset'
}

export const DEFAULT_PHASES: LockInPhase[] = [
  { id: 'ignition', numeral: 'I', name: 'Home Ignition', start: '2026-11-22', end: '2026-12-01', place: 'Melbourne', timeZone: 'Australia/Melbourne', mode: 'full' },
  { id: 'goldcoast', numeral: 'II', name: 'Gold Coast', start: '2026-12-02', end: '2026-12-08', place: 'Gold Coast', timeZone: 'Australia/Brisbane', mode: 'travel' },
  { id: 'reset', numeral: 'III', name: 'Reset', start: '2026-12-09', end: '2026-12-11', place: 'Melbourne', timeZone: 'Australia/Melbourne', mode: 'reset' },
  { id: 'india', numeral: 'IV', name: 'India', start: '2026-12-12', end: '2027-01-20', place: 'India', timeZone: 'Asia/Kolkata', mode: 'travel' },
  { id: 'presem', numeral: 'V', name: 'Pre-Semester', start: '2027-01-21', end: '2027-02-28', place: 'Melbourne', timeZone: 'Australia/Melbourne', mode: 'full' },
]

export const HOME_TIME_ZONE = 'Australia/Melbourne'
