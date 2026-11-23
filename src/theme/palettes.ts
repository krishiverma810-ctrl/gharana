// The 9 daily palettes from v2. Pure data: add, edit or remove entries here
// (and, from Phase 1, from inside the app via Settings → Palettes).

export type SkyStop = [top: string, mid: string, bottom: string]
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night'

export interface Palette {
  id: string
  name: string
  /** Sky gradients for each time of day (top → horizon). */
  sky: Record<TimeOfDay, SkyStop>
  /** Building fills: far, middle, near layers. */
  buildings: [far: string, mid: string, near: string]
  window: string
  star: string
  moon: string
  searchlight: string
  /** UI tokens */
  accent: string
  accentSoft: string
  ink: string
  inkMuted: string
  surface: string
}

export const PALETTES: Palette[] = [
  {
    id: 'gilded-noir',
    name: 'GILDED NOIR',
    sky: {
      dawn: ['#1b1612', '#5a3b22', '#d39a52'],
      day: ['#2a241c', '#6b5638', '#c9a66b'],
      dusk: ['#120d0a', '#4a2a18', '#b8692e'],
      night: ['#050403', '#0f0c09', '#241b12'],
    },
    buildings: ['#1a1510', '#120e0a', '#0a0806'],
    window: '#f3c56b',
    star: '#f5e6c4',
    moon: '#f1e3bf',
    searchlight: 'rgba(243,197,107,0.16)',
    accent: '#d4af37',
    accentSoft: '#8a7230',
    ink: '#f4ead5',
    inkMuted: '#b5a58a',
    surface: 'rgba(14,11,8,0.72)',
  },
  {
    id: 'midnight-sapphire',
    name: 'MIDNIGHT SAPPHIRE',
    sky: {
      dawn: ['#0d1a33', '#3a4a7a', '#c98a6a'],
      day: ['#1d3466', '#3f5f9e', '#9fb7dc'],
      dusk: ['#0a1228', '#2b2d63', '#a8566c'],
      night: ['#02050f', '#07102a', '#122046'],
    },
    buildings: ['#0f1a38', '#0a1229', '#050a19'],
    window: '#9fd0ff',
    star: '#dbe8ff',
    moon: '#e8eefc',
    searchlight: 'rgba(159,208,255,0.14)',
    accent: '#c8a24a',
    accentSoft: '#3f5f9e',
    ink: '#eef2ff',
    inkMuted: '#9aa7c7',
    surface: 'rgba(5,10,25,0.72)',
  },
  {
    id: 'blackout-gold',
    name: 'BLACKOUT GOLD',
    sky: {
      dawn: ['#0a0a0a', '#2a2214', '#a07a2a'],
      day: ['#161616', '#3a3324', '#8f7a45'],
      dusk: ['#050505', '#1f170a', '#7a5414'],
      night: ['#000000', '#050505', '#0f0d08'],
    },
    buildings: ['#121212', '#0a0a0a', '#030303'],
    window: '#ffd24a',
    star: '#fff1c2',
    moon: '#fff4d1',
    searchlight: 'rgba(255,210,74,0.15)',
    accent: '#ffcc33',
    accentSoft: '#7a6420',
    ink: '#fff8e6',
    inkMuted: '#b8ad90',
    surface: 'rgba(0,0,0,0.74)',
  },
  {
    id: 'velvet-emerald',
    name: 'VELVET EMERALD',
    sky: {
      dawn: ['#071a14', '#24503e', '#d1a35e'],
      day: ['#0f3326', '#2c6b52', '#a9cfa9'],
      dusk: ['#04120d', '#1c3b2a', '#a8703a'],
      night: ['#010805', '#03140d', '#0a2619'],
    },
    buildings: ['#0a2219', '#061811', '#020c08'],
    window: '#e9d27a',
    star: '#e4f5e4',
    moon: '#eef7e4',
    searchlight: 'rgba(233,210,122,0.14)',
    accent: '#d6b456',
    accentSoft: '#2c6b52',
    ink: '#effaf0',
    inkMuted: '#9fbcaa',
    surface: 'rgba(2,12,8,0.72)',
  },
  {
    id: 'oxblood-royale',
    name: 'OXBLOOD ROYALE',
    sky: {
      dawn: ['#1f0a0c', '#5c2228', '#d98d5e'],
      day: ['#3a1518', '#7a3a3a', '#d6a08a'],
      dusk: ['#14060a', '#4a1420', '#b4503a'],
      night: ['#070203', '#14060a', '#2a0d12'],
    },
    buildings: ['#2a0e12', '#1c080b', '#0e0406'],
    window: '#ffc27a',
    star: '#ffe6d6',
    moon: '#fbe7d4',
    searchlight: 'rgba(255,194,122,0.14)',
    accent: '#d9a441',
    accentSoft: '#7a3a3a',
    ink: '#fdeee6',
    inkMuted: '#c49c94',
    surface: 'rgba(14,4,6,0.74)',
  },
  {
    id: 'smoke-brass',
    name: 'SMOKE & BRASS',
    sky: {
      dawn: ['#1c1c1e', '#4a4744', '#b89a6a'],
      day: ['#3a3a3c', '#6c6a66', '#b8b2a4'],
      dusk: ['#141416', '#3a3532', '#8f6d47'],
      night: ['#060607', '#101012', '#1d1c1c'],
    },
    buildings: ['#242426', '#18181a', '#0c0c0d'],
    window: '#e3b65f',
    star: '#ecebe6',
    moon: '#eceae2',
    searchlight: 'rgba(227,182,95,0.13)',
    accent: '#b5893f',
    accentSoft: '#6c6a66',
    ink: '#f1efe9',
    inkMuted: '#aaa59b',
    surface: 'rgba(12,12,13,0.74)',
  },
  {
    id: 'copper-duskline',
    name: 'COPPER DUSKLINE',
    sky: {
      dawn: ['#1e1214', '#6a3a2e', '#e8975a'],
      day: ['#3d2a28', '#9a5e44', '#e6b48a'],
      dusk: ['#160b10', '#5e2a2a', '#d96a2e'],
      night: ['#07040a', '#140a10', '#2a1416'],
    },
    buildings: ['#2a1614', '#1c0e0d', '#0e0706'],
    window: '#ffb066',
    star: '#ffe8d6',
    moon: '#fde3cc',
    searchlight: 'rgba(255,176,102,0.15)',
    accent: '#cf7f3e',
    accentSoft: '#9a5e44',
    ink: '#fdefe4',
    inkMuted: '#c7a089',
    surface: 'rgba(14,7,6,0.74)',
  },
  {
    id: 'peacock-club',
    name: 'PEACOCK CLUB',
    sky: {
      dawn: ['#04161a', '#1f4a56', '#c9a25e'],
      day: ['#0b3440', '#1f6a78', '#9fd0cf'],
      dusk: ['#03101a', '#1a2f4f', '#7a4a6a'],
      night: ['#010609', '#031218', '#082630'],
    },
    buildings: ['#06232b', '#04171d', '#020b0e'],
    window: '#f2d06b',
    star: '#d9f5f2',
    moon: '#e6f7f4',
    searchlight: 'rgba(242,208,107,0.14)',
    accent: '#d9b44a',
    accentSoft: '#1f6a78',
    ink: '#eafbf8',
    inkMuted: '#93bcbb',
    surface: 'rgba(2,11,14,0.74)',
  },
  {
    id: 'champagne-hour',
    name: 'CHAMPAGNE HOUR',
    sky: {
      dawn: ['#2a2420', '#8a6e5a', '#f2d2a8'],
      day: ['#5a4d40', '#a8927a', '#f0dfc4'],
      dusk: ['#1e1814', '#6e5240', '#e0a878'],
      night: ['#0a0807', '#16120f', '#2a221c'],
    },
    buildings: ['#2e2620', '#211b16', '#120f0c'],
    window: '#fff0c2',
    star: '#fff8e8',
    moon: '#fff6e2',
    searchlight: 'rgba(255,240,194,0.15)',
    accent: '#e6c98a',
    accentSoft: '#8a6e5a',
    ink: '#fff9ee',
    inkMuted: '#cdbca4',
    surface: 'rgba(18,15,12,0.72)',
  },
]

// ── Phase 2: 7 more daily palettes ──────────────────────────────────
const mk = (id: string, name: string, sky: Palette['sky'], b: Palette['buildings'], window: string, accent: string, accentSoft: string, ink: string, inkMuted: string, surface: string): Palette => ({
  id, name, sky, buildings: b, window, star: '#fff6e0', moon: '#fff3d6', searchlight: `${window}26`, accent, accentSoft, ink, inkMuted, surface,
})

PALETTES.push(
  mk('saffron-speakeasy', 'SAFFRON SPEAKEASY', { dawn: ['#1a0f08', '#5e3412', '#f0a43a'], day: ['#3a2410', '#8a5a22', '#f2c36a'], dusk: ['#140a06', '#5a2a0e', '#e8822a'], night: ['#060302', '#120905', '#26140a'] }, ['#2a170a', '#1c0f06', '#0e0703'], '#ffb347', '#f2a93b', '#8a5a22', '#fff1df', '#d2ad86', 'rgba(14,7,3,0.74)'),
  mk('crimson-marquee', 'CRIMSON MARQUEE', { dawn: ['#1a0608', '#5a141c', '#e0784a'], day: ['#3a0c12', '#7a2028', '#e8a07a'], dusk: ['#12040a', '#4a0c1c', '#c83a2a'], night: ['#060103', '#12040a', '#280a12'] }, ['#2a0a10', '#1a060a', '#0c0305'], '#ffd27a', '#e8b24a', '#7a2028', '#fff0ea', '#d09a94', 'rgba(12,3,5,0.74)'),
  mk('ivory-onyx', 'IVORY & ONYX', { dawn: ['#1c1a18', '#5a5248', '#e8dcc4'], day: ['#4a4640', '#8a8478', '#efe6d4'], dusk: ['#141210', '#3e3832', '#bfa47a'], night: ['#040404', '#0c0c0c', '#1a1a1a'] }, ['#262422', '#181716', '#0a0a0a'], '#fff8e6', '#e8dcc4', '#5a5248', '#ffffff', '#bdb6aa', 'rgba(10,10,10,0.74)'),
  mk('rosewood-lounge', 'ROSEWOOD LOUNGE', { dawn: ['#1a0e10', '#5a2e34', '#e8a08a'], day: ['#3a2026', '#7a4a52', '#e6bcb0'], dusk: ['#140a0e', '#4a2030', '#c86a5a'], night: ['#060305', '#120a0e', '#24121a'] }, ['#2a161c', '#1c0e12', '#0e0709'], '#ffc8a0', '#d89a7a', '#7a4a52', '#fdeee8', '#caa29a', 'rgba(14,7,9,0.74)'),
  mk('indigo-raj', 'INDIGO RAJ', { dawn: ['#0a0a22', '#2e2a6a', '#d89a5a'], day: ['#141a4a', '#33408a', '#a8b4e0'], dusk: ['#080820', '#2a1e5a', '#b05a6a'], night: ['#02020a', '#06061a', '#10123a'] }, ['#10123a', '#0a0c28', '#050614'], '#f2c66a', '#d8b04a', '#33408a', '#eef0ff', '#9ea4d0', 'rgba(5,6,20,0.74)'),
  mk('amethyst-cabaret', 'AMETHYST CABARET', { dawn: ['#140a1a', '#46285a', '#d890a8'], day: ['#2a1a3a', '#5e3a7a', '#c8a8e0'], dusk: ['#0e0614', '#3a1a4e', '#a04a8a'], night: ['#050208', '#0e0614', '#1e0e2a'] }, ['#1e1028', '#140a1c', '#09050e'], '#ffd0f0', '#c99ae0', '#5e3a7a', '#f8eeff', '#b8a2cc', 'rgba(9,5,14,0.74)'),
  mk('steel-sunset', 'STEEL & SUNSET', { dawn: ['#10141a', '#3a4a5a', '#e89a6a'], day: ['#26323e', '#5a6e82', '#c8d4de'], dusk: ['#0c1016', '#2e3a4a', '#e0703a'], night: ['#030406', '#080c12', '#141c26'] }, ['#1a222c', '#11171e', '#080b0f'], '#ffb070', '#e8904a', '#5a6e82', '#eef3f8', '#a2b0be', 'rgba(8,11,15,0.74)'),
)

// ── Location skins (used automatically when travelling; not in the daily rotation) ──
export const SKINS: Record<'goldcoast' | 'india', Palette> = {
  goldcoast: mk('skin-goldcoast', 'GOLD COAST — SURF GOLD', { dawn: ['#0a2a3a', '#3a7a8a', '#f2c07a'], day: ['#0a5a7a', '#3aa0b8', '#bfe8ee'], dusk: ['#0a1a2a', '#2a4a6a', '#f08a4a'], night: ['#010a12', '#031824', '#082838'] }, ['#0e3444', '#082430', '#04141c'], '#ffe08a', '#f2c94c', '#2a9aa8', '#f2fbfc', '#9cc8ce', 'rgba(3,20,28,0.72)'),
  india: mk('skin-india', 'INDIA — MARIGOLD & DIYA', { dawn: ['#2a1206', '#8a3a10', '#ffb84a'], day: ['#5a2a0a', '#c8641a', '#ffd88a'], dusk: ['#1e0a08', '#7a2a14', '#ff8a2a'], night: ['#080304', '#160806', '#2a120a'] }, ['#3a1a0c', '#260f06', '#140803'], '#ffb02e', '#ff9f1c', '#c8641a', '#fff3e0', '#e0b48a', 'rgba(20,8,3,0.74)'),
}
