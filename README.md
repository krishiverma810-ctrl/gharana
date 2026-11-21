# GHARANA v3 — The Estate

> **THE HOUSE BUILDS THE NAME.**
> Krishi's personal self-improvement operating system. Art deco × jazz age × Indian heritage.
> Installable offline-first PWA (iPhone home screen) + desktop app later (Tauri, Windows).

The full spec is in [`GHARANA_v3_BUILD_PROMPT.md`](GHARANA_v3_BUILD_PROMPT.md). The build moves through Phases 0 → 5.

## Status
- [x] **Phase 0** — setup, placeholder Lounge, living skyline, 9 palettes, on-device DB, PWA
- [x] **Phase 1** — Core Estate: phone + PC shells, Corridor, command palette, Lounge, Daily Rites, Morning Rite, Night Debrief, Blueprint (+ focus timer, shifts), Patrol (+ PR vault, boxing rounds), Vault, Settings (phases, Travel Mode, rooms, data)
- [ ] Phase 2 — Travel-ready · [ ] 2.5 — Voice/JARVIS · [ ] 3 — Boardroom + Library · [ ] 4 — Full House · [ ] 5 — Polish

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
api/           Vercel serverless functions (ALFRED, Phase 2)
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
