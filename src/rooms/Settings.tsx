import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DecoCard } from '../components/DecoCard'
import { Field, RoomHeader, Segmented, Sheet, Stepper, Toggle } from '../components/ui'
import { Icon } from '../components/Icon'
import { db, MIGRATIONS } from '../db/db'
import { downloadCSV, downloadJSON, restore, saveBackup, snapshot, wipeEverything, type ExportFile } from '../db/backup'
import { useHouse } from '../app/house'
import { useSettings, type LayoutMode } from '../store/settings'
import { toast } from '../store/ui'
import { PALETTES } from '../theme/palettes'
import { ROOMS } from '../config/rooms'
import { LOCATIONS, type LocationId, type LockInPhase } from '../config/lockin'

// SETTINGS — the Engine Room controls.

function PhaseEditor() {
  const phases = useSettings((s) => s.phases)
  const update = useSettings((s) => s.update)
  const set = (i: number, p: Partial<LockInPhase>) => update({ phases: phases.map((x, j) => (j === i ? { ...x, ...p } : x)) })
  const NUM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
  return (
    <div className="flex flex-col gap-4">
      {phases.map((p, i) => (
        <div key={p.id} className="phase-edit">
          <div className="flex items-center gap-2">
            <span className="font-deco text-[13px] text-[var(--accent)] w-8">{p.numeral}</span>
            <input className="deco-input flex-1" value={p.name} onChange={(e) => set(i, { name: e.target.value })} />
            <button
              className="icon-btn"
              aria-label="Remove phase"
              disabled={phases.length <= 1}
              onClick={() => {
                const before = phases
                update({ phases: phases.filter((_, j) => j !== i).map((x, j) => ({ ...x, numeral: NUM[j] ?? `${j + 1}` })) })
                toast(`Removed ${p.name}`, () => update({ phases: before }))
              }}
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <input type="date" className="deco-input font-num" value={p.start} onChange={(e) => set(i, { start: e.target.value })} />
            <input type="date" className="deco-input font-num" value={p.end} onChange={(e) => set(i, { end: e.target.value })} />
          </div>
          <div className="mt-2 flex gap-2 flex-wrap">
            {(Object.keys(LOCATIONS) as LocationId[]).map((l) => (
              <button key={l} className={`chip ${p.location === l ? 'on' : ''}`} onClick={() => set(i, { location: l })}>{LOCATIONS[l].name}</button>
            ))}
            <Segmented value={p.mode} onChange={(mode) => set(i, { mode })} options={[{ value: 'full', label: 'Full' }, { value: 'travel', label: 'Travel' }, { value: 'reset', label: 'Reset' }]} />
          </div>
        </div>
      ))}
      <button
        className="deco-btn ghost"
        onClick={() => {
          const last = phases[phases.length - 1]
          update({ phases: [...phases, { id: `p${Date.now()}`, numeral: NUM[phases.length] ?? `${phases.length + 1}`, name: 'New Phase', start: last.end, end: last.end, location: 'melbourne', mode: 'full' }] })
        }}
      >
        Add phase
      </button>
      <p className="text-[13px] font-body text-[var(--ink-muted)]">Coming back from India early? Just change Phase IV’s end date — everything follows.</p>
    </div>
  )
}

function RoomManager() {
  const s = useSettings()
  const built = ROOMS.filter((r) => r.phase === 1)
  return (
    <div className="flex flex-col gap-5">
      <Field label="PINNED TO THE BOTTOM BAR (PICK 5, IN ORDER)">
        <div className="flex flex-wrap gap-2">
          {built.map((r) => {
            const idx = s.pinnedRooms.indexOf(r.id)
            return (
              <button
                key={r.id}
                className={`chip ${idx >= 0 ? 'on' : ''}`}
                onClick={() => {
                  if (idx >= 0) s.update({ pinnedRooms: s.pinnedRooms.filter((x) => x !== r.id) })
                  else if (s.pinnedRooms.length < 5) s.update({ pinnedRooms: [...s.pinnedRooms, r.id] })
                  else toast('Five max — unpin one first')
                }}
              >
                {idx >= 0 && <span className="font-num mr-1">{idx + 1}</span>}
                {s.roomNames[r.id] || r.name}
              </button>
            )
          })}
        </div>
      </Field>
      <Field label="RENAME + HIDE ROOMS">
        <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
          {ROOMS.filter((r) => r.id !== 'settings').map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <input
                className="deco-input flex-1"
                defaultValue={s.roomNames[r.id] ?? ''}
                placeholder={r.name}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  const names = { ...s.roomNames }
                  if (v) names[r.id] = v.toUpperCase()
                  else delete names[r.id]
                  s.update({ roomNames: names })
                }}
              />
              <button
                className={`chip ${s.hiddenRooms.includes(r.id) ? '' : 'on'}`}
                onClick={() => s.update({ hiddenRooms: s.hiddenRooms.includes(r.id) ? s.hiddenRooms.filter((x) => x !== r.id) : [...s.hiddenRooms, r.id] })}
              >
                {s.hiddenRooms.includes(r.id) ? 'Hidden' : 'Shown'}
              </button>
            </li>
          ))}
        </ul>
      </Field>
    </div>
  )
}

function DataRoom() {
  const s = useSettings()
  const backups = useLiveQuery(() => db.backups.orderBy('at').reverse().toArray(), []) ?? []
  const file = useRef<HTMLInputElement>(null)
  const [wipe, setWipe] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [csvTable, setCsvTable] = useState('habitLogs')
  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null))
  }, [])

  const doExport = async () => {
    downloadJSON(await snapshot())
    s.update({ lastExportAt: Date.now() })
    toast('Backup file saved — keep it in iCloud Drive or Files')
  }

  const doImport = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as ExportFile
      await restore(data)
      toast('Restored. Reloading the house…')
      setTimeout(() => location.reload(), 900)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not read that file')
    }
  }

  const daysSince = s.lastExportAt ? Math.floor((Date.now() - s.lastExportAt) / 86400000) : null

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-[15px] text-[var(--ink-muted)]">
        Everything lives on this device and saves instantly. Last export: <span className="text-[var(--ink)]">{daysSince === null ? 'never' : daysSince === 0 ? 'today' : `${daysSince} days ago`}</span>
        {(daysSince === null || daysSince > 7) && <span className="text-[var(--accent)]"> — export one before you fly.</span>}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button className="deco-btn" onClick={doExport}>Export JSON</button>
        <button className="deco-btn ghost" onClick={() => file.current?.click()}>Import JSON</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
      </div>
      <div className="flex gap-2">
        <select className="deco-input flex-1" value={csvTable} onChange={(e) => setCsvTable(e.target.value)}>
          {db.tables.filter((t) => !['backups', 'kv'].includes(t.name)).map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
        </select>
        <button className="deco-btn ghost px-4" onClick={() => downloadCSV(csvTable)}>Export CSV</button>
      </div>
      <Field label="ON-DEVICE BACKUPS (LAST 7, AUTOMATIC DAILY)">
        <ul className="flex flex-col gap-1">
          {backups.map((b) => (
            <li key={b.id} className="flex items-center justify-between font-body text-[15px]">
              <span>{new Date(b.at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })} <span className="text-[var(--ink-muted)]">· {b.reason}</span></span>
              <button className="chip" onClick={async () => { await restore(JSON.parse(b.data)); toast('Restored backup. Reloading…'); setTimeout(() => location.reload(), 900) }}>Restore</button>
            </li>
          ))}
        </ul>
        <button className="deco-btn ghost w-full mt-2" onClick={() => saveBackup('manual').then(() => toast('Backup saved on device'))}>Back up now</button>
      </Field>
      <div className="font-body text-[14px] text-[var(--ink-muted)]">
        Storage protected from clean-up: <span className="text-[var(--ink)]">{persisted === null ? 'unknown' : persisted ? 'yes' : 'not yet (install to home screen)'}</span>
        <br />
        Database version {db.verno} ·{' '}
        {MIGRATIONS.map((m) => `v${m.version} ${m.note}`).join(' · ')}
      </div>
      <button className="deco-btn ghost danger" onClick={() => setWipe(true)}>Wipe everything…</button>
      <Sheet open={wipe} onClose={() => setWipe(false)} title="WIPE THE HOUSE">
        <p className="font-body text-[17px]">This deletes every habit, log, workout, entry and setting on this device. A backup is saved first, so you can restore it from this screen.</p>
        <Field label='TYPE "WIPE" TO CONFIRM'>
          <input className="deco-input w-full" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <button
          className="deco-btn danger w-full mt-4"
          disabled={confirm !== 'WIPE'}
          onClick={async () => {
            await wipeEverything()
            location.reload()
          }}
        >
          Wipe
        </button>
      </Sheet>
    </div>
  )
}

export function SettingsRoom() {
  const s = useSettings()
  const house = useHouse()
  const [notif, setNotif] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')

  return (
    <div className="flex flex-col gap-5">
      <RoomHeader id="settings" subtitle="The Engine Room" />
      <div className="bp-layout">
        <div className="flex flex-col gap-5">
          <DecoCard title="TRAVEL MODE">
            <p className="font-body text-[15px] text-[var(--ink-muted)] mb-3">
              Right now: <span className="text-[var(--ink)]">{LOCATIONS[house.location].name}</span> · {house.timeZone} · {house.habitSet} habit set. “Auto” follows the lock-in dates.
            </p>
            <Segmented<'auto' | LocationId>
              value={s.location}
              onChange={(location) => s.update({ location })}
              options={[{ value: 'auto', label: 'Auto' }, { value: 'melbourne', label: 'Melbourne' }, { value: 'goldcoast', label: 'Gold Coast' }, { value: 'india', label: 'India' }]}
            />
            <p className="font-body text-[13px] text-[var(--ink-muted)] mt-3">Switching changes the time zone, day rollover, habit set and Blueprint template. Streaks are protected on flight days.</p>
          </DecoCard>

          <DecoCard title="THE LOCK-IN"><PhaseEditor /></DecoCard>

          <DecoCard title="TARGETS">
            <div className="flex flex-col gap-4">
              <Field label="NAME"><input className="deco-input w-full" defaultValue={s.name} onBlur={(e) => s.update({ name: e.target.value.trim() || 'Krishi' })} /></Field>
              <Field label="WAKE TARGET"><input type="time" className="deco-input w-full font-num" value={s.wakeTarget} onChange={(e) => s.update({ wakeTarget: e.target.value })} /></Field>
              <Field label="WATER PER DAY"><Stepper value={s.waterTargetMl} onChange={(waterTargetMl) => s.update({ waterTargetMl })} step={250} min={500} suffix="ml" /></Field>
              <Field label="PROTEIN PER DAY"><Stepper value={s.proteinTargetG} onChange={(proteinTargetG) => s.update({ proteinTargetG })} step={10} min={20} suffix="g" /></Field>
              <Field label="TRAINING PER WEEK"><Stepper value={s.trainingTargetMin} onChange={(trainingTargetMin) => s.update({ trainingTargetMin })} step={30} min={30} suffix="min" /></Field>
              <Field label="MONTHLY SPENDING BUDGET"><Stepper value={s.monthlyBudget} onChange={(monthlyBudget) => s.update({ monthlyBudget })} step={50} min={50} suffix="AUD" /></Field>
              <Field label="FOCUS PRESETS (MIN)">
                <input className="deco-input w-full font-num" defaultValue={s.focusPresets.join(', ')} onBlur={(e) => { const v = e.target.value.split(/[ ,]+/).map(Number).filter((n) => n > 0).slice(0, 3); if (v.length) s.update({ focusPresets: v }) }} />
              </Field>
            </div>
          </DecoCard>
        </div>

        <div className="flex flex-col gap-5">
          <DecoCard title="PALETTE">
            <div className="grid grid-cols-3 gap-2">
              <button className={`swatch ${!s.pinnedPaletteId ? 'on' : ''}`} onClick={() => s.update({ pinnedPaletteId: null })}>
                <span className="swatch-sky" style={{ background: 'conic-gradient(from 0deg, #d4af37, #3f5f9e, #2c6b52, #7a3a3a, #d4af37)' }} />
                <span>DAILY SHUFFLE</span>
              </button>
              {PALETTES.map((p) => (
                <button key={p.id} className={`swatch ${s.pinnedPaletteId === p.id ? 'on' : ''}`} onClick={() => s.update({ pinnedPaletteId: p.id })}>
                  <span className="swatch-sky" style={{ background: `linear-gradient(${p.sky.dusk[0]}, ${p.sky.dusk[1]}, ${p.sky.dusk[2]})`, borderColor: p.accent }}>
                    <span style={{ background: p.accent }} />
                  </span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
            <p className="text-[13px] font-body text-[var(--ink-muted)] mt-2">Today: {house.palette.name}. Gold Coast + India skins arrive in Phase 2.</p>
          </DecoCard>

          <DecoCard title="COMFORT">
            <Toggle label="Sounds" hint="Soft piano on ticks, brass on wins" on={s.sound} onChange={(sound) => s.update({ sound })} />
            <Toggle label="Low-glare night mode" hint="Dims everything for late nights" on={s.lowGlare} onChange={(lowGlare) => s.update({ lowGlare })} />
            <Toggle label="Reduced motion" on={s.reducedMotion} onChange={(reducedMotion) => s.update({ reducedMotion })} />
            <Toggle label="Battery saver" hint="Freezes the skyline animation" on={s.batterySaver} onChange={(batterySaver) => s.update({ batterySaver })} />
            <Toggle label="Marquee splash on open" on={s.splash} onChange={(splash) => s.update({ splash })} />
            <Field label="LAYOUT">
              <Segmented<LayoutMode> value={s.layout} onChange={(layout) => s.update({ layout })} options={[{ value: 'auto', label: 'Auto' }, { value: 'phone', label: 'Phone' }, { value: 'tablet', label: 'Tablet' }, { value: 'desktop', label: 'PC' }]} />
            </Field>
            <div className="mt-4">
              <Field label="NOTIFICATIONS">
                <p className="font-body text-[14px] text-[var(--ink-muted)]">
                  {notif === 'granted' ? 'Allowed — focus timers will ping you.' : notif === 'unsupported' ? 'On iPhone, notifications work once GHARANA is on your home screen (iOS 16.4+).' : 'Allow so focus timers can ping you. Scheduled nudges (water, wind-down) arrive in Phase 4.'}
                </p>
                {notif === 'default' && (
                  <button className="deco-btn ghost w-full mt-2" onClick={async () => setNotif(await Notification.requestPermission())}>Allow notifications</button>
                )}
              </Field>
            </div>
          </DecoCard>

          <DecoCard title="ROOMS"><RoomManager /></DecoCard>
          <DecoCard title="YOUR DATA"><DataRoom /></DecoCard>
          <p className="text-center font-deco text-[10px] tracking-[0.35em] text-[var(--ink-muted)]">GHARANA v3 · PHASE 1 · THE CORE ESTATE</p>
        </div>
      </div>
    </div>
  )
}
