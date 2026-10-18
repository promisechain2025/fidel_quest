# ጸሎት ዘዘወትር: the prayer book screen (design B)

## Layout (phone portrait, about 390×844)
- One warm-paper page (#fbf3e2) on a desk tone (#e9d7b0). Margins are about 44px on the sides and 40px at the top.
- Kids' type: Noto Serif Ethiopic Bold at clamp(26px, 7.4vw, 36px), line-height 2.7. The tall line gap leaves room for marks above and ties below.
- Pagination is measured. A ResizeObserver reads the page box and computes lines × letters per line, which gives a letter budget. Pages are cut on whole words and prefer to end at a ። once the page is 70% full. This usually gives 5–7 lines.
- Header: back arrow on the left, the title in red in the middle, and the eye toggle on the right.
- Footer: speed dots on the left (0.8 / 1 / 1.2) and a large saffron play/pause button in the middle.
- The page number is a Ge'ez numeral (፩ ፪ …), centered at the bottom of the page.
- No English anywhere. Icons only, with Amharic aria-labels.

## Marks
- Hidden by default, so the text is clean.
- Eye on: every mark shows (^ ተነሽ, ⁄· ሰያፍ, ▬ ተጣይ, ↷ ወዳቂ, ‿ ተናባቢ), plus a small legend row. The marks stay on during playback.
- A mark sits above the letter at `li` from tselotMarks.json. ‿ is drawn under the whole joined group.

## Playing
- The current word's mark shows in saffron. A soft saffron glow moves letter by letter: each letter turns saffron and the letters not yet read are dimmed.
- The next word shows its mark faintly, so the child can prepare.
- Word clips play in a chain. Units with no recording are skipped.
- When the last word on a page finishes, the page turns by itself with the same fold, and reading continues.

## Page fold
- A finger-follow fold. The page hinges at the spine (rotateY) and follows the finger.
- A shadow falls on the page underneath and the turning sheet gets a sheen. The back of the sheet is plain paper.
- Release commits past 35% of the width or on a fast flick; otherwise the page springs back.
- Transforms are written through refs and rAF, with no React render per frame, so it stays smooth on low-end phones.
- With prefers-reduced-motion, a plain slide replaces the fold.
- No sound for now. A soft paper sound could be an option later.

## Resume
- `fq.prayer.v1` stores the page and the last word read. Reopening returns to that word's page, even after a re-cut caused by a size change.

## Text styles
- Holy names are red (#b5281e). Other text is near-black ink (#281c12).
- Unrecorded parts look the same and the eye still shows their marks, but play skips over them (no auto-read).

## Limits
- The glow splits each word clip evenly across its letters. These are not true letter timings.
- Units 321–471 have no recording yet, plus a few small gaps.
- The fold is a hinge fold, not a true paper curl.
