import { db } from './db'

// Export / import / auto-backup. Your data never gets lost:
//  • auto-backup: once a day a snapshot is saved on-device (last 7 kept)
//  • export: one tap downloads a .json file you can keep in iCloud / email to yourself
//  • import: restores a file — a safety snapshot is taken first

export interface ExportFile {
  app: 'gharana'
  schema: number
  exportedAt: string
  tables: Record<string, unknown[]>
}

const SKIP = new Set(['backups'])

export async function snapshot(): Promise<ExportFile> {
  const tables: Record<string, unknown[]> = {}
  for (const t of db.tables) {
    if (SKIP.has(t.name)) continue
    tables[t.name] = await t.toArray()
  }
  return { app: 'gharana', schema: db.verno, exportedAt: new Date().toISOString(), tables }
}

export async function restore(file: ExportFile) {
  if (file?.app !== 'gharana' || typeof file.tables !== 'object') throw new Error('That file is not a GHARANA backup.')
  if (file.schema > db.verno) throw new Error('That backup is from a newer version of GHARANA. Update the app first.')
  await saveBackup('before import')
  const names = db.tables.map((t) => t.name).filter((n) => !SKIP.has(n))
  await db.transaction('rw', names, async () => {
    for (const name of names) {
      const rows = file.tables[name]
      if (!Array.isArray(rows)) continue
      await db.table(name).clear()
      await db.table(name).bulkPut(rows)
    }
  })
}

export async function saveBackup(reason: string) {
  const data = JSON.stringify(await snapshot())
  await db.backups.add({ at: Date.now(), reason, data })
  const all = await db.backups.orderBy('at').primaryKeys()
  const extra = all.length - 7
  if (extra > 0) await db.backups.bulkDelete(all.slice(0, extra))
}

export async function autoBackupIfDue() {
  const last = await db.backups.orderBy('at').last()
  if (!last || Date.now() - last.at > 20 * 3600_000) await saveBackup('daily auto-backup')
}

export function downloadJSON(file: ExportFile) {
  const blob = new Blob([JSON.stringify(file, null, 1)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gharana-backup-${file.exportedAt.slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** CSV export for any single table (rooms → spreadsheet). */
export async function downloadCSV(table: string) {
  const rows = (await db.table(table).toArray()) as Record<string, unknown>[]
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  const esc = (v: unknown) => {
    const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `gharana-${table}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function wipeEverything() {
  await saveBackup('before wipe')
  const names = db.tables.map((t) => t.name).filter((n) => !SKIP.has(n))
  await db.transaction('rw', names, async () => {
    for (const n of names) await db.table(n).clear()
  })
}
