# CLAUDE.md

Project context for Claude Code agent sessions in `fidel_quest`.

## Repo layout: three independent deliverables

- **`/` (root `src/`)** — the eGeez **app** (this file's main subject): fully
  client-side PWA, no backend, no accounts. Nothing below may be imported
  into it; it stays offline.
- **`website/`** — the public **learning-hub site** (Vite + React + Tailwind,
  own package.json): vision/landing, Amharic + Tigrinya pages, teacher
  application, homeschool guidance. Brand tokens hand-copied into
  `website/src/tokens.css`; forms post to `api/` (`VITE_API_URL`) with a
  mailto fallback. See `website/README.md`.
- **`api/`** — the **hub API** (Express, own package.json): JWT accounts base
  (parent/teacher) + teacher-application/waitlist/contact forms with owner
  email notifications. Mongo when `MONGO_URI` is set, in-memory otherwise;
  `npm test` runs node:test + supertest with zero services. Patterns come
  from PROMISECHAIN_BE. Distinct from `server/` (zero-dep, no-PII
  analytics/OG service) — do not merge the two. See `api/README.md`.

## What this app is

**eGeez** is an Amharic alphabet (Fidel) learning game for kids. It is
a standalone mobile-first product — fully client-side, no backend, no
accounts. All progress and settings live in `localStorage`.

The home screen is a **single linear Journey** (`src/journey.js`) — a
winding path of typed nodes (`LEARN`, `MIX`, `QUIZ` boss, `ARCADE` gateway)
with exactly one pulsing "next step". Progress lives in `fq.journey.v1`;
`nextNode`/`nodeUnlocked` gate strictly in sequence; legacy blobs
(`fq.learn.v1`, `fq2.progress`) migrate on first load. Completing a node
grants an authored wearable from `REWARD_TABLE` (composited over Anbessa by
`drawWearables`). Utilities live off the path in a **Backpack** popover.

The content behind the nodes:

1. **Letter Steps** (LEARN/MIX nodes) — learn-first six-phase mini-games
   per family (Bubble Pop → constellation → Feed Anbessa → Jibby shuffle →
   trace-to-carve). Echo/Shuffle capped at 3 rounds, Mix at 4.
2. **Lesson Levels 1–8** (QUIZ boss nodes) — listen-and-pick quizzes; 1–4
   base letters, 5–8 vowel orders.
3. **Letter Runner** / **Letter Catch** (ARCADE gateway nodes) — the two
   celebratory "earned a real game" nodes. The Runner is the 3D (three.js /
   R3F) scene; on a low-FPS device `ArcadeGateway` routes to the WebGL-free
   `Runner2D` (`src/components/ArcadeFallback.jsx`) over the same pure machine
   (verdict persists in `fq.perf.v1`). **Letter Catch** (`LetterCatch.jsx` over
   the pure `letterCatchCore.js`) is a 2D falling-letters game — slide Anbessa's
   basket to catch the letter Kokeb calls and dodge the rest — so it needs no
   3D and no fallback.
4. **Anbessa's Closet / First Words / Star Practice / Classic / Letter
   Explorer / Grown-Ups** — reached from the Backpack (Closet also opens by
   tapping the header hero). The **Closet** is the viral loop: dress Anbessa
   in earned wearables, then **Share Anbessa** renders a card (Anbessa +
   `X / 231 letters learned`, `components/ShareCard.jsx`) to the Web Share
   sheet (WhatsApp/social) with the app URL, falling back to a PNG download.
   Fully client-side; nothing leaves the device unless the parent shares.

Trace scoring is directional (`computeTraceResultV2`): a mask-derived origin
+ axis with chapter-scaled tolerance and soft origin/direction cues that
never block progress. First Words interleaves twin-aware `glyph` rounds —
the only place phonetic twins (ሀ/ሐ) co-occur, disambiguated by picture.

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
  LetterCatch.jsx              # Letter Catch: 2D falling-letters catch game
                               # (slide the basket to catch the called letter)
  letterCatchCore.js           # pure seeded Letter Catch machine (stepped)
  letterCatchCore.test.js
  skylandsCore.js              # pure letter-pool data (cumulative-by-node),
                               # reused by Letter Catch; no three.js imports
  Runner3D.jsx                 # the WebGL Letter Runner scene (three.js);
                               # lazy-loaded with FidelSkylands so the 3D
                               # stack stays off the home path
  journey.js                   # unified Journey model: nodes, fq.journey.v1
                               # progress, rewards, legacy migration (pure)
  journey.test.js
  LearnLetters.jsx             # Letter Steps path + six-phase mini-games
  components/ArcadeFallback.jsx # Runner2D / Skylands2D (WebGL-free P4 games)
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

## Before building anything (the standing checklist)

1. **Is there a better and easier way?** Prefer the boring answer.
2. **Which platform module owns this state?** Child progress never gets a
   new ad-hoc localStorage key without registering it in
   `src/platform/progress.js` (the app-level progress registry).
3. Does it work **offline**, on a **low-end device**, in **all 8
   languages** (audit with the split script - zero missing keys)?
4. Is the logic **pure and seeded** so it tests headless?
5. Does anything here **block a child mid-task**? It must not.

See `docs/architecture-review.md` for the full must-do list and the
current scorecard.

## Standing rules these repos are reviewed against

These came out of the review rounds; a change that breaks one is a
regression even if nothing fails. Check them before saying a task is done.

### The website may never out-claim the app

`website/` imports nothing from `src/`, so it drifts silently. Every
user-visible claim on the site must be checkable against app code:

- **Numbers are per-pack.** Amharic is 33 families / 231 forms; Tigrinya is
  34 / 238 (the extra ቐ). Never print one as "all letters" without saying
  which language.
- **Features that are pack-conditional must say so.** Stories are
  Amharic-only (`platform/stories.js`, every entry `pack: 'am'`), and the
  Tigrinya journey has no STORY nodes at all.
- **Prices and trial terms live in the app** (`platform/license.js`
  `APP_PRICE` / `TRIAL_DAYS` / `DAILY_PASS_MINUTES`,
  `platform/familyPack.js`). The site, the JSON-LD and `api/routes/pay.js`
  must agree with them, and JSON-LD `availability` must follow the same
  signal as the buy button - never advertise a live price on a page that
  cannot take money.
- **Never advertise a purchase path that does not exist yet.** Store
  buying needs a RevenueCat key (`platform/storeEnv.js`); without one the
  native build is deliberately free and silent.
- **No invented proof.** No user counts, awards, testimonials or test
  totals unless they are real and sourced.
- **A promise on a sales page must match the Terms page**, and no
  `[bracketed placeholder]` ships next to a live checkout.

### Accessibility is measured, not eyeballed

- Text contrast >= 4.5:1 (>= 3:1 at 18.66px bold / 24px), and focus
  indicators >= 3:1 against what they sit on - **in both colour schemes**.
  Sample the rendered pixels; do not trust the palette.
- Colour tokens split by ROLE: `--accent` is a fill, `--accent-text` is
  readable text, `--focus` is the ring. A fill colour is not a text colour.
- `aria-modal` obliges a real focus trap plus an inert background.
- One `<h1>` per page, no skipped heading levels, every control labelled,
  every image `alt` (or `alt="" aria-hidden`), a skip link to `#main`.

### A form must never lie about what happened

- Success UI only after the server actually accepted it. `submitForm`
  returns `{ mailto: true }` when `VITE_API_URL` is unset - that is a mail
  draft, not a signup, and must read differently.
- Every failure path renders a `role="alert"`; no `catch {}` that swallows.
- Transport failures get human copy (`UNREACHABLE`), never the browser's
  raw "Failed to fetch".
- A definitive 4xx is terminal - do not retry it behind a spinner.

### API defaults must fail safe

- **Never trust a header for identity.** Rate limiting keys on `req.ip`,
  which only means anything when `trust proxy` matches the real deploy
  (`TRUST_PROXY`, empty by default).
- Auth paths cost the same whether or not the account exists - no timing
  oracle.
- Anything an anonymous caller supplies is allow-listed before it reaches
  an email subject, a query, or the store.
- Fail fast at boot on config that would silently corrupt production
  (`JWT_SECRET`, `SITE_URL` when Stripe is live). Do not gate those checks
  on `NODE_ENV` - hosts often leave it unset.
- Client-caused body errors are 4xx, not 500.
- Destructive scripts refuse to run without an explicit confirm env var.

### SEO on a client-rendered SPA

- Every indexable route needs baked head tags. `src/routeMeta.js` is the
  source of truth and `scripts/prerender.mjs` writes them at build time;
  add a route to both, plus `public/sitemap.xml`.
- Descriptions 50-160 chars (the prerender script fails the build
  otherwise). Unknown URLs, per-buyer and account pages are `noindex`.

### Weight on the landing path

- No animation library on the critical path. Scroll reveals are
  IntersectionObserver + CSS (`.reveal`), and every motion class is a
  no-op under `prefers-reduced-motion`.
- Content is never hidden by a mechanism that JS failure leaves closed -
  `.reveal` has a `<noscript>` and a no-IntersectionObserver fallback.

## Branching

- Default branch: `main`, and work lands DIRECTLY on `main` (owner's
  decision, July 2026): this is a solo-maintained app where the deployed
  PWA and the store builds should always match the tip of one branch.
  Commit and push to `main`; no PR round-trips.
- Never force-push, never skip hooks.
