import { useEffect, useMemo } from 'react'
import { Skyline } from '../components/Skyline'
import { Lounge } from '../rooms/Lounge'
import { useNow } from '../store/useClock'
import { useSettings, currentTimeZone } from '../store/settings'
import { localDayKey, timeOfDay, zonedParts } from '../lib/time'
import { applyPaletteVars, paletteForDay } from '../theme/daily'

export function App() {
  const now = useNow(1000)
  const { phases, timeZoneOverride, pinnedPaletteId, reducedMotion, batterySaver } = useSettings()

  const timeZone = currentTimeZone(phases, timeZoneOverride, now)
  const dayKey = localDayKey(now, timeZone)
  const hour = zonedParts(now, timeZone).hour
  const tod = timeOfDay(hour)

  const palette = useMemo(() => paletteForDay(dayKey, pinnedPaletteId), [dayKey, pinnedPaletteId])
  useEffect(() => applyPaletteVars(palette), [palette])

  const isPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  const still = reducedMotion || batterySaver

  return (
    <div className="relative min-h-dvh">
      {/* Battery saver freezes the skyline's animation; it never removes the city. */}
      <Skyline palette={palette} tod={tod} still={still} layers={isPhone ? 2 : 3} />
      <div className="skyline-veil" />

      <main className="relative z-10 mx-auto w-full max-w-md px-4 pt-[calc(env(safe-area-inset-top)+20px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <header className="mb-6 text-center">
          <div className="sunburst-bg" aria-hidden="true" />
          <h1 className="font-display text-5xl tracking-[0.12em] text-[var(--accent)] drop-shadow">GHARANA</h1>
          <p className="mt-1 font-deco text-xs tracking-[0.45em] text-[var(--ink)]">THE HOUSE BUILDS THE NAME</p>
        </header>
        <Lounge now={now} timeZone={timeZone} palette={palette} />
      </main>
    </div>
  )
}
