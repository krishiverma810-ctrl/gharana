import Dexie, { type EntityTable } from 'dexie'
import type {
  Backup, Book, Capture, Card, ChatRecord, Deal, Media, Session, Unit, DayLog, FocusSession, Goal, Habit, HabitLog, Item, LiftSet, Shift, Template, Trip, Txn, Wish, Workout,
} from './types'

// GHARANA's on-device database (IndexedDB via Dexie). Everything saves here instantly
// and works offline.
//
// MIGRATION RULE: never edit an old version() block. Add a new version(n) with the
// full store list and, if data needs reshaping, an .upgrade() — existing data is kept.
// Every version is recorded in MIGRATIONS below so Settings can show the log.

export interface KV {
  key: string
  value: unknown
}

export const MIGRATIONS = [
  { version: 1, date: '2026-11-22', note: 'Phase 0 — kv + daily water log' },
  { version: 2, date: '2026-11-22', note: 'Phase 1 — habits, blueprint, patrol, vault, captures, backups' },
  { version: 3, date: '2026-11-23', note: 'Phase 2 — trips, shared lists, ALFRED chats' },
  { version: 4, date: '2026-11-23', note: 'Phase 3 — deals, flashcards, units, books, sessions, media' },
]

export class GharanaDB extends Dexie {
  kv!: EntityTable<KV, 'key'>
  days!: EntityTable<DayLog, 'day'>
  habits!: EntityTable<Habit, 'id'>
  habitLogs!: EntityTable<HabitLog, 'id'>
  templates!: EntityTable<Template, 'id'>
  shifts!: EntityTable<Shift, 'id'>
  focus!: EntityTable<FocusSession, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  lifts!: EntityTable<LiftSet, 'id'>
  goals!: EntityTable<Goal, 'id'>
  txns!: EntityTable<Txn, 'id'>
  wishes!: EntityTable<Wish, 'id'>
  captures!: EntityTable<Capture, 'id'>
  backups!: EntityTable<Backup, 'id'>
  trips!: EntityTable<Trip, 'id'>
  items!: EntityTable<Item, 'id'>
  chats!: EntityTable<ChatRecord, 'id'>
  deals!: EntityTable<Deal, 'id'>
  cards!: EntityTable<Card, 'id'>
  units!: EntityTable<Unit, 'id'>
  books!: EntityTable<Book, 'id'>
  sessions!: EntityTable<Session, 'id'>
  media!: EntityTable<Media, 'id'>

  constructor() {
    super('gharana')
    this.version(1).stores({
      kv: 'key',
      days: 'day',
    })
    this.version(2)
      .stores({
        kv: 'key',
        days: 'day',
        habits: 'id, order',
        habitLogs: 'id, habitId, day',
        templates: 'id, order',
        shifts: 'id, day',
        focus: 'id, day',
        workouts: 'id, day, type',
        lifts: 'id, day, lift',
        goals: 'id, order',
        txns: 'id, day, kind, goalId',
        wishes: 'id',
        captures: 'id, dest, at',
        backups: '++id, at',
      })
      .upgrade(async (tx) => {
        // v1 day rows only had waterMl — give them the new defaults.
        await tx.table('days').toCollection().modify((d: Partial<DayLog>) => {
          d.proteinG ??= 0
          d.updatedAt ??= Date.now()
        })
      })
    this.version(3).stores({
      kv: 'key',
      days: 'day',
      habits: 'id, order',
      habitLogs: 'id, habitId, day',
      templates: 'id, order',
      shifts: 'id, day',
      focus: 'id, day',
      workouts: 'id, day, type',
      lifts: 'id, day, lift',
      goals: 'id, order',
      txns: 'id, day, kind, goalId',
      wishes: 'id',
      captures: 'id, dest, at',
      backups: '++id, at',
      trips: 'id, start',
      items: 'id, [room+kind], date',
      chats: 'id, day',
    })
    this.version(4).stores({
      kv: 'key',
      days: 'day',
      habits: 'id, order',
      habitLogs: 'id, habitId, day',
      templates: 'id, order',
      shifts: 'id, day',
      focus: 'id, day',
      workouts: 'id, day, type',
      lifts: 'id, day, lift',
      goals: 'id, order',
      txns: 'id, day, kind, goalId',
      wishes: 'id',
      captures: 'id, dest, at',
      backups: '++id, at',
      trips: 'id, start',
      items: 'id, [room+kind], date',
      chats: 'id, day',
      deals: 'id, stage, order',
      cards: 'id, deck, due',
      units: 'id, sem, order',
      books: 'id, status',
      sessions: 'id, day, kind, [kind+subject]',
      media: 'id, [room+kind], at',
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

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 12)
    : Math.random().toString(36).slice(2, 14)

// ── Day helpers ──────────────────────────────────────────────────────

export function emptyDay(day: string): DayLog {
  return { day, waterMl: 0, proteinG: 0, updatedAt: Date.now() }
}

/** Read-modify-write a day row atomically. */
export async function updateDay(day: string, fn: (d: DayLog) => void) {
  await db.transaction('rw', db.days, async () => {
    const row = (await db.days.get(day)) ?? emptyDay(day)
    fn(row)
    row.updatedAt = Date.now()
    await db.days.put(row)
  })
}

export const addWater = (day: string, ml: number) =>
  updateDay(day, (d) => {
    d.waterMl = Math.max(0, d.waterMl + ml)
  })

export const addProtein = (day: string, g: number) =>
  updateDay(day, (d) => {
    d.proteinG = Math.max(0, d.proteinG + g)
  })
