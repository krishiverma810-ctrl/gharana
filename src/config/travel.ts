// Trip + packing templates. Seeded once; edit everything in the Concierge.
import type { PackItem, Trip } from '../db/types'

let n = 0
const pk = (cat: string, items: string[]): PackItem[] => items.map((text) => ({ id: `pk${++n}`, text, cat, done: false }))

export const BEACH_PACKING: PackItem[] = [
  ...pk('Clothes', ['Boardshorts ×2', 'Swimmers', 'Tees ×5', 'Going-out fits ×2', 'Shorts ×3', 'Undies + socks ×7', 'Sleepwear', 'Light jacket', 'Thongs / slides', 'Sneakers', 'Cap']),
  ...pk('Beach', ['Sunscreen SPF 50', 'Sunnies', 'Beach towel', 'Rashie', 'After-sun / aloe', 'Waterproof phone pouch']),
  ...pk('Training', ['Gym fit ×2', 'Hand wraps', 'Skipping rope', 'Resistance band']),
  ...pk('Grooming', ['Toothbrush + paste', 'Face wash', 'Moisturiser', 'Deodorant', 'Cologne (travel size)', 'Hair product', 'Razor']),
  ...pk('Tech', ['Phone charger', 'Power bank', 'AirPods', 'Camera / gimbal for content', 'Adapter not needed (AU)']),
]

export const INDIA_PACKING: PackItem[] = [
  ...pk('Documents', ['Passport (6+ months valid)', 'e-Visa / OCI printout', 'Flight tickets', 'Travel insurance', 'Copies of passport (paper + phone)', 'Some INR cash', 'Card with no foreign fees']),
  ...pk('Clothes', ['Kurta pyjama sets ×2', 'Wedding outfit(s) + shoes', 'Nehru jacket', 'Jeans ×2', 'Tees ×8', 'Warm layer (North India winter nights)', 'Hoodie', 'Undies + socks ×10', 'Slides', 'Sneakers', 'Formal shoes']),
  ...pk('Health', ['Prescription meds', 'Gastro stopper + ORS sachets', 'Hand sanitiser', 'Mozzie repellent', 'Probiotics', 'Basic first aid', 'Water purifier bottle']),
  ...pk('Grooming', ['Toothbrush + paste', 'Skincare kit', 'Cologne', 'Hair product', 'Razor + blades', 'Lip balm (dry air)']),
  ...pk('Tech', ['Universal adapter (Type D/M)', 'Phone charger ×2', 'Power bank', 'AirPods', 'Offline maps downloaded', 'Export GHARANA backup before flying']),
  ...pk('Gifts', ['Gifts for nani/dadi', 'Chocolates / Aussie treats for cousins', 'Tim Tams (mandatory)', 'Gift for hosts']),
  ...pk('Training', ['Gym fit ×2', 'Skipping rope', 'Resistance band', 'Hand wraps']),
]

export const DEFAULT_DOCS: PackItem[] = [
  ...pk('Docs', ['Passport', 'Boarding passes in Wallet', 'Accommodation confirmation', 'Insurance details', 'Emergency contacts saved']),
]

export const DEFAULT_TRIPS: Trip[] = [
  {
    id: 'goldcoast-2026', name: 'Gold Coast with the boys', location: 'goldcoast', start: '2026-12-02', end: '2026-12-08',
    flights: [], stay: '', itinerary: [], packing: BEACH_PACKING, docs: pk('Docs', ['ID / licence', 'Boarding passes in Wallet', 'Accommodation confirmation']),
    costs: [], crew: ['Krishi'], notes: '', createdAt: Date.now(),
  },
  {
    id: 'india-2026', name: 'India — family + weddings', location: 'india', start: '2026-12-12', end: '2027-01-20',
    flights: [], stay: '', itinerary: [], packing: INDIA_PACKING, docs: DEFAULT_DOCS,
    costs: [], crew: ['Krishi'], notes: '', createdAt: Date.now(),
  },
]

/** The week after landing back — rebuilds the full timetable gradually. */
export const REENTRY_PROTOCOL = [
  { day: 1, text: 'Land, hydrate, sunlight on arrival, stay up until 9pm local. No naps over 20 min.' },
  { day: 2, text: 'Wake at a fixed time. Minimum Daily 3 only. Unpack + room reset.' },
  { day: 3, text: 'Bring back boxing (short). Groceries + cook one meal. Check the Vault.' },
  { day: 4, text: 'One 50-min deep study block. Reconnect with 2 mates in Mehfil.' },
  { day: 5, text: 'Full Morning Rite. Gym session. Content day for K.S. VOL. 1.' },
  { day: 6, text: 'Full Big Five attempt. Plan the next 4 weeks in the Blueprint.' },
  { day: 7, text: 'Full timetable. Night Debrief: what stuck from the trip, what to keep.' },
]
