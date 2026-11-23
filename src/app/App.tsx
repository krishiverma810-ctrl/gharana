import { useEffect, useState, type ComponentType } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Skyline } from '../components/Skyline'
import { Confetti, Splash, Toasts } from '../components/Overlays'
import { HouseProvider, useHouse } from './house'
import { usePath } from './router'
import { DesktopShell, PhoneShell } from './Shells'
import { CommandPalette } from './CommandPalette'
import { useSettings } from '../store/settings'
import { useFocus } from '../store/focus'
import { ensureSeeded } from '../db/seed'
import { autoBackupIfDue } from '../db/backup'
import { roomByPath } from '../config/rooms'
import { primeAudio } from '../lib/sound'
import { Lounge } from '../rooms/Lounge'
import { DailyRites } from '../rooms/DailyRites'
import { MorningRite } from '../rooms/MorningRite'
import { NightDebrief } from '../rooms/NightDebrief'
import { Blueprint, FocusFullscreen } from '../rooms/Blueprint'
import { Patrol } from '../rooms/Patrol'
import { Vault } from '../rooms/Vault'
import { SettingsRoom } from '../rooms/Settings'
import { ComingSoon, Corridor } from '../rooms/Corridor'
import { Concierge } from '../rooms/Concierge'
import { CalendarRoom } from '../rooms/Calendar'
import { Wildcard } from '../rooms/Wildcard'
import { Alfred } from '../rooms/Alfred'
import { DeepaliCorner, FamilyRoom } from '../rooms/Mehfil2'
import { Captions, Orb, useVoiceHotkeys } from '../components/VoiceUI'
import { useReminders } from '../store/reminders'
import { startWakeIfEnabled, stopWakeWord, useVoice } from '../store/voice'
import { pullSiriQueue, pushSnapshotForSiri } from '../lib/alfred'
import { speak } from '../lib/voice'
import { Overlay } from './Overlay'
import { invoke, isDesktop, onDesktop } from '../lib/desktop'
import { navigate } from './router'
import { addWater, db } from '../db/db'
import { toast } from '../store/ui'

const ROOM_COMPONENTS: Record<string, ComponentType> = {
  lounge: Lounge,
  rites: DailyRites,
  morning: MorningRite,
  night: NightDebrief,
  blueprint: Blueprint,
  patrol: Patrol,
  vault: Vault,
  settings: SettingsRoom,
  concierge: Concierge,
  calendar: CalendarRoom,
  wildcard: Wildcard,
  alfred: Alfred,
  family: FamilyRoom,
  deepali: DeepaliCorner,
}

type Shell = 'phone' | 'desktop'

function useShell(): Shell {
  const layout = useSettings((s) => s.layout)
  const detect = (): Shell => {
    if (layout === 'phone') return 'phone'
    if (layout === 'desktop' || layout === 'tablet') return 'desktop'
    return window.innerWidth >= 900 ? 'desktop' : 'phone'
  }
  const [shell, setShell] = useState<Shell>(detect)
  useEffect(() => {
    const on = () => setShell(detect())
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout])
  return shell
}

export function App() {
  const loaded = useSettings((s) => s.loaded)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void (async () => {
      await useSettings.getState().load()
      await ensureSeeded()
      setReady(true)
      void autoBackupIfDue()
    })()
    const prime = () => primeAudio()
    window.addEventListener('pointerdown', prime, { once: true })
  }, [])

  // The Windows app's always-on-top ALFRED bar.
  if (location.pathname === '/overlay') return loaded && ready ? <Overlay /> : null

  return (
    <>
      <Splash />
      {loaded && ready && (
        <HouseProvider>
          <Estate />
        </HouseProvider>
      )}
    </>
  )
}

function Estate() {
  const house = useHouse()
  const path = usePath()
  const shell = useShell()
  const reduced = useSettings((s) => s.reducedMotion)
  const battery = useSettings((s) => s.batterySaver)
  const lowGlare = useSettings((s) => s.lowGlare)
  const checkFocus = useFocus((s) => s.check)
  const checkReminders = useReminders((s) => s.check)
  const wakeWord = useSettings((s) => s.wakeWord)
  useVoiceHotkeys()

  // Reminders: chime + notification, and ALFRED reads it out.
  useEffect(() => {
    const t = setInterval(() => checkReminders((r) => void speak(`Sir — ${r.label}.`)), 1000)
    return () => clearInterval(t)
  }, [checkReminders])

  // Siri bridge: apply anything Siri queued, and share today's snapshot so Siri knows the day.
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState !== 'visible') return
      void pullSiriQueue()
      void pushSnapshotForSiri()
    }
    sync()
    const t = setInterval(sync, 120_000)
    document.addEventListener('visibilitychange', sync)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  // Windows app: tray actions, "open this room" requests, and a live tray tooltip.
  useEffect(() => {
    if (!isDesktop()) return
    const offA = onDesktop<string>('tray:action', (a) => {
      if (a === 'water') void addWater(house.today, 250).then(() => toast('+250 ml water (from the tray)'))
      if (a === 'focus') {
        useFocus.getState().start(25)
        navigate('/blueprint')
      }
    })
    const offN = onDesktop<string>('navigate', (p) => navigate(p))
    const push = async () => {
      const d = await db.days.get(house.today)
      const s = useSettings.getState()
      void invoke('set_tray_summary', { text: `Water ${((d?.waterMl ?? 0) / 1000).toFixed(1)}/${s.waterTargetMl / 1000} L · Protein ${d?.proteinG ?? 0}/${s.proteinTargetG} g` })
    }
    void push()
    const t = setInterval(push, 60_000)
    return () => {
      offA()
      offN()
      clearInterval(t)
    }
  }, [house.today])

  // In-app wake word (experimental).
  useEffect(() => {
    if (wakeWord) startWakeIfEnabled()
    else stopWakeWord()
    const vis = () => (document.visibilityState === 'visible' ? startWakeIfEnabled() : (stopWakeWord(), useVoice.getState().stopAll()))
    document.addEventListener('visibilitychange', vis)
    return () => document.removeEventListener('visibilitychange', vis)
  }, [wakeWord])

  // Focus timer engine — checks once a second whether a session finished.
  useEffect(() => {
    const t = setInterval(() => checkFocus(house.today), 1000)
    return () => clearInterval(t)
  }, [checkFocus, house.today])

  useEffect(() => {
    document.documentElement.classList.toggle('low-glare', lowGlare)
    document.documentElement.classList.toggle('reduce-motion', reduced)
  }, [lowGlare, reduced])

  const room = path === '/corridor' ? null : roomByPath(path)
  const Comp = room ? ROOM_COMPONENTS[room.id] : undefined
  const content = path === '/corridor' ? <Corridor /> : Comp ? <Comp /> : room ? <ComingSoon id={room.id} /> : <Lounge />
  const Shell = shell === 'phone' ? PhoneShell : DesktopShell

  return (
    <div className="relative min-h-dvh" style={room ? { ['--room' as string]: room.accent } : undefined}>
      <Skyline palette={house.palette} tod={house.tod} still={reduced || battery} layers={shell === "phone" ? 2 : 3} skin={house.skin} />
      <div className="skyline-veil" />
      <Shell>
        <AnimatePresence mode="wait">
          <motion.div
            key={path}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </Shell>
      <CommandPalette />
      {shell === 'phone' && <Orb />}
      <Captions />
      <FocusFullscreen />
      <Toasts />
      <Confetti />
    </div>
  )
}
