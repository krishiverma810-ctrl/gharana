// No-equipment / hotel workouts for Gold Coast + India. (Phase 2 grows this to 30+.)

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
]

export const COMMON_LIFTS = ['Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row', 'Pull-up (+kg)', 'Incline DB Press', 'Leg Press']
