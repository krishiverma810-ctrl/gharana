import { memo, useMemo } from 'react'
import type { Palette, TimeOfDay } from '../theme/palettes'
import { mulberry32 } from '../theme/daily'

// The living skyline: a 3-layer city behind every room, synced to the local time where Krishi is.
//  • deco      — Melbourne: art deco towers, ziggurats, spires, fan-arch crowns, searchlights
//  • goldcoast — slim beachfront high-rises, the ocean with rolling waves, palm silhouettes
//  • india     — havelis with domes + chhatris, temple shikharas, kites at dusk, diyas at night

export type SkylineSkin = 'deco' | 'goldcoast' | 'india'

const W = 1200
const H = 700
const GROUND = H

type Top = 'flat' | 'stepped' | 'spire' | 'crown' | 'needle' | 'dome' | 'chhatri' | 'shikhara'

interface Building {
  x: number
  w: number
  h: number
  top: Top
  windows: { x: number; y: number; lit: number; twinkle: boolean; delay: number }[]
}

const TOPS: Record<SkylineSkin, Top[]> = {
  deco: ['flat', 'stepped', 'stepped', 'spire', 'crown', 'needle'],
  goldcoast: ['flat', 'flat', 'needle', 'spire', 'stepped'],
  india: ['dome', 'chhatri', 'flat', 'flat', 'shikhara', 'dome'],
}

function makeLayer(seed: number, skin: SkylineSkin, minH: number, maxH: number, minW: number, maxW: number, windowSize: number, ground = GROUND): Building[] {
  const r = mulberry32(seed)
  const out: Building[] = []
  let x = -30
  while (x < W + 30) {
    const w = Math.round(minW + r() * (maxW - minW))
    const h = Math.round(minH + r() * (maxH - minH))
    const tops = TOPS[skin]
    const top = tops[Math.floor(r() * tops.length)]
    const windows: Building['windows'] = []
    const gap = windowSize * 2.2
    for (let wy = ground - h + gap * 1.4; wy < ground - gap; wy += gap) {
      for (let wx = x + gap * 0.7; wx < x + w - gap * 0.7; wx += gap) {
        windows.push({ x: wx, y: wy, lit: r(), twinkle: r() < 0.06, delay: r() * 8 })
      }
    }
    out.push({ x, w, h, top, windows })
    x += w + Math.round(r() * (skin === 'goldcoast' ? 40 : 14)) - 4
  }
  return out
}

function BuildingShape({ b, fill, ground }: { b: Building; fill: string; ground: number }) {
  const top = ground - b.h
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
          <path d={`M ${b.x + b.w * 0.18} ${top - b.h * 0.05} A ${b.w * 0.32} ${b.w * 0.32} 0 0 1 ${b.x + b.w * 0.82} ${top - b.h * 0.05} Z`} />
        </>
      )}
      {b.top === 'dome' && (
        <>
          <rect x={b.x - 3} y={top - 4} width={b.w + 6} height={6} />
          <path d={`M ${b.x + b.w * 0.15} ${top} A ${b.w * 0.35} ${b.w * 0.38} 0 0 1 ${b.x + b.w * 0.85} ${top} Z`} />
          <rect x={cx - 1.5} y={top - b.w * 0.38 - 16} width={3} height={18} />
          <circle cx={cx} cy={top - b.w * 0.38 - 18} r={3} />
        </>
      )}
      {b.top === 'chhatri' && (
        <>
          <rect x={b.x - 3} y={top - 4} width={b.w + 6} height={6} />
          {[0.25, 0.75].map((f) => (
            <g key={f}>
              <rect x={b.x + b.w * f - 9} y={top - 16} width={2.5} height={14} />
              <rect x={b.x + b.w * f + 6.5} y={top - 16} width={2.5} height={14} />
              <path d={`M ${b.x + b.w * f - 12} ${top - 15} A 12 11 0 0 1 ${b.x + b.w * f + 12} ${top - 15} Z`} />
              <rect x={b.x + b.w * f - 1} y={top - 32} width={2} height={7} />
            </g>
          ))}
        </>
      )}
      {b.top === 'shikhara' && (
        <path
          d={`M ${b.x + b.w * 0.1} ${top} C ${b.x + b.w * 0.12} ${top - b.h * 0.35}, ${cx - 4} ${top - b.h * 0.55}, ${cx} ${top - b.h * 0.62} C ${cx + 4} ${top - b.h * 0.55}, ${b.x + b.w * 0.88} ${top - b.h * 0.35}, ${b.x + b.w * 0.9} ${top} Z`}
        />
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
  skin?: SkylineSkin
}

function SkylineImpl({ palette, tod, still = false, layers = 3, skin = 'deco' }: Props) {
  // The Gold Coast city sits a little higher so the beach + ocean fit in front.
  const ground = skin === 'goldcoast' ? GROUND - 70 : GROUND
  const city = useMemo(() => {
    const dims: Record<SkylineSkin, [number, number, number, number][]> = {
      deco: [[260, 470, 40, 90], [170, 360, 55, 120], [90, 230, 70, 150]],
      goldcoast: [[300, 520, 28, 60], [220, 440, 34, 70], [120, 300, 40, 80]],
      india: [[160, 300, 60, 120], [110, 220, 70, 140], [60, 140, 80, 160]],
    }
    const [far, mid, near] = dims[skin]
    return {
      far: makeLayer(101, skin, ...far, 3, ground),
      mid: makeLayer(202, skin, ...mid, 4, ground),
      near: makeLayer(303, skin, ...near, 5, ground),
      stars: Array.from({ length: 90 }, (_, i) => {
        const r = mulberry32(900 + i)
        return { x: r() * W, y: r() * H * 0.5, s: 0.6 + r() * 1.4, d: r() * 6 }
      }),
      kites: Array.from({ length: 7 }, (_, i) => {
        const r = mulberry32(500 + i)
        return { x: 80 + r() * (W - 160), y: 60 + r() * 220, s: 9 + r() * 8, rot: -20 + r() * 40, d: r() * 5, c: ['#ff4d6d', '#ffb02e', '#2ec4b6', '#9b5de5', '#f15bb5'][i % 5] }
      }),
      palms: [70, 310, 640, 900, 1130].map((x, i) => ({ x, h: 110 + ((i * 37) % 50), lean: i % 2 ? 1 : -1 })),
      diyas: Array.from({ length: 26 }, (_, i) => ({ x: 20 + i * 46 + ((i * 13) % 17), d: (i * 0.37) % 2 })),
    }
  }, [skin, ground])

  const [top, mid, bottom] = palette.sky[tod]
  const showNight = tod === 'night' || tod === 'dusk'
  const lit = LIT_RATE[tod]
  const winFill = palette.window

  const renderLayer = (bs: Building[], fill: string, size: number, opacity: number) => (
    <g>
      {bs.map((b, i) => (
        <BuildingShape key={i} b={b} fill={fill} ground={ground} />
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
                rx={skin === 'india' ? size / 2 : 0}
                className={w.twinkle && !still ? 'sky-twinkle' : undefined}
                style={w.twinkle ? { animationDelay: `${w.delay}s` } : undefined}
              />
            )),
        )}
      </g>
    </g>
  )

  return (
    <svg className="skyline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
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
        <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.accentSoft} stopOpacity="0.9" />
          <stop offset="100%" stopColor={palette.buildings[2]} />
        </linearGradient>
        <radialGradient id="diya">
          <stop offset="0%" stopColor="#fff2b0" />
          <stop offset="40%" stopColor="#ffb02e" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ff7b00" stopOpacity="0" />
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
            <circle key={i} cx={s.x} cy={s.y} r={s.s} fill={palette.star} className={still ? undefined : 'sky-twinkle'} style={{ animationDelay: `${s.d}s` }} />
          ))}
          <circle cx={W * 0.8} cy={H * 0.17} r={38} fill={palette.moon} mask="url(#crescent)" />
          <circle cx={W * 0.8} cy={H * 0.17} r={70} fill={palette.moon} opacity={0.06} />
        </g>
      )}

      {skin === 'deco' && tod === 'night' && (
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

      {skin === 'india' && tod !== 'night' && (
        <g>
          {city.kites.map((k, i) => (
            <g key={i} className={still ? undefined : 'kite'} style={{ animationDelay: `${k.d}s`, transformOrigin: `${k.x}px ${k.y}px` }}>
              <path d={`M ${k.x} ${k.y + k.s} q 14 ${30 + i * 4} -6 ${70 + i * 6}`} stroke={palette.buildings[0]} strokeWidth={0.8} fill="none" opacity={0.6} />
              <polygon transform={`rotate(${k.rot} ${k.x} ${k.y})`} points={`${k.x},${k.y - k.s} ${k.x + k.s * 0.8},${k.y} ${k.x},${k.y + k.s} ${k.x - k.s * 0.8},${k.y}`} fill={k.c} opacity={0.85} />
            </g>
          ))}
        </g>
      )}

      {layers === 3 && renderLayer(city.far, palette.buildings[0], 3, 0.55)}
      {renderLayer(city.mid, palette.buildings[1], 4, 0.75)}
      {renderLayer(city.near, palette.buildings[2], 5, 0.9)}

      {skin === 'goldcoast' && (
        <g>
          <rect x={0} y={ground} width={W} height={18} fill={palette.window} opacity={0.35} />
          <rect x={0} y={ground + 14} width={W} height={H - ground} fill="url(#sea)" />
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              className={still ? undefined : 'wave'}
              style={{ animationDelay: `${i * -2}s` }}
              d={`M -100 ${ground + 30 + i * 14} ${Array.from({ length: 16 }, () => `q 50 -8 100 0`).join(' ')}`}
              stroke={palette.ink}
              strokeOpacity={0.35 - i * 0.08}
              strokeWidth={1.4}
              fill="none"
            />
          ))}
          {city.palms.map((p, i) => (
            <g key={i} fill={palette.buildings[2]}>
              <path d={`M ${p.x} ${H} q ${p.lean * 10} ${-p.h / 2} ${p.lean * 22} ${-p.h}`} stroke={palette.buildings[2]} strokeWidth={6} fill="none" />
              {[-60, -25, 15, 50, 85].map((a) => (
                <path key={a} transform={`rotate(${a} ${p.x + p.lean * 22} ${H - p.h})`} d={`M ${p.x + p.lean * 22} ${H - p.h} q 26 -10 52 8 q -26 -4 -52 -8`} />
              ))}
            </g>
          ))}
        </g>
      )}

      {skin === 'india' && tod === 'night' && (
        <g>
          {city.diyas.map((d, i) => (
            <g key={i}>
              <circle cx={d.x} cy={H - 14} r={16} fill="url(#diya)" className={still ? undefined : 'diya'} style={{ animationDelay: `${d.d}s` }} />
              <path d={`M ${d.x - 7} ${H - 10} q 7 8 14 0 z`} fill="#b5651d" />
            </g>
          ))}
        </g>
      )}
    </svg>
  )
}

export const Skyline = memo(SkylineImpl)
