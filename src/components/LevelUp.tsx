import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useTrophies } from '../store/trophies'
import { titleFor } from '../lib/stats'
import { celebrate } from '../store/ui'
import { win } from '../lib/sound'

/** Full-screen LEVEL UP moment. */
export function LevelUp() {
  const level = useTrophies((t) => t.levelUp)
  const dismiss = useTrophies((t) => t.dismissLevelUp)
  useEffect(() => {
    if (!level) return
    win()
    celebrate()
    const t = setTimeout(dismiss, 4500)
    return () => clearTimeout(t)
  }, [level, dismiss])
  return (
    <AnimatePresence>
      {level && (
        <motion.button className="levelup" onClick={dismiss} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div initial={{ scale: 0.4, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} className="text-center">
            <div className="font-deco text-[14px] tracking-[0.5em] text-[var(--ink)]">LEVEL UP</div>
            <div className="level-badge big mx-auto mt-4"><span className="font-num">{level}</span></div>
            <div className="font-display text-[34px] text-[var(--accent)] mt-4">{titleFor(level).toUpperCase()}</div>
            <div className="font-body italic text-[17px] text-[var(--ink-muted)] mt-2">The house rises with you.</div>
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
