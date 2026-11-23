// Every room in the Estate, grouped into wings. `phase` = which build phase opens it.
// Rename / hide / pin rooms in Settings — this file is only the default blueprint.

export interface WingDef {
  id: string
  numeral: string
  name: string
}

export interface RoomDef {
  id: string
  path: string
  name: string
  wing: string
  icon: string
  accent: string
  phase: number
  blurb: string
}

export const WINGS: WingDef[] = [
  { id: 'hall', numeral: 'I', name: 'THE GRAND HALL' },
  { id: 'library', numeral: 'II', name: 'THE LIBRARY' },
  { id: 'patrol', numeral: 'III', name: 'THE PATROL' },
  { id: 'board', numeral: 'IV', name: 'THE BOARDROOM' },
  { id: 'mehfil', numeral: 'V', name: 'MEHFIL' },
  { id: 'game', numeral: 'VI', name: 'THE GAME ROOM' },
  { id: 'travel', numeral: 'VII', name: 'THE TRAVEL WING' },
  { id: 'butler', numeral: 'VIII', name: 'THE BUTLER' },
  { id: 'engine', numeral: 'IX', name: 'THE ENGINE ROOM' },
]

export const ROOMS: RoomDef[] = [
  { id: 'lounge', path: '/', name: 'THE LOUNGE', wing: 'hall', icon: 'lounge', accent: '#d4af37', phase: 1, blurb: 'Daily command' },
  { id: 'morning', path: '/morning', name: 'MORNING RITE', wing: 'hall', icon: 'sun', accent: '#e8a85a', phase: 1, blurb: 'Guided wake-up' },
  { id: 'night', path: '/night', name: 'NIGHT DEBRIEF', wing: 'hall', icon: 'moon', accent: '#8c9ad6', phase: 1, blurb: 'Close the day' },
  { id: 'rites', path: '/rites', name: 'DAILY RITES', wing: 'hall', icon: 'rites', accent: '#c9a44a', phase: 1, blurb: 'Habit engine' },
  { id: 'blueprint', path: '/blueprint', name: 'BLUEPRINT', wing: 'hall', icon: 'blueprint', accent: '#5aa0c8', phase: 1, blurb: 'Timetable + focus' },
  { id: 'calendar', path: '/calendar', name: 'THE CALENDAR ROOM', wing: 'hall', icon: 'calendar', accent: '#b08ad0', phase: 2, blurb: 'Countdowns + .ics' },

  { id: 'study', path: '/study', name: 'THE STUDY', wing: 'library', icon: 'study', accent: '#4a8fb8', phase: 3, blurb: 'Uni + flashcards' },
  { id: 'dental', path: '/dental', name: 'THE DENTAL WING', wing: 'library', icon: 'tooth', accent: '#9fd0e0', phase: 3, blurb: 'Road to DDS' },
  { id: 'reading', path: '/reading', name: 'THE READING ROOM', wing: 'library', icon: 'book', accent: '#a07a50', phase: 3, blurb: 'Books + ideas' },
  { id: 'forge', path: '/forge', name: 'THE SKILLS FORGE', wing: 'library', icon: 'forge', accent: '#d07a3a', phase: 3, blurb: 'Keys, cooking, skills' },

  { id: 'patrol', path: '/patrol', name: 'PATROL', wing: 'patrol', icon: 'patrol', accent: '#c0573e', phase: 1, blurb: 'Training + PRs' },
  { id: 'bulk', path: '/bulk', name: 'THE BULK LEDGER', wing: 'patrol', icon: 'scale', accent: '#6aa06a', phase: 4, blurb: 'Weight + food' },
  { id: 'grooming', path: '/grooming', name: 'THE GROOMING ROOM', wing: 'patrol', icon: 'comb', accent: '#c98aa0', phase: 4, blurb: 'Skin, hair, scent' },

  { id: 'closer', path: '/closer', name: 'THE CLOSER', wing: 'board', icon: 'deal', accent: '#d4af37', phase: 3, blurb: 'Deals board' },
  { id: 'vault', path: '/vault', name: 'THE VAULT', wing: 'board', icon: 'vault', accent: '#c9a44a', phase: 1, blurb: 'Money + goals' },
  { id: 'nazara', path: '/nazara', name: 'NAZARA HQ', wing: 'board', icon: 'brand', accent: '#b0563a', phase: 3, blurb: 'The brand' },
  { id: 'ksvol1', path: '/ksvol1', name: 'K.S. VOL. 1 STUDIO', wing: 'board', icon: 'camera', accent: '#e05a7a', phase: 3, blurb: 'TikTok with Sidak' },
  { id: 'applab', path: '/applab', name: 'THE APP LAB', wing: 'board', icon: 'lab', accent: '#5ac0a0', phase: 3, blurb: 'Scroll app + changelog' },
  { id: 'jobs', path: '/jobs', name: 'THE JOB DESK', wing: 'board', icon: 'briefcase', accent: '#8a8a6a', phase: 3, blurb: 'Applications + P licence' },
  { id: 'mpa', path: '/mpa', name: 'MPA DESK', wing: 'board', icon: 'brush', accent: '#e0a030', phase: 3, blurb: 'Poster queue' },

  { id: 'mehfil', path: '/mehfil', name: 'MEHFIL', wing: 'mehfil', icon: 'people', accent: '#4f9a6a', phase: 4, blurb: 'Your circle' },
  { id: 'deepali', path: '/deepali', name: 'DEEPALI’S CORNER', wing: 'mehfil', icon: 'heart', accent: '#d06a80', phase: 2, blurb: 'Dates + time zones' },
  { id: 'family', path: '/family', name: 'FAMILY ROOM', wing: 'mehfil', icon: 'home', accent: '#e8902a', phase: 2, blurb: 'India mode' },
  { id: 'mentor', path: '/mentor', name: 'THE MENTOR’S STUDY', wing: 'mehfil', icon: 'mentor', accent: '#c8b070', phase: 4, blurb: 'Future self at 30' },

  { id: 'wildcard', path: '/wildcard', name: 'WILDCARD', wing: 'game', icon: 'dice', accent: '#d04a4a', phase: 2, blurb: 'Spin a mission' },
  { id: 'trophy', path: '/trophy', name: 'THE TROPHY HALL', wing: 'game', icon: 'trophy', accent: '#e0c050', phase: 4, blurb: 'Wins + XP' },
  { id: 'challenges', path: '/challenges', name: 'THE CHALLENGE BOARD', wing: 'game', icon: 'flag', accent: '#c06040', phase: 4, blurb: '7/30/75-day' },
  { id: 'jukebox', path: '/jukebox', name: 'THE JUKEBOX', wing: 'game', icon: 'music', accent: '#9a5ad0', phase: 4, blurb: 'Lock-in playlists' },

  { id: 'concierge', path: '/concierge', name: 'THE CONCIERGE', wing: 'travel', icon: 'plane', accent: '#3ab0b0', phase: 2, blurb: 'Trips + packing' },

  { id: 'alfred', path: '/alfred', name: 'ALFRED', wing: 'butler', icon: 'alfred', accent: '#d4af37', phase: 2, blurb: 'Your AI confidant' },

  { id: 'settings', path: '/settings', name: 'SETTINGS', wing: 'engine', icon: 'settings', accent: '#a0a0a0', phase: 1, blurb: 'The controls' },
  { id: 'archive', path: '/archive', name: 'THE ARCHIVE', wing: 'engine', icon: 'archive', accent: '#8a7a6a', phase: 4, blurb: 'Every past day' },
  { id: 'inbox', path: '/inbox', name: 'INBOX', wing: 'engine', icon: 'inbox', accent: '#7a9ab0', phase: 4, blurb: 'Captured ideas' },
]

export const CORRIDOR = { id: 'corridor', path: '/corridor', name: 'THE CORRIDOR', icon: 'corridor', accent: '#d4af37' }

export const roomById = (id: string) => ROOMS.find((r) => r.id === id)
export const roomByPath = (path: string) => ROOMS.find((r) => r.path === path)

/** Rooms with phase ≤ this are built and open; later ones show as locked doors. */
export const BUILT_PHASE = 2
export const isOpen = (r: RoomDef) => r.phase <= BUILT_PHASE
