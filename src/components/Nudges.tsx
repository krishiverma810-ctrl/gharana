import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useDay } from '../db/hooks'
import { useHouse } from '../app/house'
import { navigate } from '../app/router'
import { useSettings } from '../store/settings'
import { daysBetween } from '../lib/time'
import { useFollowUps, useGiftAlerts } from '../lib/deepali'
import { useItems } from './ListCard'

// In-app nudges on the Lounge — work offline, no server needed. The top 3 that matter right now.

export function Nudges() {
  const { today, hour, away } = useHouse()
  const s = useSettings()
  const day = useDay(today)
  const people = useLiveQuery(() => db.people.toArray(), []) ?? []
  const cardsDue = useLiveQuery(() => db.cards.where('due').belowOrEqual(today).count(), [today]) ?? 0
  const overdue = useLiveQuery(() => db.deals.where('stage').anyOf(['radar', 'table', 'closing']).filter((d) => !!d.due && d.due < today).count(), [today]) ?? 0
  const inbox = useLiveQuery(() => db.captures.filter((c) => !c.sorted).count(), []) ?? 0

  const herName = s.deepaliName
  const followUps = useFollowUps(today)
  const giftAlerts = useGiftAlerts(today, away)
  const calls = useItems('deepali', 'call')
  const lastCall = calls.reduce((m, c) => ((c.date ?? '') > m ? (c.date ?? '') : m), '')

  const list: { text: string; to: string }[] = []
  for (const g of giftAlerts.slice(0, 1)) list.push({ text: `${g.d.text} is ${g.days === 0 ? 'today' : `in ${g.days} days`} and the gift isn’t sorted.`, to: '/deepali' })
  if (followUps.length) list.push({ text: `Ask ${herName} how ${followUps[0].text} went.`, to: '/deepali' })
  if (away && lastCall && daysBetween(lastCall, today) >= 2) list.push({ text: `${daysBetween(lastCall, today)} days since you properly spoke to ${herName}. Call her, sir.`, to: '/deepali' })
  const expectWater = s.waterTargetMl * Math.min(1, Math.max(0, (hour - 8) / 13))
  if (hour >= 12 && day.waterMl < expectWater - 500) list.push({ text: `You’re ${((expectWater - day.waterMl) / 1000).toFixed(1)} L behind on water, sir.`, to: '/' })
  if (hour >= 13 && day.proteinG < s.proteinTargetG * 0.35) list.push({ text: `Only ${day.proteinG} g protein so far — the bulk needs feeding.`, to: '/bulk' })
  if (hour >= 21 && !day.night?.completedAt) list.push({ text: 'The Night Debrief is waiting.', to: '/night' })
  if (hour < 11 && !day.morning?.completedAt) list.push({ text: 'Morning Rite not done yet.', to: '/morning' })
  const cold = people.filter((p) => p.lastContact && daysBetween(p.lastContact, today) > p.freqDays)
  if (cold.length) list.push({ text: `${cold.slice(0, 2).map((p) => p.name).join(' and ')}${cold.length > 2 ? ` +${cold.length - 2}` : ''} gone cold. Reach out?`, to: '/mehfil' })
  if (cardsDue >= 5) list.push({ text: `${cardsDue} flashcards due — ten minutes of retrieval.`, to: '/study' })
  if (overdue) list.push({ text: `${overdue} deal${overdue === 1 ? ' is' : 's are'} past deadline in The Closer.`, to: '/closer' })
  if (inbox >= 5) list.push({ text: `${inbox} ideas waiting in the Inbox.`, to: '/inbox' })

  if (!list.length) return null
  return (
    <div className="flex flex-col gap-2">
      {list.slice(0, 3).map((n) => (
        <button key={n.text} className="nudge text-left" onClick={() => navigate(n.to)}>
          <span className="font-deco text-[10px] tracking-[0.25em] text-[var(--accent)] pt-1">ALFRED</span>
          <span className="font-body text-[16px] flex-1">{n.text}</span>
        </button>
      ))}
    </div>
  )
}
