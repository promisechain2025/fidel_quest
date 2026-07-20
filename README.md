# eGeez

An Amharic alphabet (Fidel) learning game for kids. Fully client-side: no
backend, no accounts — progress lives in `localStorage`. Installable as a
PWA and works offline.

## Five modes, one home screen

- **Lesson Levels 1–4** — Duolingo-style listen-and-pick quizzes over all 33
  base letters, with stars, streaks, star-gated unlocks, and celebrations.
- **Letter Runner** — a 3D lane runner through famous places in Ethiopia and
  Eritrea (Lalibela, Aksum, the Simien Mountains, Gondar, Asmara, Massawa).
  Steer Anbessa into the gate with the letter that says the sound; wrong
  gates bring Jibby the hyena closer, and every level ends in a showdown.
- **Fidel Skylands** — a React Three Fiber island quest. Learn a session's
  letters (tap every fruit on the island's glowing tree), then beat a quiz
  drawn cumulatively from all unlocked sessions. Clearing an island grows a
  bridge to the next; Jibby ends each quiz by stealing review letters you
  must win back.
- **Classic Game** — the original eGeez: chant the seven orders, trace
  letters on a canvas pad, learn first words.
- **Letter Explorer** — tap-to-hear reference for all 231 vocalized forms.

Characters: **Anbessa** the lion cub, **Kokeb** the star, **Jibby** the
hyena, and zebra friends — all drawn in code (canvas), no image assets.

## Stack

- React 19 + Vite 6, JSX (no TypeScript)
- TailwindCSS 4 (`@tailwindcss/vite`)
- `framer-motion` for 2D UI; `three` for the runner; `@react-three/fiber`,
  `@react-three/drei`, `@react-spring/three` for Skylands
- `vite-plugin-pwa` for installable/offline builds
- Capacitor scaffold for native Android/iOS wrappers
- Vitest + Testing Library

## Commands

```
npm install
npm run dev            # vite dev server
npm run build          # production build (also generates the PWA service worker)
npm run preview        # serve the production build
npm run test -- --run  # one-shot test run
npm run lint           # eslint
```

## Audio

Every mode plays letter clips from predictable paths under
`public/audio/fidel/` and degrades gracefully (deterministic Web Audio
chimes) when a clip is missing. Drop recordings in and the whole app speaks:

- Letters: `public/audio/fidel/letters/<family>-<order>.mp3` (e.g. `le-1.mp3`)
- Words: `public/audio/fidel/words/<wordKey>.mp3`

The exact key for any character is `form.audioKey` in
`src/data/fidelGameData.js`.

## Native builds (Capacitor)

```
npm run build
npx cap add android    # once
npx cap sync
npx cap open android
```

`capacitor.config.json` points Capacitor at `dist/`.
