import { memo, useMemo } from 'react'
import type { Palette, TimeOfDay } from '../theme/palettes'
import { mulberry32 } from '../theme/daily'

// The living skyline: a 3-layer art deco city that sits behind every room.
// Geometry is generated from a fixed seed so the city is the same every visit;
// colours come from the palette of the day and the time of day where Krishi is.

const W = 1200
const H = 700
const GROUND = H

type Top = 'flat' | 'stepped' | 'spire' | 'crown' | 'needle'

interface Building {
  x: number
  w: number
  h: number
  top: Top
  windows: { x: number; y: number; lit: number; twinkle: boolean; delay: number }[]
}

function makeLayer(seed: number, minH: number, maxH: number, minW: number, maxW: number, windowSize: number): Building[] {
  const r = mulberry32(seed)
  const out: Building[] = []
  let x = -30
  while (x < W + 30) {
    const w = Math.round(minW + r() * (maxW - minW))
    const h = Math.round(minH + r() * (maxH - minH))
    const tops: Top[] = ['flat', 'stepped', 'stepped', 'spire', 'crown', 'needle']
    const top = tops[Math.floor(r() * tops.length)]
    const windows: Building['windows'] = []
    const gap = windowSize * 2.2
    for (let wy = GROUND - h + gap * 1.4; wy < GROUND - gap; wy += gap) {
      for (let wx = x + gap * 0.7; wx < x + w - gap * 0.7; wx += gap) {
        windows.push({ x: wx, y: wy, lit: r(), twinkle: r() < 0.06, delay: r() * 8 })
      }
    }
    out.push({ x, w, h, top, windows })
    x += w + Math.round(r() * 14) - 4
  }
  return out
}

function BuildingShape({ b, fill }: { b: Building; fill: string }) {
  const top = GROUND - b.h
  const cx = b.x + b.w / 2
  return (
    <g fill={fill}>
      <rect x={b.x} y={top} width={b.w} height={b.h} />
      {b.top === 'stepped' && (
        <>
          <rect x={b.x + b.w * 0.12} y={top - b.h * 0.06} width={b.w * 0.76} height={b.h * 0.06 + 1} />
          <rect x={b.x + b.w * 0.26} y={top - b.h * 0.11} width={b.w * 0.48} height={b.h * 0.05 + 1} />
          <rect x={b.x + b.w * 0.38} y={top - b.h * 0.15} width={b.w * 0.24} height={b.h * 0.04 + 1} />
        </>
      )}
      {b.top === 'spire' && (
        <>
          <rect x={b.x + b.w * 0.2} y={top - b.h * 0.07} width={b.w * 0.6} height={b.h * 0.07 + 1} />
          <polygon points={`${cx - b.w * 0.18},${top - b.h * 0.07} ${cx},${top - b.h * 0.32} ${cx + b.w * 0.18},${top - b.h * 0.07}`} />
        </>
      )}
      {b.top === 'needle' && (
        <>
          <rect x={b.x + b.w * 0.3} y={top - b.h * 0.08} width={b.w * 0.4} height={b.h * 0.08 + 1} />
          <rect x={cx - 1.5} y={top - b.h * 0.38} width={3} height={b.h * 0.3} />
        </>
      )}
      {b.top === 'crown' && (
        <>
          <rect x={b.x + b.w * 0.1} y={top - b.h * 0.05} width={b.w * 0.8} height={b.h * 0.05 + 1} />
          {/* fan arch crown */}
          <path d={`M ${b.x + b.w * 0.18} ${top - b.h * 0.05} A ${b.w * 0.32} ${b.w * 0.32} 0 0 1 ${b.x + b.w * 0.82} ${top - b.h * 0.05} Z`} />
        </>
      )}
    </g>
  )
}

const LIT_RATE: Record<TimeOfDay, number> = { dawn: 0.14, day: 0.04, dusk: 0.38, night: 0.5 }

interface Props {
  palette: Palette
  tod: TimeOfDay
  still?: boolean
  /** Phone gets 2 layers to save battery, full skyline gets 3. */
  layers?: 2 | 3
}

function SkylineImpl({ palette, tod, still = false, layers = 3 }: Props) {
  const city = useMemo(
    () => ({
      far: makeLayer(101, 260, 470, 40, 90, 3),
      mid: makeLayer(202, 170, 360, 55, 120, 4),
      near: makeLayer(303, 90, 230, 70, 150, 5),
      stars: Array.from({ length: 90 }, (_, i) => {
        const r = mulberry32(900 + i)
        return { x: r() * W, y: r() * H * 0.5, s: 0.6 + r() * 1.4, d: r() * 6 }
      }),
    }),
    [],
  )

  const [top, mid, bottom] = palette.sky[tod]
  const showNight = tod === 'night' || tod === 'dusk'
  const lit = LIT_RATE[tod]
  const winFill = palette.window

  const renderLayer = (bs: Building[], fill: string, size: number, opacity: number) => (
    <g>
      {bs.map((b, i) => (
        <BuildingShape key={i} b={b} fill={fill} />
      ))}
      <g fill={winFill} opacity={opacity}>
        {bs.flatMap((b, i) =>
          b.windows
            .filter((w) => w.lit < lit)
            .map((w, j) => (
              <rect
                key={`${i}-${j}`}
                x={w.x}
                y={w.y}
                width={size}
                height={size * 1.4}
                className={w.twinkle && !still ? 'sky-twinkle' : undefined}
                style={w.twinkle ? { animationDelay: `${w.delay}s` } : undefined}
              />
            )),
        )}
      </g>
    </g>
  )

  return (
    <svg
      className="skyline"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: top }} />
          <stop offset="55%" style={{ stopColor: mid }} />
          <stop offset="100%" style={{ stopColor: bottom }} />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="100%" r="70%">
          <stop offset="0%" stopColor={bottom} stopOpacity="0.9" />
          <stop offset="100%" stopColor={bottom} stopOpacity="0" />
        </radialGradient>
        <mask id="crescent">
          <rect width={W} height={H} fill="white" />
          <circle cx={W * 0.8 + 14} cy={H * 0.17 - 8} r={34} fill="black" />
        </mask>
      </defs>

      <rect width={W} height={H} fill="url(#sky)" className="sky-fade" />
      {(tod === 'dawn' || tod === 'dusk') && <rect width={W} height={H} fill="url(#glow)" opacity={0.55} />}

      {showNight && (
        <g opacity={tod === 'night' ? 1 : 0.45}>
          {city.stars.map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.s}
              fill={palette.star}
              className={still ? undefined : 'sky-twinkle'}
              style={{ animationDelay: `${s.d}s` }}
            />
          ))}
          <circle cx={W * 0.8} cy={H * 0.17} r={38} fill={palette.moon} mask="url(#crescent)" />
          <circle cx={W * 0.8} cy={H * 0.17} r={70} fill={palette.moon} opacity={0.06} />
        </g>
      )}

      {tod === 'night' && (
        <g className={still ? 'searchlights still' : 'searchlights'}>
          {[0.22, 0.58, 0.9].map((fx, i) => (
            <polygon
              key={i}
              className="beam"
              style={{ animationDelay: `${i * -3.3}s`, animationDuration: `${11 + i * 3}s` }}
              points={`${fx * W},${GROUND - 120} ${fx * W - 70},0 ${fx * W + 70},0`}
              fill={palette.searchlight}
            />
          ))}
        </g>
      )}

      {layers === 3 && renderLayer(city.far, palette.buildings[0], 3, 0.55)}
      {renderLayer(city.mid, palette.buildings[1], 4, 0.75)}
      {renderLayer(city.near, palette.buildings[2], 5, 0.9)}
    </svg>
  )
}

export const Skyline = memo(SkylineImpl)
