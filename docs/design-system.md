# eGeez — Dark Manuscript design system

Status: **in progress** on branch `claude/design-manuscript`. This document is
the single source of truth for the visual overhaul. It reevaluates every screen
and defines the tokens + shared primitives so screens change by *inheriting the
system*, not by bespoke rewrites.

## The idea

eGeez is rooted in **Ethiopian illuminated manuscripts + tibeb textile art**
rather than generic edtech. The look:

- **Dark vellum ground** (deep indigo) as the default; a **warm parchment**
  daylight theme is a user-selectable alternative (top-right sun/moon toggle).
- **Aged-pigment palette** from Ge'ez gospel manuscripts: madder red, lapis
  indigo, malachite green, ochre — plus **champagne gold** as the connective
  accent (rims, cords, primary buttons).
- **Tibeb woven borders** down both screen edges + a subtle gold **geometric
  lattice** background texture.
- The **letter** is the shared object everywhere: a **gold chunky
  rounded-square tile** with a dark-brown Ge'ez glyph, green check when done —
  identical on the home grid, the quiz answers, the explorer, the hunt, the
  closet previews.
- Champagne-gold typography for numbers/headings; cream/ivory body on dark.

## Layout rule

Content clears the tibeb side borders on every screen. In practice the borders
are a narrow 14px woven band and screen roots already inset with `px-4`/`px-5`
(16–20px), so nothing — header, card, label, tile, button — touches the border.
(An earlier `--pad` token was dropped: at 40px it over-indented the real,
narrower band, and the screen padding already provides the clearance.) Section
labels keep a ≥14px gap above their content.

## Tokens (remap of the existing centralized tokens in `src/index.css`)

Default theme = **dark manuscript**. The existing semantic token *names* stay
(so components need no churn); only their *values* change, plus a few additions.

| Token | Dark (default) | Warm (daylight) | Role |
|---|---|---|---|
| `--paper` | `#1b2233` | `#f7edcf` | screen ground (vellum) |
| `--paper-2` | `#141a28` | `#e5d2a4` | ground gradient bottom |
| `--ink` | `#eae3d2` | `#3c3529` | primary text |
| `--muted` | `#9aa2ba` | `#8a7a58` | secondary text |
| `--card` | `#2a3248` | `#fffaf0` | panels/cards |
| `--line` | `#3a4560` | `#e7dab2` | hairlines |
| `--accent` (gold) | `#e2c069` | `#c99a33` | brand/primary/rims |
| `--accent-deep` | `#a9832f` | `#9c7420` | button 3D edge |
| `--tile` | `#ffcb33` | `#ffc61f` | done letter tile face |
| `--tile-deep` | `#c68d12` | `#d99e12` | tile 3D edge |
| `--glyph` | `#7c4f00` | `#7c4f00` | glyph on gold tile |
| `--go` (green) | `#59a52a` | `#59a52a` | correct / share |
| `--bad` (madder) | `#c0453a` | `#c0453a` | wrong / boss |
| `--sky` (lapis) | `#3f63a0` | `#3f63a0` | story / info |
| `--cream` | `#f8f2e2` | — | glyph-on-jewel, button text |
| tibeb band | `['#c0453a','#d5a53a','#3f63a0','#5a9150', base]` | same | side borders |

Chapter jewel tones (for reward beads / accents), dark: madder `#c85446`,
lapis `#4468ad`, malachite `#5a9a52`, ochre `#d7a83e`.

## Shared primitives (new)

1. **`<TibebFrame>`** — fixed full-height woven borders on both edges + the
   subtle lattice + optional faint illuminated-letter watermark. Wraps every
   screen. One canvas or CSS-tiled element; drawn once, theme-aware.
2. **`<LetterTile glyph state size>`** — the gold chunky tile (`done|current|
   locked`), the single shared letter object. Replaces ad-hoc letter rendering
   in PathNode, the quiz options, Explore, Hunt, Closet previews.
3. **Chunky button** — extend the existing `.chunk` with gold primary / green
   positive variants over the new tokens (no structural change).
4. **Theme toggle** — sun/moon control in the header; persists to
   `localStorage` (`fq.theme.v1`) and stamps `data-theme` on `<html>` (the
   token system already resolves `data-theme`).

## Screen-by-screen reevaluation (recolor-only unless noted)

- **Home / JourneyPath** — dark trail; 3-col serpentine grid of `LetterTile`s;
  **no connector**; TibebFrame; glass HUD (avatar, progress, streak, gift,
  sound, **theme toggle**); flag-free language pill (globe + native name);
  Kokeb **power bar** at the bottom (Warm-up/Hunt charge, Continue). Node kinds
  keep their emblems (boss=Jibby tile, arcade=green circle, story=campfire,
  review=checkpoint) but in manuscript tones.
- **Lesson quiz** — slim prompt (play button + one line), 2×2 `LetterTile`
  answers, gold Check. *Layout unchanged, recolor only; top prompt minimized.*
- **Letter Steps (Feed Anbessa etc.)** — progress bar, prompt + play, floating
  `LetterTile`s (correct one glows), Anbessa. Recolor only.
- **Closet** — dressed-Anbessa preview panel + letters-learned + Share (keeps
  green); Hats/Scarves/Capes equip rows as gold-framed tiles. Recolor +
  `--pad` inset.
- **Story Time** — codex card: illuminated first `LetterTile`, decodable Ge'ez
  line, picture, translit + meaning; progress dots; Prev/Next. Recolor only.
- **Letter Explorer** — family detail strip (base + 7 forms + play) over a full
  grid of `LetterTile`s. Recolor only.
- **Daily Hunt** — target `LetterTile` + a field of tiles to match. Recolor.
- **Grown-Ups** — stat cards (letters/streak/accuracy/trouble) + tool rows.
  Recolor only.
- **Modals** (rating, gift, cancel, sheets) — inherit tokens automatically.

## Build order

1. **Foundation:** this doc + token remap in `index.css` (dark default + warm
   variant) + theme toggle plumbing. (visible: whole app shifts to manuscript.)
2. **Primitives:** `TibebFrame`, `LetterTile`, button variants.
3. **Home:** JourneyPath adopts TibebFrame + LetterTile + power bar + no
   connector + theme toggle in header.
4. **Per screen:** quiz, closet, story, explorer, hunt, grown-ups, letter steps
   — one focused change each, recolor-only, `--pad` audited.
5. **Polish + tests:** keep the 435-test suite green; add a token-contrast
   smoke check; device screenshots per screen for sign-off.

Interactive mockups for every screen (reference for the target look) were
produced during design and match this spec.
