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

## ውዳሴ ማርያም ረቡዕ–ቀዳሚት audio (owner's 2018–2020 readings)
- 29 recordings (8 ረቡዕ, 7 ሐሙስ, 5 ዓርብ, 9 ቀዳሚት), one per prayer, except that ዓርብ ፬ + ፭ share one file (read ፭ first, then ፬). The clips follow the text order.
- Same rules as ሰኑይ/ሠሉስ: one constant gain to -22 LUFS per recording, MMS forced alignment of the text to the audio, and contiguous word clips (onset to next onset, tails never cut). Breaths and noise are lowered by -30 dB only in pauses that both the pipeline's word-aware rule and the approved sample's voicing rule mark as gaps.
- Units without a clip (shown as normal text, skipped on play):
  - ረቡዕ: 0 ዉዳሴሃ, 71 አንቲ and 146 ግብረ ድንግል are cut off at the start of their recordings.
  - ሐሙስ: 386–387 and 436–438 are lines the reading skips.
  - ቀዳሚት: ፯ (158–175) was not recorded.
- እሁድ has no recording yet.
- Practice mode: on a page whose prayer has no clip, play stays inside that prayer, so it plays nothing instead of jumping to the next prayer (`startUnitForPage`).
- The fold is a hinge fold, not a true paper curl.
