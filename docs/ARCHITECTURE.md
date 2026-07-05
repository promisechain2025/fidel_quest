# Fidel Quest — Architecture

A mobile-first Amharic alphabet (Fidel) learning game for kids. Fully
client-side: no backend, no accounts, offline-capable PWA. One home screen,
five modes, one cast of code-drawn characters.

## Modes

| Mode | What it is | Engine |
|---|---|---|
| Lesson Levels 1-4 | Duolingo-style listen-and-pick quizzes over the 33 base letters: chunky press-down buttons, segmented progress, streaks, bottom feedback sheets, 1-3 stars by first-try accuracy, star-gated unlocks | Pure state machine + framer-motion |
| Letter Runner | 3D lane-runner through six landmarks (Lalibela, Aksum, Simien, Gondar, Asmara, Massawa). Letter gates are the answers; wrong gates bring the chasing Muncher closer; boss showdown every five gates | Raw three.js |
| Fidel Skylands | Floating-island quest: learn Session N by tapping every fruit on the island's tree, then beat a quiz drawn cumulatively from Sessions 1..N. Clearing an island springs a bridge, warms the sky, and ends with Jibby's Snack Attack (win back three stolen review letters) | React Three Fiber + drei + react-spring |
| Classic Game | The original game preserved intact: chant mode, canvas tracing pad, first words | Lazy-loaded legacy module |
| Letter Explorer | Tap-to-hear reference for all 231 vocalized forms | Shared data layer |

Characters (drawn in code, zero image assets): Anbessa the lion cub (hero),
Kokeb the star (companion; her glow is the power meter), Jibby the hyena
(villain), zebra friends.

## Load-bearing decisions

1. **One source of truth for the script.** All 33 families x 7 orders live
   in `src/data/fidelGameData.js` (test-verified). Mode files embed compact
   literals GENERATED from it; forms, sounds, and indexes are derived by
   pure functions. Never hand-edit Ethiopic strings.
2. **Pure, seeded state machines.** Table-driven reducers
   (`transition(ctx, event) -> { next, accepted }`); ill-timed events are
   rejected, never absorbed. No `Math.random` in game logic - a threaded
   mulberry32 PRNG makes every run a pure function of (level, seed).
   Machines: lesson (IDLE/PRESENTATION/AWAITING_INPUT/SUCCESS_BURST/
   ERROR_RECOVERY/LEVEL_COMPLETE), runner (RUNNING/FEEDING/BOSS/DESTROYED),
   Skylands progression (map/learning/game/boss phases, `sessionsCompleted`
   gates).
3. **Self-contained mode modules.** `FidelQuestApp.jsx` and
   `FidelSkylands.jsx` hold data + machines + sound + art + screens each in
   one file (section maps in their headers), so they can be bundled
   standalone as Claude Artifacts. Pure logic is exported for tests.
4. **Everything optional degrades.** Audio: real mp3 first, deterministic
   Web Audio chime fallback. No WebGL: friendly message, 2D modes work.
   No network calls anywhere.

Pedagogy in the factories: twin-letter safety (same-sounding letters never
appear as each other's distractors), fresh-material weighting (new letters
are at least half of each Skylands quiz), structural spaced repetition
(cumulative pools; the boss steals earlier-session letters).

## Tech stack

- React 19 + Vite 6, JSX (no TypeScript), TailwindCSS 4, framer-motion,
  lucide-react
- three.js (runner, imperative); @react-three/fiber + @react-three/drei +
  @react-spring/three (Skylands, declarative); hand-rolled physics
  (gravity-integrated particle bursts, springs) - WASM engines cannot ship
  in offline artifacts
- Canvas 2D character art shared between DOM sprites and WebGL textures
- Audio: 277 mp3s (231 forms + 21 labialized + 25 words) synthesized with
  espeak-ng's Amharic voice (WASM build), peak-normalized, lamejs-encoded;
  `window.FIDEL_AUDIO` hook lets artifact builds embed clips as data URIs;
  see public/audio/fidel/SOURCE.txt for provenance and upgrade paths
- Persistence: localStorage (stars, runner best, Skylands progress, sound)
- Delivery: PWA with vendor-split chunks (react/three/r3f/motion),
  Capacitor scaffold for native shells, single-file artifact builds via
  vite-plugin-singlefile
- Quality: Vitest + Testing Library (61 tests), module-load invariant suite
  (data integrity, determinism, headless playthroughs), GitHub Actions CI
  (lint, coverage tests, build)

## History

Recovered from git history after a lost session -> rebuilt Duolingo-style
on a rigid engine -> 3D runner through Ethiopia/Eritrea -> character
redesign -> Fidel Skylands with cumulative progression and boss review ->
merged into one app -> promoted to the shipped product with tests, CI, and
docs -> full synthesized Amharic voice. Every step was verified by driving
the real app in a browser before shipping.

## Open items

- Native-speaker recordings (drop-in replacement per SOURCE.txt)
- Android/iOS builds via the Capacitor scaffold
- GitHub default branch switch to `main` (repo settings)
