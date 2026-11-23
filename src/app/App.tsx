import { Suspense, lazy, useEffect, useState, type ComponentType } from 'react'
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
import { ComingSoon, Corridor } from '../rooms/Corridor'
import { Alfred } from '../rooms/Alfred'
import { LockGate } from './Lock'
import { useTrophies } from '../store/trophies'
import { LevelUp } from '../components/LevelUp'
import { loadCloudConfig } from '../lib/cloud'
import { startAutoSync } from '../lib/sync'
import { syncPushSettings } from '../lib/push'
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

// Rooms beyond the daily core load on first open (they're all precached, so this still works offline).
const SettingsRoom = lazy(() => import('../rooms/Settings').then((m) => ({ default: m.SettingsRoom })))
const Concierge = lazy(() => import('../rooms/Concierge').then((m) => ({ default: m.Concierge })))
const CalendarRoom = lazy(() => import('../rooms/Calendar').then((m) => ({ default: m.CalendarRoom })))
const Wildcard = lazy(() => import('../rooms/Wildcard').then((m) => ({ default: m.Wildcard })))
const FamilyRoom = lazy(() => import('../rooms/Mehfil2').then((m) => ({ default: m.FamilyRoom })))
const DeepaliCorner = lazy(() => import('../rooms/Deepali').then((m) => ({ default: m.DeepaliCorner })))
const AppLab = lazy(() => import('../rooms/Boardroom').then((m) => ({ default: m.AppLab })))
const Closer = lazy(() => import('../rooms/Boardroom').then((m) => ({ default: m.Closer })))
const JobDesk = lazy(() => import('../rooms/Boardroom').then((m) => ({ default: m.JobDesk })))
const KSStudio = lazy(() => import('../rooms/Boardroom').then((m) => ({ default: m.KSStudio })))
const MpaDesk = lazy(() => import('../rooms/Boardroom').then((m) => ({ default: m.MpaDesk })))
const NazaraHQ = lazy(() => import('../rooms/Boardroom').then((m) => ({ default: m.NazaraHQ })))
const DentalWing = lazy(() => import('../rooms/Library').then((m) => ({ default: m.DentalWing })))
const ReadingRoom = lazy(() => import('../rooms/Library').then((m) => ({ default: m.ReadingRoom })))
const SkillsForge = lazy(() => import('../rooms/Library').then((m) => ({ default: m.SkillsForge })))
const Study = lazy(() => import('../rooms/Library').then((m) => ({ default: m.Study })))
const BulkLedger = lazy(() => import('../rooms/FullHouse').then((m) => ({ default: m.BulkLedger })))
const ChallengeBoard = lazy(() => import('../rooms/FullHouse').then((m) => ({ default: m.ChallengeBoard })))
const GroomingRoom = lazy(() => import('../rooms/FullHouse').then((m) => ({ default: m.GroomingRoom })))
const Inbox = lazy(() => import('../rooms/FullHouse').then((m) => ({ default: m.Inbox })))
const Jukebox = lazy(() => import('../rooms/FullHouse').then((m) => ({ default: m.Jukebox })))
const Mehfil = lazy(() => import('../rooms/FullHouse').then((m) => ({ default: m.Mehfil })))
const MentorStudy = lazy(() => import('../rooms/FullHouse').then((m) => ({ default: m.MentorStudy })))
const TrophyHall = lazy(() => import('../rooms/FullHouse').then((m) => ({ default: m.TrophyHall })))
const Archive = lazy(() => import('../rooms/Archive').then((m) => ({ default: m.Archive })))

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
  closer: Closer,
  nazara: NazaraHQ,
  ksvol1: KSStudio,
  applab: AppLab,
  jobs: JobDesk,
  mpa: MpaDesk,
  study: Study,
  dental: DentalWing,
  reading: ReadingRoom,
  forge: SkillsForge,
  mehfil: Mehfil,
  mentor: MentorStudy,
  trophy: TrophyHall,
  challenges: ChallengeBoard,
  jukebox: Jukebox,
  grooming: GroomingRoom,
  bulk: BulkLedger,
  inbox: Inbox,
  archive: Archive,
}

function RoomLoading() {
  return <div className="room-loading" aria-label="Loading room"><span /></div>
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
          <LockGate>
            <Estate />
          </LockGate>
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

  // Cloud: load config, then keep syncing in the background (does nothing until you sign in).
  useEffect(() => {
    let stop = () => {}
    void loadCloudConfig().then(() => {
      stop = startAutoSync()
    })
    return () => stop()
  }, [])

  // Reminders follow you: when Travel Mode changes the time zone, tell the push server.
  useEffect(() => {
    void syncPushSettings()
  }, [house.timeZone])

  // XP, levels + achievements: refresh on open, every few minutes, and when you come back to the app.
  useEffect(() => {
    const r = () => document.visibilityState === 'visible' && void useTrophies.getState().refresh()
    void useTrophies.getState().refresh()
    const t = setInterval(r, 180_000)
    document.addEventListener('visibilitychange', r)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', r)
    }
  }, [])

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
            <Suspense fallback={<RoomLoading />}>{content}</Suspense>
          </motion.div>
        </AnimatePresence>
      </Shell>
      <CommandPalette />
      {shell === 'phone' && <Orb />}
      <Captions />
      <LevelUp />
      <FocusFullscreen />
      <Toasts />
      <Confetti />
    </div>
  )
}
