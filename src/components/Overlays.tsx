import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useUI } from '../store/ui'
import { useSettings } from '../store/settings'
import { Icon } from './Icon'

/** Toast stack with Undo buttons. */
export function Toasts() {
  const toasts = useUI((s) => s.toasts)
  const dismiss = useUI((s) => s.dismiss)
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} className="toast" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, y: 10 }}>
            <span className="font-body text-[15px]">{t.message}</span>
            {t.undo && (
              <button
                className="toast-undo"
                onClick={async () => {
                  dismiss(t.id)
                  await t.undo?.()
                }}
              >
                <Icon name="undo" size={16} /> Undo
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/** Gold confetti burst — fires whenever ui.celebrate() is called. */
export function Confetti() {
  const at = useUI((s) => s.confettiAt)
  const reduced = useSettings((s) => s.reducedMotion)
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!at || reduced) return
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = innerWidth * dpr
    cv.height = innerHeight * dpr
    ctx.scale(dpr, dpr)
    const golds = ['#d4af37', '#f6dc8a', '#b8892a', '#fff1c2', '#e6c98a']
    const parts = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 80,
      y: innerHeight * 0.38,
      vx: (Math.random() - 0.5) * 13,
      vy: -Math.random() * 13 - 4,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      w: 5 + Math.random() * 6,
      c: golds[Math.floor(Math.random() * golds.length)],
    }))
    let raf = 0
    const start = performance.now()
    const step = (t: number) => {
      ctx.clearRect(0, 0, innerWidth, innerHeight)
      for (const p of parts) {
        p.vy += 0.32
        p.vx *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.r += p.vr
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.r)
        ctx.fillStyle = p.c
        ctx.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2)
        ctx.restore()
      }
      if (t - start < 2600) raf = requestAnimationFrame(step)
      else ctx.clearRect(0, 0, innerWidth, innerHeight)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [at, reduced])
  return <canvas ref={ref} className="confetti" aria-hidden="true" />
}

/** Marquee splash on open — tap to skip. Shown once per app launch. */
export function Splash() {
  const enabled = useSettings((s) => s.splash)
  const loaded = useSettings((s) => s.loaded)
  const [show, setShow] = useState(() => {
    try {
      return !sessionStorage.getItem('gh-splash')
    } catch {
      return true
    }
  })
  useEffect(() => {
    if (!show) return
    try {
      sessionStorage.setItem('gh-splash', '1')
    } catch {
      /* ignore */
    }
    const t = setTimeout(() => setShow(false), 1700)
    return () => clearTimeout(t)
  }, [show])
  const visible = show && (!loaded || enabled)
  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="splash" onClick={() => setShow(false)} initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5 } }}>
          <div className="marquee">
            <div className="bulbs top" />
            <motion.h1 className="font-display" initial={{ letterSpacing: '0.6em', opacity: 0 }} animate={{ letterSpacing: '0.14em', opacity: 1 }} transition={{ duration: 0.9, ease: 'easeOut' }}>
              GHARANA
            </motion.h1>
            <motion.p className="font-deco" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              THE HOUSE BUILDS THE NAME
            </motion.p>
            <div className="bulbs bottom" />
          </div>
          <span className="font-deco text-[10px] tracking-[0.4em] text-[var(--ink-muted)] absolute bottom-10">TAP TO ENTER</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
