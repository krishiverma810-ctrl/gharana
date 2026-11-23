// Seeding test — run with:  npx tsx tests/seed.test.ts
// Two windows opening at the same moment must not seed the starter lists twice.
import 'fake-indexeddb/auto'

const { db } = await import('../src/db/db')
const { ensureSeeded } = await import('../src/db/seed')

let failures = 0
const check = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`)
  if (!ok) failures++
}
const dupes = async () => {
  const seen = new Map<string, number>()
  for (const i of await db.items.toArray()) seen.set(`${i.room}|${i.kind}|${i.text}`, (seen.get(`${i.room}|${i.kind}|${i.text}`) ?? 0) + 1)
  return [...seen.values()].filter((n) => n > 1).length
}

// Same window, called twice at once
await Promise.all([ensureSeeded(), ensureSeeded()])
const first = await db.items.count()
check('seeds starter lists', first > 20, `${first} items`)
check('no duplicates when called twice at once', (await dupes()) === 0)

await db.delete()
await db.open()
await ensureSeeded()

// A database that already has duplicates gets cleaned once
const skills = await db.items.where('[room+kind]').equals(['forge', 'skill']).toArray()
await db.items.bulkAdd(skills.map((s) => ({ ...s, id: `${s.id}-dup`, at: s.at + 1 })))
await db.kv.delete('seed:p5-dedupe')
await ensureSeeded()
check('existing duplicates are removed', (await dupes()) === 0)
check('originals are kept', (await db.items.where('[room+kind]').equals(['forge', 'skill']).count()) === skills.length)

console.log(failures ? `\n${failures} FAILED` : '\nALL SEED TESTS PASSED')
process.exit(failures ? 1 : 0)
