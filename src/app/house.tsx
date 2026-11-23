import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useNow } from '../store/useClock'
import { currentLocation, flightDays, habitSetFor, phaseForDay, useSettings } from '../store/settings'
import { LOCATIONS, type LocationId, type LockInPhase } from '../config/lockin'
import { localDayKey, timeOfDay, zonedParts } from '../lib/time'
import { applyPaletteVars, paletteForDay } from '../theme/daily'
import { SKINS, type Palette, type TimeOfDay } from '../theme/palettes'
import type { SkylineSkin } from '../components/Skyline'
import type { HabitSet } from '../db/types'

// The House context: one place that answers "where am I, what day is it, what's the vibe".
// Everything that depends on the current location's local day reads from here.

export interface House {
  now: Date
  location: LocationId
  timeZone: string
  today: string
  hour: number
  minuteOfDay: number
  phase: LockInPhase | null
  habitSet: HabitSet
  palette: Palette
  tod: TimeOfDay
  isFlightDay: (day: string) => boolean
  away: boolean
  skin: SkylineSkin
}

const Ctx = createContext<House | null>(null)

export function HouseProvider({ children }: { children: ReactNode }) {
  const now = useNow(15_000)
  const phases = useSettings((s) => s.phases)
  const locSetting = useSettings((s) => s.location)
  const pinned = useSettings((s) => s.pinnedPaletteId)
  const locationSkin = useSettings((s) => s.locationSkin)

  const location = currentLocation({ phases, location: locSetting }, now)
  const timeZone = LOCATIONS[location].timeZone
  const today = localDayKey(now, timeZone)
  const parts = zonedParts(now, timeZone)
  // Travelling? The Gold Coast / India skin takes over (unless turned off in Settings).
  const skin: SkylineSkin = locationSkin && location !== 'melbourne' ? location : 'deco'
  const palette = useMemo(() => (skin === 'deco' ? paletteForDay(today, pinned) : SKINS[skin]), [today, pinned, skin])
  const flights = useMemo(() => flightDays(phases), [phases])

  useEffect(() => {
    applyPaletteVars(palette)
  }, [palette])

  const value: House = {
    now,
    location,
    timeZone,
    today,
    hour: parts.hour,
    minuteOfDay: parts.hour * 60 + parts.minute,
    phase: phaseForDay(phases, today),
    habitSet: habitSetFor(location),
    palette,
    tod: timeOfDay(parts.hour),
    isFlightDay: (d) => flights.has(d),
    away: location !== 'melbourne',
    skin,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useHouse(): House {
  const h = useContext(Ctx)
  if (!h) throw new Error('useHouse outside HouseProvider')
  return h
}
