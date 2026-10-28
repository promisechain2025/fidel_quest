/* ============================================================================
   ABUGIDA (ኣቡጊዳ) ARRANGEMENT for the Letter Explorer
   ----------------------------------------------------------------------------
   Two ways to lay the fidel out:

     'vowel'    the original Explorer: pick one of the 7 vowel orders, see that
                order across every family (hoy/halehame family order ሀ ለ ሐ መ ...).
     'abugida'  the traditional ኣቡጊዳ primer chart: families in the old
                አበገደ (abegede) order አ በ ገ ደ ሀ ወ ዘ ..., and the chart is a
                ROTATION of that list - column c (0-based) is the family list
                shifted up by c and shows order c+1, so the top row reads
                አ ቡ ጊ ዳ ሄ ው ዞ (the name), the next row በ ጉ ዲ ሃ ዌ ዝ ሖ, and so on.
                Rows wrap around, so every one of the N x 7 letters appears once.

   Sources (also in the PR): am.wikipedia.org/wiki/አቡጊዳ (the Ethiopian Review
   1991 chart, 33 rows x 7 - the order used here) and geez.org/Collation/
   Abugida.html + OrderedLists.html (the rotation rule; slightly different
   abegede orders, see the PR for the open questions).

   Only the app's own families are used (ids from the active language pack, 33
   for Amharic, 34 for Tigrinya which adds qhe/ቐ). Any family the order list does
   not name is appended at the end, so a future family can never go missing.
   ========================================================================== */

export const LAYOUTS = Object.freeze({ VOWEL: 'vowel', ABUGIDA: 'abugida' })
export const LAYOUT_KEY = 'fq.explorer.layout.v1'

// Family ids in the order of the first column of the printed ኣቡጊዳ chart
// (Ethiopian Review 1991, 33 rows):
// አ በ ገ ደ ሀ ወ ዘ ዠ ሐ ጠ ጨ የ ከ ኸ ለ መ ነ ኘ ሰ ሸ ዐ ፈ ጸ ቀ ረ ሠ ተ ቸ ኀ ጰ ፀ ፐ ጀ
// The Tigrinya-only qhe/ቐ is slotted straight after qe/ቀ (where geez.org's
// extended abegede list puts it); the Amharic pack simply has no such family.
// Why this list and not the 26-letter scholarly abegede: ሀ must be 5th so the
// top row reads አ ቡ ጊ ዳ ሄ ው ዞ, and this chart covers exactly the app's letters.
export const ABUGIDA_FAMILY_IDS = Object.freeze([
  'a', 'be', 'ge', 'de', 'ha', 'we', 'ze', 'zhe', 'hha', 'the', 'chhe', 'ye', 'ke', 'khe',
  'le', 'me', 'ne', 'nye', 'se', 'she', 'ae', 'fe', 'tse', 'qe', 'qhe', 're', 'sse', 'te', 'che',
  'kha', 'ppe', 'ttse', 'pe', 'je',
])

/** The given families re-sorted into abegede order (families not named go last, in their own order). */
export function abugidaFamilies(families) {
  const rank = new Map(ABUGIDA_FAMILY_IDS.map((id, i) => [id, i]))
  return [...families].sort((a, b) => (rank.get(a.id) ?? 1e6) - (rank.get(b.id) ?? 1e6))
}

/** The rotated chart: rows[r][c] = { family, order: c + 1, key: '<id>-<order>' }.
    Row r, column c holds family (r + c) mod N in order c + 1. */
export function abugidaChart(families, orderCount = 7) {
  const list = abugidaFamilies(families)
  const n = list.length
  return list.map((_, r) =>
    Array.from({ length: orderCount }, (__, c) => {
      const family = list[(r + c) % n]
      return { family, order: c + 1, key: `${family.id}-${c + 1}` }
    }),
  )
}

export function getLayout() {
  try {
    return localStorage.getItem(LAYOUT_KEY) === LAYOUTS.ABUGIDA ? LAYOUTS.ABUGIDA : LAYOUTS.VOWEL
  } catch {
    return LAYOUTS.VOWEL
  }
}

export function setLayout(layout) {
  try {
    localStorage.setItem(LAYOUT_KEY, layout === LAYOUTS.ABUGIDA ? LAYOUTS.ABUGIDA : LAYOUTS.VOWEL)
  } catch {
    /* session-only */
  }
}
