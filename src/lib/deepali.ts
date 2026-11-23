import { useItems } from '../components/ListCard'
import { GIFT_LEAD_DAYS } from '../config/deepali'
import { daysBetween } from './time'

// Deepali's Corner helpers shared with the Lounge nudges (kept out of the room so the room can load lazily).
const ROOM = 'deepali'

/** Her events that have passed and you haven't asked about yet. */
export function useFollowUps(today: string) {
  return useItems(ROOM, 'herevent').filter((e) => e.date && e.date <= today && !e.done)
}
export function nextOccurrence(date: string, today: string) {
  const md = date.slice(5)
  let occ = `${today.slice(0, 4)}-${md}`
  if (occ < today) occ = `${Number(today.slice(0, 4)) + 1}-${md}`
  return occ
}
/** Occasions coming up within the gift lead time, with no gift sorted yet. */
export function useGiftAlerts(today: string, away: boolean) {
  const lead = away ? GIFT_LEAD_DAYS.away : GIFT_LEAD_DAYS.home
  return useItems(ROOM, 'special')
    .filter((d) => d.date)
    .map((d) => ({ d, occ: nextOccurrence(d.date!, today) }))
    .map((x) => ({ ...x, days: daysBetween(today, x.occ), sorted: !!x.d.meta?.[`sorted:${x.occ.slice(0, 4)}`] }))
    .filter((x) => x.days <= lead && !x.sorted)
}

