import { useEffect, useRef, useState } from 'react'
import { useVoice } from '../store/voice'
import { useSettings } from '../store/settings'
import { invoke, onDesktop } from '../lib/desktop'
import { Icon } from '../components/Icon'

// The always-on-top ALFRED bar for the Windows app (route: /overlay).
// The desktop shell shows it when a global hotkey is pressed and sends it events.

export function Overlay() {
  const v = useVoice()
  const speakReplies = useSettings((s) => s.speakReplies)
  const [typing, setTyping] = useState(false)
  const [text, setText] = useState('')
  const [pinned, setPinned] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  // Transparent window: no page background.
  useEffect(() => {
    document.documentElement.classList.add('overlay-mode')
    return () => document.documentElement.classList.remove('overlay-mode')
  }, [])

  // Events from the global hotkeys.
  useEffect(() => {
    const held = { on: false }
    const offs = [
      onDesktop('alfred:ptt-down', () => {
        if (held.on) return // ignore key auto-repeat
        held.on = true
        setTyping(false)
        useVoice.getState().startHold()
      }),
      onDesktop('alfred:ptt-up', () => {
        held.on = false
        useVoice.getState().endHold()
      }),
      onDesktop('alfred:converse', () => {
        setTyping(false)
        useVoice.getState().toggleConvo()
      }),
      onDesktop('alfred:type', () => {
        setTyping(true)
        setTimeout(() => input.current?.focus(), 60)
      }),
    ]
    return () => offs.forEach((o) => o())
  }, [])

  // Fade away a few seconds after he's finished (unless pinned or typing).
  useEffect(() => {
    if (pinned || typing || v.convo || v.state !== 'idle') return
    const t = setTimeout(() => void invoke('hide_overlay'), v.caption ? 7000 : 1500)
    return () => clearTimeout(t)
  }, [v.state, v.caption, v.convo, pinned, typing])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        useVoice.getState().stopAll()
        setTyping(false)
        void invoke('hide_overlay')
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  const send = () => {
    const t = text.trim()
    if (!t) return
    setText('')
    setTyping(false)
    void v.ask(t, { speak: speakReplies })
  }

  const label = v.state === 'listening' ? 'LISTENING' : v.state === 'thinking' ? 'CONSIDERING' : v.state === 'speaking' ? 'ALFRED' : typing ? 'TYPE TO ALFRED' : 'ALFRED'

  return (
    <div className="overlay-bar" data-tauri-drag-region>
      <div className={`overlay-wave ${v.state}`} aria-hidden="true">
        <Icon name="alfred" size={22} />
      </div>
      <div className="flex-1 min-w-0" data-tauri-drag-region>
        <div className="font-deco text-[10px] tracking-[0.35em] text-[var(--accent)]" data-tauri-drag-region>
          {label}
          {v.convo && ' · CONVERSATION'}
        </div>
        {typing ? (
          <input
            ref={input}
            className="overlay-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ask ALFRED anything…"
          />
        ) : (
          <p className="overlay-text">
            {v.state === 'listening' || v.state === 'thinking' ? (v.heard ? `“${v.heard}”` : '…') : v.caption || 'At your service, sir.'}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <button className={`overlay-btn ${pinned ? 'on' : ''}`} title="Keep on screen" onClick={() => { setPinned(!pinned); void invoke('set_overlay_pinned', { pinned: !pinned }) }}>📌</button>
        <button className="overlay-btn" title="Open GHARANA" onClick={() => void invoke('open_main', { path: '/alfred' })}>↗</button>
        <button className="overlay-btn" title="Close (Esc)" onClick={() => { v.stopAll(); void invoke('set_overlay_pinned', { pinned: false }).then(() => invoke('hide_overlay')); setPinned(false) }}>×</button>
      </div>
    </div>
  )
}
