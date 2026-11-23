import { useEffect, useState } from 'react'
import { Field, Sheet, Toggle } from '../components/ui'
import { useSettings } from '../store/settings'
import { toast } from '../store/ui'
import { cloudConfig, currentUser, loadCloudConfig, supa } from '../lib/cloud'
import { firstSyncChoice, replaceWithCloud, syncNow, useSync } from '../lib/sync'
import { downloadRemindersICS, disablePush, enablePush, pushSupported, sendTestPush, syncPushSettings, type Reminder } from '../lib/push'

// Settings → SYNC and Settings → NOTIFICATIONS.

function useUser() {
  const [email, setEmail] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    void loadCloudConfig().then(async () => setEmail((await currentUser())?.email ?? null))
    const sub = supa()?.auth.onAuthStateChange((_e, session) => setEmail(session?.user?.email ?? null))
    return () => sub?.data.subscription.unsubscribe()
  }, [])
  return email
}

export function SyncSettings() {
  const email = useUser()
  const sync = useSync()
  const [mail, setMail] = useState('')
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [choice, setChoice] = useState(false)

  if (email === undefined) return <p className="font-body text-[var(--ink-muted)]">Checking…</p>
  if (!cloudConfig()) {
    return (
      <p className="font-body text-[15px] text-[var(--ink-muted)]">
        Sync isn’t switched on yet. It needs a free Supabase project connected in Vercel (SUPABASE_URL + SUPABASE_ANON_KEY). Until then, use Export / Import under Your Data to move between devices.
      </p>
    )
  }

  const afterSignIn = async () => {
    const { cloudHasData, localHasData } = await firstSyncChoice()
    if (cloudHasData && localHasData) setChoice(true)
    else await syncNow()
  }

  const auth = async (mode: 'in' | 'up') => {
    const s = supa()
    if (!s || !mail.trim() || pass.length < 8) return toast('Email + a password of 8+ characters')
    setBusy(true)
    try {
      const res = mode === 'in' ? await s.auth.signInWithPassword({ email: mail.trim(), password: pass }) : await s.auth.signUp({ email: mail.trim(), password: pass })
      if (res.error) throw res.error
      setPass('')
      if (mode === 'up' && !res.data.session) toast('Check your email to confirm the account, then sign in here.')
      else {
        toast('Signed in. Syncing…')
        await afterSignIn()
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setBusy(false)
    }
  }

  if (!email) {
    return (
      <div className="flex flex-col gap-3">
        <p className="font-body text-[15px] text-[var(--ink-muted)]">One account, every device. Your data stays on each device and syncs through your own private Supabase database whenever you’re online.</p>
        <input className="deco-input" type="email" autoComplete="email" value={mail} onChange={(e) => setMail(e.target.value)} placeholder="Email" />
        <input className="deco-input" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password (8+ characters)" />
        <div className="grid grid-cols-2 gap-2">
          <button className="deco-btn" disabled={busy} onClick={() => auth('in')}>Sign in</button>
          <button className="deco-btn ghost" disabled={busy} onClick={() => auth('up')}>Create account</button>
        </div>
        <p className="font-body text-[13px] text-[var(--ink-muted)]">Create the account once (on your phone), then just Sign in on the laptop.</p>
      </div>
    )
  }

  const statusText = { off: 'Off', idle: 'Up to date', syncing: 'Syncing…', error: `Problem: ${sync.error}`, offline: 'Offline — will sync when back online' }[sync.status]
  return (
    <div className="flex flex-col gap-3">
      <p className="font-body text-[16px]">Signed in as <span className="text-[var(--accent)]">{email}</span></p>
      <p className="font-body text-[15px] text-[var(--ink-muted)]">
        {statusText}
        {sync.lastSync ? ` · last sync ${new Date(sync.lastSync).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}` : ''}
        {sync.lastSync ? ` · ↑${sync.pushed} ↓${sync.pulled}` : ''}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button className="deco-btn" disabled={sync.status === 'syncing'} onClick={() => syncNow()}>Sync now</button>
        <button className="deco-btn ghost" onClick={async () => { await supa()?.auth.signOut(); toast('Signed out. This device keeps its data.') }}>Sign out</button>
      </div>
      <p className="font-body text-[13px] text-[var(--ink-muted)]">Syncs on open, every minute and when the connection comes back. The newest edit wins. Your ALFRED house key stays per-device.</p>
      <Sheet open={choice} onClose={() => setChoice(false)} title="THIS DEVICE ALREADY HAS DATA">
        <div className="flex flex-col gap-3">
          <p className="font-body text-[17px]">The cloud already has your house from another device. What should this device do?</p>
          <button className="deco-btn" onClick={async () => { setChoice(false); await replaceWithCloud(); toast('This device now matches the cloud. Reloading…'); setTimeout(() => location.reload(), 900) }}>
            Use the cloud copy (recommended for a 2nd device)
          </button>
          <button className="deco-btn ghost" onClick={async () => { setChoice(false); await syncNow(); toast('Merged — both devices’ data combined') }}>Merge both</button>
          <p className="font-body text-[13px] text-[var(--ink-muted)]">“Use the cloud copy” replaces this device’s data (a backup is kept under Your Data). “Merge” keeps both — you may see some starter lists twice.</p>
        </div>
      </Sheet>
    </div>
  )
}

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function ReminderRow({ r, onChange }: { r: Reminder; onChange: (r: Reminder) => void }) {
  const [times, setTimes] = useState(r.times.join(', '))
  return (
    <div className="reminder">
      <Toggle label={r.label} hint={r.body ?? (r.kind === 'water' || r.kind === 'protein' ? 'Shows your real progress' : undefined)} on={r.on} onChange={(on) => onChange({ ...r, on })} />
      {r.on && (
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <input
            className="deco-input font-num flex-1 min-w-[150px]"
            value={times}
            onChange={(e) => setTimes(e.target.value)}
            onBlur={() => {
              const t = times.split(/[ ,]+/).map((x) => x.trim()).filter((x) => /^\d{1,2}:\d{2}$/.test(x)).map((x) => x.padStart(5, '0'))
              if (t.length) onChange({ ...r, times: t })
              setTimes((t.length ? t : r.times).join(', '))
            }}
            aria-label="Times"
          />
          <div className="flex gap-1">
            {DAYS.map((d, i) => {
              const on = !r.days.length || r.days.includes(i)
              return (
                <button
                  key={i}
                  className={`day-chip ${on ? 'on' : ''}`}
                  onClick={() => {
                    const all = r.days.length ? r.days : [0, 1, 2, 3, 4, 5, 6]
                    const next = on ? all.filter((x) => x !== i) : [...all, i].sort()
                    onChange({ ...r, days: next.length === 7 ? [] : next })
                  }}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function NotificationSettings() {
  const s = useSettings()
  const email = useUser()
  const [busy, setBusy] = useState(false)
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const [subscribed, setSubscribed] = useState(false)
  useEffect(() => {
    void navigator.serviceWorker?.getRegistration().then((reg) => reg?.pushManager?.getSubscription()).then((sub) => setSubscribed(!!sub))
  }, [perm])

  const save = (reminders: Reminder[]) => {
    s.update({ reminders })
    void syncPushSettings()
  }

  return (
    <div className="flex flex-col gap-3">
      {!pushSupported() ? (
        <p className="font-body text-[15px] text-[var(--ink-muted)]">Push isn’t available here. On iPhone it works when GHARANA is opened from the home-screen icon (iOS 16.4+). You can still export reminders to your calendar below.</p>
      ) : !email ? (
        <p className="font-body text-[15px] text-[var(--ink-muted)]">Sign in under Sync first — reminders are sent by the server, so it needs to know where to reach you.</p>
      ) : subscribed ? (
        <div className="grid grid-cols-2 gap-2">
          <button className="deco-btn" disabled={busy} onClick={async () => { setBusy(true); try { const n = await sendTestPush(); toast(n ? 'Test sent — check your notifications' : 'No device received it') } catch (e) { toast(e instanceof Error ? e.message : 'Failed') } finally { setBusy(false) } }}>Send a test</button>
          <button className="deco-btn ghost" onClick={async () => { await disablePush(); setSubscribed(false); toast('Notifications off on this device') }}>Turn off here</button>
        </div>
      ) : (
        <button className="deco-btn" disabled={busy} onClick={async () => { setBusy(true); try { await enablePush(); setPerm(Notification.permission); setSubscribed(true); toast('Notifications on for this device') } catch (e) { toast(e instanceof Error ? e.message : 'Failed') } finally { setBusy(false) } }}>
          Turn on notifications for this device
        </button>
      )}
      <Field label="REMINDERS (YOUR LOCAL TIME — THEY FOLLOW TRAVEL MODE)">
        <div className="flex flex-col gap-2">
          {s.reminders.map((r, i) => <ReminderRow key={r.id} r={r} onChange={(nr) => save(s.reminders.map((x, j) => (j === i ? nr : x)))} />)}
        </div>
      </Field>
      <button className="deco-btn ghost" onClick={() => downloadRemindersICS(s.reminders)}>Export as calendar alarms (.ics)</button>
      <p className="font-body text-[13px] text-[var(--ink-muted)]">The .ics option works with no server at all — your phone’s calendar rings at those times. Times are comma-separated, e.g. 10:30, 13:30.</p>
    </div>
  )
}
