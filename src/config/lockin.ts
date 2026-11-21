// Default lock-in plan. Copied into Settings on first run; edit it in the app, not here.

export type LocationId = 'melbourne' | 'goldcoast' | 'india'

export const LOCATIONS: Record<LocationId, { name: string; timeZone: string; short: string }> = {
  melbourne: { name: 'Melbourne', timeZone: 'Australia/Melbourne', short: 'MEL' },
  goldcoast: { name: 'Gold Coast', timeZone: 'Australia/Brisbane', short: 'GC' },
  india: { name: 'India', timeZone: 'Asia/Kolkata', short: 'IND' },
}

export interface LockInPhase {
  id: string
  numeral: string
  name: string
  start: string // YYYY-MM-DD inclusive
  end: string // YYYY-MM-DD inclusive
  location: LocationId
  mode: 'full' | 'travel' | 'reset'
}

export const DEFAULT_PHASES: LockInPhase[] = [
  { id: 'ignition', numeral: 'I', name: 'Home Ignition', start: '2026-11-22', end: '2026-12-01', location: 'melbourne', mode: 'full' },
  { id: 'goldcoast', numeral: 'II', name: 'Gold Coast', start: '2026-12-02', end: '2026-12-08', location: 'goldcoast', mode: 'travel' },
  { id: 'reset', numeral: 'III', name: 'Reset', start: '2026-12-09', end: '2026-12-11', location: 'melbourne', mode: 'reset' },
  { id: 'india', numeral: 'IV', name: 'India', start: '2026-12-12', end: '2027-01-20', location: 'india', mode: 'travel' },
  { id: 'presem', numeral: 'V', name: 'Pre-Semester', start: '2027-01-21', end: '2027-02-28', location: 'melbourne', mode: 'full' },
]

export const HOME_LOCATION: LocationId = 'melbourne'
export const HOME_TIME_ZONE = LOCATIONS.melbourne.timeZone
