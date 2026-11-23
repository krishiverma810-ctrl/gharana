// DEEPALI'S CORNER — config. Every list here is a starting point; your own entries sit on top.

/** Time zones she might be in (she travels too). */
export const HER_ZONES: { tz: string; label: string }[] = [
  { tz: 'Australia/Melbourne', label: 'Melbourne' },
  { tz: 'Australia/Sydney', label: 'Sydney' },
  { tz: 'Australia/Brisbane', label: 'Brisbane / Gold Coast' },
  { tz: 'Australia/Adelaide', label: 'Adelaide' },
  { tz: 'Australia/Perth', label: 'Perth' },
  { tz: 'Pacific/Auckland', label: 'New Zealand' },
  { tz: 'Asia/Kolkata', label: 'India' },
  { tz: 'Asia/Makassar', label: 'Bali' },
  { tz: 'Asia/Singapore', label: 'Singapore' },
  { tz: 'Asia/Dubai', label: 'Dubai' },
  { tz: 'Europe/London', label: 'London' },
  { tz: 'America/New_York', label: 'New York' },
  { tz: 'America/Toronto', label: 'Toronto' },
]

/** The dossier: things you should just know. Grouped so it's quick to fill in. */
export interface ProfileField {
  key: string
  label: string
  hint?: string
  long?: boolean
}
export const PROFILE_GROUPS: { title: string; fields: ProfileField[] }[] = [
  {
    title: 'ORDERS',
    fields: [
      { key: 'coffee', label: 'Coffee / chai order', hint: 'Oat flat white, extra hot' },
      { key: 'drink', label: 'Drink when out', hint: 'Lychee martini, mocktail…' },
      { key: 'food', label: 'Favourite foods', hint: 'Dumplings, butter chicken, pasta' },
      { key: 'restaurants', label: 'Her favourite places to eat' },
      { key: 'sweet', label: 'Chocolate / dessert', hint: 'Lindt sea salt, tiramisu' },
      { key: 'snack', label: 'Comfort snack' },
      { key: 'diet', label: 'Allergies / won’t eat', hint: 'Important — check before ordering' },
    ],
  },
  {
    title: 'TASTE',
    fields: [
      { key: 'flowers', label: 'Flowers', hint: 'Peonies, tulips — and ones she hates' },
      { key: 'colour', label: 'Favourite colour' },
      { key: 'perfume', label: 'Perfume / scent' },
      { key: 'jewellery', label: 'Jewellery', hint: 'Gold or silver, studs or hoops' },
      { key: 'brands', label: 'Brands / shops she loves' },
      { key: 'style', label: 'Her style', hint: 'Minimal, Y2K, old money…' },
      { key: 'music', label: 'Artists / songs' },
      { key: 'shows', label: 'Comfort shows + films' },
      { key: 'books', label: 'Books / authors' },
    ],
  },
  {
    title: 'SIZES',
    fields: [
      { key: 'top', label: 'Top / dress size' },
      { key: 'bottom', label: 'Pants / jeans size' },
      { key: 'shoe', label: 'Shoe size' },
      { key: 'ring', label: 'Ring size', hint: 'Which finger?' },
      { key: 'bra', label: 'Other sizes' },
    ],
  },
  {
    title: 'HOW SHE WORKS',
    fields: [
      { key: 'love', label: 'Love language', hint: 'Words, time, touch, gifts, acts' },
      { key: 'stressed', label: 'When she’s stressed she needs…', long: true },
      { key: 'sad', label: 'When she’s sad she needs…', long: true },
      { key: 'sick', label: 'When she’s sick — the care pack', hint: 'Soup from X, Panadol, her show', long: true },
      { key: 'angry', label: 'In an argument she needs…', hint: 'Space first? Talk it out now?', long: true },
      { key: 'peeves', label: 'Pet peeves / never do' },
      { key: 'fears', label: 'Fears + insecurities to be gentle with', long: true },
    ],
  },
  {
    title: 'HER WORLD',
    fields: [
      { key: 'study', label: 'Study / work', hint: 'Course, year, workplace' },
      { key: 'goals', label: 'Her goals right now', long: true },
      { key: 'dreams', label: 'Dream trips + big dreams', long: true },
      { key: 'address', label: 'Where to send things', hint: 'Delivery notes, not her full address if you’d rather not' },
    ],
  },
]

/** Long-distance date ideas (she's in Melbourne, you're on the Gold Coast or in India). */
export const DISTANCE_DATES = [
  'Watch party — same film, pressed play at the same second',
  'Cook the same recipe on video call, rate each other’s plate',
  'Order her dinner to her door, eat “together” on FaceTime',
  'Spotify Jam — take turns picking songs, explain why each one',
  'Play an online game together (GeoGuessr, Codenames, chess)',
  'Virtual museum tour on call',
  'Read the same book, one chapter a night, talk about it',
  'Stargazing call — both go outside at the same time',
  'Write each other a real letter and post it',
  '36 questions to fall in love — on call, no phones otherwise',
  'Plan the Bali trip together, one day of the itinerary each',
  'Show-and-tell: each give a tour of where you are right now',
  'Draw each other on call, reveal at the end',
  'Make a shared playlist of “songs that remind me of you”',
  'Morning coffee call before her day starts',
  'Online escape room together',
  'Send her a scavenger hunt of voice notes',
  'Pick each other’s outfit for tomorrow',
]

/** In-person date ideas (Melbourne). */
export const LOCAL_DATES = [
  'Rooftop dinner in the CBD',
  'Sunrise at St Kilda pier, breakfast after',
  'Pottery or painting class',
  'Queen Vic Night Market',
  'Picnic in the Royal Botanic Gardens',
  'Dumpling crawl in Chinatown',
  'Day trip to the Mornington Peninsula hot springs',
  'Mini golf + dessert',
  'Gallery at the NGV, then laneway coffee',
  'Drive the Great Ocean Road',
  'Cook her a full dinner at home — candles, playlist, the works',
  'Cinema at the Astor or Sun Theatre',
  'Yarra Valley winery (one of you drives)',
  'Bookshop date — pick a book for each other under $25',
  'Comedy show',
  'Brighton bathing boxes at golden hour',
  'Ice skating at O’Brien',
  'Recreate your first date',
]

/** Questions — one a day, so calls never go flat. */
export const QUESTIONS = [
  'What’s one thing I do that makes you feel loved without me realising?',
  'What’s something you’ve been wanting to tell me but haven’t?',
  'What’s a small thing that made you happy this week?',
  'If we could live anywhere for a year, where?',
  'What’s a memory of us you replay?',
  'What’s stressing you most right now — and how can I help?',
  'What did you want to be when you were ten?',
  'What’s one thing you want us to do before the end of next year?',
  'What’s a song that feels like us?',
  'When do you feel most like yourself?',
  'What’s something your family does that you want us to do too?',
  'What’s something you’re proud of that you don’t say out loud?',
  'What would your perfect Sunday with me look like?',
  'What’s one habit of mine you secretly like?',
  'What are you looking forward to this month?',
  'What’s a fear you’ve grown out of?',
  'What did you learn from your last hard week?',
  'If you could ask your future self one question, what would it be?',
  'What’s the best gift you’ve ever been given — and why?',
  'What’s something new you want to try together?',
  'Who in your life do you want me to get to know better?',
  'What’s one thing I could do better as your partner?',
  'What do you miss most when we’re apart?',
  'What’s your favourite version of me?',
  'Which day of ours would you relive?',
  'What are three words for this year so far?',
  'What’s a tiny luxury you’d love more of?',
  'What do you want to be known for?',
  'What made you laugh hardest recently?',
  'What would make the next time we see each other perfect?',
]

/** The three tiny touches that keep long distance warm. */
export const TOUCHES = [
  { id: 'gm', label: 'Good-morning message (her morning)' },
  { id: 'real', label: 'One real conversation (call / voice note)' },
  { id: 'gn', label: 'Good-night message (her night)' },
]

/** Milestones to celebrate, in days together. */
export const MILESTONES = [100, 200, 365, 500, 730, 1000, 1095, 1461, 1500, 1826, 2000]

/** How far ahead to start thinking about a gift (days) — longer when you're overseas. */
export const GIFT_LEAD_DAYS = { home: 10, away: 21 }
