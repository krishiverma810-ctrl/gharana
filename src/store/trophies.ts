import { create } from 'zustand'
import { db } from '../db/db'
import { computeStats, levelOf, xpOf, type Stats } from '../lib/stats'
import { ACHIEVEMENTS } from '../config/achievements'
import { celebrate, toast } from './ui'
import { win } from '../lib/sound'

// Keeps XP, level and achievements fresh, and celebrates new unlocks + level-ups.

interface TrophyStore {
  stats: Stats | null
  xp: number
  level: ReturnType<typeof levelOf>
  unlocked: Record<string, string> // id → date unlocked
  levelUp: number | null // level just reached (shows the overlay)
  refresh: () => Promise<void>
  dismissLevelUp: () => void
}

const today = () => new Date().toISOString().slice(0, 10)

export const useTrophies = create<TrophyStore>((set) => ({
  stats: null,
  xp: 0,
  level: levelOf(0),
  unlocked: {},
  levelUp: null,
  refresh: async () => {
    const stats = await computeStats()
    const xp = xpOf(stats)
    const level = levelOf(xp)
    const saved = ((await db.kv.get('trophies:unlocked'))?.value as Record<string, string>) ?? {}
    const firstRun = !(await db.kv.get('trophies:unlocked'))
    const fresh = ACHIEVEMENTS.filter((a) => !saved[a.id] && a.test(stats))
    const unlocked = { ...saved }
    for (const a of fresh) unlocked[a.id] = today()
    if (fresh.length) await db.kv.put({ key: 'trophies:unlocked', value: unlocked })
    else if (firstRun) await db.kv.put({ key: 'trophies:unlocked', value: unlocked })

    const lastLevel = ((await db.kv.get('trophies:level'))?.value as number) ?? 0
    let levelUp: number | null = null
    if (level.level > lastLevel) {
      await db.kv.put({ key: 'trophies:level', value: level.level })
      // The very first calculation just records where you are — no fanfare for history.
      if (lastLevel > 0) levelUp = level.level
    }
    // Don't spam on first run (achievements earned before Phase 4 just appear in the hall).
    if (!firstRun && fresh.length) {
      win()
      celebrate()
      toast(fresh.length === 1 ? `🏆 Achievement: ${fresh[0].name}` : `🏆 ${fresh.length} achievements unlocked — ${fresh.map((a) => a.name).slice(0, 3).join(', ')}`)
    }
    set({ stats, xp, level, unlocked, ...(levelUp ? { levelUp } : {}) })
  },
  dismissLevelUp: () => set({ levelUp: null }),
}))
