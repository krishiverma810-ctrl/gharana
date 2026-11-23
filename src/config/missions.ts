// WILDCARD missions — 300+ across 11 suits. Format per line: "mission | where | minutes"
// where: a = anywhere, h = home (Melbourne), g = Gold Coast, i = India.
// ALFRED can add fresh ones weekly; those live in the database, not here.

export type Where = 'a' | 'h' | 'g' | 'i'
export interface Mission {
  id: string
  suit: string
  text: string
  where: Where
  min: number
}

export interface Suit {
  id: string
  name: string
  glyph: string
  color: string
}

export const SUITS: Suit[] = [
  { id: 'cook', name: 'COOK', glyph: '♨', color: '#e0903a' },
  { id: 'boxing', name: 'BOXING', glyph: '✊', color: '#c0573e' },
  { id: 'keys', name: 'KEYS', glyph: '♪', color: '#8c9ad6' },
  { id: 'sport', name: 'SPORT', glyph: '⚑', color: '#4f9a6a' },
  { id: 'mind', name: 'MIND', glyph: '✦', color: '#4a8fb8' },
  { id: 'style', name: 'NAZARA / STYLE', glyph: '◈', color: '#b0563a' },
  { id: 'reset', name: 'RESET', glyph: '↺', color: '#7a9ab0' },
  { id: 'social', name: 'SOCIAL', glyph: '☍', color: '#d4af37' },
  { id: 'travel', name: 'TRAVEL', glyph: '✈', color: '#3ab0b0' },
  { id: 'family', name: 'FAMILY', glyph: '⌂', color: '#e8902a' },
  { id: 'content', name: 'CONTENT', glyph: '▶', color: '#e05a7a' },
]

const RAW: Record<string, string> = {
  cook: `
Cook a dal you've never made, from scratch|a|45
Make paneer bhurji with a protein twist (add egg or extra paneer)|a|25
Recreate your favourite GYG order at home|h|40
Batch-cook 4 lunches for the week|h|90
Make a smoothie with 40 g+ protein and rate it|a|10
Learn to make perfect fluffy rice, no rice cooker|a|25
Cook breakfast for the whole family|a|30
Make a sauce from scratch (no jar)|a|30
Try a cuisine you've never cooked: Thai, Mexican, Korean|h|60
Make rotis that actually puff up|i|40
Ask Mum to teach you one family recipe and write it down|a|60
Cook a meal under $10 for two people|h|40
Make overnight oats three ways|a|15
Make a high-protein dessert|a|30
Grill something on a barbecue|g|40
Make fresh pasta by hand|h|60
Cook with a spice you've never used|a|30
Plate a dish like a restaurant and photograph it|a|30
Make chai the proper way — no tea bags|a|15
Learn knife skills: dice an onion in under a minute|a|20
Cook a vegetarian dish the boys would actually eat|a|45
Make a three-ingredient meal|a|20
Try a street food at a stall and work out how to make it|i|30
Make a meal entirely from what's already in the fridge|h|30
Cook a shakshuka|a|25
Bake bread or naan from scratch|a|90
Make a week's meal plan hitting your protein target|a|20
Cook for a mate and get their honest rating|h|60
`,
  boxing: `
Shadowbox 3 rounds focusing only on footwork|a|12
100 jab-cross combos, perfect form|a|10
Hit the bag for 6 rounds|h|25
Practise slips and rolls in the mirror for 10 minutes|a|10
Learn a new 4-punch combo and drill it 50 times|a|15
Skip rope: 5 × 3 min rounds|a|20
Film your stance and fix one thing|a|15
Defence-only round: block, slip, roll, pivot|a|10
Shadowbox on the sand at sunrise|g|20
Shadowbox on the rooftop at sunset|i|20
Body-shot combos: 3 rounds|a|12
Do 200 punches with 1 kg weights or water bottles|a|10
Watch one classic fight and note 3 techniques|a|30
Southpaw round: switch stance for 3 minutes|a|5
Speed round: 30 seconds max output × 6|a|8
Conditioning: 3 rounds of burpees + sprawls|a|15
Practise counter-punching off a slip|a|12
Wrap your hands properly, timed under 2 minutes|a|5
Heavy-bag power round: 10 hard shots, 10 seconds rest × 10|h|15
Footwork ladder drills|a|15
Shadowbox 5 rounds to music without stopping|a|20
Partner pad work with a mate|a|30
Go to a new boxing class or gym|h|60
Neck + core strength for fighters|a|15
Visualise a full 3-round fight, then shadow it|a|15
Teach someone a basic jab|a|10
Clinch and pivot drills|a|10
Shadowbox in front of a mirror calling out your combos aloud|a|10
`,
  keys: `
Learn the first 8 bars of a new song|a|25
Practise scales in C, G and D for 10 minutes|a|10
Play a song with your eyes closed|a|10
Learn one chord inversion and use it in a song|a|15
Play a Bollywood melody by ear|a|25
Learn a left-hand bass pattern|a|20
Record yourself playing and listen back|a|15
Learn the chords to a song you love|a|20
Play for 20 minutes without stopping|a|20
Practise with a metronome at a slow tempo|a|15
Play a song for someone in the family|i|10
Learn a jazz chord progression: ii–V–I|a|20
Compose a 4-bar melody of your own|a|20
Learn a Punjabi folk tune|a|25
Sight-read one simple piece|a|20
Play the same song three different moods|a|15
Learn the theme from a film you love|a|30
Practise hand independence for 10 minutes|a|10
Find a piano in the wild and play one song|a|10
Learn one arpeggio pattern across 2 octaves|a|15
Teach a cousin a simple tune|i|15
Play a song at half speed perfectly, then speed up|a|20
Improvise over a backing track|a|15
Practise one hard bar 20 times|a|10
Use a keyboard app to practise on your phone|a|10
Write down your next 3 songs to learn|a|5
Learn a song from the 1920s jazz age|a|30
Play the same song every day this week and track the progress|a|15
`,
  sport: `
Play a full game of basketball with the boys|a|60
5 km run, any pace|a|35
Swim 20 laps or 20 minutes in the ocean|g|25
Learn to bodyboard or surf|g|90
Play beach volleyball|g|45
Play cricket in the street with cousins|i|60
Play badminton|a|45
Hit 100 shots at the nets|h|40
Do a hill-sprint session|a|25
Walk 15,000 steps today|a|120
Try a sport you've never played|a|60
Play footy kick-to-kick in the park|h|30
Go for a long bike ride|a|60
Set a new 1 km time|a|10
Play table tennis|a|30
Do a stairs workout|a|20
Join a pickup game with strangers|a|60
Swim at the beach before 8am|g|30
Morning yoga on the roof|i|20
Play kabaddi or kho-kho with cousins|i|40
Track a full workout and beat last week's numbers|a|60
Do 100 push-ups across the day|a|15
Do a mobility session for 20 minutes|a|20
Sprint the length of the beach × 6|g|20
Play a full game of FIFA… then do 50 squats for every loss|a|45
Hike a trail you've never done|a|120
Coach a younger kid in a sport|a|30
Do a 20-minute AMRAP and write down your score|a|20
`,
  mind: `
Explain one physiology topic out loud as if teaching a 12-year-old|a|20
Make 20 flashcards for a topic you'll be tested on|a|30
Read 20 pages of a book|a|30
Watch a lecture at 1.25× and write a 5-line summary|a|60
Learn 5 new medical terms and use them in sentences|a|15
Do a GAMSAT-style reasoning question|a|15
Write a one-page essay on something you believe|a|30
Learn how a tooth is structured, layer by layer|a|20
Meditate for 10 minutes|a|10
Journal for 15 minutes without stopping|a|15
Learn one idea from philosophy and explain it to a mate|a|20
Read about one religion you know little about|a|30
Do a 50-minute deep study block, phone in another room|a|50
Draw the renal nephron from memory|a|20
Learn about one great entrepreneur's early years|a|20
Teach Mum or Dad something you learned this week|a|15
Do a full retrieval-practice session with no notes|a|30
Read a research abstract and explain it in plain English|a|20
Listen to an educational podcast on a walk|a|30
Write down 10 ideas for the Scroll App|a|15
Learn 10 words in Punjabi or Hindi you didn't know|a|15
Read about the history of the place you're in|g|20
Visit a gurudwara or temple and learn its story|i|60
Plan your next week of study in the Blueprint|a|20
Solve a logic puzzle|a|15
Take a no-phone hour|a|60
Watch a documentary and note 3 lessons|a|90
Write a summary sheet for one topic from memory, then check it|a|30
`,
  style: `
Sketch 3 NAZARA design ideas|a|30
Find 5 heritage motifs for the next drop|a|20
Photograph a fit and get honest feedback|a|10
Visit a fabric or textile market for inspiration|i|90
Write the story behind your next NAZARA piece|a|20
Research one heritage streetwear brand and note what they do well|a|30
Plan a NAZARA content shoot with Sidak|a|20
Put together 3 outfits from what you own already|a|20
Get a fresh haircut|a|45
Find a tailor and get something fitted|i|60
Moodboard 10 images for "Under the Gaze"|a|20
Price out a sample run with a supplier|a|30
Thrift or market-hunt for one statement piece|a|60
Design a logo variation|a|30
Write 5 product names for the next drop|a|10
Study how a luxury brand writes captions|a|15
Steam/iron and organise your wardrobe|h|30
Wear your best fit for no reason today|a|5
Photograph street style from 10 strangers (ask first)|a|40
Learn a new way to tie or wear something|a|10
Sketch a phulkari-inspired graphic|a|30
Ask 5 people what they'd pay for a NAZARA piece|a|20
Plan the next drop's release calendar|a|25
Find a local photographer to collaborate with|a|20
Pick your signature scent for the trip|a|10
Write NAZARA's brand values in 3 lines|a|15
Make a lookbook layout in Canva|a|40
Rate your last 5 fits honestly and pick the best one|a|10
`,
  reset: `
Full room reset: bed made, floor clear, desk clean|h|20
Clear your camera roll of 200 photos|a|15
Inbox to zero|a|20
Unfollow 20 accounts that don't make you better|a|10
Delete one app that wastes your time|a|5
Lights out before 11pm|a|0
Wake up before 7am|a|0
Cold shower — 2 minutes|a|5
Phone in another room for the first hour of the day|a|60
Wash and fold all your laundry|h|40
Clean your shoes|a|20
Plan tomorrow tonight: Big 3 + Blueprint|a|10
Drink 3 litres of water today|a|0
No sugar today|a|0
Screen time under 3 hours today|a|0
Walk 20 minutes after dinner|a|20
Stretch for 15 minutes before bed|a|15
Clean out your bag and wallet|a|10
Back up your phone and export GHARANA|a|10
Sort out one admin task you've been dodging|a|30
Spend 10 minutes in sunlight before noon|a|10
Organise your desk and charge everything|h|15
Read instead of scrolling before bed|a|20
Unpack fully within an hour of arriving|a|30
Check your finances in the Vault|a|10
Write down 3 things that are stressing you and one next step each|a|10
Take a 20-minute nap — no longer|a|20
Make your bed within 5 minutes of waking|a|2
`,
  social: `
Start a conversation with a stranger|a|5
Compliment 3 people genuinely|a|5
Call a mate you haven't spoken to in a month|a|20
Ask someone a question you'd normally be too shy to ask|a|5
Organise a plan with the boys|a|15
Give a toast or speech at dinner|a|5
Say hi to a neighbour and learn their name|h|5
Make someone laugh today on purpose|a|5
Send a voice note instead of a text|a|5
Introduce two people who should know each other|a|10
Ask an older relative about their life at 20|i|30
Hold eye contact in your next three conversations|a|0
Order food in Hindi or Punjabi|i|5
Approach someone at the gym and ask for a spot|h|5
Thank someone who helped you, in detail|a|5
Ask for a discount politely|a|5
Message an old teacher and thank them|a|10
Be the first to say hi at a party|a|5
Tell a story at dinner with a proper punchline|a|10
Ask a stranger for a recommendation|a|5
Dance at the wedding — first one on the floor|i|20
Call Nonna|a|15
Plan a surprise for a mate|a|30
Talk to someone new at uni or work|h|10
Listen fully: no phone in your next conversation|a|20
Invite someone new to hang out|a|5
Speak up first in a group decision|a|0
Ask someone how their week really is and actually listen|a|10
`,
  travel: `
Watch the sunrise over the ocean|g|30
Find the best acai bowl in town|g|30
Walk the beach end to end|g|60
Try a local dish you can't pronounce|a|20
Get lost in a market and find one treasure|i|60
Take a photo that looks like a postcard|a|15
Talk to a local about the best hidden spot|a|10
Go to a lookout for sunset|a|45
Learn 5 useful phrases of the local language|i|15
Ride a rickshaw or tuk-tuk|i|20
Visit a place your parents grew up near|i|90
Take the stairs instead of the lift for a whole day|a|0
Keep a 3-line travel journal tonight|a|5
Swim somewhere new|a|30
Find a rooftop with a view|a|30
Buy something handmade from a local maker|a|30
Eat at a place with no English menu|i|45
Photograph 10 doors or windows|a|30
Get up early and walk the city before it wakes|a|45
Spend a whole day without spending money|a|0
Find the best chai stall in the area|i|20
Catch a wave|g|60
Visit a historic site and learn one story|a|90
Pack a perfect day bag the night before|a|10
Make a 60-second video diary of the day|a|10
Walk to a place instead of taking a car|a|30
Try kulfi from a street stall|i|10
Send a postcard or photo to someone back home|a|10
`,
  family: `
Ask Dad about his first job|a|20
Help cook a family meal without being asked|a|60
Take a photo of the whole family together|a|10
Learn your family tree three generations back|i|45
Sit with grandparents and just listen|i|60
Do a chore for Mum before she asks|a|20
Plan a family outing|a|20
Teach a younger cousin something useful|i|20
Ask your brother what he's struggling with|a|20
Call a relative overseas|a|20
Write down a family story so it isn't lost|a|20
Go grocery shopping with Mum|a|45
Wash the car for Dad|h|30
Watch an old family video together|a|30
Touch the feet of your elders when you arrive|i|0
Bring tea to everyone in the house|a|10
Learn the names of every cousin's kids|i|20
Help at a wedding without being asked|i|60
Play cards with the uncles|i|45
Take your brother out for food|a|60
Say thank you to your parents for something specific|a|5
Fix something broken around the house|a|30
Make a family group photo album|a|30
Ask your grandparents for their best advice|i|20
Spend an hour with your phone away at family dinner|a|60
Write a card for someone in the family|a|15
Learn a family recipe from an aunty|i|60
Cook chai for the elders in the afternoon|i|15
`,
  content: `
Film one K.S. VOL. 1 video start to finish|a|60
Write 10 hooks for future videos|a|15
Film a "day in the life" with real moments|a|30
Recreate a trend with your own twist|a|30
Script a 30-second video with a strong ending|a|20
Edit a video in under 30 minutes|a|30
Film B-roll of the beach for 10 minutes|g|10
Film the colours of a market|i|20
Do a street interview with one question|a|30
Post something and don't check the views for 3 hours|a|0
Study 3 viral videos in your niche — what's the hook?|a|20
Brainstorm a series idea with Sidak|a|30
Film a "Gold Coast with the boys" montage|g|30
Film a wedding-prep vlog (with permission)|i|30
Make a carousel post for NAZARA|a|30
Reply to every comment on your last post|a|15
Film a "what I eat in a day" on the bulk|a|30
Make a tutorial on something you're good at|a|40
Test a new editing style|a|30
Collaborate with another creator|a|60
Write captions for the next 5 posts|a|20
Film in slow motion for one shot that looks cinematic|a|10
Plan next week's posting calendar|a|20
Batch-film 3 videos in one session|a|90
Record a voiceover for a travel clip|a|15
Make a "then vs now" video|a|20
Film your fit check with a transition|a|15
Turn your best moment of the day into a 15-second clip|a|15
`,
}

export const MISSIONS: Mission[] = Object.entries(RAW).flatMap(([suit, block]) =>
  block
    .trim()
    .split('\n')
    .map((line, i) => {
      const [text, where, min] = line.split('|')
      return { id: `${suit}-${i}`, suit, text: text.trim(), where: (where?.trim() || 'a') as Where, min: Number(min) || 0 }
    }),
)
