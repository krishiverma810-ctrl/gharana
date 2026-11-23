import { useEffect, useState, type ReactNode } from 'react'
import { useSettings } from '../store/settings'
import { toast } from '../store/ui'
import { Field, Segmented } from '../components/ui'

// Privacy lock: a 4–6 digit passcode, plus optional Face ID / Touch ID / Windows Hello.
// Honest note: this keeps prying eyes out of the app; it does not encrypt the data on the device.

const enc = new TextEncoder()
const b64u = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

export async function hashPin(pin: string, salt: string) {
  return b64u(await crypto.subtle.digest('SHA-256', enc.encode(`${salt}:${pin}`)))
}

const canBio = () => typeof PublicKeyCredential !== 'undefined' && !!navigator.credentials

async function bioUnlock(credId: string): Promise<boolean> {
  try {
    const res = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ id: fromB64u(credId), type: 'public-key' }],
        userVerification: 'required',
        timeout: 60_000,
      },
    })
    return !!res
  } catch {
    return false
  }
}

const KEY = 'gh-hidden-at'

export function LockGate({ children }: { children: ReactNode }) {
  const s = useSettings()
  const enabled = !!s.pinHash
  const [locked, setLocked] = useState(enabled)
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)

  // Re-lock after N minutes in the background.
  useEffect(() => {
    if (!enabled) return
    const vis = () => {
      if (document.visibilityState === 'hidden') {
        try {
          sessionStorage.setItem(KEY, String(Date.now()))
        } catch {
          /* ignore */
        }
      } else {
        const t = Number(sessionStorage.getItem(KEY) ?? 0)
        if (t && Date.now() - t > s.lockAfterMin * 60_000) setLocked(true)
      }
    }
    document.addEventListener('visibilitychange', vis)
    return () => document.removeEventListener('visibilitychange', vis)
  }, [enabled, s.lockAfterMin])

  // Try Face ID straight away.
  useEffect(() => {
    if (locked && enabled && s.bioCredential && canBio()) void bioUnlock(s.bioCredential).then((ok) => ok && setLocked(false))
  }, [locked, enabled, s.bioCredential])

  if (!enabled || !locked) return <>{children}</>

  const press = async (d: string) => {
    const next = (pin + d).slice(0, 6)
    setPin(next)
    if (next.length >= 4 && (await hashPin(next, s.pinSalt)) === s.pinHash) {
      setLocked(false)
      setPin('')
    } else if (next.length === 6) {
      setShake(true)
      setTimeout(() => {
        setShake(false)
        setPin('')
      }, 450)
    }
  }

  return (
    <div className="lock">
      <div className="font-display text-[44px] tracking-[0.12em] text-[var(--accent)]">GHARANA</div>
      <div className="font-deco text-[11px] tracking-[0.4em] text-[var(--ink-muted)] mt-1">THE DOORS ARE LOCKED</div>
      <div className={`pin-dots ${shake ? 'shake' : ''}`}>{Array.from({ length: 6 }, (_, i) => <span key={i} className={i < pin.length ? 'on' : ''} />)}</div>
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <button key={d} onClick={() => press(d)}>{d}</button>)}
        {s.bioCredential && canBio() ? <button className="bio" onClick={() => bioUnlock(s.bioCredential).then((ok) => ok && setLocked(false))} aria-label="Unlock with Face ID">☺</button> : <span />}
        <button onClick={() => press('0')}>0</button>
        <button className="bio" onClick={() => setPin(pin.slice(0, -1))} aria-label="Delete">⌫</button>
      </div>
    </div>
  )
}

/** Settings → PRIVACY LOCK. */
export function LockSettings() {
  const s = useSettings()
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const set = async () => {
    if (!/^\d{4,6}$/.test(a)) return toast('Use 4–6 digits')
    if (a !== b) return toast('The two passcodes don’t match')
    const salt = b64u(crypto.getRandomValues(new Uint8Array(16)).buffer)
    s.update({ pinSalt: salt, pinHash: await hashPin(a, salt) })
    setA('')
    setB('')
    toast('Passcode set. The doors lock when you leave.')
  }
  const enrolBio = async () => {
    try {
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: 'GHARANA' },
          user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'gharana', displayName: s.name },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
          timeout: 60_000,
        },
      })) as PublicKeyCredential | null
      if (!cred) return
      s.update({ bioCredential: b64u(cred.rawId) })
      toast('Face ID / Touch ID / Windows Hello is on')
    } catch {
      toast('Couldn’t set it up on this device')
    }
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="font-body text-[15px] text-[var(--ink-muted)]">Locks the app with a passcode (and Face ID if your device has it). It keeps prying eyes out — your data stays on this device either way.</p>
      {s.pinHash ? (
        <>
          <p className="font-body text-[16px]">Passcode is <span className="text-[var(--accent)]">on</span>{s.bioCredential ? ' · Face ID / biometrics on' : ''}.</p>
          <Field label="LOCK AGAIN AFTER">
            <Segmented value={s.lockAfterMin} onChange={(lockAfterMin) => s.update({ lockAfterMin })} options={[{ value: 0, label: 'Always' }, { value: 1, label: '1 min' }, { value: 5, label: '5 min' }, { value: 30, label: '30 min' }]} />
          </Field>
          {canBio() && !s.bioCredential && <button className="deco-btn ghost" onClick={enrolBio}>Turn on Face ID / Touch ID</button>}
          {s.bioCredential && <button className="deco-btn ghost" onClick={() => s.update({ bioCredential: '' })}>Turn off biometrics</button>}
          <button className="deco-btn ghost danger" onClick={() => { s.update({ pinHash: '', pinSalt: '', bioCredential: '' }); toast('Lock removed') }}>Remove the lock</button>
        </>
      ) : (
        <>
          <input className="deco-input font-num" type="password" inputMode="numeric" autoComplete="new-password" value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="New passcode (4–6 digits)" />
          <input className="deco-input font-num" type="password" inputMode="numeric" autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Again" />
          <button className="deco-btn" onClick={set}>Set passcode</button>
          <p className="font-body text-[13px] text-[var(--ink-muted)]">Forget it? Clearing the app’s website data resets it — so keep your JSON backups current.</p>
        </>
      )}
    </div>
  )
}
