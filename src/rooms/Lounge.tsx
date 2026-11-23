import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DecoCard } from '../components/DecoCard'
import { SunburstDial } from '../components/SunburstDial'
import { Icon } from '../components/Icon'
import { Stamp } from '../components/ui'
import { db, addProtein, addWater } from '../db/db'
import { autoTemplateId, setBig3, useActiveHabits, useAllHabitLogs, useDay, useLogsForDay, useTemplates } from '../db/hooks'
import { useHouse } from '../app/house'
import { navigate } from '../app/router'
import { capture } from '../app/CommandPalette'
import { useSettings } from '../store/settings'
import { toast } from '../store/ui'
import { useNow } from '../store/useClock'
import { daysBetween, dayNumber, formatLongDate, formatTime, prettyHm } from '../lib/time'
import { houseScore, scoreWord } from '../lib/score'
import { nowAndNext } from '../lib/blueprint'
import { dailyStreak } from '../lib/streaks'
import { rankFor } from '../config/ranks'
import { VERSES } from '../config/verses'
import { QUOTES } from '../config/quotes'
import { HOME_TIME_ZONE } from '../config/lockin'
import type { Big3Item, CaptureDest } from '../db/types'
import { useVoice } from '../store/voice'
import { CATEGORY_COLORS } from '../config/defaults'

// THE LOUNGE — daily command. Phone shows the compact essentials (tap to see the rest);
// desktop shows the full dashboard grid.

function Clock() {
  const now = useNow(1000)
  const { timeZone, away, palette } = useHouse()
  return (
    <DecoCard>
      <div className="text-center">
        <div className="font-num text-[52px] leading-none tracking-tight text-[var(--ink)]">{formatTime(now, timeZone)}</div>
        <div className="mt-2 font-body text-lg text-[var(--ink-muted)]">{formatLongDate(now, timeZone)}</div>
        {away && <div className="mt-1 font-num text-sm text-[var(--ink-muted)]">Melbourne {formatTime(now, HOME_TIME_ZONE)}</div>}
        <div className="mt-2 font-deco text-[11px] tracking-[0.32em] text-[var(--accent)]">{palette.name}</div>
      </div>
    </DecoCard>
  )
}

function ScoreGauge({ score }: { score: number }) {
  const r = 80
  const len = Math.PI * r
  return (
    <svg viewBox="0 0 200 118" className="w-full max-w-[230px] mx-auto block">
      {Array.from({ length: 21 }, (_, i) => {
        const a = Math.PI + (i / 20) * Math.PI
        return <line key={i} x1={100 + Math.cos(a) * 92} y1={104 + Math.sin(a) * 92} x2={100 + Math.cos(a) * 98} y2={104 + Math.sin(a) * 98} stroke="var(--accent)" strokeOpacity={i / 20 <= score / 100 ? 0.9 : 0.2} strokeWidth={1.4} />
      })}
      <path d={`M 20 104 A ${r} ${r} 0 0 1 180 104`} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={10} />
      <path d={`M 20 104 A ${r} ${r} 0 0 1 180 104`} fill="none" stroke="var(--accent)" strokeWidth={10} strokeDasharray={len} strokeDashoffset={len * (1 - score / 100)} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <text x="100" y="92" textAnchor="middle" className="font-num" fontSize="38" fill="var(--ink)">{score}</text>
      <text x="100" y="112" textAnchor="middle" className="font-deco" fontSize="9" letterSpacing="2.4" fill="var(--ink-muted)">/ 100 · {scoreWord(score)}</text>
    </svg>
  )
}

function Big3({ day }: { day: string }) {
  const d = useDay(day)
  const items: Big3Item[] = [0, 1, 2].map((i) => d.big3?.[i] ?? { text: '', done: false })
  const [editing, setEditing] = useState<number | null>(null)
  const save = (next: Big3Item[]) => setBig3(day, next)
  return (
    <ol className="flex flex-col gap-2">
      {items.map((it, i) => (
        <li key={i} className="big3-row">
          <button
            className={`big3-check ${it.done ? 'on' : ''}`}
            aria-label={it.done ? 'Mark not done' : 'Mark done'}
            disabled={!it.text}
            onClick={() => save(items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
          >
            <span className="font-num text-[13px]">{i + 1}</span>
            <Stamp show={it.done} />
          </button>
          {editing === i || !it.text ? (
            <input
              className="deco-input flex-1"
              defaultValue={it.text}
              placeholder={['The one that matters most', 'The second win', 'The third win'][i]}
              autoFocus={editing === i}
              onBlur={(e) => {
                setEditing(null)
                if (e.target.value !== it.text) void save(items.map((x, j) => (j === i ? { ...x, text: e.target.value.trim() } : x)))
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          ) : (
            <button className={`flex-1 text-left font-body text-[18px] ${it.done ? 'line-through text-[var(--ink-muted)]' : 'text-[var(--ink)]'}`} onClick={() => setEditing(i)}>
              {it.text}
            </button>
          )}
        </li>
      ))}
    </ol>
  )
}

function Fuel({ day }: { day: string }) {
  const d = useDay(day)
  const wt = useSettings((s) => s.waterTargetMl)
  const pt = useSettings((s) => s.proteinTargetG)
  const bar = (v: number, t: number) => Math.min(100, Math.round((v / t) * 100))
  const add = (kind: 'w' | 'p', n: number) => {
    const fn = kind === 'w' ? addWater : addProtein
    void fn(day, n).then(() => toast(kind === 'w' ? `+${n} ml water` : `+${n} g protein`, () => fn(day, -n)))
  }
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-baseline justify-between">
          <span className="font-deco text-[11px] tracking-[0.3em] text-[var(--ink-muted)]">WATER</span>
          <span className="font-num text-[22px] text-[var(--ink)]">
            {(d.waterMl / 1000).toFixed(2)}<small className="text-[var(--ink-muted)] text-[13px]"> / {wt / 1000} L</small>
          </span>
        </div>
        <div className="meter"><div style={{ width: `${bar(d.waterMl, wt)}%` }} /></div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button className="deco-btn" onClick={() => add('w', 250)}>+250</button>
          <button className="deco-btn" onClick={() => add('w', 500)}>+500</button>
          <button className="deco-btn" onClick={() => add('w', 750)}>+750</button>
        </div>
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <span className="font-deco text-[11px] tracking-[0.3em] text-[var(--ink-muted)]">PROTEIN</span>
          <span className="font-num text-[22px] text-[var(--ink)]">
            {d.proteinG}<small className="text-[var(--ink-muted)] text-[13px]"> / {pt} g</small>
          </span>
        </div>
        <div className="meter"><div style={{ width: `${bar(d.proteinG, pt)}%` }} /></div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button className="deco-btn" onClick={() => add('p', 10)}>+10</button>
          <button className="deco-btn" onClick={() => add('p', 25)}>+25</button>
          <button className="deco-btn" onClick={() => add('p', 40)}>+40</button>
        </div>
      </div>
    </div>
  )
}

function NowCard() {
  const { today, location, minuteOfDay } = useHouse()
  const templates = useTemplates()
  const day = useDay(today)
  const shifts = useLiveQuery(() => db.shifts.where('day').equals(today).count(), [today]) ?? 0
  const tid = autoTemplateId(today, location, shifts > 0, day)
  const tpl = templates.find((t) => t.id === tid) ?? templates[0]
  if (!tpl) return null
  const { now, next, minsLeft } = nowAndNext(tpl.blocks, minuteOfDay)
  return (
    <button className="w-full text-left" onClick={() => navigate('/blueprint')}>
      <div className="font-deco text-[11px] tracking-[0.3em] text-[var(--ink-muted)]">NOW · {tpl.name.toUpperCase()}</div>
      {now ? (
        <div className="flex items-center gap-3 mt-1">
          <span className="w-1.5 self-stretch" style={{ background: CATEGORY_COLORS[now.category] }} />
          <div>
            <div className="font-display text-[24px] text-[var(--ink)] leading-tight">{now.title}</div>
            <div className="font-num text-[13px] text-[var(--ink-muted)]">{minsLeft} min left · until {prettyHm(now.end)}</div>
          </div>
        </div>
      ) : (
        <div className="font-body text-[18px] text-[var(--ink-muted)] mt-1">Open time.</div>
      )}
      {next && (
        <div className="font-body text-[15px] text-[var(--ink-muted)] mt-2">
          Next: <span className="text-[var(--ink)]">{next.title}</span> at <span className="font-num">{prettyHm(next.start)}</span>
        </div>
      )}
    </button>
  )
}

function VerseCard({ day }: { day: string }) {
  const v = VERSES[((dayNumber(day) % VERSES.length) + VERSES.length) % VERSES.length]
  const [showT, setShowT] = useState(false)
  return (
    <div>
      <div className="font-deco text-[11px] tracking-[0.3em] text-[var(--accent)] text-center">BHAGAVAD GITA {v.ref}</div>
      <button className="block w-full mt-3" onClick={() => setShowT((s) => !s)}>
        <p className="sanskrit">{v.sanskrit}</p>
        {showT && <p className="font-body italic text-[15px] text-[var(--ink-muted)] whitespace-pre-line mt-2 text-center">{v.translit}</p>}
      </button>
      <p className="font-body text-[18px] text-[var(--ink)] mt-3 text-center leading-snug">{v.english}</p>
      <p className="font-body text-[15px] text-[var(--accent)] mt-3 text-center italic">→ {v.apply}</p>
    </div>
  )
}

function QuoteCard({ day }: { day: string }) {
  const q = QUOTES[((dayNumber(day) * 7 + 3) % QUOTES.length + QUOTES.length) % QUOTES.length]
  return (
    <figure className="text-center">
      <blockquote className="font-body text-[20px] leading-snug text-[var(--ink)]">“{q.text}”</blockquote>
      {q.original && <p className="font-body italic text-[14px] text-[var(--ink-muted)] whitespace-pre-line mt-2">{q.original}</p>}
      <figcaption className="font-deco text-[11px] tracking-[0.3em] text-[var(--accent)] mt-3">
        — {q.by.toUpperCase()}
        {q.spirit && <span className="text-[var(--ink-muted)]"> · IN THE SPIRIT OF</span>}
      </figcaption>
    </figure>
  )
}

function LockIn() {
  const phases = useSettings((s) => s.phases)
  const { today, phase } = useHouse()
  const first = phases[0].start
  const last = phases[phases.length - 1].end
  const total = daysBetween(first, last) + 1
  const idx = Math.min(total, Math.max(0, daysBetween(first, today) + 1))
  const next = phases.find((p) => p.start > today)
  const toNext = next ? daysBetween(today, next.start) : null
  return (
    <div>
      <SunburstDial totalDays={total} today={idx} phaseStarts={phases.map((p) => daysBetween(first, p.start))} label={idx > 0 ? `${idx}` : '—'} sublabel={`OF ${total} DAYS`} />
      {phase && (
        <div className="mt-3 text-center">
          <div className="font-deco text-[12px] tracking-[0.3em] text-[var(--accent)]">PHASE {phase.numeral}</div>
          <div className="font-display text-[24px] text-[var(--ink)]">{phase.name.toUpperCase()}</div>
        </div>
      )}
      {next && toNext !== null && (
        <div className="mt-1 text-center font-body text-[var(--ink-muted)]">
          {next.name} in <span className="font-num text-[var(--ink)]">{toNext}</span> {toNext === 1 ? 'day' : 'days'}
        </div>
      )}
    </div>
  )
}

function QuickCapture() {
  const [text, setText] = useState('')
  const [dest, setDest] = useState<CaptureDest>('inbox')
  const recent = useLiveQuery(() => db.captures.orderBy('at').reverse().limit(3).toArray(), []) ?? []
  const submit = async () => {
    if (!text.trim()) return
    await capture(text.trim(), dest)
    setText('')
  }
  return (
    <div>
      <div className="flex gap-2">
        <input className="deco-input flex-1" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="An idea, a note, a hook…" />
        <button className="deco-btn px-4" onClick={submit} aria-label="Capture">
          <Icon name="plus" size={20} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mt-2" data-noswipe>
        {(['inbox', 'nazara', 'ksvol1', 'scrollapp'] as CaptureDest[]).map((d) => (
          <button key={d} className={`chip ${dest === d ? 'on' : ''}`} onClick={() => setDest(d)}>
            {{ inbox: 'Inbox', nazara: 'NAZARA', ksvol1: 'K.S. VOL. 1', scrollapp: 'Scroll App' }[d]}
          </button>
        ))}
      </div>
      {recent.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {recent.map((c) => (
            <li key={c.id} className="font-body text-[15px] text-[var(--ink-muted)] truncate">
              <span className="font-deco text-[10px] tracking-[0.2em] text-[var(--accent)] mr-2">{c.dest.toUpperCase()}</span>
              {c.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Ticker({ items }: { items: string[] }) {
  const line = items.join('   ◆   ')
  return (
    <div className="ticker" aria-label="Ticker">
      <div className="ticker-track">
        <span>{line}   ◆   </span>
        <span aria-hidden="true">{line}   ◆   </span>
      </div>
    </div>
  )
}

export function Lounge() {
  const house = useHouse()
  const { today } = house
  const s = useSettings()
  const habits = useActiveHabits(house.habitSet)
  const logs = useLogsForDay(today)
  const allLogs = useAllHabitLogs()
  const day = useDay(today)
  const workouts = useLiveQuery(() => db.workouts.where('day').equals(today).toArray(), [today]) ?? []
  const [expanded, setExpanded] = useState(false)
  const voice = useVoice()
  const briefing = house.hour >= 4 && house.hour < 12 && (
    <DecoCard title="MORNING BRIEFING">
      <button
        className="deco-btn w-full"
        disabled={voice.state !== 'idle'}
        onClick={() => voice.ask('Brief me on today out loud: greeting, the palette of the day, my Big 3, the next Blueprint blocks, streaks at risk, fuel, countdowns and the verse — under 90 seconds.', { speak: true })}
      >
        {voice.state === 'thinking' ? 'ALFRED is preparing…' : voice.state === 'speaking' ? 'ALFRED is speaking…' : '▶ Play ALFRED’s briefing'}
      </button>
    </DecoCard>
  )
  const phone = window.innerWidth < 900 && s.layout !== 'desktop'

  const score = houseScore({ habits, logs, day, workouts, waterTarget: s.waterTargetMl, proteinTarget: s.proteinTargetG, wakeTarget: s.wakeTarget })

  const topStreak = useMemo(() => {
    let best = { name: '', n: 0 }
    for (const h of habits) {
      const st = dailyStreak(h, allLogs.filter((l) => l.habitId === h.id), today, (d) => house.isFlightDay(d))
      if (st.current > best.n) best = { name: h.name, n: st.current }
    }
    return best
  }, [habits, allLogs, today, house])

  const next = s.phases.find((p) => p.start > today)
  const ticker = [
    `PALETTE: ${house.palette.name}`,
    `HOUSE SCORE ${score.total}`,
    `RITES ${score.doneCount}/${score.habitCount}`,
    topStreak.n ? `${topStreak.name.toUpperCase()} STREAK ${topStreak.n} · ${rankFor(topStreak.n).rank.name}` : 'START A STREAK TODAY',
    next ? `${next.name.toUpperCase()} IN ${daysBetween(today, next.start)} DAYS` : 'LOCK-IN COMPLETE',
    `${s.name.toUpperCase()} · THE HOUSE BUILDS THE NAME`,
  ]

  const Score = (
    <DecoCard title="HOUSE SCORE">
      <ScoreGauge score={score.total} />
      <div className="grid grid-cols-3 gap-2 mt-2 text-center">
        {(
          [
            ['Rites', score.parts.habits, 35],
            ['Big 3', score.parts.big3, 15],
            ['Fuel', score.parts.fuel, 15],
            ['Morning', score.parts.morning, 15],
            ['Train', score.parts.training, 10],
            ['Debrief', score.parts.night, 10],
          ] as const
        ).map(([k, v, max]) => (
          <div key={k}>
            <div className="font-num text-[15px] text-[var(--ink)]">{Math.round(v)}<small className="text-[var(--ink-muted)]">/{max}</small></div>
            <div className="font-deco text-[9px] tracking-[0.2em] text-[var(--ink-muted)]">{k.toUpperCase()}</div>
          </div>
        ))}
      </div>
    </DecoCard>
  )

  const rites = (
    <DecoCard title="RITUALS">
      <div className="grid grid-cols-2 gap-2">
        <button className="deco-btn ghost" onClick={() => navigate('/morning')}>
          {day.morning?.completedAt ? '✓ Morning' : 'Morning Rite'}
        </button>
        <button className="deco-btn ghost" onClick={() => navigate('/night')}>
          {day.night?.completedAt ? '✓ Debrief' : 'Night Debrief'}
        </button>
        <button className="deco-btn ghost col-span-2" onClick={() => navigate('/rites')}>
          Daily Rites · {score.doneCount}/{score.habitCount}
        </button>
      </div>
    </DecoCard>
  )

  if (phone) {
    return (
      <div className="flex flex-col gap-4">
        <Ticker items={ticker} />
        <Clock />
        {briefing}
        {Score}
        <DecoCard title="TODAY’S BIG 3"><Big3 day={today} /></DecoCard>
        <DecoCard><NowCard /></DecoCard>
        <DecoCard title="FUEL STATION"><Fuel day={today} /></DecoCard>
        {!expanded ? (
          <button className="deco-btn ghost" onClick={() => setExpanded(true)}>Show the rest of the Lounge</button>
        ) : (
          <>
            {rites}
            <DecoCard title="THE VERSE"><VerseCard day={today} /></DecoCard>
            <DecoCard title="WORDS FOR TODAY"><QuoteCard day={today} /></DecoCard>
            <DecoCard title="THE LOCK-IN"><LockIn /></DecoCard>
            <DecoCard title="QUICK CAPTURE"><QuickCapture /></DecoCard>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <Ticker items={ticker} />
      <div className="desk-grid">
        <div className="flex flex-col gap-5">
          <Clock />
          {briefing}
          {Score}
          {rites}
        </div>
        <div className="flex flex-col gap-5">
          <DecoCard title="TODAY’S BIG 3"><Big3 day={today} /></DecoCard>
          <DecoCard><NowCard /></DecoCard>
          <DecoCard title="THE VERSE"><VerseCard day={today} /></DecoCard>
        </div>
        <div className="flex flex-col gap-5">
          <DecoCard title="FUEL STATION"><Fuel day={today} /></DecoCard>
          <DecoCard title="THE LOCK-IN"><LockIn /></DecoCard>
          <DecoCard title="WORDS FOR TODAY"><QuoteCard day={today} /></DecoCard>
          <DecoCard title="QUICK CAPTURE"><QuickCapture /></DecoCard>
        </div>
      </div>
    </div>
  )
}
