// Lock-in sunburst dial: one ray per day of the whole lock-in.
// Past days glow, today blazes, the future waits in hairline.

interface Props {
  totalDays: number
  /** 1-based day index of today within the lock-in (0 = not started). */
  today: number
  /** Indexes (0-based) where a new phase begins — drawn as longer rays. */
  phaseStarts: number[]
  label: string
  sublabel: string
}

export function SunburstDial({ totalDays, today, phaseStarts, label, sublabel }: Props) {
  const size = 260
  const c = size / 2
  const inner = 70
  const rays = Array.from({ length: totalDays }, (_, i) => {
    // fan from 200° to 340° … full circle reads better: start at top, go clockwise
    const a = (i / totalDays) * Math.PI * 2 - Math.PI / 2
    const isPhase = phaseStarts.includes(i)
    const outer = isPhase ? c - 4 : c - 18
    const state = i + 1 < today ? 'past' : i + 1 === today ? 'today' : 'future'
    return { a, outer, state, isPhase, i }
  })

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[260px] mx-auto block" role="img" aria-label={`${label} ${sublabel}`}>
      {rays.map((r) => (
        <line
          key={r.i}
          x1={c + Math.cos(r.a) * inner}
          y1={c + Math.sin(r.a) * inner}
          x2={c + Math.cos(r.a) * r.outer}
          y2={c + Math.sin(r.a) * r.outer}
          stroke="var(--accent)"
          strokeWidth={r.state === 'today' ? 3 : r.isPhase ? 1.6 : 1.2}
          strokeLinecap="round"
          opacity={r.state === 'past' ? 0.9 : r.state === 'today' ? 1 : 0.18}
          className={r.state === 'today' ? 'ray-today' : undefined}
        />
      ))}
      <circle cx={c} cy={c} r={inner - 8} fill="none" stroke="var(--accent)" strokeOpacity={0.5} strokeWidth={1} />
      <circle cx={c} cy={c} r={inner - 13} fill="none" stroke="var(--accent)" strokeOpacity={0.25} strokeWidth={0.6} />
      <text x={c} y={c - 4} textAnchor="middle" className="font-num" fontSize="30" fill="var(--ink)">
        {label}
      </text>
      <text x={c} y={c + 18} textAnchor="middle" className="font-deco" fontSize="10" letterSpacing="2.5" fill="var(--ink-muted)">
        {sublabel}
      </text>
    </svg>
  )
}
