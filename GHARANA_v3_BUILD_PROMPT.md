# GHARANA v3 — "THE ESTATE, FULLY BUILT"
### Master build prompt for Claude Code

> **How to use this file:** put it in the root of the GitHub repo, open Claude Code in that folder, and say:
> *"Read GHARANA_v3_BUILD_PROMPT.md fully, then start Phase 0. Stop at the end of each phase so I can test it on my phone."*
> If I have the old `gharana.jsx` (v2) file, it's in `/legacy/gharana.jsx` — read it first and keep its look and feel.

---

## 0. WHO YOU'RE BUILDING FOR

I'm Krishi — 20, Melbourne (Craigieburn), second-year BSc at Monash majoring in Physiology, on the road to postgraduate dentistry (Melbourne DDS). I work casual at GYG, co-founded a heritage streetwear brand called NAZARA, I'm starting a TikTok page (K.S. VOL. 1) with my mate Sidak, I design posters for MPA (Melbourne Punjabi Association), and I'm planning a TikTok-style educational scroll app. Long-term: become the man I needed at 14, a family man with financial freedom, a garage of cars and a lavish home. Right now I describe myself as "bummy" — this app is how I fix that.

**GHARANA** (Hindi for house/lineage, and the word for a school of Indian classical music) is my personal self-improvement operating system. Tagline: **THE HOUSE BUILDS THE NAME.** Aesthetic: **art deco × jazz age × Indian heritage**, Wayne Manor energy. v1 was a 5-tab Claude artifact, v2 ("The Estate") was 9 rooms. v3 is a real installable app, and it needs to be **100x better**.

### The lock-in this is built for
| Phase | Dates | Where | Mode |
|---|---|---|---|
| I — Home Ignition | 22 Nov → 1 Dec 2026 | Melbourne | Full timetable |
| II — Gold Coast | 2 → 8 Dec | Gold Coast, QLD (AEST, no daylight saving — 1 hr behind Melbourne) | Travel mode |
| III — Reset | 9 → 11 Dec | Melbourne | Pack + reset |
| IV — India | 12 Dec → 20 Jan 2027 (latest; might come back earlier) | India (IST, UTC+5:30) | Travel mode, family-heavy, patchy internet |
| V — Pre-Semester | return → Sem 1 start | Melbourne | Build back to full timetable |

All dates must be editable in Settings. **The app has to work perfectly offline in India and on the Gold Coast.**

---

## 1. NON-NEGOTIABLE RULES FOR YOU (CLAUDE CODE)

1. **I'm not a pro developer.** Explain every terminal command, every account I need to make, and every click in plain English, step by step, numbered.
2. **Work in phases.** Finish a phase, make sure it builds with zero errors, commit to git with a clear message, push, then STOP and tell me what to test on my phone.
3. **Phase 1 must be live on my iPhone home screen before 2 Dec 2026.** Ship a solid core first, then pile features on. A finished 30 rooms beats a broken 100.
4. **Never commit secrets.** API keys go in environment variables only. Add `.env` to `.gitignore` before anything else. The repo should be **private**.
5. **My data never gets lost.** Every schema change needs a migration. Auto-backup locally. One-tap JSON export/import.
6. **Config-driven everything.** Habits, rooms, quotes, people, goals, timetable blocks, ranks, palettes — all live in editable data/config, not hardcoded. I should be able to add/remove/rename almost anything from inside the app without touching code.
7. **Mobile-first.** I'll use this mostly on my iPhone. Big tap targets, thumb-reachable nav, fast. Desktop gets a richer dashboard layout.
8. Write clean, typed, organised code with a README so future sessions (me or you) can pick it up.

---

## 2. TECH STACK

- **Vite + React + TypeScript**
- **Styling:** Tailwind CSS + CSS variables for the theme system (or CSS modules if cleaner — your call, explain why)
- **State:** Zustand
- **Local database:** IndexedDB via **Dexie** (offline-first, everything saved on-device instantly)
- **PWA:** `vite-plugin-pwa` — installable on iPhone home screen, full offline caching, own icon + splash screen, standalone display (no Safari bars)
- **Animations:** Framer Motion
- **Charts:** Recharts (or lightweight custom SVG)
- **Hosting:** Vercel (free tier), auto-deploys when I push to GitHub
- **ALFRED (AI):** a Vercel serverless function at `/api/alfred` that calls the Anthropic API. My API key lives only in Vercel env vars. Add a monthly spend cap setting + token usage counter in-app.
- **Voice (see Section 8):** speech-to-text via the browser's Web Speech API as the free fallback, plus a proper STT model (e.g. OpenAI Whisper / Deepgram — your recommendation) through a serverless function for accuracy, incl. Hindi + Punjabi. Text-to-speech via a high-quality voice API (e.g. ElevenLabs or OpenAI TTS — recommend one) with the browser's `speechSynthesis` as the free/offline fallback. Optional on-device wake word via Picovoice Porcupine (web SDK).
- **Desktop app (see Section 9):** wrap the same codebase in **Tauri** (preferred — light and fast; use Electron only if you have a strong reason, and explain it) so the laptop version gets a **system-wide hotkey** for ALFRED, a tray icon and an always-on-top mini overlay. Ask me whether my laptop is Windows or Mac before building this.
- **Optional cloud sync (Phase 4):** Supabase (free tier) so PC and phone share data. Must stay offline-first — sync when online, never block when offline.
- **Notifications:** Web Push for installed PWA (works on iOS 16.4+ when added to home screen). Fallback: in-app nudges + an "export to Apple Calendar/Reminders" (.ics) option.

---

## 3. DESIGN SYSTEM — "DECO HOUSE"

- **Fonts:** a deco display face for titles (e.g. Poiret One / Limelight / Marcellus SC), a clean serif or sans for body, a mono for numbers/timers. Devanagari support for Sanskrit/Hindi/Gurmukhi text.
- **Motifs:** sunburst rays, stepped ziggurat frames, fan arches, chevrons, gold hairline borders, rangoli-meets-deco geometry, jaali (lattice) patterns.
- **The living skyline** (from v2, keep and upgrade): 3-layer art deco city behind everything, lit windows, searchlights at night, moon + stars, dawn glow — **synced to the time zone I'm currently in** (Melbourne / Gold Coast / India).
- **9 daily palettes from v2** (keep all): GILDED NOIR, MIDNIGHT SAPPHIRE, BLACKOUT GOLD, VELVET EMERALD, OXBLOOD ROYALE, SMOKE & BRASS, COPPER DUSKLINE, PEACOCK CLUB, CHAMPAGNE HOUR. Each has 4 time-of-day sky gradients + building, window, star, moon and searchlight colours. Seeded by date, cycles all 9 before repeating, pin-a-favourite option.
- **Add new palettes:** at least 9 more, including **location skins** — a Gold Coast skin (ocean teal, surf gold, high-rise beach skyline) and an India skin (marigold, saffron, haveli arches, kite silhouettes at dusk, diya lights at night).
- **Every room has its own accent colour.** Smooth gold transitions between rooms. Marquee splash screen on open (skippable).
- **Micro-interactions:** haptic-style button presses, gold confetti on wins, ink-stamp animation on check-offs, a satisfying "vault door" for the Vault.
- **Accessibility:** readable contrast, a "low glare" night mode, reduced-motion toggle, battery saver mode (kills skyline animation).
- In number-heavy screens, use fonts where lowercase "l" and "1" are clearly different.

---

## 4. THE ESTATE — ALL THE ROOMS

Navigation: desktop = sidebar of wings; mobile = bottom bar with 5 pinned rooms (user picks which) + a **CORRIDOR** screen with arched doorways to every other room + a **command palette / search** (pull down from top) to jump anywhere or quick-add anything.

Rooms are grouped into **Wings**. Every room can be hidden, reordered, renamed, or pinned.

### 🏛 WING I — THE GRAND HALL (daily command)

**1. THE LOUNGE** (home) — upgraded v2 dashboard
- Live clock for current location + small Melbourne clock when travelling
- Lock-in sunburst dial (one ray lights per day, now spans the whole multi-phase lock-in) + current phase banner
- House Score gauge /100 (weighted from habits, sleep, training, study, social, money)
- Daily Gita verse (Sanskrit + transliteration + English + one-line application to my life)
- Daily quote rotating through Harvey Specter, Mike Ross, Batman, Alfred, Nightwing, Kabir (+ let me add my own)
- Today's Big 3 (the three things that make today a win)
- Fuel station (water + protein trackers with quick-tap buttons)
- Scrolling deco ticker (mood palette name, streaks, countdowns, next event)
- Quick capture bar → routes ideas to NAZARA / K.S. VOL. 1 / Scroll App / general inbox
- "Now" card: what I should be doing this hour per the Blueprint

**2. MORNING RITE** — guided wake-up flow
- Wake-time log (goal: shift from ~10am to early), sleep log, energy 1–10
- Sunlight check, water, cold face wash, skincare
- Set Big 3, read the verse, one line of intention
- Streak for "up before target time"

**3. NIGHT DEBRIEF** — guided close of day
- What I won, what I dodged, one lesson
- 3 gratitudes (from v2 Mehfil)
- Tomorrow's Big 3 pre-set
- Mood + energy + screen time entry
- Phone-down / wind-down timer

**4. DAILY RITES** — habit engine (v1/v2 upgraded)
- The Big Five (default: boxing, keyboard, sport, deep study, cook something new) + maintenance habits (brush, face wash, skincare, sunlight, room reset) — all editable
- Habit types: yes/no, count, duration, number, "X times per week"
- Per-phase habit sets (Home set vs Travel set vs India set — travel set is lighter: a **Minimum Daily 3** that survives chaos)
- Streaks with ranks: THE PROSPECT → … → THE DON (add 10+ ranks with deco insignia)
- Streak freezes (earned, not free), skip-with-reason, habit heatmap per habit
- Full-house celebration when all Big Five are done

**5. BLUEPRINT** — timetable (v1 upgraded)
- Hour-by-hour timeline, separate templates for weekday / weekend / GYG shift day / uni day / travel day / India family day
- Current hour glows gold with NOW pin
- Drag-to-edit blocks, colour-coded by category
- Focus timer (25/50/90 + custom) with chime, Pomodoro cycles, focus session log
- Shift tracker for GYG (enter shifts, hours, auto-adjust that day's plan)

**6. THE CALENDAR ROOM**
- Month/week/agenda views, lock-in phases shown as bands
- Countdowns (Gold Coast, India flight, return, Sem 1, exams, NAZARA drops, birthdays)
- .ics export so key events land in my phone calendar

### 🧠 WING II — THE LIBRARY (mind & study)

**7. THE STUDY** — uni + dentistry
- Units list with weeks, assessments, deadlines, grades, WAM/GPA calculator
- Study session log (subject, duration, focus rating)
- **Retrieval practice deck**: flashcards with spaced repetition (SM-2 or similar), add cards by topic, daily review queue — I learn by explanation + retrieval, not note-taking
- "Explain it back" mode: I type an explanation, ALFRED grades it
- Summary sheet builder per topic

**8. THE DENTAL WING** — road to DDS
- Prerequisite checklist, GPA target tracker, application timeline
- GAMSAT prep tracker (sections, practice tests, scores, weak areas)
- Experience log (shadowing, volunteering, relevant work), portfolio of evidence
- Interview prep question bank

**9. THE READING ROOM**
- Books list (reading / to read / done), pages per day, quotes I save
- Topics I want to explore (psychology, philosophy, religions, business)
- "One idea a day" card

**10. THE SKILLS FORGE**
- Keyboard/piano practice log, songs learning, minutes per week
- Cooking: "cook something new" log with photos, recipe bank, wins
- Any skill I add → hours tracker toward 20-hour / 100-hour milestones
- Language corner (Hindi/Punjabi words of the day — optional)

### 💪 WING III — THE PATROL (body)

**11. PATROL** — training (v2 upgraded)
- Session log: gym / boxing / sport / run / swim, duration, intensity dots
- Weekly minutes bar (default target 420, editable)
- PR Vault for lifts, auto-detect new PRs with a celebration
- Workout templates + travel/hotel/no-equipment workouts (for Gold Coast + India)
- Boxing: rounds, combos practised, shadowboxing timer with round/rest bells

**12. THE BULK LEDGER**
- Weight log + sparkline toward goal weight (editable; bulking = gaining shows green)
- Body measurements, progress photos (stored locally, private, blurred thumbnails)
- Protein + calorie quick tracker (simple, not obsessive), meal templates
- Vegetarian-friendly food ideas, India meal mode (dal, paneer, etc. quick-adds)

**13. THE GROOMING ROOM**
- Skincare AM/PM routine checklist, haircut tracker, fragrance rotation (which scent today, collection list, wishlist)
- Fit check log: photo of the fit → ALFRED rates it

### 💼 WING IV — THE BOARDROOM (money & business)

**14. THE CLOSER** — deals board (v2 upgraded)
- Kanban: ON THE RADAR → AT THE TABLE → CLOSING → WON (+ LOST)
- Any "deal" = a goal I'm trying to close (job application, NAZARA drop, licence test, etc.)
- Closing a deal → confetti + gold plaque on the Wins Wall forever
- Daily negotiation/persuasion tactic

**15. THE VAULT** — money (v2 upgraded)
- Savings goals with rings (default: **Mazda MX-5 fund**, India trip spending, Gold Coast budget, iPhone)
- Income log (GYG pay, other work), expenses by category, monthly budget
- Cop list / wishlist with SECURED toggle
- Travel budget mode with AUD ↔ INR converter (manual rate entry so it works offline)
- Bills/rent contribution tracker

**16. NAZARA HQ**
- Drops roadmap, design ideas board (image uploads), to-dos with Sidak, content calendar
- Inspo moodboard, supplier/contacts list, sales/orders log
- "Under the Gaze" brand notes page

**17. K.S. VOL. 1 STUDIO** (TikTok with Sidak)
- Content ideas bank, scripts, shot lists, posting calendar
- Posted video log with views/likes/follows tracking + growth chart
- Hooks bank, trends to try
- **Travel content planner** — Gold Coast + India content ideas queued

**18. THE APP LAB**
- Scroll app (educational TikTok-style app) planning: features, screens, to-dos
- GHARANA's own changelog + feature request list (so I can ask Claude Code for the next batch)

**19. THE JOB DESK**
- Applications tracker (role, company, date, status, follow-up date)
- Resume versions, cover letter bank, interview log
- P licence progress: logbook hours, test booking, practice checklist

**20. MPA DESK**
- Poster/event design queue, deadlines, finished designs gallery

### 🤝 WING V — MEHFIL (people)

**21. MEHFIL** — circle (v2 upgraded)
- People cards: Mum, Dad, brother, Deepali, Sidak, Arnav, Syed, Nathan, Ravdeep, Nonna, Aditya, Harkie (editable, add/remove)
- Last-contact tracking — cards go cold if I leave someone too long, custom frequency per person
- Birthdays, notes on what's going on with them, gift ideas
- Daily social rep (social confidence challenges, levelled easy → hard)
- Sohbat lines about brotherhood

**22. DEEPALI'S CORNER**
- Date ideas bank, special dates, gift ideas, Bali trip planning (mid-2027), things she's mentioned
- Long-distance mode while I'm in India: call log, time-zone helper (IST vs AEDT), "send something" reminders

**23. FAMILY ROOM (India mode)**
- Relatives list with names + relationships (so I don't blank at weddings 😭)
- Family events/weddings calendar, things to bring back list, gifts list
- Family time counts as a habit, not a failure

**24. THE MENTOR'S STUDY** — "Future Self at 30"
- My 30-year-old self framework: career, body, aesthetics, relationships, money
- Letter from future me (ALFRED can write it from my data)
- Life vision board: penthouse, garage, New York, family man goals
- "Would 30-year-old me be proud of today?" daily yes/no

### 🎲 WING VI — THE GAME ROOM (motivation)

**25. WILDCARD** (v1 upgraded)
- Pick a suit (Cook, Boxing, Keys, Sport, Mind, NAZARA/Style, Reset, Social, Travel, Family, Content) → slot-machine spin → mission
- 300+ missions, tagged by location (home / Gold Coast / India / anywhere) and time needed
- ALFRED can generate fresh missions weekly

**26. THE TROPHY HALL**
- Wins Wall (gold plaques), achievements/badges (100+ — first PR, 7-day streak, 30-day streak, woke before 7 for a week, etc.)
- XP + levels across the whole house, level-up animations
- Season pass for the lock-in: 5 phases, rewards per phase

**27. THE CHALLENGE BOARD**
- 7/30/75-day challenges (e.g. no-sugar week, 10k steps, 30 days of boxing)
- Challenge a mate mode (share a code/image of progress)

**28. THE JUKEBOX**
- Lock-in playlists (paste Spotify links), focus music links, "song of the day"

### ✈️ WING VII — THE TRAVEL WING

**29. THE CONCIERGE** — travel mode
- One switch: **Travel Mode ON** → changes time zone, switches to travel habit set + travel Blueprint, swaps skin (Gold Coast / India)
- Trip planner per trip: flights, accommodation, itinerary, packing list (template + custom), documents checklist
- Gold Coast: daily plan, beach/gym/session tracking, shared costs with the boys
- India: flight dates, return-early tracker, offline-ready everything
- Jet lag helper: sleep shift plan before/after flights
- Return plan: "re-entry protocol" for the week after landing back

### 🎩 WING VIII — THE BUTLER

**30. ALFRED** — AI confidant (v2 upgraded, now a real backend)
- Chat with full context: current phase, streaks, today's ticks, weight trend, deals, vault progress, who's gone cold, study queue
- Photo uploads (fits, food, progress) → feedback
- **DELULU ON/OFF** toggle (from v1). Roasts my excuses, never me. If I'm genuinely down, he drops the bit and talks properly.
- Modes: Coach, Study Tutor (explain → quiz me), Strategist (NAZARA/content), Mate (casual banter)
- **Sunday Review**: reads my week, proposes changes (retire a habit I've skipped 6 times, raise a target I've maxed, new Wildcards) → I approve/reject → writes to config
- Daily morning brief + night debrief summary (on demand, to save tokens)
- Token usage counter + monthly cap
- Offline: queues messages and sends when back online

### ⚙️ WING IX — THE ENGINE ROOM

**31. SETTINGS**
- Name, lock-in dates/phases, time zones, home city
- Room manager (show/hide/reorder/rename/pin)
- Habit, quote, verse, people, rank, palette editors
- Notifications schedule (water, protein, wake, wind-down, study, contact reminders)
- Theme: palette shuffle/pin, location skin auto/manual, battery saver, reduced motion
- Data: export/import JSON, auto-backup, wipe, migrations log
- PIN / Face ID-style lock screen (simple app passcode) for privacy

**32. THE ARCHIVE**
- Every past day as a "page" — scroll back through history
- Weekly/monthly reports with charts (habits %, training minutes, study hours, money saved, weight)
- Lock-in final report card at the end (shareable image)

**33. INBOX**
- Everything from quick capture lands here, then gets sorted into rooms

---

## 5. SYSTEM-WIDE FEATURES

- **Command palette / global search** across every room
- **Quick-add floating button** (habit tick, water, expense, idea, workout, contact)
- **Home screen widgets-style** summary cards on the Lounge
- **Undo** on every destructive action
- **Streak protection**: if I'm travelling on a flight day, mark it as a travel day automatically
- **Time-zone brain**: all daily logic (day rollover, streaks) uses my current location's local midnight; never breaks a streak because of a flight
- **Data portability**: export any room to CSV
- **Shareable cards**: generate a deco-styled image of a win / streak / weekly report for Instagram story
- **Sounds**: optional jazz-club UI sounds (soft piano note on tick, brass sting on win) — mute toggle
- **Onboarding**: first launch walks me through setting my phases, habits and people

---

## 6. BUILD PHASES

> Voice/JARVIS work (Section 8) slots in as **Phase 2.5** — after the travel wing, so the basics are solid first. If time allows before India, at minimum ship push-to-talk + spoken replies + voice commands for the top 20 actions.

**Phase 0 — Setup (today)**
Walk me through: making a GitHub account/repo (private), installing Node, creating the Vite + React + TS project, Tailwind, PWA plugin, Dexie, folder structure, first deploy on Vercel, and adding it to my iPhone home screen via Safari (open Safari directly, paste link, Share → Add to Home Screen). Placeholder Lounge + skyline is enough to prove it works.

**Phase 1 — Core Estate (must be on my phone before 2 Dec)**
Design system + skyline + 9 palettes, navigation (sidebar/bottom bar/Corridor), Lounge, Daily Rites, Blueprint, Morning Rite, Night Debrief, Patrol, Vault, Settings (incl. lock-in phases + Travel Mode + time zones), export/import, full offline support.

**Phase 2 — Travel-ready (before Gold Coast / India)**
Concierge, travel habit sets, Gold Coast + India skins, Family Room, Deepali's Corner time-zone helper, Wildcard v3, ALFRED backend on Vercel with spend cap.

**Phase 3 — The Boardroom + Library**
Closer, NAZARA HQ, K.S. VOL. 1 Studio, Job Desk, MPA Desk, App Lab, Study (with spaced-repetition flashcards), Dental Wing, Reading Room, Skills Forge.

**Phase 4 — The Full House**
Mehfil v3, Mentor's Study, Trophy Hall, XP/levels, Challenge Board, Jukebox, Archive + reports, shareable cards, Grooming Room, Bulk Ledger, notifications, Supabase sync, passcode lock, Sunday Review.

**Phase 5 — Polish**
Performance pass, animation polish, accessibility, bug sweep, README + changelog, a "what to build next" list in App Lab.

After every phase: run the build, fix all errors, commit + push, give me a numbered "test this on your phone" checklist, and wait for my go-ahead.

---

## 7. SEED CONTENT TO WRITE

Pre-fill so it feels alive from day one (all editable):
- 60+ Gita verses with Sanskrit, transliteration, English, and a one-line modern application
- 150+ quotes across Harvey, Mike, Batman, Alfred, Nightwing, Kabir (paraphrase where needed — don't reproduce long copyrighted text)
- 300+ Wildcard missions across all suits, tagged by location
- 60+ social confidence reps, easy → hard
- 30+ travel/no-equipment workouts
- 100+ achievements
- 15+ ranks from THE PROSPECT to THE DON with insignia
- Packing list templates for a beach trip and a 5-week India family trip

---

## 8. THE JARVIS LAYER — ALFRED BECOMES THE HOUSE

ALFRED isn't just a chat room anymore. He **is** the Estate — he can hear me, talk back, and run every room. Think JARVIS with Alfred Pennyworth's manners. Build this as a layer that sits on top of the whole app, reachable from every screen.

### 8.1 Be straight with me about the limits first
Before building, explain in plain English what's actually possible on an iPhone web app vs what needs a workaround. Expected reality (correct me if wrong):
- A PWA **can't listen in the background** or when the phone is locked — no always-on "Hey Alfred" from my pocket.
- Wake word **can** work while the app is open on screen (Porcupine, runs on-device, no audio sent anywhere).
- The real hands-free route on iPhone is **Siri Shortcuts** (see 8.6) — "Hey Siri, Alfred" → speaks to my backend → reads the reply aloud. Build that.
- Speech recognition inside an installed iOS PWA can be flaky — test it, and fall back to recording audio + sending it to the STT API if the built-in one fails.

### 8.2 Ways to talk to him
- **Push-to-talk orb** — a floating gold deco orb on every screen. Hold to talk, release to send. Tap once for hands-free conversation mode.
- **Conversation mode** — continuous back-and-forth: he speaks, then auto-listens for my reply. Voice activity detection to know when I've stopped talking. "Thanks Alfred" / "That's all" ends it. Perfect for gym sets, cooking, getting ready.
- **Wake word (in-app)** — "Hey Alfred" while the app is open. Toggle in Settings, off by default to save battery.
- **Barge-in** — if I start talking while he's speaking, he stops and listens.
- **Type or talk, same brain** — the text chat and voice share one conversation history.
- **Visual** — while listening, the orb pulses with a deco sunburst audio-wave; while speaking, live captions appear on screen (subtitles toggle).

### 8.3 His voice + personality
- Voice options in Settings: a refined British butler (default), plus 3–4 others. Speed and pitch sliders.
- Personality modes, switchable by voice ("Alfred, coach mode"):
  - **Butler** — dry wit, formal, loyal (default)
  - **Coach** — hype, short, aggressive motivation for training
  - **Tutor** — explains big picture first, then details, then quizzes me before moving on
  - **Strategist** — NAZARA, content, money, career moves
  - **Mate** — casual banter, Aussie/desi slang allowed
  - **Calm** — slow, warm, for late nights or when I'm down
- **DELULU ON/OFF** stays. Roasts excuses, never me. If I'm genuinely low, he drops every bit and talks to me properly — and if something sounds serious, he's honest that he's an app and points me to real people (family, mates, or a helpline).
- **Languages** — understands English, Hindi and Punjabi (and Hinglish), replies in whichever I pick. Useful in India.

### 8.4 He can actually DO things (tool calling)
Use Claude tool/function calling so ALFRED can act on the app, not just talk. Every action shows a confirmation chip with **Undo**. Destructive actions (delete, wipe, money moves) need a spoken or tapped "confirm".

Build tools for at least all of these (and design it so adding new tools is easy):
- **Habits:** tick/untick any habit, "what's left today?", "how's my streak?", skip with reason
- **Fuel:** "log 500ml water", "log 40g protein", "what am I at?"
- **Training:** start a workout, log sets by voice ("bench, 3 sets of 8 at 60"), start boxing round timer, call out rounds and rest
- **Timers:** focus timer, Pomodoro, cooking timers, "remind me in 20 minutes"
- **Blueprint:** "what's next?", "move study to 4pm", "it's a shift day today"
- **Money:** "spent $14 on GYG", "how much is in the MX-5 fund?", "convert 2000 rupees", "how much have I spent in India?"
- **Deals:** create, move stage, close ("close the licence deal" → confetti + plaque)
- **People:** "I called Sidak", "who have I not spoken to?", "when's Mum's birthday?", "remind me to message Deepali at 9 her time"
- **Capture:** "note for NAZARA: …", "TikTok idea: …", "add to inbox: …"
- **Study:** "quiz me on renal physiology", "add a flashcard", run a spoken flashcard review session, "explain this then test me"
- **Journal:** voice night debrief — I talk, he transcribes, pulls out wins/dodges/lesson/gratitudes and files them
- **Travel:** "switch to India mode", "what time is it in Melbourne?", "what's left to pack?"
- **Navigation:** "open the Vault", "show my week", "read me the verse"
- **App control:** change palette, toggle battery saver, mute sounds, start/end conversation mode

### 8.5 Proactive Jarvis
- **Morning briefing (spoken):** greeting, palette of the day, weather where I am, today's Big 3, Blueprint highlights, streak status, who's gone cold, countdowns, the verse — under 90 seconds. Triggered when I open the app before noon or say "brief me".
- **Night debrief (spoken):** he asks me the debrief questions out loud and logs my answers.
- **Nudges:** via push notifications ("Sir, you're 1.2L behind on water"), tone set by personality mode.
- **Pattern spotting:** weekly, he tells me things like "you skip boxing every Thursday after shifts — want me to move it?" and proposes config changes (Sunday Review).
- **Re-entry protocol:** when I land back from India, he walks me through getting back to full timetable over a week.

### 8.6 Siri + Apple integration (the real hands-free move)
- Build a secure `/api/alfred/shortcut` endpoint (token-protected) that takes text in and returns a short spoken-style reply, and can run the same tools (writes go into a queue the app syncs when opened — or straight to Supabase if sync is built).
- Give me **step-by-step instructions + a downloadable iOS Shortcut** setup for:
  - "Hey Siri, Alfred" → dictate → send → Siri reads the reply
  - "Hey Siri, log water" / "log protein" / "start focus" one-tap shortcuts
  - Shortcuts I can put on my Action Button / Lock Screen / Apple Watch if I have one
- Morning briefing as a Shortcut I can automate (e.g. when my alarm stops).

### 8.7 ALFRED's long-term memory
- A **Memory Bank** room where ALFRED stores facts about me (goals, preferences, people, patterns) that I can view, edit and delete.
- He references it naturally, never creepily. "Forget that" works by voice.
- Conversation summaries saved per day so he can say "last Tuesday you said…".

### 8.8 Extra integrations (Phase 4+, each optional with its own toggle)
- **Weather** for current location (free API)
- **Google Calendar** read/write (OAuth)
- **Spotify** — play my lock-in playlists by voice (needs Spotify Premium for playback control; otherwise just open the link)
- **News/brief** — short daily headlines on topics I pick (business, sport, tech)
- **Currency rates** (cache last rate for offline)
- **Maps links** — "how far to the beach?" opens Apple/Google Maps

### 8.9 Cost + privacy controls
- Settings → **ALFRED Budget**: monthly cap in AUD, live usage meter (STT minutes, TTS characters, AI tokens), auto-switch to free browser voice when I'm near the cap.
- **Offline mode:** browser speech + on-device commands for simple stuff (tick habit, log water, timers) still work with no internet. Anything needing AI gets queued.
- Mic only ever on when I've pressed/tapped or the in-app wake word is on — show a clear "listening" indicator at all times.
- Option to never store raw audio, only transcripts.

---

## 9. TWO BODIES, ONE HOUSE — PHONE UI vs PC UI

Same data, same brain, but **phone and PC get genuinely different interfaces**, not just one layout squished. Detect device type + screen size + input (touch vs mouse/keyboard) and load the right shell. Let me override it in Settings (force Phone / PC / Tablet layout). Build a shared component library so both shells reuse the same pieces.

### 9.1 PHONE — "The Pocket Estate"
Built for one thumb, on the go, at the gym, in India.
- **Bottom bar** with 5 rooms I pick + a centre slot for the Corridor (arched doorways to every room)
- **The Gold Orb** — floating ALFRED orb, bottom-right in the thumb zone by default, **draggable** anywhere on screen and it snaps to edges. Hold = push-to-talk, tap = conversation mode, double-tap = open ALFRED chat, long-press = quick actions wheel (water, protein, focus timer, capture idea, log expense). Orb hides when the keyboard is open. Pulses gold when listening, sunburst wave while he speaks.
- **Gestures:** swipe left/right between pinned rooms, pull down for the command palette/search, swipe a habit to tick it, long-press any card for options, pull to refresh
- **Card stack layouts** — one thing at a time, big tap targets (44px+), large numbers
- **Haptic feedback** on ticks and wins (where iOS allows)
- **Full-screen modes** for focus timer, boxing round timer and workout logging — giant digits, screen stays awake
- Safe-area aware (notch, home bar), works in standalone mode with no Safari bars
- **Compact Lounge:** clock, House Score, Big 3, next block and fuel only — tap to expand the rest
- Lightweight skyline on phone (fewer layers) to save battery; full skyline when charging

### 9.2 PC / LAPTOP — "The Command Centre"
Built for mouse + keyboard, big screen, planning sessions.
- **Left sidebar** with all wings expanded (collapsible), room icons + names, wing headers in deco type
- **Dashboard grid Lounge** — widgets I can **drag, resize, add and remove** (clock, House Score, Big 3, habits, Blueprint timeline, Vault rings, deal board, streak heatmap, countdowns, verse, weather, mini calendar)
- **Split view** — open two rooms side by side (e.g. Blueprint + Study, Closer + NAZARA HQ)
- **ALFRED docked side panel** on the right — always available, collapsible, shows live captions + action chips. No orb on PC; the panel + hotkey replace it.
- **Full skyline** with all three layers, searchlights and parallax on mouse move
- **Hover states**, tooltips, right-click context menus
- **Tables + bulk editing** for money, applications, flashcards, content calendar
- **Keyboard-first:**
  - `Ctrl/Cmd + K` — command palette (jump to any room, run any action, search everything)
  - `1`–`9` — jump to pinned rooms
  - `N` — quick capture, `W` — log water, `F` — start focus timer, `/` — search
  - `?` — show all shortcuts overlay (deco-styled cheat sheet)
  - All shortcuts rebindable in Settings

### 9.3 THE ALFRED HOTKEY (laptop voice)
- **Inside the app (works in the browser too):** hold a key to talk, release to send — default **hold `Right Alt`** (or `Right Option` on Mac); tap `Ctrl/Cmd + Shift + A` to toggle conversation mode. `Esc` stops him talking.
- **System-wide (desktop app via Tauri):** the same hotkey works **from anywhere on my laptop**, even when GHARANA is minimised or I'm in another app. Pressing it pops up a small **always-on-top deco overlay** (bottom-centre, like a mini Siri bar) with the sunburst wave, live captions and his reply, then it fades out. Option to keep it pinned.
- **Key binder in Settings:** "Press the key you want…" capture screen. Supports single keys, combos, hold-to-talk vs tap-to-toggle, and a separate binding for "type to ALFRED" (opens the overlay with a text box).
- Warn me if a binding clashes with a common system shortcut.
- **Tray / menu bar icon:** quick actions (talk, log water, start focus, open app), shows today's House Score, launch on startup toggle.
- Mic permission handled cleanly on first use, with a plain-English explanation.

### 9.4 TABLET (bonus)
- If I ever use an iPad: sidebar + grid like PC, but with the orb and touch gestures from phone.

### 9.5 Sync between them
- Tick something on my phone at the gym → it's ticked on the laptop when I get home (via Supabase sync, Phase 4). Until sync exists, export/import JSON is the bridge.
- ALFRED conversation history and Memory Bank shared across both.

> Build order: phone + PC shells in **Phase 1** (core layouts, orb, in-app shortcuts, in-app hold-to-talk once voice lands). **Tauri desktop app + system-wide hotkey + overlay + tray** come in **Phase 2.5** alongside the voice layer.

---

Start with Phase 0. Before writing code, give me a one-screen summary of the plan and the accounts I'll need. Let's build the house. 🏛
