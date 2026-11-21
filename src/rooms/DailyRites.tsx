import { useMemo, useRef, useState } from 'react'
import { DecoCard } from '../components/DecoCard'
import { Field, RoomHeader, Segmented, Sheet, Stamp, Stepper, Toggle } from '../components/ui'
import { Icon } from '../components/Icon'
import { db, uid } from '../db/db'
import { setHabitValue, skipHabit, useActiveHabits, useAllHabitLogs, useAllHabits, useLogsForDay } from '../db/hooks'
import { useHouse } from '../app/house'
import { dailyStreak, isDone, type StreakInfo } from '../lib/streaks'
import { addDays, weekStart } from '../lib/time'
import { rankFor } from '../config/ranks'
import { toast } from '../store/ui'
import type { Habit, HabitGroup, HabitLog, HabitSet, HabitType } from '../db/types'

// DAILY RITES — the habit engine.

const GROUPS: { id: HabitGroup; name: string }[] = [
  { id: 'big5', name: 'THE BIG FIVE' },
  { id: 'minimum', name: 'MINIMUM DAILY 3' },
  { id: 'maintenance', name: 'MAINTENANCE' },
  { id: 'custom', name: 'HOUSE RULES' },
]

const SET_NAMES: Record<HabitSet, string> = { home: 'HOME SET', travel: 'TRAVEL SET', india: 'INDIA SET' }

function Insignia({ days }: { days: number }) {
  const { rank } = rankFor(days)
  return (
    <span className="insignia" title={rank.name}>
      <span>{rank.glyph}</span>
      {rank.chevrons > 0 && <span className="chevrons">{'‹'.repeat(rank.chevrons)}</span>}
    </span>
  )
}

function HabitRow({ h, log, streak, weekCount, activeIds, onMore }: { h: Habit; log?: HabitLog; streak: StreakInfo; weekCount: number; activeIds: string[]; onMore: () => void }) {
  const { today } = useHouse()
  const done = isDone(h, log)
  const value = log?.status === 'skip' ? 0 : log?.value ?? 0
  const set = (v: number) => setHabitValue(h, today, v, { activeIds })
  const touch = useRef<number | null>(null)

  const toggle = () => set(done ? 0 : h.type === 'check' || h.type === 'weekly' ? 1 : h.target)

  return (
    <li
      className={`habit-row ${done ? 'done' : ''} ${log?.status === 'skip' ? 'skipped' : ''}`}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = touch.current == null ? 0 : e.changedTouches[0].clientX - touch.current
        touch.current = null
        if (dx > 70 && !done) void toggle()
      }}
      data-noswipe
    >
      <button className="habit-check" onClick={toggle} aria-label={done ? `Untick ${h.name}` : `Tick ${h.name}`}>
        <Stamp show={done} />
      </button>
      <div className="flex-1 min-w-0">
        <button className="block text-left w-full" onClick={h.type === 'check' || h.type === 'weekly' ? toggle : undefined}>
          <div className="font-body text-[18px] text-[var(--ink)] leading-tight truncate">{h.name}</div>
          <div className="flex flex-wrap items-center gap-x-2 text-[13px] text-[var(--ink-muted)] font-num whitespace-nowrap">
            {h.type === 'weekly' ? (
              <span>{weekCount}/{h.target} this week · {streak.current} wk</span>
            ) : (
              <span>{streak.current}d streak</span>
            )}
            <Insignia days={h.type === 'weekly' ? streak.current * 7 : streak.current} />
            {streak.freezes > 0 && <span title="Streak freezes">❄{streak.freezes}</span>}
            {log?.status === 'skip' && <span className="italic whitespace-normal">skipped: {log.reason}</span>}
          </div>
        </button>
        {/* Controls sit under the name so long names never get cut off */}
        {h.type === 'count' && (
          <div className="mt-2 flex items-center gap-2">
            <Stepper value={value} onChange={set} />
            <span className="font-num text-[13px] text-[var(--ink-muted)]">of {h.target}</span>
          </div>
        )}
        {h.type === 'duration' && (
          <div className="mt-2 flex items-center gap-2">
            <span className="font-num text-[14px] text-[var(--ink)] min-w-14">{value}<span className="text-[var(--ink-muted)]">/{h.target}m</span></span>
            <button className="mini-btn" onClick={() => set(value + 10)}>+10</button>
            <button className="mini-btn" onClick={() => set(value + 30)}>+30</button>
            {value > 0 && <button className="mini-btn" onClick={() => set(Math.max(0, value - 10))} aria-label="Take off 10 minutes">−10</button>}
          </div>
        )}
      </div>
      {h.type === 'number' && (
        <input
          className="deco-input w-20 text-center font-num"
          inputMode="decimal"
          defaultValue={value || ''}
          placeholder={h.unit ?? '#'}
          onBlur={(e) => set(Number(e.target.value) || 0)}
        />
      )}
      <button className="icon-btn" onClick={onMore} aria-label={`Options for ${h.name}`}>
        <span className="font-num">⋯</span>
      </button>
    </li>
  )
}

function Heatmap({ h, logs, today }: { h: Habit; logs: HabitLog[]; today: string }) {
  const map = new Map(logs.map((l) => [l.day, l]))
  const start = addDays(weekStart(today), -7 * 15)
  const cells = Array.from({ length: 16 * 7 }, (_, i) => addDays(start, i))
  return (
    <div className="heatmap" data-noswipe>
      {cells.map((d) => {
        const l = map.get(d)
        const cls = d > today ? 'future' : isDone(h, l) ? 'done' : l?.status === 'skip' ? 'skip' : l ? 'part' : ''
        return <span key={d} className={cls} title={d} />
      })}
    </div>
  )
}

function HabitEditor({ habit, onClose }: { habit: Habit | 'new'; onClose: () => void }) {
  const all = useAllHabits() ?? []
  const base: Habit =
    habit === 'new'
      ? { id: uid(), name: '', type: 'check', target: 1, group: 'custom', sets: ['home'], order: all.length + 40, createdAt: Date.now() }
      : habit
  const [h, setH] = useState<Habit>(base)
  const up = (p: Partial<Habit>) => setH((x) => ({ ...x, ...p }))
  const save = async () => {
    if (!h.name.trim()) return
    await db.habits.put({ ...h, name: h.name.trim(), target: h.type === 'check' ? 1 : Math.max(1, h.target) })
    toast(habit === 'new' ? 'Habit added' : 'Habit saved')
    onClose()
  }
  return (
    <div className="flex flex-col gap-4">
      <Field label="NAME">
        <input className="deco-input w-full" value={h.name} onChange={(e) => up({ name: e.target.value })} autoFocus />
      </Field>
      <Field label="TYPE">
        <Segmented<HabitType>
          value={h.type}
          onChange={(type) => up({ type, target: type === 'check' ? 1 : type === 'duration' ? 30 : type === 'weekly' ? 3 : h.target })}
          options={[
            { value: 'check', label: 'Yes/No' },
            { value: 'count', label: 'Count' },
            { value: 'duration', label: 'Minutes' },
            { value: 'number', label: 'Number' },
            { value: 'weekly', label: '× / week' },
          ]}
        />
      </Field>
      {h.type !== 'check' && (
        <Field label={h.type === 'weekly' ? 'TIMES PER WEEK' : h.type === 'duration' ? 'TARGET MINUTES' : 'TARGET'}>
          <Stepper value={h.target} onChange={(target) => up({ target })} step={h.type === 'duration' ? 5 : 1} min={1} />
        </Field>
      )}
      <Field label="GROUP">
        <Segmented<HabitGroup> value={h.group} onChange={(group) => up({ group })} options={GROUPS.map((g) => ({ value: g.id, label: g.name.replace('THE ', '').replace('MINIMUM DAILY 3', 'MIN 3') }))} />
      </Field>
      <Field label="ACTIVE IN">
        <div className="flex flex-col">
          {(['home', 'travel', 'india'] as HabitSet[]).map((s) => (
            <Toggle key={s} label={SET_NAMES[s]} on={h.sets.includes(s)} onChange={(on) => up({ sets: on ? [...h.sets, s] : h.sets.filter((x) => x !== s) })} />
          ))}
        </div>
      </Field>
      <div className="flex gap-2">
        <button className="deco-btn flex-1" onClick={save}>Save</button>
        {habit !== 'new' && (
          <button
            className="deco-btn ghost"
            onClick={async () => {
              await db.habits.update(h.id, { archived: true })
              toast(`${h.name} retired`, () => db.habits.update(h.id, { archived: false }))
              onClose()
            }}
          >
            Retire
          </button>
        )}
      </div>
    </div>
  )
}

export function DailyRites() {
  const house = useHouse()
  const { today, habitSet } = house
  const habits = useActiveHabits(habitSet)
  const logs = useLogsForDay(today)
  const allLogs = useAllHabitLogs()
  const [more, setMore] = useState<Habit | null>(null)
  const [edit, setEdit] = useState<Habit | 'new' | null>(null)
  const [reason, setReason] = useState('')
  const activeIds = habits.map((h) => h.id)

  const stats = useMemo(() => {
    const m = new Map<string, { streak: StreakInfo; week: number; logs: HabitLog[] }>()
    const ws = weekStart(today)
    for (const h of habits) {
      const hl = allLogs.filter((l) => l.habitId === h.id)
      m.set(h.id, {
        streak: dailyStreak(h, hl, today, (d) => house.isFlightDay(d)),
        week: hl.filter((l) => l.day >= ws && l.day <= today && isDone(h, l)).length,
        logs: hl,
      })
    }
    return m
  }, [habits, allLogs, today, house])

  const daily = habits.filter((h) => h.type !== 'weekly')
  const doneCount = daily.filter((h) => isDone(h, logs.get(h.id))).length

  return (
    <div className="flex flex-col gap-5">
      <RoomHeader
        id="rites"
        subtitle={`${SET_NAMES[habitSet]} · ${doneCount}/${daily.length} done today`}
        right={
          <button className="icon-btn" onClick={() => setEdit('new')} aria-label="Add habit">
            <Icon name="plus" />
          </button>
        }
      />
      <p className="font-body text-[14px] text-[var(--ink-muted)] -mt-3">Tap to tick · swipe a habit right to tick it · ⋯ to skip, see the heatmap, or edit.</p>
      {GROUPS.map((g) => {
        const list = habits.filter((h) => h.group === g.id)
        if (!list.length) return null
        return (
          <DecoCard key={g.id} title={g.name}>
            <ul className="flex flex-col">
              {list.map((h) => {
                const st = stats.get(h.id)
                return (
                  <HabitRow
                    key={h.id}
                    h={h}
                    log={logs.get(h.id)}
                    streak={st?.streak ?? { current: 0, best: 0, freezes: 0 }}
                    weekCount={st?.week ?? 0}
                    activeIds={activeIds}
                    onMore={() => {
                      setReason('')
                      setMore(h)
                    }}
                  />
                )
              })}
            </ul>
          </DecoCard>
        )
      })}

      <Sheet open={!!more} onClose={() => setMore(null)} title={more?.name.toUpperCase() ?? ''}>
        {more && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-3 text-center">
              <div><div className="font-num text-[26px]">{stats.get(more.id)?.streak.current ?? 0}</div><div className="field-label">CURRENT</div></div>
              <div><div className="font-num text-[26px]">{stats.get(more.id)?.streak.best ?? 0}</div><div className="field-label">BEST</div></div>
              <div><div className="font-num text-[26px]">❄{stats.get(more.id)?.streak.freezes ?? 0}</div><div className="field-label">FREEZES</div></div>
            </div>
            <div className="text-center font-deco text-[12px] tracking-[0.3em] text-[var(--accent)]">
              {rankFor(stats.get(more.id)?.streak.current ?? 0).rank.name}
              {rankFor(stats.get(more.id)?.streak.current ?? 0).next && (
                <span className="text-[var(--ink-muted)]"> → {rankFor(stats.get(more.id)?.streak.current ?? 0).next?.name} at {rankFor(stats.get(more.id)?.streak.current ?? 0).next?.minDays}d</span>
              )}
            </div>
            <Heatmap h={more} logs={stats.get(more.id)?.logs ?? []} today={today} />
            <Field label="SKIP TODAY — WITH A REASON">
              <div className="flex gap-2">
                <input className="deco-input flex-1" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Sick, shift ran late, travelling…" />
                <button
                  className="deco-btn px-4"
                  disabled={!reason.trim()}
                  onClick={async () => {
                    await skipHabit(more, today, reason.trim())
                    setMore(null)
                  }}
                >
                  Skip
                </button>
              </div>
            </Field>
            <p className="text-[13px] text-[var(--ink-muted)] font-body -mt-3">A skip uses a streak freeze if you have one (you earn one every 7 days in a row, max 3). No freeze = the streak resets.</p>
            <button
              className="deco-btn ghost"
              onClick={() => {
                setEdit(more)
                setMore(null)
              }}
            >
              Edit habit
            </button>
          </div>
        )}
      </Sheet>

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit === 'new' ? 'NEW HABIT' : 'EDIT HABIT'}>
        {edit && <HabitEditor habit={edit} onClose={() => setEdit(null)} />}
      </Sheet>
    </div>
  )
}
