import { cloudConfig, currentUser, supa } from './cloud'
import { getSettings, currentLocation } from '../store/settings'
import { LOCATIONS } from '../config/lockin'

// Push notifications: subscribe this device, and keep the server's copy of your reminder
// schedule + current time zone up to date (so reminders follow you to the Gold Coast / India).

import type { Reminder } from '../config/reminders'
export { DEFAULT_REMINDERS, type Reminder } from '../config/reminders'

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

const b64ToBytes = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const s = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

/** Upload this device's subscription + the schedule + current time zone. */
async function upsert(subscription?: PushSubscriptionJSON) {
  const s = supa()
  const user = await currentUser()
  if (!s || !user) throw new Error('Sign in under Settings → Sync first.')
  const settings = getSettings()
  const { data: row } = await s.from('push_settings').select('subscriptions').eq('user_id', user.id).maybeSingle()
  let subs = ((row?.subscriptions as PushSubscriptionJSON[]) ?? []).filter((x) => x?.endpoint)
  if (subscription) subs = [...subs.filter((x) => x.endpoint !== subscription.endpoint), subscription]
  const tz = LOCATIONS[currentLocation(settings)].timeZone
  const { error } = await s.from('push_settings').upsert({ user_id: user.id, subscriptions: subs, schedule: settings.reminders, tz, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

/** Ask permission (must come from a tap) and subscribe this device. */
export async function enablePush() {
  if (!pushSupported()) throw new Error('This browser can’t do push. On iPhone, open GHARANA from the home-screen icon (iOS 16.4+).')
  const key = cloudConfig()?.vapidPublicKey
  if (!key) throw new Error('Notifications aren’t set up on the server yet (VAPID keys).')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Notifications are blocked. Allow them in Settings → Notifications → GHARANA.')
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) }))
  await upsert(sub.toJSON())
}

/** Re-send the schedule + time zone (after editing reminders or switching Travel Mode). */
export async function syncPushSettings() {
  try {
    if (!pushSupported() || Notification.permission !== 'granted') return
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (!sub) return
    await upsert(sub.toJSON())
  } catch {
    /* offline / signed out — next time */
  }
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  const s = supa()
  const user = await currentUser()
  if (s && user) {
    const { data: row } = await s.from('push_settings').select('subscriptions').eq('user_id', user.id).maybeSingle()
    const subs = ((row?.subscriptions as PushSubscriptionJSON[]) ?? []).filter((x) => x.endpoint !== sub.endpoint)
    await s.from('push_settings').update({ subscriptions: subs }).eq('user_id', user.id)
  }
  await sub.unsubscribe()
}

export async function sendTestPush() {
  const s = supa()
  const { data } = (await s?.auth.getSession()) ?? { data: { session: null } }
  const token = data.session?.access_token
  if (!token) throw new Error('Sign in first.')
  const r = await fetch('/api/push', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ kind: 'test' }) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error === 'no_devices' ? 'Turn notifications on for this device first.' : j.error ?? `Error ${r.status}`)
  return j.sent as number
}

/** Fallback that needs no server: export reminders as repeating calendar alarms (.ics). */
export function downloadRemindersICS(reminders: Reminder[]) {
  const DAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GHARANA//Reminders//EN', 'X-WR-CALNAME:GHARANA reminders']
  for (const r of reminders.filter((x) => x.on)) {
    for (const t of r.times) {
      const hm = t.replace(':', '')
      lines.push(
        'BEGIN:VEVENT',
        `UID:gharana-rem-${r.id}-${hm}@gharana.app`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${today}T${hm}00`,
        'DURATION:PT5M',
        `RRULE:FREQ=${r.days.length ? `WEEKLY;BYDAY=${r.days.map((d) => DAY[d]).join(',')}` : 'DAILY'}`,
        `SUMMARY:${r.label.replace(/[,;]/g, ' ')}`,
        ...(r.body ? [`DESCRIPTION:${r.body.replace(/[,;]/g, ' ')}`] : []),
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${r.label.replace(/[,;]/g, ' ')}`,
        'TRIGGER:PT0M',
        'END:VALARM',
        'END:VEVENT',
      )
    }
  }
  lines.push('END:VCALENDAR')
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'gharana-reminders.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
