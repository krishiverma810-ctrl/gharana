import { createClient } from '@supabase/supabase-js'
import { sendNotification, setVapidDetails } from 'web-push'

// /api/push — GHARANA's reminder scheduler.
//
//  POST (from Supabase pg_cron every 5 min, header x-cron-secret) → send any reminders that are due,
//       using each person's CURRENT time zone (it follows Travel Mode: Melbourne / Gold Coast / India).
//  POST { kind: "test" } with "Authorization: Bearer <supabase access token>" → send a test now.
//
// Secrets (Vercel env only): SUPABASE_SERVICE_ROLE_KEY, VAPID_PRIVATE_KEY, PUSH_CRON_SECRET.

interface Reminder {
  id: string
  kind: 'water' | 'protein' | 'wake' | 'winddown' | 'study' | 'mehfil' | 'review' | 'custom'
  label: string
  body?: string
  times: string[] // "HH:MM" local
  days: number[] // 0 = Sunday … 6
  on: boolean
}

interface PushRow {
  user_id: string
  subscriptions: { endpoint: string; keys: { p256dh: string; auth: string } }[]
  schedule: Reminder[]
  tz: string
  last_sent: Record<string, string>
}

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

function safeEqual(a: string, b: string) {
  if (!a || a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

function admin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function vapidReady() {
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  setVapidDetails('https://gharana-blue.vercel.app', pub, priv)
  return true
}

/** Local date/time parts in a time zone. */
function local(tz: string, at = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  )
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday)
  return { day: `${p.year}-${p.month}-${p.day}`, minute: Number(p.hour) * 60 + Number(p.minute), dow }
}

const URLS: Record<Reminder['kind'], string> = { water: '/', protein: '/bulk', wake: '/morning', winddown: '/night', study: '/blueprint', mehfil: '/mehfil', review: '/archive', custom: '/' }

/** Make the message specific using today's synced data where possible. */
async function compose(sb: ReturnType<typeof admin>, row: PushRow, r: Reminder, day: string) {
  let body = r.body ?? ''
  if ((r.kind === 'water' || r.kind === 'protein') && sb) {
    const [{ data: d }, { data: s }] = await Promise.all([
      sb.from('records').select('data').eq('user_id', row.user_id).eq('tbl', 'days').eq('id', day).maybeSingle(),
      sb.from('records').select('data').eq('user_id', row.user_id).eq('tbl', 'kv').eq('id', 'settings').maybeSingle(),
    ])
    const dayData = (d?.data ?? {}) as { waterMl?: number; proteinG?: number }
    const settings = ((s?.data as { value?: Record<string, number> })?.value ?? {}) as Record<string, number>
    if (r.kind === 'water') {
      const target = settings.waterTargetMl ?? 3000
      const have = dayData.waterMl ?? 0
      body = have >= target ? 'Water target already hit — splendid, sir.' : `You’re at ${(have / 1000).toFixed(1)} of ${(target / 1000).toFixed(1)} L. A glass now, sir.`
    } else {
      const target = settings.proteinTargetG ?? 140
      const have = dayData.proteinG ?? 0
      body = have >= target ? 'Protein target hit. The bulk thanks you.' : `${have} of ${target} g protein so far. Time to fuel, sir.`
    }
  }
  return { title: r.label, body: body || 'A gentle nudge from the house, sir.', url: URLS[r.kind] ?? '/', tag: r.id }
}

async function sendAll(sb: ReturnType<typeof admin>, row: PushRow, payload: object) {
  const alive: PushRow['subscriptions'] = []
  let sent = 0
  for (const sub of row.subscriptions ?? []) {
    try {
      await sendNotification(sub, JSON.stringify(payload), { TTL: 3600 })
      alive.push(sub)
      sent++
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code !== 404 && code !== 410) alive.push(sub) // keep unless the device unsubscribed
    }
  }
  if (sb && alive.length !== (row.subscriptions ?? []).length) await sb.from('push_settings').update({ subscriptions: alive }).eq('user_id', row.user_id)
  return sent
}

export function GET() {
  return json({ ok: true, configured: Boolean(admin() && process.env.VAPID_PRIVATE_KEY && process.env.PUSH_CRON_SECRET) })
}

export async function POST(request: Request) {
  const sb = admin()
  if (!sb || !vapidReady()) return json({ error: 'push_not_configured' }, 503)
  const body = (await request.json().catch(() => ({}))) as { kind?: string }

  // ── Test notification for the signed-in user ──
  if (body.kind === 'test') {
    const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: u } = await sb.auth.getUser(token)
    if (!u?.user) return json({ error: 'not_signed_in' }, 401)
    const { data: row } = await sb.from('push_settings').select('*').eq('user_id', u.user.id).maybeSingle()
    if (!row) return json({ error: 'no_devices' }, 404)
    const sent = await sendAll(sb, row as PushRow, { title: 'GHARANA', body: 'Notifications are working, sir. The house will keep you on track.', url: '/', tag: 'test' })
    return json({ ok: true, sent })
  }

  // ── Scheduler tick (pg_cron) ──
  if (!safeEqual(request.headers.get('x-cron-secret') ?? '', process.env.PUSH_CRON_SECRET ?? '')) return json({ error: 'forbidden' }, 403)
  const { data: rows, error } = await sb.from('push_settings').select('*')
  if (error) return json({ error: error.message }, 500)
  let total = 0
  for (const row of (rows ?? []) as PushRow[]) {
    if (!row.subscriptions?.length) continue
    const now = local(row.tz || 'Australia/Melbourne')
    const lastSent = { ...(row.last_sent ?? {}) }
    let changed = false
    for (const r of row.schedule ?? []) {
      if (!r.on || (r.days?.length && !r.days.includes(now.dow))) continue
      for (const t of r.times ?? []) {
        const [h, m] = t.split(':').map(Number)
        const at = h * 60 + m
        const key = `${r.id}@${t}`
        // Due within the last 6 minutes (tick runs every 5) and not yet sent today.
        if (now.minute >= at && now.minute - at < 6 && lastSent[key] !== now.day) {
          total += await sendAll(sb, row, await compose(sb, row, r, now.day))
          lastSent[key] = now.day
          changed = true
        }
      }
    }
    if (changed) await sb.from('push_settings').update({ last_sent: lastSent }).eq('user_id', row.user_id)
  }
  return json({ ok: true, sent: total })
}
