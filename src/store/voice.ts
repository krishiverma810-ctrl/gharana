import { create } from 'zustand'
import { listen, speak, stopSpeaking, type Listener } from '../lib/voice'
import { runCommand, isGoodbye } from '../lib/commands'
import { AlfredError, here, lastReply, queueMessage, sendToAlfred } from '../lib/alfred'
import { getSettings } from './settings'
import { tick } from '../lib/sound'

// The voice conductor: listen → (offline command | ALFRED) → speak → (conversation mode: listen again).

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface VoiceStore {
  state: VoiceState
  /** What you said (live while listening). */
  heard: string
  /** What ALFRED replied (shown as captions). */
  caption: string
  captionAt: number
  convo: boolean
  error: string
  wheelOpen: boolean
  startHold: () => void
  endHold: () => void
  toggleConvo: () => void
  interrupt: () => void
  stopAll: () => void
  ask: (text: string, opts?: { speak?: boolean }) => Promise<void>
  setWheel: (open: boolean) => void
  dismissCaption: () => void
}

let listener: Listener | null = null
let wakeListener: Listener | null = null

function friendly(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  if (m === 'no_speech_input') return 'This browser can’t listen. Use the mic on your keyboard instead, or turn on the premium voice in Settings.'
  if (m === 'mic_denied') return 'Microphone access is off. Allow it for this app in Settings → Safari → Microphone (or the browser’s site settings).'
  if (m === 'network') return 'Speech recognition needs a connection on this device.'
  return m
}

export const useVoice = create<VoiceStore>((set, get) => {
  /** Conversation mode: listen once, end on silence. */
  const listenOnce = async (retry = 0) => {
    if (!get().convo) return
    try {
      tick()
      set({ state: 'listening', heard: '', error: '' })
      listener = listen({ onInterim: (heard) => set({ heard }) })
      const text = await listener.done
      listener = null
      if (!get().convo) return
      if (!text) {
        if (retry < 1) return listenOnce(retry + 1)
        set({ convo: false, state: 'idle', caption: 'I’ll be here, sir.', captionAt: Date.now() })
        return
      }
      await get().ask(text)
    } catch (e) {
      listener = null
      set({ convo: false, state: 'idle', error: friendly(e), caption: friendly(e), captionAt: Date.now() })
    }
  }

  return {
    state: 'idle',
    heard: '',
    caption: '',
    captionAt: 0,
    convo: false,
    error: '',
    wheelOpen: false,

    startHold: () => {
      stopSpeaking()
      stopWake()
      listener?.cancel()
      try {
        tick()
        set({ state: 'listening', heard: '', error: '', wheelOpen: false })
        listener = listen({ hold: true, onInterim: (heard) => set({ heard }) })
      } catch (e) {
        listener = null
        set({ state: 'idle', error: friendly(e), caption: friendly(e), captionAt: Date.now() })
      }
    },

    endHold: () => {
      const l = listener
      if (!l) return
      listener = null
      void l
        .stop()
        .then((text) => (text ? get().ask(text) : set({ state: 'idle', heard: '' })))
        .catch((e) => set({ state: 'idle', error: friendly(e), caption: friendly(e), captionAt: Date.now() }))
    },

    toggleConvo: () => {
      if (get().convo) {
        get().stopAll()
        return
      }
      stopSpeaking()
      stopWake()
      set({ convo: true, wheelOpen: false })
      void listenOnce()
    },

    /** Barge-in: stop ALFRED talking and listen (conversation mode) or go quiet. */
    interrupt: () => {
      stopSpeaking()
      if (get().convo) {
        listener?.cancel()
        void listenOnce()
      } else set({ state: 'idle' })
    },

    stopAll: () => {
      stopSpeaking()
      listener?.cancel()
      listener = null
      set({ convo: false, state: 'idle', heard: '' })
      startWakeIfEnabled()
    },

    ask: async (text, opts = {}) => {
      set({ state: 'thinking', heard: text, error: '' })
      if (isGoodbye(text)) {
        set({ convo: false, caption: 'Very good, sir.', captionAt: Date.now(), state: 'speaking' })
        if (getSettings().speakReplies) await speak('Very good, sir.')
        set({ state: 'idle' })
        startWakeIfEnabled()
        return
      }
      let reply = ''
      try {
        const local = await runCommand(text)
        if (local) reply = local.reply
        else {
          const rec = await sendToAlfred(here().today, text, undefined, 'voice')
          reply = lastReply(rec) || 'Done, sir.'
        }
      } catch (e) {
        if (e instanceof AlfredError && e.code === 'offline') {
          await queueMessage(here().today, text)
          reply = 'We’re offline, sir. I’ve noted it and will pass it on when we’re back.'
        } else reply = e instanceof Error ? e.message : 'Something went wrong, sir.'
      }
      // Captions show clean text (no markdown symbols).
      set({ caption: reply.replace(/[*_#`>]/g, '').trim(), captionAt: Date.now() })
      if (opts.speak ?? getSettings().speakReplies) {
        set({ state: 'speaking' })
        await speak(reply)
      }
      set({ state: 'idle' })
      if (get().convo) void listenOnce()
      else startWakeIfEnabled()
    },

    setWheel: (wheelOpen) => set({ wheelOpen }),
    dismissCaption: () => set({ caption: '', heard: '', captionAt: 0 }),
  }
})

// ── In-app wake word ("Hey Alfred") — experimental, off by default ────
// Uses continuous speech recognition while the app is open and idle. Battery-hungry; works best
// in desktop Chrome. Nothing listens while the app is closed or in the background.

function stopWake() {
  wakeListener?.cancel()
  wakeListener = null
}

export function startWakeIfEnabled() {
  const s = getSettings()
  const v = useVoice.getState()
  if (!s.wakeWord || wakeListener || v.state !== 'idle' || v.convo || document.visibilityState !== 'visible') return
  try {
    wakeListener = listen({
      continuous: true,
      onInterim: (t) => {
        const m = t.toLowerCase().match(/\b(?:hey|hi|ok|okay)?\s*alfred\b[\s,]*(.*)$/)
        if (!m) return
        stopWake()
        const rest = m[1]?.trim()
        if (rest && rest.split(' ').length >= 3) void useVoice.getState().ask(rest)
        else useVoice.getState().toggleConvo()
      },
    })
    void wakeListener.done.finally(() => {
      wakeListener = null
      // Recognition ends by itself after a while — keep listening while still enabled.
      setTimeout(startWakeIfEnabled, 400)
    })
  } catch {
    wakeListener = null
  }
}

export function stopWakeWord() {
  stopWake()
}
