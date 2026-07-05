# CLAUDE.md

Project context for Claude Code agent sessions in `fidel_quest`.

## What this app is

**Fidel Quest** is an Amharic alphabet (Fidel) learning game for kids. It is
a standalone mobile-first product — fully client-side, no backend, no
accounts. Progress, language choice, and sound settings live in
`localStorage`.

It was extracted from the PromiseChain UI repository (`promisechain_ui`,
branch `claude/amharic-fidel-game-989vis`, formerly mounted at
`/learn/fidel`) because it is not part of the remittance app.

## Stack

- React 19 + Vite 6, JSX (no TypeScript)
- TailwindCSS 4 via `@tailwindcss/vite`
- `lucide-react` icons
- `vite-plugin-pwa` (installable/offline; audio clips runtime-cached)
- Capacitor scaffold for native Android/iOS shells (`capacitor.config.json`)
- Vitest + Testing Library

## Layout

```
src/
  main.jsx                     # StrictMode + root render
  App.jsx                      # renders the game directly; no router
  index.css                    # tailwind import + .dark class variant
  pages/AmharicFidelGame.jsx   # THE GAME: data wiring, audio, state machine,
                               # every screen. Deliberately one big file —
                               # read its header comment before restructuring.
  pages/AmharicFidelGame.test.jsx
  components/FidelTracePad.jsx # canvas tracing pad + pure computeTraceResult
  data/fidelGameData.js        # 33 fidel families, forms, words, UI strings
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
- **The game stays self-contained by design.** Data + helpers + screens live
  in `pages/AmharicFidelGame.jsx` per the product brief in its header
  comment. Pure logic that needs direct testing is exported from the same
  file (see the test file's import list) — keep that export surface stable.
- **Audio is optional by contract.** Every sound call goes through
  `playFileWithFallback`; missing clips fall back to Web Audio tones. Never
  make a feature hard-depend on an mp3 existing.
- **No network calls.** The app must work fully offline; the PWA config
  assumes it.
- **Amharic-first bilingual UI.** All user-facing strings go through
  `UI_STRINGS` in `src/data/fidelGameData.js` with the `t()` lookup —
  never hardcode display text in components.

## Testing

- `pages/AmharicFidelGame.test.jsx` covers data integrity (33 families,
  unique characters), question builders, star scoring, weighting, and mount
  smoke tests. jsdom has no Audio/canvas; tests stub `Audio` and the trace
  pad guards `getContext` failures.
- Keep data-integrity tests exhaustive when touching
  `src/data/fidelGameData.js` — a wrong character in the fidel table is the
  worst bug this app can ship.

## Branching

- Default branch: `main`
- Feature work for agent sessions goes on `claude/<task>-<id>` branches and
  opens PRs against `main`.
- Never force-push, never push directly to `main`, never skip hooks.
