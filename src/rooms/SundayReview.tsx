import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DecoCard } from '../components/DecoCard'
import { Empty } from '../components/ui'
import { addItem } from '../components/ListCard'
import { db, uid } from '../db/db'
import { useHouse } from '../app/house'
import { toast } from '../store/ui'
import { isDone } from '../lib/streaks'
import { addDays, weekdayOf } from '../lib/time'
import type { Habit, HabitLog } from '../db/types'

// SUNDAY REVIEW — ALFRED reads the week, proposes changes, you approve or reject, the house updates itself.
// Works offline too: the pattern-spotting is local; ALFRED adds judgement + extra ideas when online.

type Proposal =
  | { type: 'retire_habit'; habit_id: string; reason: string }
  | { type: 'set_target'; habit_id: string; target: number; reason: string }
  | { type: 'add_habit'; name: string; group?: Habit['group']; reason: string }
  | { type: 'add_mission'; suit: string; text: string; reason: string }

const DOW = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']

/** Local pattern spotting over the last 28 days. */
function analyse(habits: Habit[], logs: HabitLog[], today: string) {
  const patterns: string[] = []
  const proposals: Proposal[] = []
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, -1 - i))
  const last28 = Array.from({ length: 28 }, (_, i) => addDays(today, -1 - i))
  for (const h of habits.filter((x) => !x.archived && x.type !== 'weekly')) {
    const hl = new Map(logs.filter((l) => l.habitId === h.id).map((l) => [l.day, l]))
    const missed7 = last7.filter((d) => !isDone(h, hl.get(d))).length
    const skips7 = last7.filter((d) => hl.get(d)?.status === 'skip').length
    if (missed7 >= 6 && logs.some((l) => l.habitId === h.id)) {
      proposals.push({ type: 'retire_habit', habit_id: h.id, reason: `${h.name} was missed ${missed7} of the last 7 days${skips7 ? ` (${skips7} skips)` : ''}. Retire it, or shrink it.` })
    }
    // Same weekday missed 3–4 weeks running.
    for (let dow = 0; dow < 7; dow++) {
      const ds = last28.filter((d) => weekdayOf(d) === dow)
      const miss = ds.filter((d) => !isDone(h, hl.get(d))).length
      const hits = last28.filter((d) => isDone(h, hl.get(d))).length
      if (ds.length >= 3 && miss >= 3 && hits >= 8) patterns.push(`You tend to miss ${h.name} on ${DOW[dow]} (${miss} of the last ${ds.length}).`)
    }
    // Maxed targets — consistently 130%+ of target.
    if ((h.type === 'duration' || h.type === 'count') && last7.every((d) => (hl.get(d)?.value ?? 0) >= h.target * 1.3)) {
      const next = h.type === 'duration' ? Math.round((h.target * 1.25) / 5) * 5 : h.target + 1
      proposals.push({ type: 'set_target', habit_id: h.id, target: next, reason: `You beat ${h.name} by 30%+ every day this week. Raise the bar to ${next}.` })
    }
  }
  return { patterns, proposals }
}

function parseJSON(text: string): { summary?: string; proposals?: Proposal[] } | null {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/)
  if (!m) return null
  try {
    return JSON.parse(m[1])
  } catch {
    return null
  }
}

export function SundayReview() {
  const { today } = useHouse()
  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? []
  const logs = useLiveQuery(() => db.habitLogs.where('day').between(addDays(today, -29), today, true, true).toArray(), [today]) ?? []
  const local = useMemo(() => analyse(habits, logs, today), [habits, logs, today])
  const [ai, setAi] = useState<{ summary?: string; proposals: Proposal[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [decided, setDecided] = useState<Record<number, 'yes' | 'no'>>({})
  const proposals = [...local.proposals, ...(ai?.proposals ?? [])]
  const nameOf = (id: string) => habits.find((h) => h.id === id)?.name ?? id

  const askAlfred = async () => {
    setBusy(true)
    try {
      const { askOnce } = await import('../lib/alfred')
      const text = await askOnce(
        `It's my Sunday Review. Read my week from the snapshot plus these local findings:\n${[...local.patterns, ...local.proposals.map((p) => p.reason)].join('\n') || '(nothing flagged locally)'}\n\n` +
          `Reply with a 2–3 sentence summary of my week (honest, encouraging), then a JSON code block exactly like:\n` +
          '```json\n{"summary": "...", "proposals": [{"type": "set_target", "habit_id": "boxing", "target": 40, "reason": "..."}, {"type": "retire_habit", "habit_id": "...", "reason": "..."}, {"type": "add_habit", "name": "...", "group": "custom", "reason": "..."}, {"type": "add_mission", "suit": "cook", "text": "...", "reason": "..."}]}\n```\n' +
          'Max 5 proposals. Only use habit ids from the snapshot. Don\'t repeat the local findings unless you disagree. Do NOT call any tools for this.',
      )
      const parsed = parseJSON(text)
      setAi({ summary: parsed?.summary ?? text.replace(/```[\s\S]*```/, '').trim(), proposals: (parsed?.proposals ?? []).slice(0, 5) })
    } catch (e) {
      toast(e instanceof Error ? e.message : 'ALFRED is unavailable')
    } finally {
      setBusy(false)
    }
  }

  const apply = async (p: Proposal, i: number) => {
    if (p.type === 'retire_habit') await db.habits.update(p.habit_id, { archived: true })
    if (p.type === 'set_target') await db.habits.update(p.habit_id, { target: p.target })
    if (p.type === 'add_habit') await db.habits.add({ id: uid(), name: p.name, type: 'check', target: 1, group: p.group ?? 'custom', sets: ['home'], order: 50 + habits.length, createdAt: Date.now() })
    if (p.type === 'add_mission') await addItem('wildcard', 'custom', { text: p.text, sub: p.suit, tags: ['a'], num: 20 })
    await addItem('alfred', 'review', { text: describe(p), date: today, meta: { decision: 'approved' } })
    setDecided((d) => ({ ...d, [i]: 'yes' }))
    toast('Applied to the house')
  }

  const describe = (p: Proposal) =>
    p.type === 'retire_habit' ? `Retire “${nameOf(p.habit_id)}”` : p.type === 'set_target' ? `Raise “${nameOf(p.habit_id)}” to ${p.target}` : p.type === 'add_habit' ? `New habit: “${p.name}”` : `New Wildcard: “${p.text}”`

  return (
    <div className="flex flex-col gap-5">
      <DecoCard title="SUNDAY REVIEW">
        <p className="font-body text-[16px] text-[var(--ink-muted)]">ALFRED reads your week, spots patterns and proposes changes. Nothing changes until you approve it.</p>
        {local.patterns.length > 0 && (
          <div className="mt-3">
            <div className="field-label">PATTERNS SPOTTED</div>
            {local.patterns.map((p) => <p key={p} className="font-body text-[16px]">· {p}</p>)}
          </div>
        )}
        {ai?.summary && <div className="bubble alfred !max-w-full mt-3">{ai.summary}</div>}
        <button className="deco-btn w-full mt-3" disabled={busy} onClick={askAlfred}>{busy ? 'ALFRED is reading your week…' : ai ? 'Ask again' : 'Run the review with ALFRED'}</button>
      </DecoCard>
      <DecoCard title="PROPOSALS">
        <ul className="flex flex-col gap-3">
          {proposals.map((p, i) => (
            <li key={i} className={`proposal ${decided[i] ?? ''}`}>
              <div className="font-display text-[18px]">{describe(p)}</div>
              <p className="font-body text-[15px] text-[var(--ink-muted)]">{p.reason}</p>
              {!decided[i] ? (
                <div className="flex gap-2 mt-2">
                  <button className="deco-btn flex-1" onClick={() => apply(p, i)}>Approve</button>
                  <button className="deco-btn ghost flex-1" onClick={() => setDecided((d) => ({ ...d, [i]: 'no' }))}>Reject</button>
                </div>
              ) : (
                <p className="font-deco text-[11px] tracking-[0.25em] mt-2 text-[var(--accent)]">{decided[i] === 'yes' ? 'APPROVED' : 'REJECTED'}</p>
              )}
            </li>
          ))}
          {!proposals.length && <Empty>No changes proposed{ai ? '' : ' yet — run the review with ALFRED for more ideas'}.</Empty>}
        </ul>
      </DecoCard>
    </div>
  )
}
