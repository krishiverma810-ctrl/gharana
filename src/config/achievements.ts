import type { Stats } from '../lib/stats'

// THE TROPHY HALL — 100+ achievements, all derived from real data.

export interface Achievement {
  id: string
  name: string
  desc: string
  glyph: string
  test: (s: Stats) => boolean
  /** 0–1 progress toward unlocking (for the locked view). */
  progress: (s: Stats) => number
}

const tiers = (key: keyof Stats, glyph: string, unit: string, list: [number, string][]): Achievement[] =>
  list.map(([n, name]) => ({
    id: `${String(key)}-${n}`,
    name,
    desc: `${n.toLocaleString()} ${unit}`,
    glyph,
    test: (s) => (s[key] as number) >= n,
    progress: (s) => Math.min(1, (s[key] as number) / n),
  }))

export const ACHIEVEMENTS: Achievement[] = [
  ...tiers('habitsDone', '✓', 'habits ticked', [[1, 'First Stamp'], [25, 'Getting Warm'], [100, 'Centurion'], [250, 'Creature of Habit'], [500, 'Machine'], [1000, 'The Thousand'], [2500, 'Unbreakable']]),
  ...tiers('bestStreak', '✦', 'day streak (best)', [[3, 'Three in a Row'], [7, 'A Full Week'], [14, 'Fortnight Strong'], [30, 'The Month'], [60, 'Two Months Deep'], [100, 'Triple Digits'], [200, 'Relentless'], [365, 'The Year']]),
  ...tiers('fullHouseDays', '♛', 'full-house days (all Big Five)', [[1, 'Full House'], [7, 'Royal Week'], [30, 'House Always Wins']]),
  ...tiers('workouts', '🥊', 'training sessions', [[1, 'First Patrol'], [10, 'Regular'], [25, 'Committed'], [50, 'Half-Century'], [100, 'Iron Habit'], [250, 'Built Different']]),
  ...tiers('workoutMinutes', '⏱', 'minutes trained', [[420, 'One Week’s Worth'], [3000, '50 Hours of Work'], [6000, '100 Hours of Work']]),
  ...tiers('prs', '🏋', 'personal records', [[1, 'First PR'], [5, 'Getting Stronger'], [20, 'PR Machine'], [50, 'The Vault Is Full']]),
  ...tiers('focusHours', '◎', 'hours of deep focus', [[1, 'First Hour'], [10, 'Ten Deep'], [50, 'Monk Mode'], [100, 'Hundred-Hour Mind'], [250, 'Scholar']]),
  ...tiers('dealsWon', '★', 'deals closed', [[1, 'Closer'], [5, 'Dealmaker'], [10, 'The Specter'], [25, 'Name Partner']]),
  ...tiers('cards', '▤', 'flashcards made', [[10, 'Deck Started'], [100, 'Card Shark'], [500, 'Library of Cards']]),
  ...tiers('reviews', '↻', 'flashcard reviews', [[50, 'Retrieval Rookie'], [500, 'Memory Palace'], [2000, 'Forgetting-Curve Slayer']]),
  ...tiers('booksDone', '📖', 'books finished', [[1, 'First Shelf'], [5, 'Bookworm'], [10, 'Well-Read'], [25, 'Bibliophile']]),
  ...tiers('pagesRead', '❦', 'pages read', [[100, 'Hundred Pages'], [1000, 'Thousand Pages'], [5000, 'Five Thousand']]),
  ...tiers('waterDays', '💧', 'days at your water target', [[1, 'Hydrated'], [7, 'Week of Water'], [30, 'Hydration Habit'], [100, 'Well Watered']]),
  ...tiers('proteinDays', '⚡', 'days at your protein target', [[1, 'Fuelled'], [7, 'Protein Week'], [30, 'Bulk Mode'], [100, 'Built on Protein']]),
  ...tiers('morningRites', '☀', 'Morning Rites completed', [[1, 'First Light'], [7, 'Morning Person (Allegedly)'], [30, 'Dawn Patrol'], [100, 'Sunrise Society']]),
  ...tiers('earlyWakes', '⏰', 'days up before your wake target', [[3, 'Early Bird'], [7, 'Up Before 8, a Week'], [30, 'The 10am Era Is Over'], [100, 'Owns the Morning']]),
  ...tiers('debriefs', '☾', 'Night Debriefs filed', [[1, 'Honest Ledger'], [7, 'Week Reviewed'], [30, 'Month of Reflection'], [100, 'Self-Aware']]),
  ...tiers('missionsDone', '🎲', 'Wildcard missions', [[1, 'Wildcard'], [10, 'Mission Runner'], [50, 'Agent of Chaos'], [100, 'Hundred Missions']]),
  ...tiers('savedTotal', '$', 'dollars saved into funds', [[100, 'First Hundred'], [1000, 'Four Figures'], [5000, 'Serious Saver'], [25000, 'MX-5 Money']]),
  ...tiers('goalsFunded', '🏎', 'funds fully funded', [[1, 'Secured the Bag'], [3, 'Triple Funded']]),
  ...tiers('packedTrips', '✈', 'trips fully packed', [[1, 'Packed and Ready'], [3, 'Seasoned Traveller']]),
  ...tiers('memories', '🧠', 'Memory Bank entries', [[1, 'ALFRED Remembers'], [10, 'Known by the Butler']]),
  ...tiers('contacts', '☍', 'check-ins with your people', [[1, 'Reached Out'], [25, 'Good Friend'], [100, 'Pillar of the Mehfil']]),
  ...tiers('socialReps', '🗣', 'social confidence reps', [[1, 'First Rep'], [12, 'Easy Level Cleared'], [30, 'Smooth'], [60, 'Social Heavyweight']]),
  ...tiers('challengesDone', '⚑', 'challenges completed', [[1, 'Challenger'], [5, 'Challenge Collector']]),
  ...tiers('bodyLogs', '⚖', 'body check-ins', [[1, 'On the Scale'], [30, 'Tracking the Bulk']]),
  ...tiers('dishes', '♨', 'new dishes cooked', [[1, 'First Dish'], [10, 'Home Chef'], [25, 'Head Chef']]),
  ...tiers('maxSkillHours', '⚒', 'hours on one skill', [[20, 'Past the Awkward Stage'], [100, 'Hundred-Hour Craft']]),
  ...tiers('studyHours', '✎', 'hours of logged study', [[10, 'Study Started'], [50, 'Library Regular'], [200, 'Future Doctor']]),
  ...tiers('gamsatTests', '🦷', 'GAMSAT practice tests', [[1, 'First Practice Test'], [5, 'Test Hardened']]),
  ...tiers('expHours', '⚕', 'experience hours', [[10, 'Hands-On'], [50, 'Experienced'], [100, 'Portfolio Strong']]),
  ...tiers('applications', '✉', 'job applications', [[1, 'Put Yourself Out There'], [10, 'Persistent']]),
  ...tiers('drivingHours', '🚗', 'logbook hours', [[10, 'Behind the Wheel'], [60, 'Halfway to P'], [120, 'Logbook Complete']]),
  ...tiers('ksPosts', '▶', 'K.S. VOL. 1 videos posted', [[1, 'Posted'], [10, 'Consistent Creator'], [50, 'Fifty Uploads']]),
  ...tiers('ksViews', '👁', 'total views', [[1000, 'First Thousand'], [10000, 'Ten K'], [100000, 'Six Figures of Eyes']]),
  ...tiers('nazaraSales', '◈', 'dollars of NAZARA sales', [[100, 'First Sale'], [1000, 'Four-Figure Brand'], [10000, 'Five-Figure Brand']]),
  ...tiers('postersDelivered', '✒', 'MPA posters delivered', [[1, 'Designer'], [10, 'Community Artist']]),
  ...tiers('captures', '✎', 'ideas captured', [[10, 'Idea Collector'], [100, 'Idea Machine']]),
  ...tiers('daysActive', '🏛', 'days in the house', [[7, 'Moved In'], [30, 'Resident'], [100, 'Part of the Furniture'], [365, 'One Year in the Estate']]),
  ...tiers('proudDays', '♚', 'days 30-year-old you would be proud of', [[1, 'Made Him Proud'], [30, 'A Month to Be Proud Of'], [100, 'The Man You Needed']]),
]
