# App-level progress

One shared store, one home indicator, every game and lesson reports into it. Per child, persists across reload.

## What it is
- **Store** `src/platform/appProgress.js`, key `fq.appprogress.v1`. Registered in `PROGRESS_KEYS` (so backup, restore, wipe) and therefore in `SWAP_KEYS` (each child keeps their own; a profile switch reloads).
- **Shape** per area `{visits, answers, correct, done, last}` and per day `{answers, correct, done, areas[]}` (last 60 days). `applyReport()` is pure; `summarize()` gives `tried/total`, totals, today.
- **30 areas** in 4 groups (lessons, games, read, explore) = every router screen a child can open.
- **Home** `AppProgressChip` (compass + bar + `tried/total`, star when something was done today) under the header; tap opens `AppProgressSheet` (`.fq-modal`, Escape closes). Kid text is icons and numbers; Ge'ez labels carry no Latin hints.
- **Grown-Ups** shows the same panel (`AppProgressPanel`) above the practice report. "Lesson stars" now reads the Journey (it read a legacy key and was always 0).

## How games report (no per-game wiring)
The router effect calls `trackScreen(screen.name)`, which sets the *active area*. Three existing seams then report into it:
| event | seam |
|---|---|
| answer (right/wrong) | `telemetry.recordAnswer` |
| finished unit | `markNodeDone`, Daily Hunt `onDone`, `roundStore.save` (Echo, Train, Market, Beats...), `churchStore.save` |
| visit | still on the screen after 8 s (`VISIT_MS`), so stray taps do not count |

A new game only needs its screen name in `AREA_GROUPS` and a label in `AppProgress.jsx`.

## Guards
`t(key, fallback)` for all text; `.fq-modal` + safe-area padding; sheet sets `overscroll-behavior: none` and `touch-action: pan-y` (otherwise a horizontal drag triggered browser history-back); no `data-allow-zoom`; no audio code touched.

## Checks
- Unit: `src/platform/appProgress.test.js`, `src/components/AppProgress.test.jsx`.
- Live: `python3 tools/progress-check.py URL [shots_dir]` (chip moves, reload, sheet, second child, back to first, slots 2-6 owned). `tools/rotate-check.py` and `zoom-check.py` gained a `progress` screen.

## ጸሎት (prayer book) tracker
- Prayer is one of the 30 areas (group *read*). Each page turn in the prayer book reports `noteDone('prayer')` (opening the book is not a turn; StrictMode safe).
- `prayerStats()` joins the practice log: minutes over the last 7 days and pages turned. `AppProgressPanel` renders `PrayerTracker` under the groups; `summarize()` returns `prayer` and `mask`.

## Share link (parent-gated, not made by kids)
Grown-Ups > Progress card makes `https://easygeez.com/progress#p=<base64url JSON>`; the website decodes it locally (`website/src/progressCard.js` is a verbatim port of `src/platform/progressCard.js`, cross-checked by vitest). Fields: `v n d s L m c T` plus
- `a` 30-char tried mask for the app areas (`APP_AREA_COUNT`, `APP_GROUP_SIZES` 9/13/2/6)
- `r` `[prayer minutes over 7 days, pages turned]`
Older cards (no `a`/`r`) still render, without the app block.
- **Tigrinya fix:** the Tigrinya pack has 34 families (ቐ after Qe, 238 letters). The card used to hard-code 33 / 231, so every Tigrinya child's link was rejected on the website. Both decoders now take a 33 or 34 mask (`CARD_FAMILY_COUNTS`, `MAX_CARD_LETTERS`), and the site renders the extra ቐ tile for a 34 mask.
- A child with no name gives an empty `n` (it used to say "1"); the page heading falls back to "Fidel journey progress".
- Website header: `/progress#p=...` no longer throws in the anchor-scroll interval (`getElementById`, not `querySelector`).
- Check: `python3 tools/share-check.py APP_URL SITE_URL [shots_dir]` (tablet, desktop, phone, landscape, 320 px, reload, two children, old card, garbage token, nothing sent to the network).
