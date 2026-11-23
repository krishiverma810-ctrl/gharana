import { db } from './db'
import { DEFAULT_GOALS, DEFAULT_HABITS, DEFAULT_TEMPLATES } from '../config/defaults'
import { DEFAULT_TRIPS } from '../config/travel'
import { SEED_LISTS } from '../config/library'
import { DEFAULT_PEOPLE } from '../config/people'
import { uid } from './db'

// Seeds starting data once. Each seed step has its own flag so later phases
// can add new seed steps without re-seeding (or overwriting) anything you edited.
const SEED_STEPS: { key: string; run: () => Promise<void> }[] = [
  {
    key: 'seed:p1-habits',
    run: async () => {
      if ((await db.habits.count()) === 0) await db.habits.bulkPut(DEFAULT_HABITS)
    },
  },
  {
    key: 'seed:p1-templates',
    run: async () => {
      if ((await db.templates.count()) === 0) await db.templates.bulkPut(DEFAULT_TEMPLATES)
    },
  },
  {
    key: 'seed:p1-goals',
    run: async () => {
      if ((await db.goals.count()) === 0) await db.goals.bulkPut(DEFAULT_GOALS)
    },
  },
  {
    key: 'seed:p2-trips',
    run: async () => {
      if ((await db.trips.count()) === 0) await db.trips.bulkPut(DEFAULT_TRIPS)
    },
  },
  {
    key: 'seed:p3-lists',
    run: async () => {
      let t = Date.now()
      for (const list of SEED_LISTS) {
        const existing = await db.items.where('[room+kind]').equals([list.room, list.kind]).count()
        if (existing) continue
        await db.items.bulkAdd(list.items.map((text) => ({ id: uid(), room: list.room, kind: list.kind, text, done: false, at: t++ })))
      }
      if (!(await db.items.where('[room+kind]').equals(['forge', 'skill']).count())) {
        await db.items.bulkAdd(['Keyboard', 'Cooking', 'Boxing', 'Design'].map((text) => ({ id: uid(), room: 'forge', kind: 'skill', text, at: t++ })))
      }
    },
  },
  {
    key: 'seed:p4-people-grooming',
    run: async () => {
      if (!(await db.people.count())) await db.people.bulkPut(DEFAULT_PEOPLE)
      let t = Date.now()
      const steps: [string, string[]][] = [
        ['am', ['Cold face wash / gentle cleanser', 'Moisturiser', 'Sunscreen SPF 50']],
        ['pm', ['Cleanser', 'Treatment (e.g. niacinamide)', 'Moisturiser', 'Lip balm']],
      ]
      for (const [kind, list] of steps) {
        if (await db.items.where('[room+kind]').equals(['grooming', kind]).count()) continue
        await db.items.bulkAdd(list.map((text) => ({ id: uid(), room: 'grooming', kind, text, at: t++ })))
      }
    },
  },
]

export async function ensureSeeded() {
  for (const step of SEED_STEPS) {
    const done = await db.kv.get(step.key)
    if (done) continue
    await step.run()
    await db.kv.put({ key: step.key, value: Date.now() })
  }
}
