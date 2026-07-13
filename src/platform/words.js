/* ============================================================================
   DECODABLE WORDS — platform layer
   ----------------------------------------------------------------------------
   A word is DECODABLE when every letter in it belongs to a family the child
   has already learned - the reading-pedagogy rule that makes a word a
   reward for the letters, not a stranger. Pure selectors over the active
   pack's family table; the journey learns families in FIDEL_FAMILIES order,
   so a word's unlock stage is simply the LAST family it needs.

   Everything here is pure and pack-aware (Tigrinya's extra qhe family and
   its different word list both flow through automatically).
   ========================================================================== */

import { FIDEL_FAMILIES } from './ethiopic'

/** char -> familyId for every vocalized form INCLUDING the labialized
    bonus forms (ሏ ቋ ሟ ...), which words are allowed to use. */
export function buildCharFamilies(families = FIDEL_FAMILIES) {
  const map = new Map()
  for (const f of families) {
    for (const ch of Array.from(f.chars)) map.set(ch, f.id)
    if (f.labial) map.set(f.labial, f.id)
  }
  return map
}

const CHAR_FAMILY = buildCharFamilies()

/** The distinct family ids a word's spelling needs, or null when the word
    uses a character outside the script (never decodable). */
export function familiesOfWord(geez, charFamilies = CHAR_FAMILY) {
  const out = new Set()
  for (const ch of Array.from(geez)) {
    const fam = charFamilies.get(ch)
    if (!fam) return null
    out.add(fam)
  }
  return [...out]
}

/** Journey position (0-based family index) at which the word becomes
    readable: the index of the LAST family it needs. Infinity when the word
    is not writable in the script. */
export function unlockStage(geez, families = FIDEL_FAMILIES, charFamilies = CHAR_FAMILY) {
  const fams = familiesOfWord(geez, charFamilies)
  if (!fams) return Infinity
  const index = new Map(families.map((f, i) => [f.id, i]))
  return fams.reduce((max, id) => Math.max(max, index.get(id) ?? Infinity), 0)
}

/** Is the word readable with the given learned family ids? */
export function isDecodable(geez, learnedIds, charFamilies = CHAR_FAMILY) {
  const fams = familiesOfWord(geez, charFamilies)
  if (!fams) return false
  const learned = learnedIds instanceof Set ? learnedIds : new Set(learnedIds)
  return fams.every((id) => learned.has(id))
}

/** Filter a word list (objects with .geez) to the decodable ones. */
export function decodableWords(words, learnedIds, charFamilies = CHAR_FAMILY) {
  const learned = learnedIds instanceof Set ? learnedIds : new Set(learnedIds)
  return words.filter((w) => isDecodable(w.geez, learned, charFamilies))
}

/** The words that JUST became decodable when `newId` was learned: readable
    now, not readable without it. This is the "new words unlocked!" moment. */
export function newlyDecodable(words, learnedIds, newId, charFamilies = CHAR_FAMILY) {
  const withNew = new Set(learnedIds)
  withNew.add(newId)
  const without = new Set(withNew)
  without.delete(newId)
  return words.filter(
    (w) => isDecodable(w.geez, withNew, charFamilies) && !isDecodable(w.geez, without, charFamilies),
  )
}
