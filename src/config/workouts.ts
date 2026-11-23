// 30 no-equipment / hotel workouts for Gold Coast + India.

export interface TravelWorkout {
  id: string
  name: string
  minutes: number
  where: 'anywhere' | 'hotel' | 'beach' | 'rooftop'
  moves: string[]
}

export const TRAVEL_WORKOUTS: TravelWorkout[] = [
  { id: 'tw1', name: 'Hotel Room Full Body', minutes: 20, where: 'hotel', moves: ['4 rounds:', '15 push-ups', '20 squats', '10 lunges each leg', '30s plank', '60s rest'] },
  { id: 'tw2', name: 'Shadowbox Burner', minutes: 18, where: 'anywhere', moves: ['6 × 2-min rounds, 1-min rest', 'R1–2: jab-cross, footwork', 'R3–4: hooks + slips', 'R5–6: everything, max pace'] },
  { id: 'tw3', name: 'Beach Sprints', minutes: 20, where: 'beach', moves: ['5 min jog warm-up', '10 × 30 m sprints in sand', 'walk back recovery', '3 × 20 burpees', 'cool-down swim'] },
  { id: 'tw4', name: 'Bulk-Friendly Push', minutes: 25, where: 'anywhere', moves: ['5 rounds:', '12 decline push-ups (feet on bed)', '10 pike push-ups', '12 chair dips', 'max diamond push-ups'] },
  { id: 'tw5', name: 'Leg Day, No Gym', minutes: 25, where: 'anywhere', moves: ['4 rounds:', '12 Bulgarian split squats each leg', '20 jump squats', '15 single-leg glute bridges each', '45s wall sit'] },
  { id: 'tw6', name: 'Rooftop Core', minutes: 12, where: 'rooftop', moves: ['3 rounds:', '20 bicycle crunches', '15 leg raises', '30s hollow hold', '20 mountain climbers'] },
  { id: 'tw7', name: 'Wedding-Day 10', minutes: 10, where: 'anywhere', moves: ['Do it before getting ready:', '50 squats', '40 push-ups (split as needed)', '2 min plank total'] },
  { id: 'tw8', name: 'Pull Without a Bar', minutes: 20, where: 'hotel', moves: ['4 rounds:', '12 towel rows (door anchored)', '15 superman holds', '12 reverse snow angels', '10 table rows if sturdy'] },
  { id: 'tw9', name: 'Stairwell Conditioning', minutes: 20, where: 'hotel', moves: ['10 × stair climbs (2 at a time)', 'walk down recovery', 'every 2nd round: 15 push-ups at the top'] },
  { id: 'tw10', name: 'Mobility Reset (jet lag)', minutes: 15, where: 'anywhere', moves: ['World’s greatest stretch 5 each side', '90/90 hips 2 min', 'Cat-cow 1 min', 'Deep squat hold 2 min', 'Thoracic rotations 10 each'] },
  { id: 'tw11', name: 'Push-up Pyramid', minutes: 15, where: 'anywhere', moves: ['1-2-3-…-10-…-3-2-1 push-ups', 'rest = walk 10 steps between sets', '100 total — finish strong'] },
  { id: 'tw12', name: 'EMOM 20', minutes: 20, where: 'anywhere', moves: ['Every minute on the minute:', 'odd: 12 push-ups', 'even: 15 squats', 'rest whatever is left'] },
  { id: 'tw13', name: 'Boxer’s Footwork', minutes: 15, where: 'anywhere', moves: ['3 min skipping (rope or imaginary)', '3 × 2 min in-and-out footwork', '2 min lateral shuffles', '3 min shadowbox, defence only'] },
  { id: 'tw14', name: 'Sand Strength', minutes: 25, where: 'beach', moves: ['4 rounds in soft sand:', '20 walking lunges', '15 push-ups', '20 squat jumps', '40 m bear crawl'] },
  { id: 'tw15', name: 'Ocean Swim Intervals', minutes: 20, where: 'beach', moves: ['Swim between the flags only', '6 × 1 min hard / 1 min easy', 'beach: 10 burpees after each 2 rounds'] },
  { id: 'tw16', name: 'Chest + Tris, Bed Edition', minutes: 22, where: 'hotel', moves: ['4 rounds:', '15 incline push-ups (hands on bed)', '12 bed-edge dips', '10 archer push-ups each side', '30s push-up hold (bottom)'] },
  { id: 'tw17', name: 'Backpack Bulk Legs', minutes: 25, where: 'hotel', moves: ['Load a backpack with water bottles:', '4 × 15 goblet squats', '4 × 12 Romanian deadlifts', '4 × 20 calf raises on a step'] },
  { id: 'tw18', name: 'Backpack Upper', minutes: 25, where: 'hotel', moves: ['Loaded backpack:', '4 × 12 bent-over rows', '4 × 10 overhead press', '4 × 15 curls (hold the straps)', '3 × max push-ups wearing it'] },
  { id: 'tw19', name: 'Rooftop HIIT', minutes: 16, where: 'rooftop', moves: ['40s on / 20s off × 4 rounds:', 'high knees', 'squat jumps', 'push-ups', 'skater hops'] },
  { id: 'tw20', name: 'Sunrise Yoga Flow', minutes: 15, where: 'rooftop', moves: ['5 sun salutations', 'Warrior I/II each side', 'Downward dog 1 min', 'Pigeon 1 min each side', 'Breathing 2 min'] },
  { id: 'tw21', name: 'Core Destroyer', minutes: 12, where: 'anywhere', moves: ['3 rounds:', '45s plank', '20 Russian twists', '15 V-ups', '30s side plank each side'] },
  { id: 'tw22', name: 'Grip + Forearms', minutes: 10, where: 'anywhere', moves: ['Towel wring 3 × 30s', 'Fingertip push-up holds 3 × 15s', 'Dead hang from a door frame (if safe) 3 × max'] },
  { id: 'tw23', name: 'Shoulder Saver', minutes: 12, where: 'anywhere', moves: ['3 rounds:', '15 band-less pull-aparts (squeeze 2s)', '10 wall slides', '12 prone Y-T-W each', '30s doorway stretch'] },
  { id: 'tw24', name: 'Long-Haul Flight Prep', minutes: 10, where: 'anywhere', moves: ['Before boarding:', '2 min brisk walk', '20 calf raises', '10 hip circles each way', 'hamstring + chest stretch 1 min each'] },
  { id: 'tw25', name: 'Shaadi Season Shred', minutes: 20, where: 'anywhere', moves: ['5 rounds:', '10 burpees', '15 push-ups', '20 squats', '30s mountain climbers'] },
  { id: 'tw26', name: 'Glute Builder', minutes: 18, where: 'anywhere', moves: ['4 rounds:', '20 glute bridges (2s squeeze)', '12 single-leg hip thrusts each', '15 donkey kicks each', '30s frog pumps'] },
  { id: 'tw27', name: 'Tabata Double', minutes: 10, where: 'anywhere', moves: ['20s on / 10s off × 8: squat jumps', '1 min rest', '20s on / 10s off × 8: push-ups'] },
  { id: 'tw28', name: 'Walk + Talk', minutes: 30, where: 'anywhere', moves: ['30-min brisk walk', 'call Mum, Dad or Deepali while you go', 'last 5 min: hills or stairs'] },
  { id: 'tw29', name: 'Pistol Progression', minutes: 15, where: 'anywhere', moves: ['4 rounds:', '8 box pistol squats each leg (sit to bed)', '10 cossack squats each side', '30s single-leg balance each'] },
  { id: 'tw30', name: 'Recovery Day', minutes: 20, where: 'anywhere', moves: ['10 min easy walk', 'Foam roll or tennis ball 5 min', 'Couch stretch 1 min each side', 'Box breathing 4 min'] },
]

export const COMMON_LIFTS = ['Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row', 'Pull-up (+kg)', 'Incline DB Press', 'Leg Press']
