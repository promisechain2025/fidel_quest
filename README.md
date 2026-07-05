# Fidel Quest

An Amharic alphabet (Fidel) learning game for kids. Fully client-side: no
backend, no accounts — progress lives in `localStorage`.

The game was originally built inside the PromiseChain UI repository (branch
`claude/amharic-fidel-game-989vis`, route `/learn/fidel`) and extracted here
because it is a standalone mobile product, not part of the remittance app.

## What is in the box

- Full 33-family Fidel table (231 core forms plus labialized bonus forms)
- Levels: explore/chant mode, listen-and-pick quizzes, tracing pad, first words
- Bilingual UI (Amharic / English), stars, streaks, champion banner
- The whole game deliberately lives in `src/pages/AmharicFidelGame.jsx`
  (data module and trace pad are split out); see the header comment there
  for the design brief and the audio file contract

## Stack

- React 19 + Vite 6, JSX (no TypeScript)
- TailwindCSS 4 (`@tailwindcss/vite`)
- `vite-plugin-pwa` for installable/offline web builds
- Capacitor scaffold for native Android/iOS wrappers
- Vitest + Testing Library

## Commands

```
npm install
npm run dev            # vite dev server
npm run build          # production build (also generates the PWA service worker)
npm run preview        # serve the production build
npm run test           # vitest watch
npm run test -- --run  # one-shot test run
npm run lint           # eslint
```

## Audio

The game plays letter and word clips from predictable paths under
`public/audio/fidel/` and degrades gracefully (Web Audio fallback tones) when
a clip is missing. Drop recordings in and they just work:

- Letters: `public/audio/fidel/letters/<family>-<order>.mp3` (e.g. `le-1.mp3`)
- Words: `public/audio/fidel/words/<wordKey>.mp3`

The exact key for any character is `form.audioKey` in
`src/data/fidelGameData.js`.

## Native builds (Capacitor)

The web app is the source of truth; native shells are generated:

```
npm run build
npx cap add android    # once
npx cap sync
npx cap open android
```

`capacitor.config.json` points Capacitor at `dist/`.
