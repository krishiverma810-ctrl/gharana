# GHARANA v3 — The Estate

> **THE HOUSE BUILDS THE NAME.**
> Krishi's personal self-improvement operating system. Art deco × jazz age × Indian heritage.
> Installable offline-first PWA (iPhone home screen) + desktop app later (Tauri, Windows).

The full spec is in [`GHARANA_v3_BUILD_PROMPT.md`](GHARANA_v3_BUILD_PROMPT.md). The build moves through Phases 0 → 5.

## Status
- [x] **Phase 0** — setup, placeholder Lounge, living skyline, 9 palettes, on-device DB, PWA
- [x] **Phase 1** — Core Estate: phone + PC shells, Corridor, command palette, Lounge, Daily Rites, Morning Rite, Night Debrief, Blueprint (+ focus timer, shifts), Patrol (+ PR vault, boxing rounds), Vault, Settings (phases, Travel Mode, rooms, data)
- [x] **Phase 2** — Travel-ready: Concierge (trips, flights, packing, docs, shared costs, jet lag, re-entry), Gold Coast + India skyline skins, 7 new palettes, Family Room, Deepali’s Corner, Wildcard (308 missions), Calendar (+ .ics), ALFRED on Vercel (tools, photos, modes, DELULU, spend cap, offline queue)
- [x] **Phase 2.5a** — Voice: Gold Orb (hold / tap / double-tap / drag), conversation mode, captions, 25+ offline voice commands, spoken replies (device or premium), desktop dock + Right-Alt hold-to-talk, Memory Bank, reminders, Siri bridge (`kind: siri | quick`, Upstash queue), morning briefing
- [x] **Phase 2.5b** — Windows desktop app (Tauri, `src-tauri/`): system-wide hotkeys (rebindable), always-on-top ALFRED bar, tray, close-to-tray, launch on startup, native Windows speech recognition. Build: `npx tauri build` → `src-tauri/target/release/bundle/nsis/`
- [x] **Phase 3** — Boardroom + Library: Closer (kanban + Wins Wall + daily tactic), NAZARA HQ, K.S. VOL. 1 Studio (growth chart), App Lab (feature requests → Claude Code), Job Desk (+ P-licence logbook), MPA Desk, Study (units, WAM/GPA, SM-2 flashcards, explain-it-back), Dental Wing (GAMSAT, experience, interview practice), Reading Room, Skills Forge (20/100-hour milestones, language corner)
- [x] **Phase 4a** — Full House (in-app): Mehfil (people cards that go cold, birthdays, check-ins, 60 social reps, sohbat), Mentor’s Study (30-year-old me, vision board, letters from ALFRED), Trophy Hall (XP, levels, 136 achievements, Wins Wall, season pass rewards), Challenge Board (7/30/75-day + vs a mate), Jukebox, Grooming Room (AM/PM routine, fragrance rotation, haircuts, ALFRED fit check), Bulk Ledger (weight chart, measurements, private progress photos, protein/kcal quick-adds incl. India meals), Inbox (sort captures into rooms), Archive (every day as a page, week/month/lock-in reports), shareable story cards, passcode + Face ID lock, Sunday Review (local pattern-spotting + ALFRED proposals you approve)
- [ ] Phase 4b — Supabase sync (phone ↔ laptop) + push notifications · [ ] Phase 5 — Polish

## Run it
```bash
npm install        # once, after cloning
npm run dev        # local dev server → http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build → http://localhost:4173
npm run icons      # regenerate PNG icons from public/favicon.svg
```
Pushing to `main` on GitHub makes Vercel auto-deploy → **https://gharana-blue.vercel.app**

## Phase 1 notes / known gaps
- Blueprint blocks are edited by tapping them (start/end pickers); true drag-to-resize comes in Phase 5 polish.
- 26 Gita verses + 50 quotes ship now; the full 60 / 150 sets arrive with later phases.
- Desktop Lounge widgets are a fixed grid; drag/resize/add/remove widgets is Phase 4.
- The ALFRED orb + docked panel arrive with ALFRED (Phase 2) and voice (Phase 2.5).
- Scheduled push nudges (water, wind-down) are Phase 4; the focus timer can already notify.

## ALFRED setup (server)
Vercel → Project → Settings → Environment Variables:
- `ANTHROPIC_API_KEY` — from console.anthropic.com (set a monthly spend limit there too)
- `ALFRED_ACCESS_KEY` — a passphrase you choose; enter the same one in the app under Settings → ALFRED

The API key never reaches the phone. The app runs the tool loop locally and sends a short day snapshot with each message. History is append-only (frozen system prompt + per-turn system messages) so thinking blocks stay valid; refusals fall back server-side (`fallbacks: "default"`).

## Voice + Siri (optional server pieces)
- **Upstash Redis** (Vercel → Storage → Upstash, free): lets Siri queue actions + read today's snapshot. Env vars `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_*`) are added by the integration.
- **OPENAI_API_KEY** (optional): premium TTS/STT via `/api/voice`. Without it the phone's own voices + speech recognition are used.
- Siri Shortcut: POST `/api/alfred?format=text` with header `x-house-key` and JSON `{ "kind": "siri", "text": <dictated> }` → plain-text reply for "Speak Text". One-tap: `{ "kind": "quick", "action": "water", "amount": 500 }`.

## Stack
Vite + React 19 + TypeScript · Tailwind v4 + CSS variables (palette tokens) · Zustand · Dexie (IndexedDB) ·
vite-plugin-pwa (Workbox) · Framer Motion · self-hosted fonts via @fontsource (work offline).

**Why Tailwind + CSS variables:** each palette is just a set of CSS variables
(`--accent`, `--ink`, `--surface`…). The palette of the day writes them at runtime and
everything restyles instantly. Tailwind handles layout; the variables handle the colour.

## Folder map
```
src/
  app/         App shell (layout, palette + time-zone wiring)
  components/  Shared pieces: Skyline, DecoCard, SunburstDial…
  rooms/       One file/folder per room (Lounge, …)
  db/          Dexie database + migrations — NEVER edit an old version() block
  store/       Zustand stores + small hooks
  theme/       Palettes (data) + palette-of-the-day logic
  config/      Default seed config (lock-in phases, later habits/quotes/verses…)
  lib/         Utilities (time-zone brain, etc.)
api/           Vercel serverless functions — alfred.ts (Claude, model claude-opus-5-5)
legacy/        Old v2 gharana.jsx goes here for reference
public/        Icons + static files
scripts/       Dev scripts (icon generator)
```

## Rules of the house
1. **Secrets** live only in Vercel env vars / `.env.local`. `.env*` is git-ignored.
2. **Data is sacred.** Schema changes = new Dexie `version(n)` with `upgrade()`. Never delete user data.
3. **Config-driven.** Habits, rooms, quotes, palettes, phases → data, editable in-app.
4. **Time-zone brain.** All "today" logic uses `src/lib/time.ts` with the current location's zone.
5. **Mobile-first**, 44px+ tap targets, safe-area aware.
