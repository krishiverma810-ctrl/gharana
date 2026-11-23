// BULK LEDGER quick-adds. Protein/calorie numbers are rough per-serve estimates, not lab values.

export interface Food {
  name: string
  protein: number // g
  calories: number
  india?: boolean
}

export const QUICK_FOODS: Food[] = [
  { name: 'Protein shake (1 scoop + milk)', protein: 32, calories: 280 },
  { name: 'Greek yoghurt (200 g)', protein: 20, calories: 190 },
  { name: 'Eggs ×3', protein: 19, calories: 230 },
  { name: 'Paneer (100 g)', protein: 18, calories: 300, india: true },
  { name: 'Dal (1 bowl)', protein: 12, calories: 230, india: true },
  { name: 'Rajma (1 bowl)', protein: 13, calories: 260, india: true },
  { name: 'Chole (1 bowl)', protein: 12, calories: 280, india: true },
  { name: 'Roti ×2', protein: 6, calories: 240, india: true },
  { name: 'Rice (1 cup)', protein: 4, calories: 210 },
  { name: 'Curd / dahi (1 bowl)', protein: 8, calories: 140, india: true },
  { name: 'Lassi (glass)', protein: 9, calories: 250, india: true },
  { name: 'Soya chunks (50 g dry)', protein: 26, calories: 170, india: true },
  { name: 'Peanut butter toast ×2', protein: 14, calories: 420 },
  { name: 'GYG burrito bowl', protein: 30, calories: 700 },
  { name: 'Tofu (150 g)', protein: 18, calories: 200 },
  { name: 'Milk (300 ml)', protein: 10, calories: 190 },
  { name: 'Oats + milk + banana', protein: 15, calories: 450 },
  { name: 'Chana chaat', protein: 11, calories: 250, india: true },
]

export const VEG_IDEAS: string[] = [
  'Paneer bhurji wrap with spinach',
  'Soya chunk curry with brown rice',
  'Tofu scramble + toast + avocado',
  'Rajma chawal with curd',
  'Greek yoghurt bowl with oats, honey, nuts',
  'Chickpea + feta salad with olive oil',
  'Moong dal chilla with paneer filling',
  'Lentil bolognese with pasta',
  'Peanut noodles with edamame',
  'Overnight oats with protein powder',
  'Black bean + cheese quesadilla',
  'Palak paneer with two rotis',
]
