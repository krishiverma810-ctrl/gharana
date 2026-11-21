import Dexie, { type EntityTable } from 'dexie'

// GHARANA's on-device database (IndexedDB via Dexie). Everything saves here instantly
// and works offline. RULE: never edit an old version() block — add a new version with
// an upgrade() so existing data is migrated, never lost.

export interface KV {
  key: string
  value: unknown
}

/** One row per local day ("2026-11-22"), holding simple daily counters. */
export interface DayLog {
  day: string
  waterMl: number
  proteinG: number
  updatedAt: number
}

export class GharanaDB extends Dexie {
  kv!: EntityTable<KV, 'key'>
  days!: EntityTable<DayLog, 'day'>

  constructor() {
    super('gharana')
    // v1 — Phase 0 foundations
    this.version(1).stores({
      kv: 'key',
      days: 'day',
    })
  }
}

export const db = new GharanaDB()

/** Ask the browser not to evict our data when storage runs low. */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist()
    }
  } catch {
    /* not supported — fine */
  }
}

export async function addWater(day: string, ml: number) {
  await db.transaction('rw', db.days, async () => {
    const row = await db.days.get(day)
    const waterMl = Math.max(0, (row?.waterMl ?? 0) + ml)
    await db.days.put({ day, waterMl, proteinG: row?.proteinG ?? 0, updatedAt: Date.now() })
  })
}
