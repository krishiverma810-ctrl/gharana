import { PALETTES, type Palette } from './palettes'
import { dayNumber } from '../lib/time'

/** Small deterministic random generator: same seed → same sequence, on every device. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Palette of the day: every block of N days is a fresh shuffle of all N palettes,
 * so all of them appear once before any repeats. Pinning a favourite overrides it.
 */
export function paletteForDay(dayKey: string, pinnedId?: string | null, palettes: Palette[] = PALETTES): Palette {
  if (pinnedId) {
    const pinned = palettes.find((p) => p.id === pinnedId)
    if (pinned) return pinned
  }
  const n = palettes.length
  const d = dayNumber(dayKey)
  const cycle = Math.floor(d / n)
  const pos = ((d % n) + n) % n
  const order = palettes.map((_, i) => i)
  const rand = mulberry32(cycle * 7919 + 17)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return palettes[order[pos]]
}

/** Push a palette's UI tokens into CSS variables so every component restyles at once. */
export function applyPaletteVars(p: Palette) {
  const s = document.documentElement.style
  s.setProperty('--accent', p.accent)
  s.setProperty('--accent-soft', p.accentSoft)
  s.setProperty('--ink', p.ink)
  s.setProperty('--ink-muted', p.inkMuted)
  s.setProperty('--surface', p.surface)
  s.setProperty('--night', p.sky.night[0])
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', p.sky.night[0])
}
