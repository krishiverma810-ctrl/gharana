import { db } from '../db/db'
import { getSettings } from '../store/settings'
import { dailyStreak, isDone } from './streaks'
import { localDayKey } from './time'
import { LOCATIONS } from '../config/lockin'
import { currentLocation } from '../store/settings'

// The house's whole-life stats — computed fresh from your data (nothing stored that can drift).
// Powers XP, levels, achievements, the Archive and reports.

export interface Stats {
  habitsDone: number
  bestStreak: number
  fullHouseDays: number
  workouts: number
  workoutMinutes: number
  prs: number
  focusHours: number
  dealsWon: number
  cards: number
  reviews: number
  booksDone: number
  pagesRead: number
  waterDays: number
  proteinDays: number
  morningRites: number
  earlyWakes: number
  debriefs: number
  missionsDone: number
  savedTotal: number
  goalsFunded: number
  packedTrips: number
  memories: number
  contacts: number
  challengesDone: number
  bodyLogs: number
  dishes: number
  maxSkillHours: number
  gamsatTests: number
  expHours: number
  applications: number
  ksPosts: number
  ksViews: number
  nazaraSales: number
  postersDelivered: number
  captures: number
  daysActive: number
  proudDays: number
  studyHours: number
  drivingHours: number
  socialReps: number
}

export async function computeStats(): Promise<Stats> {
  const s = getSettings()
  const today = localDayKey(new Date(), LOCATIONS[currentLocation(s)].timeZone)
  const [habits, logs, days, workouts, lifts, focus, deals, cards, books, sessions, txns, goals, trips, items, captures, kvKeys, challenges, body] = await Promise.all([
    db.habits.toArray(), db.habitLogs.toArray(), db.days.toArray(), db.workouts.toArray(), db.lifts.toArray(), db.focus.toArray(),
    db.deals.toArray(), db.cards.toArray(), db.books.toArray(), db.sessions.toArray(), db.txns.toArray(), db.goals.toArray(),
    db.trips.toArray(), db.items.toArray(), db.captures.count(), db.kv.toCollection().primaryKeys(), db.challenges.toArray(), db.body.count(),
  ])
  const byHabit = new Map<string, typeof logs>()
  for (const l of logs) byHabit.set(l.habitId, [...(byHabit.get(l.habitId) ?? []), l])
  let bestStreak = 0
  let habitsDone = 0
  for (const h of habits) {
    const hl = byHabit.get(h.id) ?? []
    habitsDone += hl.filter((l) => isDone(h, l)).length
    bestStreak = Math.max(bestStreak, dailyStreak(h, hl, today, () => false).best)
  }
  // PRs: each time a lift's e1RM beats its previous best.
  let prs = 0
  const best = new Map<string, number>()
  for (const l of [...lifts].sort((a, b) => a.at - b.at)) {
    if (l.e1rm > (best.get(l.lift) ?? 0)) {
      prs++
      best.set(l.lift, l.e1rm)
    }
  }
  const it = (room: string, kind: string) => items.filter((i) => i.room === room && i.kind === kind)
  const skillHours = new Map<string, number>()
  for (const x of sessions.filter((x) => x.kind === 'skill')) skillHours.set(x.subject, (skillHours.get(x.subject) ?? 0) + x.minutes / 60)
  const hoursOf = (kind: string) => sessions.filter((x) => x.kind === kind).reduce((a, x) => a + x.minutes, 0) / 60
  const savedFor = (id: string) => txns.filter((t) => t.goalId === id).reduce((a, t) => a + t.amount, 0)

  return {
    habitsDone,
    bestStreak,
    fullHouseDays: kvKeys.filter((k) => String(k).startsWith('fullhouse:')).length,
    workouts: workouts.length,
    workoutMinutes: workouts.reduce((a, w) => a + w.minutes, 0),
    prs,
    focusHours: focus.reduce((a, f) => a + f.minutes, 0) / 60,
    dealsWon: deals.filter((d) => d.stage === 'won').length,
    cards: cards.length,
    reviews: cards.reduce((a, c) => a + c.reps + c.lapses, 0),
    booksDone: books.filter((b) => b.status === 'done').length,
    pagesRead: sessions.filter((x) => x.kind === 'reading').reduce((a, x) => a + (x.num ?? 0), 0),
    waterDays: days.filter((d) => d.waterMl >= s.waterTargetMl).length,
    proteinDays: days.filter((d) => d.proteinG >= s.proteinTargetG).length,
    morningRites: days.filter((d) => d.morning?.completedAt).length,
    earlyWakes: days.filter((d) => d.morning?.wakeTime && d.morning.wakeTime <= s.wakeTarget).length,
    debriefs: days.filter((d) => d.night?.completedAt).length,
    missionsDone: it('wildcard', 'done').length,
    savedTotal: txns.filter((t) => t.kind === 'saving').reduce((a, t) => a + t.amount, 0),
    goalsFunded: goals.filter((g) => savedFor(g.id) >= g.target).length,
    packedTrips: trips.filter((t) => t.packing.length && t.packing.every((p) => p.done)).length,
    memories: it('alfred', 'memory').length,
    contacts: it('mehfil', 'contact').length,
    challengesDone: challenges.filter((c) => c.status === 'done').length,
    bodyLogs: body,
    dishes: it('forge', 'cooked').length,
    maxSkillHours: Math.max(0, ...skillHours.values()),
    gamsatTests: it('dental', 'gamsat').length,
    expHours: it('dental', 'experience').reduce((a, e) => a + Number(e.meta?.hours ?? 0), 0),
    applications: it('jobs', 'application').length,
    ksPosts: it('ksvol1', 'post').length,
    ksViews: it('ksvol1', 'post').reduce((a, p) => a + Number(p.meta?.views ?? 0), 0),
    nazaraSales: it('nazara', 'order').reduce((a, p) => a + Number(p.meta?.amount ?? 0), 0),
    postersDelivered: it('mpa', 'poster').filter((p) => p.meta?.status === 'Delivered').length,
    captures,
    daysActive: days.length,
    proudDays: days.filter((d) => d.proud || d.night?.proud).length,
    studyHours: hoursOf('study') + hoursOf('gamsat'),
    drivingHours: hoursOf('driving'),
    socialReps: it('mehfil', 'rep').length,
  }
}

/** XP: every real action in the house earns some. */
export function xpOf(s: Stats): number {
  return Math.round(
    s.habitsDone * 10 + s.fullHouseDays * 50 + s.workoutMinutes / 3 + s.prs * 40 + s.focusHours * 12 + s.dealsWon * 100 +
      s.cards * 2 + s.reviews * 2 + s.booksDone * 150 + s.pagesRead * 0.5 + s.waterDays * 10 + s.proteinDays * 10 +
      s.morningRites * 20 + s.earlyWakes * 15 + s.debriefs * 20 + s.missionsDone * 30 + s.savedTotal / 10 + s.goalsFunded * 300 +
      s.packedTrips * 50 + s.contacts * 8 + s.challengesDone * 250 + s.bodyLogs * 5 + s.dishes * 25 + s.gamsatTests * 60 +
      s.expHours * 6 + s.applications * 20 + s.ksPosts * 25 + s.postersDelivered * 40 + s.studyHours * 12 + s.drivingHours * 8 +
      s.socialReps * 20 + s.proudDays * 15,
  )
}

/** Level curve: each level needs a bit more than the last. Level 1 at 0 XP. */
export function levelOf(xp: number) {
  const need = (l: number) => Math.round(150 * Math.pow(l - 1, 1.6)) // XP to reach level l
  let level = 1
  while (xp >= need(level + 1)) level++
  const cur = need(level)
  const next = need(level + 1)
  return { level, cur, next, into: xp - cur, span: next - cur }
}

export const LEVEL_TITLES = ['Doorman', 'Apprentice', 'Footman', 'Valet', 'Under-butler', 'Steward', 'Butler', 'Major-domo', 'Master of the House', 'Patron', 'Founder', 'Dynast', 'Legend of the Estate']
export const titleFor = (level: number) => LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((level - 1) / 3))]
