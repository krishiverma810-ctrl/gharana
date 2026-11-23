import Dexie from 'dexie'
import { create } from 'zustand'
import { db } from '../db/db'
import { currentUser as realUser, supa as realSupa } from './cloud'

// Test seam: lets the sync tests swap in a fake server. Never set in the app.
let override: { client: ReturnType<typeof realSupa>; user: unknown } | null = null
export const __setSyncClientForTests = (o: typeof override) => (override = o)
const supa = () => (override ? override.client : realSupa())
const currentUser = async () => (override ? override.user : realUser())

// SYNC — phone ↔ laptop through your own Supabase database. Offline-first:
//  • every local change is stamped with `_u` (edit time) by database hooks
//  • push: anything stamped after the last push goes up (server keeps the newest edit)
//  • pull: anything the server received since the last pull comes down (newest edit wins)
//  • deletes leave a small tombstone so other devices delete too
// Nothing ever blocks: if you're offline, changes wait and go up later.

const SKIP_TABLES = new Set(['backups'])
const isSyncKey = (tbl: string, key: string) => tbl === 'kv' && key.startsWith('sync:')
const syncedTables = () => db.tables.filter((t) => !SKIP_TABLES.has(t.name))
const keyPathOf = (tbl: string) => db.table(tbl).schema.primKey.keyPath as string

/** _u = last edit time · _r = the edit time it had when pulled from the cloud (unchanged since if _r === _u). */
type Row = Record<string, unknown> & { _u?: number; _r?: number; __remote?: boolean }

const remoteDeletes = new Set<string>()
let installed = false

/** Stamp every change. Must run before the app writes anything. */
export function installSyncHooks() {
  if (installed) return
  installed = true
  for (const t of syncedTables()) {
    const name = t.name
    t.hook('creating', function (_pk, obj: Row) {
      if (obj.__remote) {
        delete obj.__remote
        return
      }
      obj._u = Date.now()
    })
    t.hook('updating', function (mods) {
      if ('__remote' in (mods as Record<string, unknown>)) return { __remote: undefined }
      return { _u: Date.now() }
    })
    t.hook('deleting', function (pk) {
      const key = String(pk)
      if (isSyncKey(name, key)) return
      if (remoteDeletes.delete(`${name}:${key}`)) return
      // Record a tombstone outside the current transaction.
      void Dexie.ignoreTransaction(() => db.kv.put({ key: `sync:del:${name}:${key}`, value: Date.now() }))
    })
  }
}

// ── State shown in Settings ───────────────────────────────────────────
interface SyncState {
  status: 'off' | 'idle' | 'syncing' | 'error' | 'offline'
  lastSync: number | null
  error: string
  pushed: number
  pulled: number
  set: (p: Partial<SyncState>) => void
}
export const useSync = create<SyncState>((set) => ({ status: 'off', lastSync: null, error: '', pushed: 0, pulled: 0, set }))

const kvGet = async <T,>(k: string, d: T) => ((await db.kv.get(k))?.value as T) ?? d
const kvSet = (k: string, v: unknown) => db.kv.put({ key: k, value: v, __remote: true } as never) // __remote: don't stamp sync bookkeeping

// ── Push ──────────────────────────────────────────────────────────────
async function push(): Promise<number> {
  const s = supa()!
  const startedAt = Date.now()
  const since = await kvGet<number>('sync:pushedAt', 0)
  const rows: { tbl: string; id: string; data: unknown; updated_at: number; deleted?: boolean }[] = []
  for (const t of syncedTables()) {
    const kp = keyPathOf(t.name)
    const all = (await t.toArray()) as Row[]
    for (const r of all) {
      const id = String(r[kp])
      if (isSyncKey(t.name, id)) continue
      const u = r._u ?? 1 // records from before sync existed count as "changed once"
      if (r._r !== undefined && r._r === r._u) continue // came from the cloud and not edited here since
      if (u > since) rows.push({ tbl: t.name, id, data: r, updated_at: u })
    }
  }
  const tombs = (await db.kv.where('key').startsWith('sync:del:').toArray()) as { key: string; value: number }[]
  for (const tb of tombs) {
    const [, , tbl, ...rest] = tb.key.split(':')
    rows.push({ tbl, id: rest.join(':'), data: null, updated_at: tb.value, deleted: true })
  }
  for (let i = 0; i < rows.length; i += 400) {
    const { error } = await s.rpc('push_records', { rows: rows.slice(i, i + 400) })
    if (error) throw new Error(error.message)
  }
  if (tombs.length) await db.kv.bulkDelete(tombs.map((t) => t.key))
  await kvSet('sync:pushedAt', startedAt)
  return rows.length
}

// ── Pull ──────────────────────────────────────────────────────────────
async function pull(): Promise<number> {
  const s = supa()!
  let since = await kvGet<string>('sync:pulledAt', '1970-01-01T00:00:00Z')
  let applied = 0
  for (;;) {
    const { data, error } = await s.from('records').select('tbl,id,data,updated_at,deleted,server_at').gt('server_at', since).order('server_at').limit(500)
    if (error) throw new Error(error.message)
    if (!data?.length) break
    for (const row of data as { tbl: string; id: string; data: Row | null; updated_at: number; deleted: boolean; server_at: string }[]) {
      since = row.server_at
      if (SKIP_TABLES.has(row.tbl) || isSyncKey(row.tbl, row.id)) continue
      let table
      try {
        table = db.table(row.tbl)
      } catch {
        continue // a table this version of the app doesn't have yet
      }
      const key = row.id
      const local = (await table.get(key)) as Row | undefined
      if (local && (local._u ?? 0) > row.updated_at) continue // local edit is newer — it'll be pushed
      if (row.deleted) {
        if (local) {
          remoteDeletes.add(`${row.tbl}:${key}`)
          await table.delete(key)
        }
      } else if (row.data) {
        await table.put({ ...row.data, _u: row.updated_at, _r: row.updated_at, __remote: true })
      }
      applied++
    }
    await kvSet('sync:pulledAt', since)
    if (data.length < 500) break
  }
  return applied
}

let running = false

/** One full sync: pull first (so newer remote edits land), then push. */
export async function syncNow(): Promise<void> {
  const st = useSync.getState()
  if (running) return
  if (!supa() || !(await currentUser())) {
    st.set({ status: 'off' })
    return
  }
  if (!navigator.onLine) {
    st.set({ status: 'offline' })
    return
  }
  running = true
  st.set({ status: 'syncing', error: '' })
  try {
    const pulled = await pull()
    const pushed = await push()
    st.set({ status: 'idle', lastSync: Date.now(), pulled, pushed })
    await kvSet('sync:lastSync', Date.now())
  } catch (e) {
    st.set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
  } finally {
    running = false
  }
}

/** First sign-in on a device that already has data: merge, or take the cloud copy. */
export async function firstSyncChoice(): Promise<{ cloudHasData: boolean; localHasData: boolean }> {
  const s = supa()!
  const { count } = await s.from('records').select('id', { count: 'exact', head: true })
  const localHasData = (await db.habitLogs.count()) + (await db.days.count()) + (await db.txns.count()) > 0
  return { cloudHasData: (count ?? 0) > 0, localHasData }
}

/** Replace this device with the cloud copy (used on a second device). */
export async function replaceWithCloud() {
  await db.transaction('rw', syncedTables().map((t) => t.name), async () => {
    for (const t of syncedTables()) {
      if (t.name === 'kv') {
        const keys = (await t.toCollection().primaryKeys()).filter((k) => !String(k).startsWith('sync:'))
        for (const k of keys) remoteDeletes.add(`kv:${String(k)}`)
        await t.bulkDelete(keys)
      } else {
        const keys = await t.toCollection().primaryKeys()
        for (const k of keys) remoteDeletes.add(`${t.name}:${String(k)}`)
        await t.clear()
      }
    }
  })
  remoteDeletes.clear()
  await db.kv.bulkDelete(['sync:pulledAt', 'sync:pushedAt'])
  // Everything left locally is now older than the cloud; pull it all.
  await kvSet('sync:pushedAt', Date.now())
  await syncNow()
}

/** Keep syncing in the background: on open, every minute while visible, and when the connection returns. */
export function startAutoSync() {
  const tick = () => document.visibilityState === 'visible' && void syncNow()
  tick()
  const t = setInterval(tick, 60_000)
  window.addEventListener('online', tick)
  document.addEventListener('visibilitychange', tick)
  return () => {
    clearInterval(t)
    window.removeEventListener('online', tick)
    document.removeEventListener('visibilitychange', tick)
  }
}
