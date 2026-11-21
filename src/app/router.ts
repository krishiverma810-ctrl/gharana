import { useSyncExternalStore } from 'react'

// Tiny router: the URL path is the room ("/vault", "/rites"…). No library needed.
// Vercel rewrites every path to index.html, so deep links and refreshes work.

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())
window.addEventListener('popstate', notify)

export function navigate(path: string) {
  if (path === location.pathname) return
  history.pushState(null, '', path)
  notify()
  window.scrollTo({ top: 0 })
}

export function usePath(): string {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => location.pathname,
  )
}
