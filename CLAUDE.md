# CLAUDE.md

Project context for Claude Code agent sessions in `fidel_quest`.

## What this app is

**Fidel Quest** is an Amharic alphabet (Fidel) learning game for kids. It is
a standalone mobile-first product — fully client-side, no backend, no
accounts. All progress and settings live in `localStorage`.

One home screen offers five modes:

1. **Lesson Levels 1–4** — Duolingo-style listen-and-pick quizzes over the
   33 base letters, with stars, streaks, and star-gated unlocks.
2. **Letter Runner** — a 3D (three.js) lane runner through famous places in
   Ethiopia and Eritrea; steering into a letter gate answers the question.
3. **Fidel Skylands** — a React Three Fiber island quest with strict
   learn-then-play session progression, cumulative quizzes, and a boss
   review (Jibby steals letters from earlier sessions).
4. **Classic Game** — the original game: chant mode, tracing pad, first
   words. Kept intact as its own mode.
5. **Letter Explorer** — tap-to-hear reference for all 231 vocalized forms.

Characters: Anbessa the lion cub (hero), Kokeb the star (companion/power
indicator), Jibby the hyena (villain), plus zebra friends.

## Stack

- React 19 + Vite 6, JSX (no TypeScript)
- TailwindCSS 4 via `@tailwindcss/vite`
- `framer-motion` (2D UI), `three` (runner), `@react-three/fiber` +
  `@react-three/drei` + `@react-spring/three` (Skylands)
- `lucide-react` icons
- `vite-plugin-pwa` (installable/offline; audio clips runtime-cached)
- Capacitor scaffold for native Android/iOS shells (`capacitor.config.json`)
- Vitest + Testing Library

## Layout

```
src/
  main.jsx                     # StrictMode + root render
  App.jsx                      # renders FidelQuestApp; no router
  index.css                    # tailwind, design tokens, chunky buttons
  FidelQuestApp.jsx            # THE APP: data layer, lesson + runner state
                               # machines, sound engine, character art, and
                               # the home/lesson/runner/explorer screens.
                               # Deliberately one big file; §-section map in
                               # its header comment. Exports pure logic for
                               # tests; keep that export surface stable.
  FidelQuestApp.test.jsx       # invariant suite + machine + smoke tests
  FidelSkylands.jsx            # Skylands mode: R3F scene, session
                               # progression machine, cumulative quiz + boss
  FidelSkylands.test.jsx
  pages/AmharicFidelGame.jsx   # Classic mode (chant, trace, words) —
                               # lazy-loaded; read its header before changes
  pages/AmharicFidelGame.test.jsx
  components/FidelTracePad.jsx # canvas tracing pad (Classic)
  data/fidelGameData.js        # 33 fidel families — the validated source
  utils/loadFromStorage.js
  test/setup.js                # jest-dom + storage reset
public/
  audio/fidel/letters/         # drop-in mp3s: <family>-<order>.mp3
  audio/fidel/words/           # drop-in mp3s: <wordKey>.mp3
```

## Commands

```
npm install
npm run dev            # vite dev server
npm run build          # production build + PWA service worker
npm run test -- --run  # one-shot test run
npm run test:coverage
npm run lint
```

## Conventions

- **No TypeScript, no emojis in code or commit messages** (same as the other
  PromiseChain repos).
- **Modes are self-contained single files.** `FidelQuestApp.jsx` and
  `FidelSkylands.jsx` each hold their data, pure machines, and screens, so
  they can also be bundled standalone as Claude Artifacts. Pure logic is
  exported for direct testing.
- **State machines are pure and seeded.** Game loops are table-driven
  reducers (`transition(ctx, event)`); ill-timed events are rejected, never
  absorbed. No `Math.random` in game logic — a threaded mulberry32 PRNG
  makes every run a pure function of (level, seed).
- **The character table has one source of truth**:
  `src/data/fidelGameData.js` (test-verified). The compact family literals
  embedded in the mode files were generated from it — regenerate, never
  hand-edit Ethiopic strings.
- **Audio is optional by contract.** Every sound call tries the real mp3
  first and falls back to Web Audio tones. Never make a feature hard-depend
  on an mp3 existing. No network calls anywhere — the PWA works offline.
- **Character art is drawn in code** (canvas draw-functions shared between
  DOM sprites and WebGL textures). No image assets.
- **ESLint:** `react/no-unknown-property` and `only-export-components` are
  disabled for the two mode files (R3F props / single-file design).

## Testing

- ~60 tests. jsdom has no Audio/canvas/WebGL: tests stub `Audio`, canvas
  code guards `getContext` failures, and 3D scenes are not mounted in tests.
- `FidelQuestApp.jsx` runs a self-test invariant suite at module load
  (data integrity, determinism, twin-letter safety, headless playthroughs);
  the vitest suite asserts every invariant passes — keep the suite green
  and extend it when touching machines or data.
- Keep data-integrity tests exhaustive when touching
  `src/data/fidelGameData.js` — a wrong character in the fidel table is the
  worst bug this app can ship.

## Branching

- Default branch: `main`
- Feature work for agent sessions goes on `claude/<task>-<id>` branches and
  opens PRs against `main`.
- Never force-push, never skip hooks.
