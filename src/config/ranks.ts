// Streak ranks — THE PROSPECT to THE DON. Insignia = deco glyph + number of chevrons.

export interface Rank {
  name: string
  minDays: number
  glyph: string
  chevrons: number
}

export const RANKS: Rank[] = [
  { name: 'THE PROSPECT', minDays: 0, glyph: '◇', chevrons: 0 },
  { name: 'THE ASSOCIATE', minDays: 3, glyph: '◆', chevrons: 0 },
  { name: 'THE RUNNER', minDays: 5, glyph: '◆', chevrons: 1 },
  { name: 'THE REGULAR', minDays: 7, glyph: '✦', chevrons: 1 },
  { name: 'THE OPERATOR', minDays: 10, glyph: '✦', chevrons: 2 },
  { name: 'THE CAPTAIN', minDays: 14, glyph: '❖', chevrons: 2 },
  { name: 'THE LIEUTENANT', minDays: 21, glyph: '❖', chevrons: 3 },
  { name: 'THE CONSIGLIERE', minDays: 30, glyph: '✶', chevrons: 3 },
  { name: 'THE UNDERBOSS', minDays: 45, glyph: '✷', chevrons: 3 },
  { name: 'THE BARON', minDays: 60, glyph: '✸', chevrons: 4 },
  { name: 'THE MOGUL', minDays: 75, glyph: '✹', chevrons: 4 },
  { name: 'THE TYCOON', minDays: 100, glyph: '✺', chevrons: 4 },
  { name: 'THE MAGNATE', minDays: 150, glyph: '❂', chevrons: 5 },
  { name: 'THE PATRIARCH', minDays: 200, glyph: '♜', chevrons: 5 },
  { name: 'THE DON', minDays: 365, glyph: '♛', chevrons: 5 },
]

export function rankFor(days: number): { rank: Rank; next: Rank | null } {
  let i = 0
  while (i + 1 < RANKS.length && days >= RANKS[i + 1].minDays) i++
  return { rank: RANKS[i], next: RANKS[i + 1] ?? null }
}
