import { useEffect, useState } from 'react'
import { Field, Segmented, Toggle } from '../components/ui'
import { useSettings } from '../store/settings'
import { toast } from '../store/ui'
import { canRecognise, canRecord, deviceVoices, speak } from '../lib/voice'
import { getHouseKey } from '../lib/alfred'

// Settings → VOICE and Settings → SIRI.

const PREMIUM_VOICES = ['fable', 'onyx', 'ash', 'echo', 'sage', 'ballad', 'verse', 'alloy', 'coral', 'nova', 'shimmer']

function useServerCaps() {
  const [caps, setCaps] = useState<{ kv: boolean; voice: boolean; configured: boolean } | null>(null)
  useEffect(() => {
    fetch(`/api/alfred?status=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCaps(d ? { kv: !!d.kv, voice: !!d.voice, configured: !!d.configured } : null))
      .catch(() => setCaps(null))
  }, [])
  return caps
}

export function VoiceSettings() {
  const s = useSettings()
  const caps = useServerCaps()
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(deviceVoices())
  useEffect(() => {
    const load = () => setVoices(deviceVoices())
    try {
      speechSynthesis.addEventListener('voiceschanged', load)
      return () => speechSynthesis.removeEventListener('voiceschanged', load)
    } catch {
      return undefined
    }
  }, [])
  const english = voices.filter((v) => /^(en|hi|pa)/i.test(v.lang))

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-[15px] text-[var(--ink-muted)]">
        Listening on this device: <span className="text-[var(--ink)]">{canRecognise() ? 'built-in speech recognition ✓' : canRecord() ? 'needs the premium voice (or use the keyboard mic)' : 'not available — use the mic key on your keyboard'}</span>
      </p>
      <Field label="ALFRED'S VOICE">
        <Segmented
          value={s.voiceProvider}
          onChange={(voiceProvider) => s.update({ voiceProvider })}
          options={[{ value: 'device', label: 'Phone voice (free, offline)' }, { value: 'premium', label: 'Premium' }]}
        />
      </Field>
      {s.voiceProvider === 'device' ? (
        <Field label="DEVICE VOICE">
          <select className="deco-input w-full" value={s.deviceVoice} onChange={(e) => s.update({ deviceVoice: e.target.value })}>
            <option value="">Best British voice available</option>
            {english.map((v) => (
              <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
            ))}
          </select>
          <p className="font-body text-[13px] text-[var(--ink-muted)] mt-1">On iPhone, nicer voices (e.g. “Daniel (Enhanced)”) can be downloaded in Settings → Accessibility → Spoken Content → Voices → English.</p>
        </Field>
      ) : (
        <Field label="PREMIUM VOICE">
          <div className="flex flex-wrap gap-2">
            {PREMIUM_VOICES.map((v) => <button key={v} className={`chip ${s.premiumVoice === v ? 'on' : ''}`} onClick={() => s.update({ premiumVoice: v })}>{v}</button>)}
          </div>
          <p className="font-body text-[13px] text-[var(--ink-muted)] mt-2">
            {caps?.voice ? 'Premium voice is set up on the server ✓' : 'Not set up yet — needs an OPENAI_API_KEY in Vercel. Until then ALFRED uses the phone voice.'}
          </p>
        </Field>
      )}
      <Field label={`SPEED · ${s.voiceRate.toFixed(2)}×`}>
        <input type="range" min={0.7} max={1.4} step={0.05} value={s.voiceRate} onChange={(e) => s.update({ voiceRate: Number(e.target.value) })} className="w-full accent-[var(--accent)]" />
      </Field>
      <Field label={`PITCH · ${s.voicePitch.toFixed(2)}`}>
        <input type="range" min={0.6} max={1.4} step={0.05} value={s.voicePitch} onChange={(e) => s.update({ voicePitch: Number(e.target.value) })} className="w-full accent-[var(--accent)]" />
      </Field>
      <button className="deco-btn ghost" onClick={() => speak('Good evening, sir. The house is in order, and the kettle is on.')}>Test the voice</button>
      <Toggle label="Speak replies" hint="ALFRED talks back when you use voice" on={s.speakReplies} onChange={(speakReplies) => s.update({ speakReplies })} />
      <Toggle label="Subtitles" hint="Live captions of what he says" on={s.subtitles} onChange={(subtitles) => s.update({ subtitles })} />
      <Toggle label="“Hey Alfred” wake word (experimental)" hint="Listens only while the app is open on screen. Uses more battery; works best on a laptop in Chrome." on={s.wakeWord} onChange={(wakeWord) => s.update({ wakeWord })} />
      <Toggle label="Orb on the left" hint="Or drag the orb anywhere — it snaps to the edge" on={s.orbSide === 'left'} onChange={(on) => s.update({ orbSide: on ? 'left' : 'right' })} />
      <p className="font-body text-[13px] text-[var(--ink-muted)]">
        The mic is only on while you hold the orb, during conversation mode, or with the wake word switched on — the orb glows whenever it’s listening. Audio is never stored; only the text of what you said is kept in the chat.
      </p>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="font-num text-[var(--accent)] w-5 flex-none">{n}.</span>
      <div className="font-body text-[15.5px] leading-snug">{children}</div>
    </li>
  )
}

function Code({ children }: { children: string }) {
  return (
    <button className="code-chip" onClick={() => navigator.clipboard?.writeText(children).then(() => toast('Copied'))} title="Tap to copy">
      {children}
    </button>
  )
}

export function SiriSettings() {
  const s = useSettings()
  const caps = useServerCaps()
  const [testing, setTesting] = useState(false)
  const url = `${location.origin}/api/alfred?format=text`

  const test = async () => {
    setTesting(true)
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-house-key': getHouseKey() }, body: JSON.stringify({ kind: 'siri', text: 'Say a one-sentence hello for a Siri test.' }) })
      const text = await r.text()
      toast(r.ok ? `Siri test: ${text}` : `Siri test failed (${r.status})`)
      if (r.ok) void speak(text)
    } catch {
      toast('Siri test failed — are you online?')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-[15px] text-[var(--ink-muted)]">
        A web app can’t listen in your pocket, so the hands-free route is Siri: “Hey Siri, Alfred” → you talk → Siri reads his reply. Anything he logs waits on the server and lands in GHARANA the next time you open it.
      </p>
      <p className="font-body text-[15px]">
        Server: {caps === null ? 'checking…' : caps.configured ? 'ALFRED ✓' : 'ALFRED not set up'} · Action store: {caps === null ? '…' : caps.kv ? 'Upstash ✓' : <span className="text-[var(--accent)]">not set up (Siri can chat but not log)</span>}
      </p>
      <Toggle label="Share today’s snapshot with Siri" hint="Keeps a short summary of your day on the server (deleted after 2 days) so Siri’s answers know what’s going on" on={s.siriSnapshot} onChange={(siriSnapshot) => s.update({ siriSnapshot })} />
      <button className="deco-btn ghost" disabled={testing || !getHouseKey()} onClick={test}>{testing ? 'Asking ALFRED…' : 'Test the Siri connection'}</button>

      <div>
        <div className="field-label">“HEY SIRI, ALFRED” — BUILD IT ONCE (5 MIN)</div>
        <ol className="flex flex-col gap-2">
          <Step n={1}>Open the <b>Shortcuts</b> app → <b>+</b> (top right). Name it <b>Alfred</b> (that’s what you’ll say to Siri).</Step>
          <Step n={2}>Add action <b>Dictate Text</b>. Tap its arrow: Language <b>English (Australia)</b>, Stop Listening <b>After Pause</b>.</Step>
          <Step n={3}>Add <b>Get Contents of URL</b>. URL: <Code>{url}</Code></Step>
          <Step n={4}>Tap the arrow on it → Method <b>POST</b> → Headers: add <Code>x-house-key</Code> with your house key as the value.</Step>
          <Step n={5}>Request Body <b>JSON</b> → add <b>Text</b> field <Code>kind</Code> = <Code>siri</Code>, then add <b>Text</b> field <Code>text</Code> and set its value to the <b>Dictated Text</b> variable.</Step>
          <Step n={6}>Add <b>Speak Text</b> (it fills in “Contents of URL”). Done — say <b>“Hey Siri, Alfred.”</b></Step>
        </ol>
      </div>
      <div>
        <div className="field-label">ONE-TAP SHORTCUTS (FREE — NO AI)</div>
        <ol className="flex flex-col gap-2">
          <Step n={1}>Duplicate “Alfred”, delete Dictate Text, rename it <b>Log water</b>.</Step>
          <Step n={2}>In the JSON body set <Code>kind</Code> = <Code>quick</Code>, <Code>action</Code> = <Code>water</Code>, and a <b>Number</b> field <Code>amount</Code> = 500.</Step>
          <Step n={3}>Same idea for <Code>protein</Code> (amount in g) and <Code>focus</Code> (field <Code>minutes</Code>).</Step>
          <Step n={4}>Put them on your <b>Action Button</b> (Settings → Action Button → Shortcut), a <b>Lock Screen</b> widget, or your Apple Watch.</Step>
        </ol>
      </div>
      <div>
        <div className="field-label">MORNING BRIEFING WHEN YOUR ALARM STOPS</div>
        <ol className="flex flex-col gap-2">
          <Step n={1}>Duplicate “Alfred”, delete Dictate Text, rename it <b>Alfred Brief</b>, and set <Code>text</Code> to: <Code>Brief me on today in under a minute.</Code></Step>
          <Step n={2}>Shortcuts → <b>Automation</b> → <b>+</b> → <b>Alarm</b> → <b>Is Stopped</b> → <b>Run Immediately</b> → choose <b>Alfred Brief</b>.</Step>
        </ol>
      </div>
      <p className="font-body text-[13px] text-[var(--ink-muted)]">Siri usage is counted in your ALFRED budget the next time the app opens.</p>
    </div>
  )
}
