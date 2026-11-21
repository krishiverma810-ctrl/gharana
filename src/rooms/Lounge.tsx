import { useLiveQuery } from 'dexie-react-hooks'
import { DecoCard } from '../components/DecoCard'
import { SunburstDial } from '../components/SunburstDial'
import { db, addWater } from '../db/db'
import { useSettings, phaseForDay } from '../store/settings'
import { daysBetween, formatLongDate, formatTime, localDayKey } from '../lib/time'
import { HOME_TIME_ZONE } from '../config/lockin'
import type { Palette } from '../theme/palettes'

const WATER_TARGET = 3000

interface Props {
  now: Date
  timeZone: string
  palette: Palette
}

export function Lounge({ now, timeZone, palette }: Props) {
  const phases = useSettings((s) => s.phases)
  const today = localDayKey(now, timeZone)
  const phase = phaseForDay(phases, today)

  const first = phases[0].start
  const last = phases[phases.length - 1].end
  const totalDays = daysBetween(first, last) + 1
  const dayIndex = Math.min(totalDays, Math.max(0, daysBetween(first, today) + 1))
  const phaseStarts = phases.map((p) => daysBetween(first, p.start))

  const next = phases.find((p) => p.start > today)
  const daysToNext = next ? daysBetween(today, next.start) : null

  const log = useLiveQuery(() => db.days.get(today), [today])
  const water = log?.waterMl ?? 0
  const pct = Math.min(100, Math.round((water / WATER_TARGET) * 100))

  const away = timeZone !== HOME_TIME_ZONE

  return (
    <div className="flex flex-col gap-5">
      {/* Clock */}
      <DecoCard>
        <div className="text-center">
          <div className="font-num text-5xl sm:text-6xl tracking-tight text-[var(--ink)]">{formatTime(now, timeZone)}</div>
          <div className="mt-1 font-body text-lg text-[var(--ink-muted)]">{formatLongDate(now, timeZone)}</div>
          {away && (
            <div className="mt-2 font-num text-sm text-[var(--ink-muted)]">
              Melbourne {formatTime(now, HOME_TIME_ZONE)}
            </div>
          )}
          <div className="mt-3 font-deco text-xs tracking-[0.3em] text-[var(--accent)]">{palette.name}</div>
        </div>
      </DecoCard>

      {/* Lock-in dial */}
      <DecoCard title="THE LOCK-IN">
        <SunburstDial
          totalDays={totalDays}
          today={dayIndex}
          phaseStarts={phaseStarts}
          label={dayIndex > 0 ? `${dayIndex}` : '—'}
          sublabel={`OF ${totalDays} DAYS`}
        />
        {phase && (
          <div className="mt-4 text-center">
            <div className="font-deco text-sm tracking-[0.25em] text-[var(--accent)]">PHASE {phase.numeral}</div>
            <div className="font-display text-2xl text-[var(--ink)]">{phase.name.toUpperCase()}</div>
            <div className="font-body text-[var(--ink-muted)]">{phase.place}</div>
          </div>
        )}
        {next && daysToNext !== null && (
          <div className="mt-3 text-center font-body text-[var(--ink-muted)]">
            {next.name} in <span className="font-num text-[var(--ink)]">{daysToNext}</span> {daysToNext === 1 ? 'day' : 'days'}
          </div>
        )}
      </DecoCard>

      {/* Water — proves on-device saving works offline */}
      <DecoCard title="FUEL STATION">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-num text-4xl text-[var(--ink)]">
              {(water / 1000).toFixed(2)}
              <span className="text-lg text-[var(--ink-muted)]"> / {WATER_TARGET / 1000} L</span>
            </div>
            <div className="font-body text-sm text-[var(--ink-muted)]">Water today</div>
          </div>
          <div className="font-num text-2xl text-[var(--accent)]">{pct}%</div>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button className="deco-btn" onClick={() => addWater(today, 250)}>+250 ml</button>
          <button className="deco-btn" onClick={() => addWater(today, 500)}>+500 ml</button>
          <button className="deco-btn ghost" onClick={() => addWater(today, -250)} disabled={water === 0}>
            Undo
          </button>
        </div>
      </DecoCard>

      <p className="text-center font-deco text-[11px] tracking-[0.3em] text-[var(--ink-muted)] pb-2">
        PHASE 0 · THE FOUNDATIONS ARE POURED
      </p>
    </div>
  )
}
