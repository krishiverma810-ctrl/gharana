import { useEffect, useState } from 'react'
import { Field } from '../components/ui'
import { toast } from '../store/ui'
import { CLASHES, invoke, isDesktop, type Hotkeys } from '../lib/desktop'

// Settings → DESKTOP (only inside the Windows app): rebind the system-wide hotkeys.

const LABELS: Record<keyof Hotkeys, string> = {
  talk: 'HOLD TO TALK',
  converse: 'CONVERSATION MODE',
  type_to: 'TYPE TO ALFRED',
}

/** Turn a keydown into Tauri's shortcut format, e.g. "Ctrl+Shift+Space". */
function fromEvent(e: KeyboardEvent): string | null {
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return null
  const mods = [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Super'].filter(Boolean)
  let key = e.code
  if (key.startsWith('Key')) key = key.slice(3)
  else if (key.startsWith('Digit')) key = key.slice(5)
  if (!mods.length) return null // a global hotkey needs at least one modifier
  return [...mods, key].join('+')
}

export function DesktopSettings() {
  const [keys, setKeys] = useState<Hotkeys | null>(null)
  const [capturing, setCapturing] = useState<keyof Hotkeys | null>(null)

  useEffect(() => {
    void invoke<Hotkeys>('get_hotkeys').then((k) => k && setKeys(k))
  }, [])

  useEffect(() => {
    if (!capturing || !keys) return
    const onKey = async (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') return setCapturing(null)
      const combo = fromEvent(e)
      if (!combo) return
      const next = { ...keys, [capturing]: combo }
      setCapturing(null)
      try {
        await invoke('set_hotkeys', { hotkeys: next })
        setKeys(next)
        toast(CLASHES[combo] ? `Saved — heads up, ${combo} is normally “${CLASHES[combo]}”` : `${LABELS[capturing]}: ${combo}`)
      } catch (err) {
        toast(String(err))
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [capturing, keys])

  if (!isDesktop()) return null
  if (!keys) return <p className="font-body text-[var(--ink-muted)]">Loading hotkeys…</p>

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-[15px] text-[var(--ink-muted)]">These work anywhere on the laptop — even when GHARANA is minimised. A small ALFRED bar pops up bottom-centre.</p>
      {(Object.keys(LABELS) as (keyof Hotkeys)[]).map((k) => (
        <Field key={k} label={LABELS[k]}>
          <button className={`deco-btn ghost w-full ${capturing === k ? 'pulse' : ''}`} onClick={() => setCapturing(k)}>
            {capturing === k ? 'Press the keys you want… (Esc to cancel)' : keys[k]}
          </button>
          {CLASHES[keys[k]] && <p className="font-body text-[13px] text-[var(--accent)] mt-1">Clashes with “{CLASHES[keys[k]]}”.</p>}
        </Field>
      ))}
      <button
        className="deco-btn ghost"
        onClick={async () => {
          const d = { talk: 'Ctrl+Shift+Space', converse: 'Ctrl+Shift+A', type_to: 'Ctrl+Shift+T' }
          try {
            await invoke('set_hotkeys', { hotkeys: d })
            setKeys(d)
            toast('Hotkeys reset')
          } catch (err) {
            toast(String(err))
          }
        }}
      >
        Reset to defaults
      </button>
      <p className="font-body text-[13px] text-[var(--ink-muted)]">
        Windows doesn’t allow a single modifier key (like Right Alt on its own) as a system-wide hotkey, so the global one needs a combination. Inside the app window, holding Right Alt still works. Launch on startup is in the tray menu.
      </p>
    </div>
  )
}
