/* ============================================================================
   ETHIOPIC (GE'EZ) NUMERALS - the validated source of truth
   ----------------------------------------------------------------------------
   The single home for the Ge'ez numeral glyphs, shared by Ethiopia and
   Eritrea (culturally neutral - a safe first step beyond fidel toward the
   general learning platform; see docs/general-learning-platform.md).

   Like data/fidelGameData.js for letters, a wrong glyph here is among the
   worst bugs the app can ship, so the whole table is round-trip verified
   (toGeez -> fromGeez -> the original number) exhaustively over 1..100 in
   numerals.test.js. Keep that suite green when touching this file.

   Scope: 1..100, which is the pedagogically relevant range for early
   counting and number recognition. Ge'ez has no zero. Larger numbers use
   ፻ (hundred) and ፼ (ten-thousand) as multiplicative group separators - a
   more intricate algorithm deliberately left for when the math track needs
   it, rather than shipped unverified.

   Spoken number NAMES (Amharic/Tigrinya) are intentionally NOT here yet:
   they need native-speaker review before an audio-first children's app can
   use them, the same bar the language packs hold (see langpacks.js).
   ========================================================================== */

// Units ፩..፱ (index 1..9; index 0 is a placeholder - Ge'ez has no zero).
export const GEEZ_ONES = ['', '፩', '፪', '፫', '፬', '፭', '፮', '፯', '፰', '፱']
// Tens ፲..፺ (index 1..9 -> 10..90).
export const GEEZ_TENS = ['', '፲', '፳', '፴', '፵', '፶', '፷', '፸', '፹', '፺']
export const GEEZ_HUNDRED = '፻'
export const GEEZ_MYRIAD = '፼'

// Back-compat: the 1..9 digit array several components already import.
export const GEEZ_DIGITS = GEEZ_ONES.slice(1)

// glyph -> integer value (additive within 1..100).
export const GLYPH_VALUE = (() => {
  const m = {}
  GEEZ_ONES.forEach((g, i) => { if (g) m[g] = i })
  GEEZ_TENS.forEach((g, i) => { if (g) m[g] = i * 10 })
  m[GEEZ_HUNDRED] = 100
  m[GEEZ_MYRIAD] = 10000
  return m
})()

/** Render an integer 1..100 as Ge'ez numerals. Returns '' outside the range
    (Ge'ez has no zero, and beyond 100 needs the hundred/myriad algorithm). */
export function toGeez(n) {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v) || v < 1 || v > 100) return ''
  if (v === 100) return GEEZ_HUNDRED
  const tens = Math.floor(v / 10)
  const ones = v % 10
  return GEEZ_TENS[tens] + GEEZ_ONES[ones]
}

/** Parse a Ge'ez numeral string in the 1..100 range back to an integer, by
    summing glyph values (additive in this range). Returns 0 on any unknown
    glyph or an out-of-range total. */
export function fromGeez(s) {
  const chars = Array.from(String(s || ''))
  if (!chars.length) return 0
  let total = 0
  for (const ch of chars) {
    if (!(ch in GLYPH_VALUE)) return 0
    total += GLYPH_VALUE[ch]
  }
  return total >= 1 && total <= 100 ? total : 0
}

/** Ordered learning sequence for a counting track: 1..10, then the tens and
    a hundred as recognition milestones. [{ value, glyph }] */
export const GEEZ_NUMERALS = [
  ...Array.from({ length: 10 }, (_, i) => ({ value: i + 1, glyph: toGeez(i + 1) })),
  ...[20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => ({ value: v, glyph: toGeez(v) })),
]
