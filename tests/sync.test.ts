// Sync engine test — run with:  npx tsx tests/sync.test.ts
// Uses an in-memory IndexedDB and a fake Supabase server that mimics push_records (newest edit wins)
// and the records table (server_at ordering), so we can test the real sync code end to end.
import 'fake-indexeddb/auto'

const store = new Map<string, string>()
;(globalThis as Record<string, unknown>).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) }
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })

type Rec = { tbl: string; id: string; data: unknown; updated_at: number; deleted: boolean; server_at: string }
const server = new Map<string, Rec>()
let clock = Date.parse('2026-11-23T00:00:00Z')
const fake = {
  rpc: async (_fn: string, { rows }: { rows: Omit<Rec, 'server_at'>[] }) => {
    for (const r of rows) {
      const k = `${r.tbl}|${r.id}`
      const cur = server.get(k)
      if (cur && r.updated_at < cur.updated_at) continue // older edit never wins
      server.set(k, { ...r, deleted: !!r.deleted, server_at: new Date(++clock).toISOString() })
    }
    return { error: null }
  },
  from: () => ({
    select: (_cols: string, opts?: { head?: boolean }) => {
      if (opts?.head) return Promise.resolve({ count: server.size, error: null })
      let gt = ''
      let lim = 1000
      const q = {
        gt: (_c: string, v: string) => ((gt = v), q),
        order: () => q,
        limit: (n: number) => ((lim = n), q),
        then: (res: (v: { data: Rec[]; error: null }) => void) =>
          res({ data: [...server.values()].filter((r) => r.server_at > gt).sort((a, b) => a.server_at.localeCompare(b.server_at)).slice(0, lim), error: null }),
      }
      return q
    },
  }),
}

const { db } = await import('../src/db/db')
const sync = await import('../src/lib/sync')
sync.installSyncHooks()
sync.__setSyncClientForTests({ client: fake as never, user: { id: 'u1' } })

let failures = 0
const check = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`)
  if (!ok) failures++
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── Device A ──
await db.days.put({ day: '2026-11-23', waterMl: 1500, proteinG: 60, updatedAt: Date.now() })
await db.items.put({ id: 'i1', room: 'nazara', kind: 'todo', text: 'Order samples', at: 1 })
await db.items.put({ id: 'i2', room: 'nazara', kind: 'todo', text: 'Shoot lookbook', at: 2 })
await db.kv.put({ key: 'settings', value: { name: 'Krishi', waterTargetMl: 3000 } })
const stamped = (await db.days.get('2026-11-23')) as { _u?: number }
check('new records get an edit stamp', typeof stamped._u === 'number')

await sync.syncNow()
check('device A pushed to the server', server.size >= 4, `${server.size} rows`)

// ── Device B (fresh install) ──
await db.delete()
await db.open()
check('device B starts empty', (await db.items.count()) === 0)
await sync.syncNow()
const day = await db.days.get('2026-11-23')
check('device B pulled the day', day?.waterMl === 1500)
check('device B pulled both items', (await db.items.count()) === 2)
check('device B pulled settings', ((await db.kv.get('settings'))?.value as { name?: string })?.name === 'Krishi')
check('pulled rows are not re-sent as new edits', sync.useSync.getState().pushed === 0, `pushed ${sync.useSync.getState().pushed}`)

// B edits and deletes
await wait(5)
await db.days.update('2026-11-23', { waterMl: 2250 })
await db.items.delete('i2')
await wait(20) // tombstone is written just after the delete
await sync.syncNow()
check('edit reached the server', (server.get('days|2026-11-23')?.data as { waterMl?: number })?.waterMl === 2250)
check('delete reached the server as a tombstone', server.get('items|i2')?.deleted === true)
check('tombstone cleaned up locally', (await db.kv.where('key').startsWith('sync:del:').count()) === 0)

// Conflict 1: a newer edit from another device wins on pull
const remoteNewer = Date.now() + 60_000
await fake.rpc('push_records', { rows: [{ tbl: 'days', id: '2026-11-23', data: { day: '2026-11-23', waterMl: 2750, proteinG: 90, updatedAt: 0 }, updated_at: remoteNewer, deleted: false }] })
await sync.syncNow()
check('newer remote edit wins locally', (await db.days.get('2026-11-23'))?.waterMl === 2750)

// Conflict 2: an older remote edit does not overwrite a newer local one
await wait(5)
await db.items.update('i1', { text: 'Order samples — urgent' })
const localU = ((await db.items.get('i1')) as { _u: number })._u
server.set('items|i1', { tbl: 'items', id: 'i1', data: { id: 'i1', room: 'nazara', kind: 'todo', text: 'STALE', at: 1 }, updated_at: localU - 10_000, deleted: false, server_at: new Date(++clock).toISOString() })
await sync.syncNow()
check('older remote edit does not clobber local', (await db.items.get('i1'))?.text === 'Order samples — urgent')
check('…and the newer local edit wins on the server', (server.get('items|i1')?.data as { text?: string })?.text === 'Order samples — urgent')

// Remote delete applies locally
await fake.rpc('push_records', { rows: [{ tbl: 'items', id: 'i1', data: null, updated_at: Date.now() + 120_000, deleted: true }] })
await sync.syncNow()
check('remote delete removes the item locally', (await db.items.get('i1')) === undefined)
check('remote delete does not echo back a tombstone', (await db.kv.where('key').startsWith('sync:del:').count()) === 0)

// Second device that already has its own (different) data chooses "Use the cloud copy"
await db.items.put({ id: 'laptop-only', room: 'nazara', kind: 'todo', text: 'Laptop junk', at: 9 })
await db.kv.bulkDelete(['sync:pulledAt', 'sync:pushedAt'])
await sync.replaceWithCloud()
check('replace: local-only data is gone', (await db.items.get('laptop-only')) === undefined)
check('replace: cloud data is present', (await db.days.get('2026-11-23'))?.waterMl === 2750)
check('replace: nothing deleted on the server', server.get('items|laptop-only') === undefined && server.get('days|2026-11-23')?.deleted === false)

console.log(failures ? `\n${failures} FAILED` : '\nALL SYNC TESTS PASSED')
process.exit(failures ? 1 : 0)
