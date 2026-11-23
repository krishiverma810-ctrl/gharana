import type Anthropic from '@anthropic-ai/sdk'
import { addProtein, addWater, db, uid } from '../db/db'
import { setBig3, setHabitValue, skipHabit, autoTemplateId } from '../db/hooks'
import { getSettings, currentLocation, habitSetFor, phaseForDay, useSettings } from '../store/settings'
import { addReminder } from '../store/reminders'
import { epley } from './streaks'
import { toast } from '../store/ui'
import { useFocus } from '../store/focus'
import { LOCATIONS } from '../config/lockin'
import { roomById } from '../config/rooms'
import { addItem } from '../components/ListCard'
import { navigate } from '../app/router'
import { syncHabits } from '../rooms/Patrol'
import { isDone, dailyStreak } from './streaks'
import { addDays, daysBetween, formatLongDate, formatTime, localDayKey, monthKey, prettyHm, weekStart, zonedParts } from './time'
import { nowAndNext } from './blueprint'
import type { ChatRecord, HabitLog, Txn, Workout, WorkoutType } from '../db/types'

// ALFRED on the phone: builds the context snapshot, runs the conversation loop against
// /api/alfred, executes ALFRED's tools locally, tracks spend, and queues messages offline.

type Block = Anthropic.Beta.BetaContentBlock
type BlockParam = Anthropic.Beta.BetaContentBlockParam
/** Messages API history entry. `system` entries are mid-conversation operator messages. */
type Msg = { role: 'user' | 'assistant' | 'system'; content: string | BlockParam[] | Block[] }

interface ApiReply {
  content: Block[]
  stop_reason: string | null
  stop_details: { category?: string | null; explanation?: string | null } | null
  model: string
  usage: { input_tokens: number; output_tokens: number; cache_creation_input_tokens: number; cache_read_input_tokens: number }
}

// ── House key (stored only on this device; never exported) ───────────
const KEY = 'gh-house-key'
export const getHouseKey = () => {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}
export const setHouseKey = (k: string) => {
  try {
    localStorage.setItem(KEY, k.trim())
  } catch {
    /* ignore */
  }
}

// ── Spend tracking (estimate; Claude Opus 5.5 list prices, USD per million tokens) ──
const PRICE = { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 }

export interface Usage {
  input: number
  output: number
  cacheWrite: number
  cacheRead: number
  usd: number
  requests: number
}

const usageKey = (month: string) => `alfred:usage:${month}`

export async function getUsage(month = new Date().toISOString().slice(0, 7)): Promise<Usage> {
  const row = await db.kv.get(usageKey(month))
  return (row?.value as Usage) ?? { input: 0, output: 0, cacheWrite: 0, cacheRead: 0, usd: 0, requests: 0 }
}

async function addUsage(u: ApiReply['usage'], extraUsd = 0) {
  const month = new Date().toISOString().slice(0, 7)
  const cur = await getUsage(month)
  const usd =
    (u.input_tokens * PRICE.input + u.output_tokens * PRICE.output + u.cache_creation_input_tokens * PRICE.cacheWrite + u.cache_read_input_tokens * PRICE.cacheRead) / 1_000_000
  await db.kv.put({
    key: usageKey(month),
    value: {
      input: cur.input + u.input_tokens,
      output: cur.output + u.output_tokens,
      cacheWrite: cur.cacheWrite + u.cache_creation_input_tokens,
      cacheRead: cur.cacheRead + u.cache_read_input_tokens,
      usd: cur.usd + usd + extraUsd,
      requests: cur.requests + (extraUsd ? 0 : 1),
    } satisfies Usage,
  })
}

export async function spendAud() {
  return (await getUsage()).usd * getSettings().usdToAud
}

// ── Where / when am I ─────────────────────────────────────────────────
export function here() {
  const s = getSettings()
  const now = new Date()
  const location = currentLocation(s, now)
  const timeZone = LOCATIONS[location].timeZone
  const today = localDayKey(now, timeZone)
  const p = zonedParts(now, timeZone)
  return { s, now, location, timeZone, today, minute: p.hour * 60 + p.minute, habitSet: habitSetFor(location) }
}

// ── Context snapshot (sent as a system message with each user turn) ──
/** `voice` = he's listening, not reading — keep it short and speakable. */
export type Channel = 'chat' | 'voice'

export async function buildSnapshot(channel: Channel = 'chat'): Promise<string> {
  const { s, now, location, timeZone, today, minute, habitSet } = here()
  const phase = phaseForDay(s.phases, today)
  const first = s.phases[0]?.start ?? today
  const last = s.phases[s.phases.length - 1]?.end ?? today
  const next = s.phases.find((p) => p.start > today)

  const [habitsAll, logsAll, day, workouts, txns, goals, focus, templates, shiftsToday, trips, wildcard, yesterday] = await Promise.all([
    db.habits.orderBy('order').toArray(),
    db.habitLogs.toArray(),
    db.days.get(today),
    db.workouts.where('day').between(weekStart(today), today, true, true).toArray(),
    db.txns.toArray(),
    db.goals.toArray(),
    db.focus.where('day').equals(today).toArray(),
    db.templates.toArray(),
    db.shifts.where('day').equals(today).count(),
    db.trips.toArray(),
    db.items.where('[room+kind]').equals(['wildcard', 'active']).toArray(),
    db.days.get(addDays(today, -1)),
  ])
  const memories = await db.items.where('[room+kind]').equals(['alfred', 'memory']).toArray()
  const habits = habitsAll.filter((h) => !h.archived && h.sets.includes(habitSet))
  const logsByHabit = new Map<string, HabitLog[]>()
  for (const l of logsAll) logsByHabit.set(l.habitId, [...(logsByHabit.get(l.habitId) ?? []), l])

  const lines: string[] = []
  lines.push(`NOW: ${formatLongDate(now, timeZone)}, ${formatTime(now, timeZone)}, in ${LOCATIONS[location].name} (${timeZone}).`)
  lines.push(`MODE: ${s.alfredMode} · DELULU: ${s.delulu ? 'on' : 'off'} · LANGUAGE: ${s.alfredLang}`)
  if (channel === 'voice') lines.push('CHANNEL: voice — he is listening, not reading. Reply in 1–3 short spoken sentences. No markdown, lists or emoji.')
  if (memories.length) lines.push(`MEMORY BANK (things he asked you to remember):\n${memories.slice(-40).map((m) => `- ${m.text}`).join('\n')}`)
  if (phase) lines.push(`LOCK-IN: Phase ${phase.numeral} ${phase.name}, day ${daysBetween(first, today) + 1} of ${daysBetween(first, last) + 1}.${next ? ` ${next.name} in ${daysBetween(today, next.start)} days.` : ''}`)

  lines.push(`HABITS (${habitSet} set) — id: name, today, streak:`)
  for (const h of habits) {
    const logs = logsByHabit.get(h.id) ?? []
    const log = logs.find((l) => l.day === today)
    const st = dailyStreak(h, logs, today, () => false)
    const status = log?.status === 'skip' ? `skipped (${log.reason})` : isDone(h, log) ? 'DONE' : log ? `${log.value}/${h.target}` : 'not yet'
    const kind = h.type === 'check' ? '' : h.type === 'weekly' ? ` [${h.target}×/week]` : ` [target ${h.target}${h.type === 'duration' ? ' min' : ''}]`
    lines.push(`- ${h.id}: ${h.name}${kind}, ${status}, streak ${st.current}${h.type === 'weekly' ? ' wk' : 'd'}`)
  }

  lines.push(`FUEL: water ${((day?.waterMl ?? 0) / 1000).toFixed(2)}/${s.waterTargetMl / 1000} L, protein ${day?.proteinG ?? 0}/${s.proteinTargetG} g.`)
  const b3 = (day?.big3 ?? []).filter((b) => b.text)
  lines.push(`BIG 3: ${b3.length ? b3.map((b) => `${b.done ? '✓' : '○'} ${b.text}`).join('; ') : 'not set'}.`)

  const tid = autoTemplateId(today, location, shiftsToday > 0, day)
  const tpl = templates.find((t) => t.id === tid)
  if (tpl) {
    const nn = nowAndNext(tpl.blocks, minute)
    lines.push(`BLUEPRINT (${tpl.name}): now ${nn.now ? `${nn.now.title} until ${prettyHm(nn.now.end)}` : 'open time'}; next ${nn.next ? `${nn.next.title} at ${prettyHm(nn.next.start)}` : '—'}.`)
  }
  const m = day?.morning
  lines.push(`MORNING: ${m?.completedAt ? `done, woke ${m.wakeTime}, slept ${m.sleepHours}h, energy ${m.energy ?? '?'}/10` : 'Morning Rite not done'} (wake target ${s.wakeTarget}).`)
  const mins = workouts.reduce((a: number, w: Workout) => a + w.minutes, 0)
  lines.push(`TRAINING this week: ${mins}/${s.trainingTargetMin} min (${workouts.map((w) => `${w.type} ${w.minutes}m`).join(', ') || 'none'}). Focus today: ${focus.reduce((a, f) => a + f.minutes, 0)} min.`)

  const mk = monthKey(today)
  const spent = txns.filter((t: Txn) => t.kind === 'expense' && monthKey(t.day) === mk).reduce((a, t) => a + t.amount, 0)
  lines.push(`MONEY (${mk}): spent $${spent.toFixed(0)} of $${s.monthlyBudget} budget. Funds — ${goals.filter((g) => !g.archived).map((g) => `${g.id}: ${g.name} $${txns.filter((t) => t.goalId === g.id).reduce((a, t) => a + t.amount, 0).toFixed(0)}/$${g.target}`).join('; ')}.`)

  const upcoming = trips.filter((t) => t.end >= today).sort((a, b) => a.start.localeCompare(b.start))[0]
  if (upcoming) {
    const packed = upcoming.packing.filter((p) => p.done).length
    lines.push(`NEXT TRIP: ${upcoming.name} ${upcoming.start}→${upcoming.end}; packing ${packed}/${upcoming.packing.length}.`)
  }
  const mission = wildcard.find((w) => w.date === today)
  if (mission) lines.push(`WILDCARD MISSION today: ${mission.text}`)
  const y = yesterday?.night
  if (y?.completedAt) lines.push(`YESTERDAY'S DEBRIEF: won "${y.won ?? ''}", dodged "${y.dodged ?? ''}", lesson "${y.lesson ?? ''}", mood ${y.mood ?? '?'}/10.`)
  return lines.join('\n')
}

// ── Tools (run on the phone) ──────────────────────────────────────────
interface ToolOutcome {
  result: string
  chip: string
  error?: boolean
}
type Runner = (input: Record<string, unknown>) => Promise<ToolOutcome>

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v))
const str = (v: unknown) => (typeof v === 'string' ? v : '')

const TOOL_RUNNERS: Record<string, Runner> = {
  async log_fuel(i) {
    const { today } = here()
    const amount = num(i.amount)
    if (!Number.isFinite(amount) || Math.abs(amount) > 5000) return { result: 'Invalid amount.', chip: 'Fuel: invalid amount', error: true }
    if (i.kind === 'water') await addWater(today, amount)
    else await addProtein(today, amount)
    const d = await db.days.get(today)
    return {
      result: `Logged. Water now ${d?.waterMl ?? 0} ml, protein ${d?.proteinG ?? 0} g.`,
      chip: i.kind === 'water' ? `💧 ${amount > 0 ? '+' : ''}${amount} ml water` : `⚡ ${amount > 0 ? '+' : ''}${amount} g protein`,
    }
  },
  async set_habit(i) {
    const { today } = here()
    const h = await db.habits.get(str(i.habit_id))
    if (!h) return { result: `No habit with id "${str(i.habit_id)}".`, chip: 'Habit not found', error: true }
    const value = Math.max(0, num(i.value) || 0)
    const all = (await db.habits.toArray()).map((x) => x.id)
    await setHabitValue(h, today, value, { quiet: true, activeIds: all })
    return { result: `${h.name} set to ${value}.`, chip: value > 0 ? `✓ ${h.name}${h.type !== 'check' ? ` · ${value}` : ''}` : `↺ ${h.name} unticked` }
  },
  async skip_habit(i) {
    const { today } = here()
    const h = await db.habits.get(str(i.habit_id))
    if (!h) return { result: 'No such habit.', chip: 'Habit not found', error: true }
    await skipHabit(h, today, str(i.reason) || 'skipped via ALFRED')
    return { result: `${h.name} skipped.`, chip: `⤼ Skipped ${h.name}` }
  },
  async log_money(i) {
    const { today, location, s } = here()
    const raw = num(i.amount)
    if (!(raw > 0) || raw > 100000) return { result: 'Invalid amount.', chip: 'Money: invalid amount', error: true }
    const inr = i.currency === 'INR'
    const amount = inr ? Math.round((raw / s.inrPerAud) * 100) / 100 : raw
    const kind = (['expense', 'income', 'saving'] as const).find((k) => k === i.kind) ?? 'expense'
    const goalId = kind === 'saving' ? str(i.goal_id) : undefined
    if (kind === 'saving' && !(goalId && (await db.goals.get(goalId)))) return { result: 'Unknown fund id — check the snapshot.', chip: 'Fund not found', error: true }
    await db.txns.add({ id: uid(), day: today, amount, kind, category: kind === 'saving' ? 'Savings' : str(i.category) || 'Other', note: str(i.note) || undefined, goalId, inr: inr ? raw : undefined, place: location, at: Date.now() })
    const sign = kind === 'income' ? '+' : kind === 'expense' ? '−' : '→'
    return { result: `Logged ${kind} of $${amount} AUD.`, chip: `💰 ${sign}$${amount}${inr ? ` (₹${raw})` : ''} ${kind === 'saving' ? 'saved' : str(i.category) || kind}` }
  },
  async log_workout(i) {
    const { today } = here()
    const types: WorkoutType[] = ['gym', 'boxing', 'sport', 'run', 'swim', 'walk', 'mobility', 'other']
    const type = types.find((t) => t === i.type) ?? 'other'
    const minutes = Math.max(1, Math.min(600, Math.round(num(i.minutes) || 0)))
    const w: Workout = { id: uid(), day: today, type, minutes, intensity: Math.max(1, Math.min(5, Math.round(num(i.intensity) || 3))), notes: str(i.notes) || undefined, at: Date.now() }
    await db.workouts.add(w)
    await syncHabits(w)
    return { result: `Logged ${minutes} min ${type}.`, chip: `🥊 ${minutes} min ${type}` }
  },
  async set_big3(i) {
    const { today } = here()
    const items = (Array.isArray(i.items) ? i.items : []).map(str).filter(Boolean).slice(0, 3)
    await setBig3(today, items.map((text) => ({ text, done: false })))
    return { result: 'Big 3 set.', chip: `★ Big 3 set (${items.length})` }
  },
  async start_focus(i) {
    const minutes = Math.max(1, Math.min(240, Math.round(num(i.minutes) || 25)))
    useFocus.getState().start(minutes, str(i.label) || 'Deep Study')
    return { result: `Focus timer started for ${minutes} minutes.`, chip: `⏱ ${minutes}-min focus started` }
  },
  async capture(i) {
    const dest = (['inbox', 'nazara', 'ksvol1', 'scrollapp'] as const).find((d) => d === i.dest) ?? 'inbox'
    await db.captures.add({ id: uid(), text: str(i.text), dest, at: Date.now() })
    return { result: 'Captured.', chip: `✎ Captured to ${dest}` }
  },
  async open_room(i) {
    const r = roomById(str(i.room))
    if (!r) return { result: 'No such room.', chip: 'Room not found', error: true }
    navigate(r.path)
    return { result: `Opened ${r.name}.`, chip: `→ ${r.name}` }
  },
  async add_missions(i) {
    const list = Array.isArray(i.missions) ? (i.missions as Record<string, unknown>[]) : []
    let n = 0
    for (const m of list.slice(0, 20)) {
      if (!str(m.text)) continue
      await addItem('wildcard', 'custom', { text: str(m.text), sub: str(m.suit) || 'mind', tags: [str(m.where) || 'a'], num: Math.round(num(m.minutes) || 20) })
      n++
    }
    lastMissionCount = n
    return { result: `Added ${n} missions.`, chip: `🎲 ${n} new Wildcard missions` }
  },
  async log_lift(i) {
    const { today } = here()
    const lift = str(i.lift) || 'Lift'
    const weight = num(i.weight)
    const reps = Math.round(num(i.reps))
    const sets = Math.max(1, Math.min(10, Math.round(num(i.sets) || 1)))
    if (!(weight >= 0) || !(reps > 0)) return { result: 'Invalid set.', chip: 'Lift: invalid', error: true }
    const prev = (await db.lifts.where('lift').equals(lift).toArray()).reduce((m, l) => Math.max(m, l.e1rm), 0)
    const e1rm = epley(weight, reps)
    for (let k = 0; k < sets; k++) await db.lifts.add({ id: uid(), day: today, lift, weight, reps, e1rm, at: Date.now() + k })
    const pr = e1rm > prev
    return { result: `Logged ${sets}×${reps} @ ${weight} kg. e1RM ${e1rm} kg${pr ? ` — NEW PR (was ${prev || 'none'})` : ''}.`, chip: `🏋 ${lift} ${sets}×${reps} @ ${weight}kg${pr ? ' · PR!' : ''}` }
  },
  async set_timer(i) {
    const minutes = Math.max(1, Math.min(600, Math.round(num(i.minutes) || 0)))
    addReminder(minutes, str(i.label) || 'Timer')
    return { result: `Reminder set for ${minutes} min.`, chip: `⏰ ${minutes} min · ${str(i.label) || 'Timer'}` }
  },
  async set_travel_mode(i) {
    const mode = (['auto', 'melbourne', 'goldcoast', 'india'] as const).find((m) => m === i.mode)
    if (!mode) return { result: 'Unknown mode.', chip: 'Travel mode: unknown', error: true }
    useSettings.getState().update({ location: mode })
    return { result: `Travel Mode set to ${mode}.`, chip: `✈ Travel Mode: ${mode}` }
  },
  async app_setting(i) {
    const on = i.on === true
    const map: Record<string, Partial<ReturnType<typeof getSettings>>> = {
      sound: { sound: on }, battery_saver: { batterySaver: on }, low_glare: { lowGlare: on }, reduced_motion: { reducedMotion: on }, speak_replies: { speakReplies: on }, palette_shuffle: on ? { pinnedPaletteId: null } : {},
    }
    const patch = map[str(i.setting)]
    if (!patch) return { result: 'Unknown setting.', chip: 'Setting: unknown', error: true }
    useSettings.getState().update(patch)
    return { result: 'Done.', chip: `⚙ ${str(i.setting).replace('_', ' ')} ${on ? 'on' : 'off'}` }
  },
  async remember(i) {
    const fact = str(i.fact).trim().slice(0, 300)
    if (!fact) return { result: 'Nothing to remember.', chip: 'Memory: empty', error: true }
    await addItem('alfred', 'memory', { text: fact })
    return { result: 'Saved to the Memory Bank.', chip: `🧠 Remembered: ${fact.slice(0, 60)}` }
  },
  async forget(i) {
    const q = str(i.match).toLowerCase().trim()
    const all = await db.items.where('[room+kind]').equals(['alfred', 'memory']).toArray()
    const hits = all.filter((m) => q && m.text.toLowerCase().includes(q))
    await db.items.bulkDelete(hits.map((h) => h.id))
    return { result: `Forgot ${hits.length} memories.`, chip: `🧠 Forgot ${hits.length}` }
  },
}
let lastMissionCount = 0

async function runTools(blocks: Block[]): Promise<{ results: BlockParam[]; chips: Record<string, string> }> {
  const results: BlockParam[] = []
  const chips: Record<string, string> = {}
  for (const b of blocks) {
    if (b.type !== 'tool_use') continue
    const runner = TOOL_RUNNERS[b.name]
    let out: ToolOutcome
    try {
      out = runner ? await runner((b.input ?? {}) as Record<string, unknown>) : { result: `Unknown tool ${b.name}.`, chip: `? ${b.name}`, error: true }
    } catch (e) {
      out = { result: `Tool failed: ${e instanceof Error ? e.message : 'error'}`, chip: `⚠ ${b.name} failed`, error: true }
    }
    chips[b.id] = out.chip
    results.push({ type: 'tool_result', tool_use_id: b.id, content: out.result, ...(out.error ? { is_error: true } : {}) })
  }
  return { results, chips }
}

// ── The conversation loop ─────────────────────────────────────────────

export class AlfredError extends Error {
  constructor(message: string, readonly code: string) {
    super(message)
  }
}

async function post(messages: Msg[], effort: string): Promise<ApiReply> {
  const key = getHouseKey()
  if (!key) throw new AlfredError('Add your house key in Settings → ALFRED first.', 'no_key')
  if (!navigator.onLine) throw new AlfredError('Offline — I’ll send it when you’re back online.', 'offline')
  let res: Response
  try {
    res = await fetch('/api/alfred', { method: 'POST', headers: { 'content-type': 'application/json', 'x-house-key': key }, body: JSON.stringify({ messages, effort }) })
  } catch {
    throw new AlfredError('Couldn’t reach ALFRED — I’ll retry when the connection is back.', 'offline')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new AlfredError(data.message ?? `ALFRED error ${res.status}`, data.error ?? 'error')
  const reply = data as ApiReply
  await addUsage(reply.usage)
  return reply
}

const effortFor = () => (['tutor', 'strategist'].includes(getSettings().alfredMode) ? 'medium' : 'low')

async function checkBudget() {
  const s = getSettings()
  const aud = await spendAud()
  if (aud >= s.alfredCapAud) throw new AlfredError(`This month’s ALFRED budget ($${s.alfredCapAud} AUD) is used up. Raise it in Settings → ALFRED.`, 'cap')
}

/** Run the loop: send, execute any tools ALFRED calls, send the results back, until he's done. */
async function loop(messages: Msg[], chips: Record<string, string>, onProgress?: (m: Msg[]) => void): Promise<{ messages: Msg[]; refusal?: string }> {
  const msgs = [...messages]
  for (let i = 0; i < 8; i++) {
    const reply = await post(msgs, effortFor())
    msgs.push({ role: 'assistant', content: reply.content })
    if (reply.stop_reason === 'refusal') {
      return { messages: msgs, refusal: 'I’m afraid I can’t help with that one, sir.' }
    }
    if (reply.stop_reason !== 'tool_use') break
    const { results, chips: c } = await runTools(reply.content)
    Object.assign(chips, c)
    msgs.push({ role: 'user', content: results })
    onProgress?.(msgs)
  }
  return { messages: msgs }
}

export function chatIdFor(day: string) {
  return day
}

/**
 * Send a message in today's conversation. History is append-only: nothing is saved until the
 * API has answered, so a failed send never leaves a half-turn behind.
 */
export async function sendToAlfred(chatId: string, content: string | BlockParam[], onProgress?: (rec: ChatRecord) => void, channel: Channel = 'chat'): Promise<ChatRecord> {
  await checkBudget()
  const { today } = here()
  const rec: ChatRecord = (await db.chats.get(chatId)) ?? { id: chatId, day: today, messages: [], chips: {}, updatedAt: Date.now() }
  const base = rec.messages as Msg[]
  const outgoing: Msg[] = [...base, { role: 'user', content }, { role: 'system', content: await buildSnapshot(channel) }]
  const chips = { ...rec.chips }
  const { messages, refusal } = await loop(outgoing, chips, (m) => onProgress?.({ ...rec, messages: m, chips }))
  const saved: ChatRecord = { ...rec, messages, chips, updatedAt: Date.now() }
  if (refusal) saved.chips[`refusal-${Date.now()}`] = refusal
  await db.chats.put(saved)
  return saved
}

/** One-shot: ALFRED writes 10 fresh Wildcard missions (separate from the chat). */
export async function askAlfredForMissions(): Promise<number> {
  await checkBudget()
  lastMissionCount = 0
  const { location } = here()
  const where = location === 'goldcoast' ? 'g' : location === 'india' ? 'i' : 'h'
  await loop(
    [
      { role: 'user', content: `Write 10 fresh Wildcard missions for my week. Mix the suits, favour what I've been neglecting in the snapshot, keep each under 15 words, specific and doable. Use where "${where}" or "a". Add them with the add_missions tool, then reply with one short line.` },
      { role: 'system', content: await buildSnapshot() },
    ],
    {},
  )
  return lastMissionCount
}

// ── Offline queue ─────────────────────────────────────────────────────
const QUEUE = 'alfred:queue'
export async function queueMessage(chatId: string, text: string) {
  const q = ((await db.kv.get(QUEUE))?.value as { chatId: string; text: string; at: number }[]) ?? []
  q.push({ chatId, text, at: Date.now() })
  await db.kv.put({ key: QUEUE, value: q })
}
export async function getQueue() {
  return ((await db.kv.get(QUEUE))?.value as { chatId: string; text: string; at: number }[]) ?? []
}
export async function flushQueue(): Promise<number> {
  const q = await getQueue()
  if (!q.length || !navigator.onLine) return 0
  let sent = 0
  for (const item of q) {
    try {
      await sendToAlfred(item.chatId, item.text)
      sent++
    } catch {
      break
    }
  }
  await db.kv.put({ key: QUEUE, value: q.slice(sent) })
  return sent
}

/** Server health check for Settings. */
export async function alfredStatus(): Promise<{ ok: boolean; configured: boolean }> {
  try {
    // Unique URL so no stale CDN copy is ever used.
    const r = await fetch(`/api/alfred?status=${Date.now()}`, { cache: 'no-store' })
    if (!r.ok) return { ok: false, configured: false }
    return (await r.json()) as { ok: boolean; configured: boolean }
  } catch {
    return { ok: false, configured: false }
  }
}

/** Shrink a photo before sending (saves tokens + upload time). */
export async function imageToBlock(file: File): Promise<BlockParam> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  const data = c.toDataURL('image/jpeg', 0.82).split(',')[1]
  return { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } }
}

// ── Siri bridge ───────────────────────────────────────────────────────

/** Last assistant text in a chat — what ALFRED just said. */
export function lastReply(rec: ChatRecord): string {
  const msgs = rec.messages as Msg[]
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i]
    if (m.role !== 'assistant') continue
    if (typeof m.content === 'string') return m.content
    const t = (m.content as Block[]).flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n').trim()
    if (t) return t
  }
  return ''
}

/** Apply actions Siri queued on the server since the app was last open. */
export async function pullSiriQueue(): Promise<number> {
  const key = getHouseKey()
  if (!key || !navigator.onLine) return 0
  try {
    const r = await fetch(`/api/alfred?queue=1&t=${Date.now()}`, { headers: { 'x-house-key': key }, cache: 'no-store' })
    if (!r.ok) return 0
    const data = (await r.json()) as { actions?: { name: string; input: Record<string, unknown> }[]; siriUsd?: number }
    if (data.siriUsd) await addUsage({ input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }, data.siriUsd)
    let n = 0
    for (const a of data.actions ?? []) {
      const run = TOOL_RUNNERS[a.name]
      if (!run) continue
      try {
        const out = await run(a.input ?? {})
        if (!out.error) n++
        toast(`From Siri: ${out.chip}`)
      } catch {
        /* skip a bad action */
      }
    }
    return n
  } catch {
    return 0
  }
}

let lastPush = 0
/** Send today's snapshot to the server so "Hey Siri, Alfred" knows your day. At most every 10 min. */
export async function pushSnapshotForSiri(force = false) {
  const s = getSettings()
  if (!s.siriSnapshot || !getHouseKey() || !navigator.onLine) return
  if (!force && Date.now() - lastPush < 10 * 60_000) return
  lastPush = Date.now()
  try {
    await fetch('/api/alfred', { method: 'POST', headers: { 'content-type': 'application/json', 'x-house-key': getHouseKey() }, body: JSON.stringify({ kind: 'snapshot', text: await buildSnapshot('voice') }) })
  } catch {
    /* offline — next time */
  }
}
