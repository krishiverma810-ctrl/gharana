// Default push reminders (edit them in Settings → Notifications).

export interface Reminder {
  id: string
  kind: 'water' | 'protein' | 'wake' | 'winddown' | 'study' | 'mehfil' | 'review' | 'custom'
  label: string
  body?: string
  times: string[]
  days: number[] // empty = every day
  on: boolean
}

export const DEFAULT_REMINDERS: Reminder[] = [
  { id: 'wake', kind: 'wake', label: 'Rise and shine, sir', body: 'Feet on the floor. Morning Rite awaits.', times: ['07:45'], days: [], on: true },
  { id: 'water', kind: 'water', label: 'Water check', times: ['10:30', '13:30', '16:30', '19:30'], days: [], on: true },
  { id: 'protein', kind: 'protein', label: 'Protein check', times: ['13:00', '19:00'], days: [], on: true },
  { id: 'study', kind: 'study', label: 'Deep study block', body: 'Phone face down. One focused block.', times: ['09:30'], days: [1, 2, 3, 4, 5], on: true },
  { id: 'winddown', kind: 'winddown', label: 'Wind down', body: 'Night Debrief, tomorrow’s Big 3, then screens off.', times: ['22:15'], days: [], on: true },
  { id: 'mehfil', kind: 'mehfil', label: 'Who’s gone cold?', body: 'Call someone in the Mehfil today.', times: ['18:00'], days: [0, 3], on: true },
  { id: 'review', kind: 'review', label: 'Sunday Review', body: 'ALFRED has read your week. Ten minutes, sir.', times: ['17:00'], days: [0], on: true },
]
