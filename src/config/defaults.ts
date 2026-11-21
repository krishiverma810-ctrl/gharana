// Starting data written into the database on first run. After that, everything is edited in-app.
import type { Block, BlockCategory, Goal, Habit, Template } from '../db/types'

const now = Date.now()
const h = (id: string, name: string, p: Partial<Habit> & Pick<Habit, 'group' | 'sets'>, order: number): Habit => ({
  id, name, type: 'check', target: 1, order, createdAt: now, ...p,
})

export const DEFAULT_HABITS: Habit[] = [
  // The Big Five
  h('boxing', 'Boxing', { group: 'big5', sets: ['home'], type: 'duration', target: 30, unit: 'min' }, 1),
  h('keys', 'Keyboard', { group: 'big5', sets: ['home'], type: 'duration', target: 20, unit: 'min' }, 2),
  h('sport', 'Sport / Gym', { group: 'big5', sets: ['home'] }, 3),
  h('study', 'Deep Study', { group: 'big5', sets: ['home'], type: 'duration', target: 60, unit: 'min' }, 4),
  h('cook', 'Cook Something New', { group: 'big5', sets: ['home'], type: 'weekly', target: 2 }, 5),
  // Maintenance
  h('brush', 'Brush ×2', { group: 'maintenance', sets: ['home', 'travel', 'india'], type: 'count', target: 2 }, 10),
  h('facewash', 'Face Wash', { group: 'maintenance', sets: ['home', 'travel', 'india'] }, 11),
  h('skincare', 'Skincare', { group: 'maintenance', sets: ['home', 'travel', 'india'] }, 12),
  h('sunlight', 'Morning Sunlight', { group: 'maintenance', sets: ['home', 'travel', 'india'] }, 13),
  h('roomreset', 'Room Reset', { group: 'maintenance', sets: ['home'] }, 14),
  // Minimum Daily 3 — the travel set that survives chaos
  h('min-move', 'Move 20 min', { group: 'minimum', sets: ['travel', 'india'], type: 'duration', target: 20, unit: 'min' }, 20),
  h('min-mind', 'Learn 15 min', { group: 'minimum', sets: ['travel', 'india'], type: 'duration', target: 15, unit: 'min' }, 21),
  h('min-reset', 'Reset: water + skin + bed on time', { group: 'minimum', sets: ['travel', 'india'] }, 22),
  // India
  h('family', 'Family Time', { group: 'custom', sets: ['india'] }, 30),
]

let bid = 0
const b = (start: string, end: string, title: string, category: BlockCategory): Block => ({
  id: `b${++bid}`, start, end, title, category,
})

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'weekday', name: 'Weekday', order: 1,
    blocks: [
      b('07:30', '08:00', 'Morning Rite', 'body'),
      b('08:00', '08:30', 'Breakfast + protein', 'fuel'),
      b('08:30', '10:30', 'Deep Study', 'mind'),
      b('10:30', '11:30', 'Boxing', 'body'),
      b('11:30', '12:30', 'Lunch + reset', 'fuel'),
      b('12:30', '14:30', 'NAZARA / Content', 'create'),
      b('14:30', '15:00', 'Keyboard', 'mind'),
      b('15:00', '16:30', 'Gym / Sport', 'body'),
      b('16:30', '18:00', 'Free / errands', 'free'),
      b('18:00', '19:00', 'Cook + dinner', 'fuel'),
      b('19:00', '21:00', 'Social / family', 'social'),
      b('21:00', '22:30', 'Study review + reading', 'mind'),
      b('22:30', '23:00', 'Night Debrief', 'admin'),
      b('23:00', '07:30', 'Sleep', 'sleep'),
    ],
  },
  {
    id: 'weekend', name: 'Weekend', order: 2,
    blocks: [
      b('08:30', '09:00', 'Morning Rite', 'body'),
      b('09:00', '10:00', 'Breakfast', 'fuel'),
      b('10:00', '11:30', 'Sport', 'body'),
      b('11:30', '13:00', 'Cook something new', 'fuel'),
      b('13:00', '16:00', 'NAZARA / K.S. VOL. 1', 'create'),
      b('16:00', '19:00', 'Mates / family', 'social'),
      b('19:00', '21:30', 'Free', 'free'),
      b('21:30', '22:00', 'Plan the week', 'admin'),
      b('22:00', '23:00', 'Wind down + debrief', 'admin'),
      b('23:00', '08:30', 'Sleep', 'sleep'),
    ],
  },
  {
    id: 'shift', name: 'GYG Shift Day', order: 3,
    blocks: [
      b('08:00', '08:30', 'Morning Rite', 'body'),
      b('08:30', '10:00', 'Deep Study', 'mind'),
      b('10:00', '11:00', 'Boxing (short)', 'body'),
      b('11:00', '11:45', 'Eat + prep', 'fuel'),
      b('12:00', '18:00', 'GYG Shift', 'work'),
      b('18:30', '19:30', 'Dinner + protein', 'fuel'),
      b('19:30', '20:00', 'Keyboard', 'mind'),
      b('20:00', '22:00', 'Recover / social', 'social'),
      b('22:00', '22:30', 'Night Debrief', 'admin'),
      b('22:30', '08:00', 'Sleep', 'sleep'),
    ],
  },
  {
    id: 'uni', name: 'Uni Day', order: 4,
    blocks: [
      b('07:00', '07:30', 'Morning Rite', 'body'),
      b('07:30', '08:30', 'Commute + flashcards', 'mind'),
      b('08:30', '16:00', 'Campus', 'mind'),
      b('16:00', '17:00', 'Gym', 'body'),
      b('17:00', '18:00', 'Commute home', 'free'),
      b('18:00', '19:00', 'Dinner', 'fuel'),
      b('19:00', '21:00', 'Retrieval practice', 'mind'),
      b('21:00', '22:30', 'Free', 'free'),
      b('22:30', '23:00', 'Night Debrief', 'admin'),
      b('23:00', '07:00', 'Sleep', 'sleep'),
    ],
  },
  {
    id: 'travel', name: 'Travel Day', order: 5,
    blocks: [
      b('08:00', '08:30', 'Minimum Daily 3 — start', 'body'),
      b('08:30', '12:00', 'Beach / explore', 'social'),
      b('12:00', '13:00', 'Lunch + protein', 'fuel'),
      b('13:00', '13:30', 'Hotel workout', 'body'),
      b('13:30', '18:00', 'With the boys', 'social'),
      b('18:00', '18:30', 'Content capture', 'create'),
      b('18:30', '22:30', 'Dinner + night out', 'social'),
      b('22:30', '23:00', 'Quick debrief', 'admin'),
      b('23:00', '08:00', 'Sleep', 'sleep'),
    ],
  },
  {
    id: 'india', name: 'India Family Day', order: 6,
    blocks: [
      b('07:30', '08:00', 'Morning Rite (light)', 'body'),
      b('08:00', '09:00', 'Chai + family breakfast', 'social'),
      b('09:00', '09:30', 'No-equipment workout', 'body'),
      b('09:30', '10:00', 'Learn 15 min', 'mind'),
      b('10:00', '18:00', 'Family / visits / weddings', 'social'),
      b('18:00', '18:30', 'Call Deepali window', 'social'),
      b('18:30', '22:00', 'Family dinner', 'social'),
      b('22:00', '22:30', 'Quick debrief', 'admin'),
      b('22:30', '07:30', 'Sleep', 'sleep'),
    ],
  },
]

export const DEFAULT_GOALS: Goal[] = [
  { id: 'mx5', name: 'Mazda MX-5 Fund', emoji: '🏎️', target: 25000, order: 1 },
  { id: 'india', name: 'India Trip Spending', emoji: '🪔', target: 1500, order: 2 },
  { id: 'goldcoast', name: 'Gold Coast Budget', emoji: '🌊', target: 600, order: 3 },
  { id: 'iphone', name: 'New iPhone', emoji: '📱', target: 1800, order: 4 },
]

export const CATEGORY_COLORS: Record<BlockCategory, string> = {
  sleep: '#5b6b9a',
  body: '#c0573e',
  mind: '#4a8fb8',
  work: '#8a6a3a',
  create: '#b0569a',
  social: '#4f9a6a',
  fuel: '#c99a3a',
  admin: '#7a7a7a',
  free: '#6a5a8a',
}

export const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Fits', 'Going out', 'Gym / sport', 'Subscriptions', 'Bills / rent', 'Gifts', 'NAZARA', 'Travel', 'Other']
export const INCOME_CATEGORIES = ['GYG pay', 'NAZARA sales', 'Design work', 'Gift', 'Other']
