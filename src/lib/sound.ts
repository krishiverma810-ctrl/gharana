// Jazz-club UI sounds, synthesised on the fly (no audio files → nothing to download, works offline).
import { getSettings } from '../store/settings'

let ctx: AudioContext | null = null
function ac(): AudioContext | null {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  const c = ac()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  const t = c.currentTime + start
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + dur + 0.05)
}

const on = (force?: boolean) => force || getSettings().sound

/** Soft piano note — habit tick. */
export function tick() {
  if (!on()) return
  tone(659.25, 0, 0.5, 'triangle', 0.1)
  tone(1318.5, 0, 0.25, 'sine', 0.03)
}

/** Brass sting — wins, PRs, full house. */
export function win() {
  if (!on()) return
  ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.6, 'sawtooth', 0.05))
}

/** Focus timer finished — always plays (it's an alarm). */
export function chime() {
  ;[880, 1108.7, 1318.5].forEach((f, i) => tone(f, i * 0.35, 1.4, 'sine', 0.14))
}

/** Boxing bell — always plays. */
export function bell(times = 1) {
  for (let i = 0; i < times; i++) {
    tone(1200, i * 0.35, 1.2, 'triangle', 0.18)
    tone(1800, i * 0.35, 0.8, 'sine', 0.06)
  }
}

/** Unlock audio on first touch (iOS needs a user gesture). */
export function primeAudio() {
  ac()
}
