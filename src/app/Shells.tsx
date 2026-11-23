import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { CORRIDOR, ROOMS, WINGS, roomById, isOpen } from '../config/rooms'
import { useSettings } from '../store/settings'
import { useUI } from '../store/ui'
import { useFocus } from '../store/focus'
import { navigate, usePath } from './router'
import { useHouse } from './house'
import { addWater } from '../db/db'
import { toast } from '../store/ui'
import { formatTime } from '../lib/time'
import { LOCATIONS } from '../config/lockin'
import { Sheet } from '../components/ui'

// Two bodies, one house: the Pocket Estate (phone) and the Command Centre (desktop).

function useRoomName() {
  const names = useSettings((s) => s.roomNames)
  return (id: string) => names[id] || roomById(id)?.name || id
}

/** Small running-timer pill visible from every room. */
function FocusPill() {
  const f = useFocus()
  const [, force] = useState(0)
  useEffect(() => {
    if (f.status !== 'running') return
    const t = setInterval(() => force((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [f.status])
  if (f.status === 'idle') return null
  const ms = f.status === 'paused' ? f.remainingMs : Math.max(0, f.endsAt - Date.now())
  const mm = Math.floor(ms / 60000)
  const ss = Math.floor((ms % 60000) / 1000)
  return (
    <button className="focus-pill font-num" onClick={() => f.setFullscreen(true)}>
      <Icon name="timer" size={15} /> {f.phase === 'break' ? 'BREAK ' : ''}
      {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
    </button>
  )
}

// ── PHONE ─────────────────────────────────────────────────────────────

export function PhoneShell({ children }: { children: ReactNode }) {
  const path = usePath()
  const pinned = useSettings((s) => s.pinnedRooms)
  const setPalette = useUI((s) => s.setPaletteOpen)
  const house = useHouse()
  const name = useRoomName()
  const pinnedRooms = pinned.map((id) => roomById(id)).filter(Boolean) as typeof ROOMS

  // Gestures: swipe left/right between pinned rooms, pull down at the top for search.
  const touch = useRef<{ x: number; y: number; t: number; ok: boolean } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    const el = e.target as HTMLElement
    const ok = !el.closest('input, textarea, select, [data-noswipe], .sheet')
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), ok }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current
    touch.current = null
    if (!s?.ok || Date.now() - s.t > 600) return
    const dx = e.changedTouches[0].clientX - s.x
    const dy = e.changedTouches[0].clientY - s.y
    if (dy > 110 && Math.abs(dx) < 50 && window.scrollY <= 0 && s.y < 260) {
      setPalette(true)
      return
    }
    if (Math.abs(dx) > 80 && Math.abs(dy) < 50) {
      const idx = pinnedRooms.findIndex((r) => r.path === path)
      if (idx < 0) return
      const next = pinnedRooms[(idx + (dx < 0 ? 1 : -1) + pinnedRooms.length) % pinnedRooms.length]
      navigate(next.path)
    }
  }

  const left = pinnedRooms.slice(0, 2)
  const right = pinnedRooms.slice(2, 5)

  const Tab = ({ r }: { r: (typeof ROOMS)[number] }) => (
    <button className={`tab ${path === r.path ? 'on' : ''}`} style={{ ['--room' as string]: r.accent }} onClick={() => navigate(r.path)} aria-label={name(r.id)}>
      <Icon name={r.icon} size={23} />
      <span>{shortName(name(r.id))}</span>
    </button>
  )

  return (
    <div className="phone-shell" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="phone-top">
        <span className="font-display text-[18px] tracking-[0.14em] text-[var(--accent)]">GHARANA</span>
        <div className="flex items-center gap-2">
          <FocusPill />
          {house.away && <span className="loc-chip font-num">{LOCATIONS[house.location].short} {formatTime(house.now, house.timeZone)}</span>}
          <button className="icon-btn" onClick={() => setPalette(true)} aria-label="Search">
            <Icon name="search" size={21} />
          </button>
        </div>
      </div>
      <main className="phone-main">{children}</main>
      <nav className="tabbar" aria-label="Rooms">
        {left.map((r) => (
          <Tab key={r.id} r={r} />
        ))}
        <button className={`tab corridor ${path === CORRIDOR.path ? 'on' : ''}`} onClick={() => navigate(CORRIDOR.path)} aria-label="The Corridor">
          <span className="corridor-arch">
            <Icon name="corridor" size={24} />
          </span>
        </button>
        {right.map((r) => (
          <Tab key={r.id} r={r} />
        ))}
      </nav>
    </div>
  )
}

function shortName(n: string) {
  return n.replace(/^THE /, '').split(' ')[0]
}

// ── DESKTOP ───────────────────────────────────────────────────────────

export function DesktopShell({ children }: { children: ReactNode }) {
  const path = usePath()
  const hidden = useSettings((s) => s.hiddenRooms)
  const pinned = useSettings((s) => s.pinnedRooms)
  const setPalette = useUI((s) => s.setPaletteOpen)
  const house = useHouse()
  const name = useRoomName()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [help, setHelp] = useState(false)
  const startFocus = useFocus((s) => s.start)
  const presets = useSettings((s) => s.focusPresets)

  // Keyboard-first: Ctrl/Cmd+K, /, 1–9, W, F, N, ?
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as Element | null)?.closest?.('input, textarea, select, [contenteditable]')
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette(true)
        return
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === '/' || e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setPalette(true)
      } else if (e.key === '?') setHelp(true)
      else if (e.key.toLowerCase() === 'w') {
        void addWater(house.today, 250).then(() => toast('+250 ml water', () => addWater(house.today, -250)))
      } else if (e.key.toLowerCase() === 'f') {
        startFocus(presets[0] ?? 25)
        navigate('/blueprint')
      } else if (/^[1-9]$/.test(e.key)) {
        const id = pinned[Number(e.key) - 1]
        const r = id && roomById(id)
        if (r) navigate(r.path)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [house.today, pinned, presets, setPalette, startFocus])

  return (
    <div className="desk-shell">
      <aside className="sidebar">
        <button className="block text-left mb-5 px-3" onClick={() => navigate('/')}>
          <div className="font-display text-[28px] tracking-[0.12em] text-[var(--accent)]">GHARANA</div>
          <div className="font-deco text-[9px] tracking-[0.4em] text-[var(--ink-muted)]">THE HOUSE BUILDS THE NAME</div>
        </button>
        <button className="side-search" onClick={() => setPalette(true)}>
          <Icon name="search" size={16} /> <span className="flex-1 text-left">Search or do…</span>
          <kbd>Ctrl K</kbd>
        </button>
        <nav className="mt-3 flex-1 overflow-y-auto pr-1">
          {WINGS.map((w) => {
            const rooms = ROOMS.filter((r) => r.wing === w.id && !hidden.includes(r.id))
            if (!rooms.length) return null
            return (
              <div key={w.id} className="mb-2">
                <button className="wing-head" onClick={() => setCollapsed((c) => ({ ...c, [w.id]: !c[w.id] }))}>
                  <span>
                    {w.numeral} · {w.name}
                  </span>
                  <Icon name="chevron" size={12} className={collapsed[w.id] ? '' : 'rotate-90'} />
                </button>
                {!collapsed[w.id] &&
                  rooms.map((r) => (
                    <button
                      key={r.id}
                      className={`side-room ${path === r.path ? 'on' : ''} ${!isOpen(r) ? 'locked' : ''}`}
                      style={{ ['--room' as string]: r.accent }}
                      onClick={() => navigate(r.path)}
                    >
                      <Icon name={r.icon} size={17} />
                      <span className="flex-1 truncate">{name(r.id)}</span>
                      {!isOpen(r) && <span className="phase-tag">P{r.phase}</span>}
                    </button>
                  ))}
              </div>
            )
          })}
        </nav>
        <div className="pt-3 px-3 flex items-center justify-between text-[var(--ink-muted)]">
          <span className="font-num text-[12px]">
            {LOCATIONS[house.location].short} · {formatTime(house.now, house.timeZone)}
          </span>
          <button className="font-deco text-[11px] tracking-[0.2em] hover:text-[var(--accent)]" onClick={() => setHelp(true)}>
            ? KEYS
          </button>
        </div>
      </aside>
      <main className="desk-main">
        <div className="absolute right-6 top-5 z-20">
          <FocusPill />
        </div>
        {children}
      </main>
      <Sheet open={help} onClose={() => setHelp(false)} title="THE SHORTCUTS">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 font-body text-[17px]">
          {[
            ['Ctrl/⌘ K', 'Command palette — go anywhere, do anything'],
            ['/  or  N', 'Search / quick capture'],
            ['1 – 9', 'Jump to pinned rooms'],
            ['W', 'Log 250 ml water'],
            ['F', 'Start a focus timer'],
            ['?', 'This cheat sheet'],
            ['Esc', 'Close any panel'],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt>
                <kbd>{k}</kbd>
              </dt>
              <dd className="text-[var(--ink-muted)]">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[13px] text-[var(--ink-muted)] font-body italic">Rebinding keys + the ALFRED hold-to-talk hotkey arrive with the voice layer (Phase 2.5).</p>
      </Sheet>
    </div>
  )
}
