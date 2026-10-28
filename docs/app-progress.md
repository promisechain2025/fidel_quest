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
