import type { Block } from '../db/types'
import { hmToMin } from './time'

/** Does a block cover this minute of the day? Handles overnight blocks (23:00 → 07:30). */
export function covers(b: Block, minute: number): boolean {
  const s = hmToMin(b.start)
  const e = hmToMin(b.end)
  return s <= e ? minute >= s && minute < e : minute >= s || minute < e
}

export function blockLength(b: Block): number {
  const s = hmToMin(b.start)
  const e = hmToMin(b.end)
  return s <= e ? e - s : 1440 - s + e
}

export function sortBlocks(blocks: Block[]): Block[] {
  return [...blocks].sort((a, b) => hmToMin(a.start) - hmToMin(b.start))
}

export function nowAndNext(blocks: Block[], minute: number): { now: Block | null; next: Block | null; minsLeft: number } {
  const sorted = sortBlocks(blocks)
  const now = sorted.find((b) => covers(b, minute)) ?? null
  const upcoming = sorted.filter((b) => hmToMin(b.start) > minute)
  const next = (now ? upcoming.find((b) => b.id !== now.id) : upcoming[0]) ?? sorted[0] ?? null
  let minsLeft = 0
  if (now) {
    const e = hmToMin(now.end)
    minsLeft = e > minute ? e - minute : 1440 - minute + e
  }
  return { now, next, minsLeft }
}
