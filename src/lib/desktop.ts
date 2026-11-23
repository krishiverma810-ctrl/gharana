// Bridge to the Windows desktop app (Tauri). Everything here is a no-op on phones / browsers.

interface TauriGlobal {
  core: { invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T> }
  event: { listen: <T = unknown>(event: string, cb: (e: { payload: T }) => void) => Promise<() => void> }
}

const tauri = (): TauriGlobal | undefined => (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__

export const isDesktop = () => !!tauri()

export async function invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T | undefined> {
  const t = tauri()
  if (!t) return undefined
  return t.core.invoke<T>(cmd, args)
}

/** Listen to an event from the desktop shell. Returns an unsubscribe function. */
export function onDesktop<T = unknown>(event: string, cb: (payload: T) => void): () => void {
  const t = tauri()
  if (!t) return () => {}
  let off: (() => void) | null = null
  let cancelled = false
  void t.event.listen<T>(event, (e) => cb(e.payload)).then((u) => {
    if (cancelled) u()
    else off = u
  })
  return () => {
    cancelled = true
    off?.()
  }
}

export interface Hotkeys {
  talk: string
  converse: string
  type_to: string
}

/** Common Windows shortcuts it's best not to steal. */
export const CLASHES: Record<string, string> = {
  'Ctrl+C': 'Copy', 'Ctrl+V': 'Paste', 'Ctrl+X': 'Cut', 'Ctrl+Z': 'Undo', 'Ctrl+S': 'Save', 'Ctrl+A': 'Select all',
  'Ctrl+Shift+Esc': 'Task Manager', 'Alt+Tab': 'Switch apps', 'Alt+F4': 'Close window', 'Ctrl+Alt+Delete': 'Security screen',
  'Ctrl+Shift+N': 'New folder / incognito', 'Ctrl+Shift+T': 'Reopen closed tab (browsers)', 'Ctrl+Shift+S': 'Save as',
  'Ctrl+W': 'Close tab', 'Ctrl+T': 'New tab', 'Ctrl+Space': 'Input language (some setups)', 'Alt+Space': 'Window menu / PowerToys Run',
}
