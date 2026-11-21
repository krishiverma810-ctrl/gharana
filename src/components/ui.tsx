import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import { Icon } from './Icon'
import { roomById } from '../config/rooms'
import { useSettings } from '../store/settings'

// Shared building blocks used by every room (phone + desktop).

export function RoomHeader({ id, subtitle, right }: { id: string; subtitle?: ReactNode; right?: ReactNode }) {
  const room = roomById(id)
  const custom = useSettings((s) => s.roomNames[id])
  if (!room) return null
  return (
    <header className="room-header" style={{ ['--room' as string]: room.accent }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="room-badge">
            <Icon name={room.icon} size={22} />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-[26px] leading-tight text-[var(--room)] truncate">{custom || room.name}</h1>
            {subtitle && <div className="font-body text-[15px] text-[var(--ink-muted)] truncate">{subtitle}</div>}
          </div>
        </div>
        {right}
      </div>
      <div className="room-rule" />
    </header>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className="sheet"
            role="dialog"
            aria-label={title}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-deco text-sm tracking-[0.3em] text-[var(--accent)]">{title}</h2>
              <button className="icon-btn" onClick={onClose} aria-label="Close">
                <Icon name="close" size={20} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" className="toggle-row" onClick={() => onChange(!on)} aria-pressed={on}>
      <span className="text-left">
        <span className="block font-body text-[17px] text-[var(--ink)]">{label}</span>
        {hint && <span className="block font-body text-[13px] text-[var(--ink-muted)]">{hint}</span>}
      </span>
      <span className={`toggle ${on ? 'on' : ''}`}>
        <span />
      </span>
    </button>
  )
}

export function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 9999, suffix }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} aria-label="Less">−</button>
      <span className="font-num">
        {value}
        {suffix && <small> {suffix}</small>}
      </span>
      <button type="button" onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))} aria-label="More">+</button>
    </div>
  )
}

export function Ring({ pct, size = 84, stroke = 7, color = 'var(--accent)', children }: { pct: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, pct))
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c * (1 - p)} strokeLinecap="butt" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

export function Dots({ value, max = 5, onChange }: { value: number; max?: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-2" role="radiogroup">
      {Array.from({ length: max }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`${i + 1}`}
          className={`dot ${i < value ? 'on' : ''}`}
          onClick={() => onChange?.(i + 1)}
          disabled={!onChange}
        />
      ))}
    </div>
  )
}

export function Scale10({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  return (
    <div className="grid grid-cols-10 gap-1">
      {Array.from({ length: 10 }, (_, i) => (
        <button key={i} type="button" className={`scale-cell font-num ${value === i + 1 ? 'on' : ''}`} onClick={() => onChange(i + 1)}>
          {i + 1}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-center font-body italic text-[var(--ink-muted)] py-3">{children}</p>
}

export function Stamp({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          className="stamp"
          initial={{ scale: 2.2, opacity: 0, rotate: -18 }}
          animate={{ scale: 1, opacity: 1, rotate: -8 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', damping: 14, stiffness: 400 }}
        >
          ✓
        </motion.span>
      )}
    </AnimatePresence>
  )
}
