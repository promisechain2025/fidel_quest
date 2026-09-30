# Read-Along Reader (liturgical Ge'ez) - design & blueprint

A read-along ("reading karaoke") surface for connected Ge'ez text - e.g.
liturgical passages such as the Wudase Maryam. The child sees the Ge'ez words
and each word (or letter) **highlights exactly as it is pronounced** in an
accompanying recording, so they can follow along and connect what a word looks
like to what it sounds like.

This is a **reverent sibling of Story Time** (`src/components/StoryTime.jsx` +
`src/platform/stories.js`): the app already splits Ge'ez on the `፡` wordspace,
renders tappable words, plays per-word/per-letter audio, and flips a word's
colour when spoken. The Reader reuses all of that and adds the one genuinely
new capability: **karaoke sync to a continuous recording**.

## Content the owner provides, per passage

1. **Text** - the Ge'ez, words separated by `፡`, clauses by `።` (from a PDF or
   as Unicode text). Never hand-typed into the app; it comes from a vetted
   source (see "reverence" below).
2. **Audio** - one recording **per mode** (three modes, three files).
3. **Timing map** - per-word (or per-letter) start/stop times, authored once
   with `tools/reader-timing.html` (see "authoring").

### Three modes
- **letter** - each fidel highlighted one at a time (finest timing).
- **spoken** - each word, read plainly.
- **chanted** - each word, chanted (zema). A held/melismatic syllable is just
  one long timing entry, so it needs no special handling.

## Architecture

### New, pure, already built (this branch)
- **`src/platform/passageTiming.js`** - the brain, all pure/testable:
  - `tokenizePassage(text)` / `passageWords(text)` / `letterUnits(text)` -
    deterministic tokenization on `፡` / `።`; word index is a pure function of
    the string (separators are kept, not dropped, so a word's index never
    shifts when punctuation is edited - the timing map is keyed by that index).
  - `activeTokenAt(map, t)` - the highlight heart: binary search returns the
    active token index at time `t`, or `-1` in a gap / before / after. A held
    chant syllable is one wide entry, returned across its whole span.
  - `progressWithin(map, t)` (0..1 sweep across a word) and
    `nextBoundaryAfter(map, t)` (so the rAF loop can idle on a low-end device).
  - `letterClipFor(char)` - maps a glyph to its existing letter clip, or `null`
    (labiovelars, numerals have no clip yet - they still highlight; audio is
    optional by contract).
  - Validators run in tests, not at runtime: `validatePassageMap`,
    `passageCoverage` (sacred-text character audit), `validatePassage`.
- **`src/platform/passagePlayer.js`** - a tiny `HTMLAudioElement` wrapper whose
  native `.currentTime` (polled on `requestAnimationFrame`) drives the
  highlight. Deliberately **separate from `audioEngine.js`**, which has no
  playhead and is built for short one-at-a-time clips; keeping it separate
  leaves the engine's "one voice, cut on nav" invariants untouched. Fails soft
  everywhere (missing/blocked audio never throws).
- **`tools/reader-timing.html`** - offline, self-contained tap-to-sync author:
  load a recording, paste the text, tap on each word's onset, export the
  `{ i, s, e }` map. This is the recommended way to time **chant** (see below).

### Still to build (the UI + wiring - small, cloned from Story Time)
- `src/platform/reader.js` - the passage library (`PASSAGES[]`) + `fq.reader.v1`
  persistence (which passages opened, last position/mode). Mirrors `stories.js`.
  Register `fq.reader.v1` in `src/platform/progress.js` `PROGRESS_KEYS`
  (per-child profiles pick it up automatically via `SWAP_KEYS`).
- `src/components/ReadAlong.jsx` - the reader UI. Reuses `TibebFrame`, the
  `Harag` chapter ornament, `Chunky` buttons, the `.geez` font, and Story Time's
  word-highlight markup - recoloured to **gold** (`--accent`) for sacred
  emphasis rather than the green "correct" pigment. Whole verse always visible,
  current word emphasised (gold + weight + soft glow + one calm `fq-tv-pop`),
  auto-scroll to keep the live word centred (the Explorer pattern), a
  letter/word/chant mode switch, play/pause + slow/normal/fast, tap-a-word-to-
  repeat, an immersive mode, and a calm Anbessa completion with **no score over
  the verse**. Honours `prefers-reduced-motion` (static colour swap).
- Wiring in `src/FidelQuestApp.jsx` (~4 spots, copied from the `stories` arm):
  import `ReadAlong` (via `lazyRetry`), a `screen.name === 'reader'` render arm,
  a `startReader()`, and an `onReader` Backpack tile (ungated - sacred text must
  never block the Journey).
- `vite.config.js` - add `'**/audio/fidel/reader/**'` to `globIgnores` (keep
  passage audio out of the atomic precache) and give it its own runtime
  CacheFirst bucket so passage churn never evicts the core letter voice.
- Audio under `public/audio/fidel/reader/<id>-<mode>.mp3`.

## The timing-map format

Each mode carries its own audio file and its own map (the three recordings have
very different durations). A map is a flat array sorted by start time:

```jsonc
"spoken": {
  "unit": "word",                 // "word" | "letter"
  "audio": "reader/<id>-spoken.mp3",
  "map": [
    { "i": 0, "s": 0.00, "e": 0.62 },
    { "i": 1, "s": 0.62, "e": 1.20 },
    { "i": 2, "s": 1.20, "e": 3.90 }   // a held (chanted) syllable
  ]
}
```

`i` indexes word tokens (`unit:"word"`) or letter units (`unit:"letter"`).
Gaps (silence) are allowed; overlaps are not. `validatePassageMap` /
`validatePassage` enforce this in tests.

## Authoring the timing (affects the recording workflow)

**Recommendation: human tap-to-sync (`tools/reader-timing.html`), especially
for chant.** Automatic forced alignment (Whisper / MFA / aeneas) is weak for
Amharic and **collapses on melismatic chant**, where one syllable is held for
seconds and has no speech-like phoneme sequence to lock onto. Tapping once per
word onset while the recording plays is a few minutes per short passage and is
the only method that gets zema right. (For the plain *spoken* mode, an aeneas
first-pass draft could be imported and hand-corrected later, but it is not
required.)

## Reverence & correctness (highest-stakes, non-code)

Sacred text: a wrong character is worse than in a game. Mitigations, enforced as
green tests:
- Text always comes from the vetted source / the recording CSV, **never**
  hand-typed Ethiopic (same rule as the fidel table).
- `passageCoverage(text)` flags any character that is not a known fidel glyph,
  numeral, or punctuation (PDF copy artifacts, presentation-form codepoints).
- `validatePassage(passage)` asserts every mode's `map` indices and length match
  the token count, so no word/letter is left unhighlighted or over-counted.
- Everything degrades soft: a missing clip still highlights; a missing/uncached
  recording falls back to word-by-word audio; a timing gap holds the previous
  token. Nothing ever blocks a child mid-passage.

## Web vs app vs API

- **App** is the home (offline, no account - its whole purpose).
- **Website** can host a few free sample passages for marketing later (a
  read-only `Reader.jsx` reusing the site's Ge'ez page + fonts). Optional.
- **API** stays out of it - the app never talks to the hub API. Passages ship as
  bundled text/timing + lazy, runtime-cached static audio, exactly like the
  existing story-audio pipeline.
- Each passage carries **rights/vetting metadata** (source, reciter/permission,
  license, a "cleared to distribute" flag) so the liturgical library grows one
  vetted passage at a time. Rights-sensitive passages ship inside the app only,
  not the world-readable web sample.
