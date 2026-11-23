import { getSettings } from '../store/settings'
import { getHouseKey } from './alfred'

// Voice I/O for ALFRED.
//   Listening: the browser's built-in speech recognition (free; on iPhone it uses Apple's engine).
//              Fallback: record audio → /api/voice (OpenAI) — only if the premium voice is set up.
//   Speaking:  the phone's own voices (free, offline) or the premium voice via /api/voice.
// The mic is only ever on while you hold the orb / tap it / have the wake word switched on.
// Audio is never stored.

// ── Speech recognition (browser) ─────────────────────────────────────
interface SRResultList {
  length: number
  [i: number]: { isFinal: boolean; 0: { transcript: string } }
}
interface SR {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: { resultIndex: number; results: SRResultList }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type SRCtor = new () => SR

function srCtor(): SRCtor | null {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const canRecognise = () => !!srCtor()
export const canRecord = () => typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

export function speechLang(): string {
  const l = getSettings().alfredLang
  return l === 'hindi' ? 'hi-IN' : l === 'punjabi' ? 'pa-IN' : l === 'hinglish' ? 'en-IN' : 'en-AU'
}

export interface Listener {
  /** Stop listening and get the final transcript. */
  stop: () => Promise<string>
  /** Abandon without a result. */
  cancel: () => void
  /** Resolves when listening ends by itself (silence detected). */
  done: Promise<string>
}

export interface ListenOpts {
  /** Keep listening until stop() (push-to-talk). Otherwise ends on silence (conversation mode). */
  hold?: boolean
  onInterim?: (text: string) => void
  continuous?: boolean
}

/** Start listening. Throws if this device can't do speech input. */
export function listen(opts: ListenOpts = {}): Listener {
  const Ctor = srCtor()
  if (Ctor) return listenBrowser(Ctor, opts)
  if (canRecord() && getSettings().voiceProvider === 'premium') return listenRecorder(opts)
  throw new Error('no_speech_input')
}

function listenBrowser(Ctor: SRCtor, opts: ListenOpts): Listener {
  const rec = new Ctor()
  rec.lang = speechLang()
  rec.interimResults = true
  rec.continuous = !!(opts.hold || opts.continuous)
  let finalText = ''
  let interim = ''
  let resolve!: (t: string) => void
  let reject!: (e: Error) => void
  let settled = false
  const done = new Promise<string>((res, rej) => {
    resolve = res
    reject = rej
  })
  rec.onresult = (e) => {
    interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i]
      if (r.isFinal) finalText += r[0].transcript
      else interim += r[0].transcript
    }
    opts.onInterim?.((finalText + interim).trim())
  }
  rec.onerror = (e) => {
    if (settled) return
    if (e.error === 'no-speech' || e.error === 'aborted') return
    settled = true
    reject(new Error(e.error === 'not-allowed' ? 'mic_denied' : e.error))
  }
  rec.onend = () => {
    if (settled) return
    settled = true
    resolve((finalText || interim).trim())
  }
  try {
    rec.start()
  } catch {
    /* already started */
  }
  return {
    done,
    stop: () => {
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
      return done
    },
    cancel: () => {
      settled = true
      try {
        rec.abort()
      } catch {
        /* ignore */
      }
      resolve('')
    },
  }
}

/** Fallback: record audio and send it to the premium transcriber. Ends on ~1.3 s of silence. */
function listenRecorder(opts: ListenOpts): Listener {
  let stopFn: () => void = () => {}
  let cancelled = false
  const done = (async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).catch(() => {
      throw new Error('mic_denied')
    })
    const mr = new MediaRecorder(stream)
    const chunks: Blob[] = []
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    const stopped = new Promise<void>((r) => (mr.onstop = () => r()))
    // Simple voice-activity detection for conversation mode.
    const ctx = new AudioContext()
    const an = ctx.createAnalyser()
    ctx.createMediaStreamSource(stream).connect(an)
    const buf = new Uint8Array(an.fftSize)
    let heard = false
    let quietSince = Date.now()
    const vad = window.setInterval(() => {
      an.getByteTimeDomainData(buf)
      const level = Math.max(...buf) - 128
      if (level > 12) {
        heard = true
        quietSince = Date.now()
      }
      if (!opts.hold && heard && Date.now() - quietSince > 1300) stopFn()
      if (!opts.hold && !heard && Date.now() - quietSince > 7000) stopFn()
    }, 120)
    stopFn = () => mr.state !== 'inactive' && mr.stop()
    mr.start()
    opts.onInterim?.('…')
    await stopped
    clearInterval(vad)
    void ctx.close()
    stream.getTracks().forEach((t) => t.stop())
    if (cancelled || !chunks.length) return ''
    const form = new FormData()
    form.append('audio', new Blob(chunks, { type: mr.mimeType || 'audio/webm' }))
    const r = await fetch('/api/voice?op=stt', { method: 'POST', headers: { 'x-house-key': getHouseKey() }, body: form })
    if (!r.ok) throw new Error('stt_failed')
    return (((await r.json()) as { text?: string }).text ?? '').trim()
  })()
  return {
    done,
    stop: () => {
      stopFn()
      return done
    },
    cancel: () => {
      cancelled = true
      stopFn()
    },
  }
}

// ── Speaking ──────────────────────────────────────────────────────────
let currentAudio: HTMLAudioElement | null = null
let speakingResolve: (() => void) | null = null

/** Make text sound right when read aloud. */
export function forSpeech(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*_#>`~|]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\n+/g, '. ')
    .trim()
}

export function deviceVoices(): SpeechSynthesisVoice[] {
  try {
    return speechSynthesis.getVoices()
  } catch {
    return []
  }
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const s = getSettings()
  const voices = deviceVoices()
  if (s.deviceVoice) {
    const v = voices.find((x) => x.name === s.deviceVoice)
    if (v) return v
  }
  const lang = speechLang()
  if (lang !== 'en-AU') return voices.find((v) => v.lang.startsWith(lang.slice(0, 2)))
  // Prefer a British gentleman: Daniel / Arthur / any en-GB.
  return voices.find((v) => /Daniel|Arthur|Oliver/i.test(v.name) && /en-GB/i.test(v.lang)) ?? voices.find((v) => /en-GB/i.test(v.lang)) ?? voices.find((v) => v.lang.startsWith('en'))
}

/** Speak text. Resolves when finished (or interrupted). */
export async function speak(text: string): Promise<void> {
  stopSpeaking()
  const clean = forSpeech(text)
  if (!clean) return
  const s = getSettings()
  if (s.voiceProvider === 'premium' && navigator.onLine) {
    try {
      const r = await fetch('/api/voice?op=tts', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-house-key': getHouseKey() },
        body: JSON.stringify({ text: clean, voice: s.premiumVoice }),
      })
      if (r.ok) {
        const url = URL.createObjectURL(await r.blob())
        const audio = new Audio(url)
        audio.playbackRate = s.voiceRate
        currentAudio = audio
        await new Promise<void>((res) => {
          speakingResolve = res
          audio.onended = audio.onerror = () => res()
          audio.play().catch(() => res())
        })
        URL.revokeObjectURL(url)
        currentAudio = null
        return
      }
    } catch {
      /* fall back to the device voice */
    }
  }
  await new Promise<void>((res) => {
    try {
      const u = new SpeechSynthesisUtterance(clean)
      const v = pickVoice()
      if (v) u.voice = v
      u.lang = v?.lang ?? speechLang()
      u.rate = s.voiceRate
      u.pitch = s.voicePitch
      speakingResolve = res
      u.onend = u.onerror = () => res()
      speechSynthesis.speak(u)
    } catch {
      res()
    }
  })
}

export function stopSpeaking() {
  try {
    speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  speakingResolve?.()
  speakingResolve = null
}
