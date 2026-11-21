// Time-zone brain. Every "what day is it / what hour is it" question goes through here,
// using the time zone of wherever Krishi currently is (Melbourne / Gold Coast / India).

export interface ZonedParts {
  year: number
  month: number // 1–12
  day: number
  hour: number
  minute: number
  second: number
  weekday: string
}

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-AU', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'long',
    hourCycle: 'h23',
  })
  const get = (t: string) => fmt.formatToParts(date).find((p) => p.type === t)?.value ?? '0'
  return {
    year: +get('year'),
    month: +get('month'),
    day: +get('day'),
    hour: +get('hour'),
    minute: +get('minute'),
    second: +get('second'),
    weekday: get('weekday'),
  }
}

/** "2026-11-22" for the local day in the given zone. */
export function localDayKey(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/** Whole days between two "YYYY-MM-DD" keys (b − a). Calendar maths, immune to DST. */
export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)
  return Math.round(ms / 86_400_000)
}

/** Day number since a fixed epoch — used to seed the palette of the day. */
export function dayNumber(dayKey: string): number {
  return daysBetween('2026-01-01', dayKey)
}

export function formatTime(date: Date, timeZone: string, withSeconds = false): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
    hour12: true,
  }).format(date)
}

export function formatLongDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function timeOfDay(hour: number): 'dawn' | 'day' | 'dusk' | 'night' {
  if (hour >= 5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 17) return 'day'
  if (hour >= 17 && hour < 20) return 'dusk'
  return 'night'
}
