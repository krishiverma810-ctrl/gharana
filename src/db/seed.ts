import { db } from './db'
import { DEFAULT_GOALS, DEFAULT_HABITS, DEFAULT_TEMPLATES } from '../config/defaults'
import { DEFAULT_TRIPS } from '../config/travel'

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
]

export async function ensureSeeded() {
  for (const step of SEED_STEPS) {
    const done = await db.kv.get(step.key)
    if (done) continue
    await step.run()
    await db.kv.put({ key: step.key, value: Date.now() })
  }
}
