import { addProtein, addWater, db, uid } from '../db/db'
import { autoTemplateId, setHabitValue } from '../db/hooks'
import { getSettings, useSettings } from '../store/settings'
import { useFocus } from '../store/focus'
import { navigate } from '../app/router'
import { ROOMS } from '../config/rooms'
import { LOCATIONS, type LocationId } from '../config/lockin'
import { VERSES } from '../config/verses'
import { here } from './alfred'
import { isDone, dailyStreak } from './streaks'
import { addReminder } from '../store/reminders'
import { dayNumber, formatTime, prettyHm, daysBetween } from './time'
import { nowAndNext } from './blueprint'
import { syncHabits } from '../rooms/Patrol'
import type { WorkoutType } from '../db/types'

// Offline voice commands. These run instantly on the phone — no internet, no AI, no cost.
// Anything that doesn't match falls through to ALFRED.

export interface CommandResult {
  reply: string
}

const NUM_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  fifteen: 15, twenty: 20, 'twenty five': 25, thirty: 30, forty: 40, 'forty five': 45, fifty: 50, sixty: 60, ninety: 90, hundred: 100,
}

/** "twenty five" → "25" so the patterns below only need digits. */
function normalise(raw: string) {
  let t = raw.toLowerCase().replace(/[’']/g, "'").replace(/[.,!?]/g, ' ').replace(/\s+/g, ' ').trim()
  t = t.replace(/^(hey |ok |okay )?alfred\b\s*/, '').replace(/\bplease\b/g, '').trim()
  for (const [w, n] of Object.entries(NUM_WORDS).sort((a, b) => b[0].length - a[0].length)) {
    t = t.replace(new RegExp(`\\b${w}\\b(?= (ml|millilitres?|litres?|l|g|grams?|minutes?|mins?|hours?|rupees|dollars|bucks|sets?|reps?))`, 'g'), String(n))
  }
  return t.replace(/\s+/g, ' ').trim()
}

const ROOM_ALIASES: Record<string, string> = {
  home: 'lounge', lounge: 'lounge', dashboard: 'lounge', habits: 'rites', rites: 'rites', 'daily rites': 'rites',
  timetable: 'blueprint', blueprint: 'blueprint', schedule: 'blueprint', plan: 'blueprint', training: 'patrol', patrol: 'patrol', gym: 'patrol',
  money: 'vault', vault: 'vault', budget: 'vault', settings: 'settings', calendar: 'calendar', trips: 'concierge', trip: 'concierge',
  concierge: 'concierge', packing: 'concierge', wildcard: 'wildcard', missions: 'wildcard', family: 'family', deepali: 'deepali',
  alfred: 'alfred', chat: 'alfred', morning: 'morning', 'morning rite': 'morning', debrief: 'night', 'night debrief': 'night', corridor: 'corridor',
}

const LOC_ALIASES: Record<string, LocationId> = { melbourne: 'melbourne', home: 'melbourne', india: 'india', delhi: 'india', punjab: 'india', 'gold coast': 'goldcoast', queensland: 'goldcoast', brisbane: 'goldcoast' }

const WORKOUTS: WorkoutType[] = ['gym', 'boxing', 'sport', 'run', 'swim', 'walk', 'mobility']

async function findHabit(name: string) {
  const { habitSet } = here()
  const habits = (await db.habits.toArray()).filter((h) => !h.archived && h.sets.includes(habitSet))
  const q = name.replace(/^(my|the)\s+/, '').trim()
  return (
    habits.find((h) => h.name.toLowerCase() === q) ??
    habits.find((h) => h.name.toLowerCase().includes(q)) ??
    habits.find((h) => q.includes(h.name.toLowerCase().split(/[ /]/)[0])) ??
    habits.find((h) => h.id === q.replace(/\s+/g, ''))
  )
}

/** Try to handle a spoken command locally. Returns null if ALFRED should handle it. */
export async function runCommand(raw: string): Promise<CommandResult | null> {
  const t = normalise(raw)
  if (!t) return null
  const { today, timeZone, location, habitSet, s, minute, now } = here()
  let m: RegExpMatchArray | null

  // 1. Water
  if ((m = t.match(/(\d+(?:\.\d+)?)\s*(ml|millilitres?|l|litres?)\b.*water|water.*?(\d+(?:\.\d+)?)\s*(ml|millilitres?|l|litres?)\b/))) {
    const n = Number(m[1] ?? m[3])
    const unit = m[2] ?? m[4]
    const ml = unit.startsWith('l') ? Math.round(n * 1000) : Math.round(n)
    await addWater(today, ml)
    const d = await db.days.get(today)
    return { reply: `${ml} millilitres logged. You're at ${((d?.waterMl ?? 0) / 1000).toFixed(1)} of ${s.waterTargetMl / 1000} litres, sir.` }
  }
  if (/\b(a|one) (glass|cup) of water\b|\bdrank (some )?water\b/.test(t)) {
    await addWater(today, 250)
    return { reply: 'A glass of water, logged. Splendid.' }
  }
  if (/\b(a|one) bottle of water\b/.test(t)) {
    await addWater(today, 600)
    return { reply: 'A bottle of water, 600 millilitres, logged.' }
  }

  // 2. Protein
  if ((m = t.match(/(\d+)\s*(g|grams?)\b.*protein|protein.*?(\d+)\s*(g|grams?)\b/))) {
    const g = Number(m[1] ?? m[3])
    await addProtein(today, g)
    const d = await db.days.get(today)
    return { reply: `${g} grams of protein logged. ${d?.proteinG ?? 0} of ${s.proteinTargetG} for the day.` }
  }

  // 3. Fuel status
  if (/what am i at|how much (water|protein)|fuel (status|check)/.test(t)) {
    const d = await db.days.get(today)
    return { reply: `Water ${((d?.waterMl ?? 0) / 1000).toFixed(1)} of ${s.waterTargetMl / 1000} litres, protein ${d?.proteinG ?? 0} of ${s.proteinTargetG} grams.` }
  }

  // 4. Logged a workout: "did 30 minutes of boxing" / "log 45 minute gym session"
  if ((m = t.match(/(\d+)\s*(?:min(?:ute)?s?|hours?)\b(?: of)? (boxing|gym|run(?:ning)?|swim(?:ming)?|walk(?:ing)?|sport|mobility|stretching)/))) {
    const minutes = /hour/.test(t) ? Number(m[1]) * 60 : Number(m[1])
    const type = (WORKOUTS.find((w) => m![2].startsWith(w.slice(0, 3))) ?? 'other') as WorkoutType
    const w = { id: uid(), day: today, type, minutes, intensity: 3, at: Date.now() }
    await db.workouts.add(w)
    await syncHabits(w)
    return { reply: `${minutes} minutes of ${type} logged to the Patrol.` }
  }

  // 5. Untick a habit
  if ((m = t.match(/^(?:untick|undo|uncheck)\s+(.+)/))) {
    const h = await findHabit(m[1])
    if (!h) return { reply: `I couldn't find a habit called ${m[1]}.` }
    await setHabitValue(h, today, 0, { quiet: true })
    return { reply: `${h.name} unticked.` }
  }

  // 6. Tick a habit: "tick boxing", "done skincare", "skincare done", "I did keyboard"
  if ((m = t.match(/^(?:tick|done|did|finished|completed|i did|i finished|check off)\s+(.+)|^(.+?)\s+(?:done|finished|completed)$/))) {
    const name = m[1] ?? m[2]
    const h = await findHabit(name)
    if (h) {
      const value = h.type === 'check' || h.type === 'weekly' ? 1 : h.target
      await setHabitValue(h, today, value, { activeIds: (await db.habits.toArray()).map((x) => x.id) })
      return { reply: `${h.name}, ticked. Well done, sir.` }
    }
  }

  // 7. Reminders / timers: "remind me in 20 minutes to take the chicken out", "set a 10 minute timer"
  if ((m = t.match(/(?:remind me|timer|set a timer|alarm)\s+(?:in|for)\s+(\d+)\s*(min(?:ute)?s?|hours?)(?:\s+to\s+(.+))?/)) || (m = t.match(/set an? (\d+)\s*(min(?:ute)?s?|hours?) timer(?: for (.+))?/))) {
    const mins = /hour/.test(m[2]) ? Number(m[1]) * 60 : Number(m[1])
    const label = m[3]?.trim() || 'Timer'
    addReminder(mins, label)
    return { reply: `Very good. I'll remind you in ${mins} minutes${m[3] ? ` to ${m[3]}` : ''}.` }
  }

  // 8. Focus timer
  if (/pomodoro/.test(t)) {
    useFocus.getState().start(25, 'Deep Study', true)
    return { reply: 'Pomodoro started. Twenty-five minutes on, five off. Phone face down, sir.' }
  }
  if ((m = t.match(/(?:start|begin)?\s*(?:an?\s*)?(\d+)?\s*(?:-|\s)?(?:min(?:ute)?s?)?\s*(?:focus|study|deep work)(?:\s+(?:session|block|timer))?(?:\s+(?:for|on)\s+(.+))?/)) && /focus|study|deep work/.test(t) && /start|begin|focus timer|^\d/.test(t)) {
    const mins = Number(m[1]) || s.focusPresets[0] || 25
    useFocus.getState().start(mins, m[2] ? m[2].replace(/^\w/, (c) => c.toUpperCase()) : 'Deep Study')
    return { reply: `${mins} minutes of focus, starting now.` }
  }
  if (/^(stop|end|cancel|finish) (the )?(focus|timer|session)/.test(t)) {
    useFocus.getState().stop(true, today)
    return { reply: 'Focus session ended and logged.' }
  }

  // 9. Boxing rounds
  if (/boxing (rounds|timer)|round timer/.test(t)) {
    navigate('/patrol#rounds')
    return { reply: 'The round timer, sir. Hands up.' }
  }

  // 10. Time somewhere
  if ((m = t.match(/(?:what(?:'s| is) the )?time (?:is it )?in (melbourne|india|delhi|punjab|gold coast|brisbane|queensland)/))) {
    const loc = LOC_ALIASES[m[1]]
    return { reply: `It's ${formatTime(now, LOCATIONS[loc].timeZone)} in ${LOCATIONS[loc].name}.` }
  }
  if (/^what(?:'s| is) the time|^what time is it/.test(t)) {
    return { reply: `It's ${formatTime(now, timeZone)}.` }
  }

  // 12. Spending: "spent 14 dollars on GYG", "spent 500 rupees on chai"
  if ((m = t.match(/spent \$?(\d+(?:\.\d+)?)\s*(dollars|bucks|rupees|rs|inr)?\s*(?:on|at)\s+(.+)/))) {
    // Exact unit match — "dollars" contains the letters "rs", so no substring tests here.
    const inr = /^(rupees?|rs|inr)$/.test(m[2] ?? '')
    const amount = inr ? Math.round((Number(m[1]) / s.inrPerAud) * 100) / 100 : Number(m[1])
    // Keep the original capitals for the note ("GYG", not "gyg").
    const lowerWhat = m[3].trim()
    const at = raw.toLowerCase().lastIndexOf(lowerWhat)
    const what = at >= 0 ? raw.slice(at, at + lowerWhat.length) : lowerWhat
    const cat = /gyg|food|lunch|dinner|breakfast|chai|coffee|maccas|kfc|eat/.test(lowerWhat) ? 'Food' : /uber|train|myki|fuel|petrol|bus|taxi|rickshaw/.test(lowerWhat) ? 'Transport' : /shirt|shoes|jeans|fit|clothes|hoodie/.test(lowerWhat) ? 'Fits' : /gym|boxing/.test(lowerWhat) ? 'Gym / sport' : 'Other'
    await db.txns.add({ id: uid(), day: today, amount, kind: 'expense', category: cat, note: what, inr: inr ? Number(m[1]) : undefined, place: location, at: Date.now() })
    return { reply: `${inr ? `${m[1]} rupees, about ` : ''}${amount} dollars on ${what}, logged under ${cat}.` }
  }

  // 11. Currency
  if ((m = t.match(/(?:convert )?(\d+(?:\.\d+)?)\s*(rupees|inr|rs)\b/))) {
    const aud = Number(m[1]) / s.inrPerAud
    return { reply: `${m[1]} rupees is about ${aud.toFixed(2)} Australian dollars, at your rate of ${s.inrPerAud}.` }
  }
  if ((m = t.match(/(?:convert )?(\d+(?:\.\d+)?)\s*(dollars|aud|bucks)\b.*(rupees|inr)/))) {
    return { reply: `${m[1]} dollars is about ${Math.round(Number(m[1]) * s.inrPerAud).toLocaleString('en-IN')} rupees.` }
  }

  // 13. What's left today
  if (/what(?:'s| is) left|what do i (still )?(have|need) to do/.test(t)) {
    const habits = (await db.habits.toArray()).filter((h) => !h.archived && h.sets.includes(habitSet) && h.type !== 'weekly')
    const logs = await db.habitLogs.where('day').equals(today).toArray()
    const left = habits.filter((h) => !isDone(h, logs.find((l) => l.habitId === h.id)))
    const d = await db.days.get(today)
    const big = (d?.big3 ?? []).filter((b) => b.text && !b.done).map((b) => b.text)
    if (!left.length && !big.length) return { reply: 'Nothing left, sir. A full house. Go and rest.' }
    return { reply: `${left.length ? `Still to do: ${left.map((h) => h.name).join(', ')}.` : ''} ${big.length ? `Big 3 open: ${big.join('; ')}.` : ''}`.trim() }
  }

  // 14. What's next
  if (/what(?:'s| is) next|what should i (be )?do(ing)?( now)?/.test(t)) {
    const templates = await db.templates.toArray()
    const shifts = await db.shifts.where('day').equals(today).count()
    const dayLog = await db.days.get(today)
    const tpl = templates.find((x) => x.id === autoTemplateId(today, location, shifts > 0, dayLog))
    if (!tpl) return { reply: 'The Blueprint is empty today.' }
    const nn = nowAndNext(tpl.blocks, minute)
    return { reply: `${nn.now ? `Right now: ${nn.now.title}, ${nn.minsLeft} minutes left.` : 'This is open time.'} ${nn.next ? `Next: ${nn.next.title} at ${prettyHm(nn.next.start)}.` : ''}`.trim() }
  }

  // 15. Travel mode
  if ((m = t.match(/(?:switch to|go into|turn on|change to|set)\s+(india|gold coast|home|melbourne|auto)(?: mode)?/))) {
    const mode = m[1] === 'auto' ? 'auto' : LOC_ALIASES[m[1]]
    useSettings.getState().update({ location: mode })
    return { reply: mode === 'auto' ? 'Travel Mode is back on automatic.' : `Switching to ${LOCATIONS[mode].name} mode. Time zone, habits and the skyline follow.` }
  }

  // 16. Sounds / battery saver / speaking
  if (/^(mute|silence)( sounds?)?$|sounds? off/.test(t)) {
    useSettings.getState().update({ sound: false })
    return { reply: 'Sounds off.' }
  }
  if (/^unmute|sounds? on/.test(t)) {
    useSettings.getState().update({ sound: true })
    return { reply: 'Sounds on.' }
  }
  if ((m = t.match(/battery saver (on|off)|(turn on|turn off|enable|disable) battery saver/))) {
    const on = /on|enable/.test(m[1] ?? m[2])
    useSettings.getState().update({ batterySaver: on })
    return { reply: `Battery saver ${on ? 'on — the city stands still' : 'off'}.` }
  }

  // 17. The verse
  if (/verse|gita/.test(t) && /read|what|today|tell/.test(t)) {
    const v = VERSES[((dayNumber(today) % VERSES.length) + VERSES.length) % VERSES.length]
    return { reply: `Bhagavad Gita, chapter ${v.ref.replace('.', ', verse ')}. ${v.english} In your terms: ${v.apply}` }
  }

  // 18. Packing
  if (/left to pack|what(?:'s| is) (still )?(left )?(to )?pack|packing (status|list)/.test(t)) {
    const trip = (await db.trips.toArray()).filter((x) => x.end >= today).sort((a, b) => a.start.localeCompare(b.start))[0]
    if (!trip) return { reply: 'No upcoming trip to pack for.' }
    const left = trip.packing.filter((p) => !p.done)
    if (!left.length) return { reply: `Fully packed for ${trip.name}. Bon voyage.` }
    return { reply: `${left.length} things left for ${trip.name}: ${left.slice(0, 8).map((p) => p.text).join(', ')}${left.length > 8 ? ', and more' : ''}.` }
  }

  // 19. Streaks
  if (/streak/.test(t)) {
    const habits = (await db.habits.toArray()).filter((h) => !h.archived && h.sets.includes(habitSet))
    const logs = await db.habitLogs.toArray()
    const best = habits
      .map((h) => ({ h, n: dailyStreak(h, logs.filter((l) => l.habitId === h.id), today, () => false).current }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 3)
      .filter((x) => x.n > 0)
    return { reply: best.length ? `Top streaks: ${best.map((x) => `${x.h.name} ${x.n} days`).join(', ')}.` : 'No streaks running yet. Today is day one.' }
  }

  // 20. Countdowns
  if (/how (many days|long) (until|till|to) (india|gold coast|the trip|sem|semester|uni)/.test(t)) {
    const phases = getSettings().phases
    const target = /india/.test(t) ? phases.find((p) => p.location === 'india') : /gold/.test(t) ? phases.find((p) => p.location === 'goldcoast') : null
    if (/sem|uni/.test(t)) {
      const last = phases[phases.length - 1]
      return { reply: `Semester one starts in about ${daysBetween(today, last.end) + 1} days.` }
    }
    if (target) return { reply: `${target.name} starts in ${daysBetween(today, target.start)} days.` }
  }

  // 21. Open a room
  if ((m = t.match(/^(?:open|go to|show(?: me)?|take me to)\s+(?:the\s+|my\s+)?(.+?)(?:\s+room)?$/))) {
    const q = m[1].trim()
    const id = ROOM_ALIASES[q] ?? ROOMS.find((r) => r.name.toLowerCase().replace(/^the /, '').includes(q))?.id
    if (id === 'corridor') {
      navigate('/corridor')
      return { reply: 'The Corridor.' }
    }
    const room = ROOMS.find((r) => r.id === id)
    if (room) {
      navigate(room.path)
      return { reply: `${room.name.replace(/^THE /, 'The ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}.` }
    }
  }

  return null
}

/** Phrases that end conversation mode. */
export const isGoodbye = (raw: string) => /^(thanks|thank you|cheers)( alfred)?$|that'?s all|that will be all|goodbye|stop listening|bye alfred/.test(normalise(raw))
