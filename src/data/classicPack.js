/* ============================================================================
   CLASSIC MODE — PACK-AWARE DATA
   ----------------------------------------------------------------------------
   Classic (pages/AmharicFidelGame.jsx) was the app's original Amharic-only
   mode: it read the raw Amharic table (data/fidelGameData.js) directly, so
   Tigrinya got Amharic letters, Amharic word cards, and ሐ voiced as the
   Amharic "h". This adapter feeds Classic the ACTIVE pack's letters instead,
   reshaped into the exact structure Classic expects (0-indexed `forms` with
   `sound` + `audioKey`, a `labialForm`, `CHAR_TO_FORM`, `WORDS`).

   Amharic is returned unchanged - byte-identical to the validated table, with
   its nicknames, hints and vowel sounds intact and zero risk. Every other
   pack (Tigrinya today) is derived from mergeFamilies() so Trace, chant,
   explore and words all speak that language. audioKey is family-id based, so
   playback flows through the same pack audio override as the rest of the app
   (e.g. ሐ -> letters/ti/hha-1.mp3).
   ========================================================================== */

import {
  FIDEL_FAMILIES as AM_FAMILIES,
  ALL_FORMS as AM_FORMS,
  CHAR_TO_FORM as AM_CHAR_TO_FORM,
  WORDS as AM_WORDS,
} from './fidelGameData'
import { mergeFamilies, PACKS } from '../platform/ethiopic'
import { ETHIOPIC_SCRIPT } from '../script/ethiopic'

const wordsOf = (f) => (Array.isArray(f.words) && f.words.length ? f.words : f.word ? [f.word] : [])

/** Classic's {FIDEL_FAMILIES, ALL_FORMS, CHAR_TO_FORM, WORDS} for a pack. */
export function buildClassicData(packId) {
  // Amharic keeps the rich validated table exactly as-is.
  if (packId === 'am' || !PACKS[packId]) {
    return { FIDEL_FAMILIES: AM_FAMILIES, ALL_FORMS: AM_FORMS, CHAR_TO_FORM: AM_CHAR_TO_FORM, WORDS: AM_WORDS }
  }
  const pack = PACKS[packId]
  const FIDEL_FAMILIES = mergeFamilies(ETHIOPIC_SCRIPT, pack).map((family, familyIndex) => {
    const forms = Array.from(family.chars).map((char, order) => ({
      char,
      order,
      familyIndex,
      familyName: family.name,
      // Consonant + the pack's vowel for this order (empty consonant for the
      // vowel-bearer families yields the bare vowel) - matches the Explorer.
      sound: family.consonant + (pack.orders[order]?.vowel || ''),
      audioKey: `${family.id}-${order + 1}`,
    }))
    const labialForm = family.labial
      ? { char: family.labial, order: 7, familyIndex, familyName: family.name, sound: `${family.consonant}wa`, audioKey: `${family.id}-8`, isLabial: true }
      : null
    return { ...family, familyIndex, forms, labialForm }
  })
  const ALL_FORMS = FIDEL_FAMILIES.flatMap((f) => f.forms)
  return {
    FIDEL_FAMILIES,
    ALL_FORMS,
    CHAR_TO_FORM: new Map(ALL_FORMS.map((f) => [f.char, f])),
    WORDS: FIDEL_FAMILIES.flatMap((f) =>
      wordsOf(f).map((w) => ({ ...w, familyIndex: f.familyIndex, startChar: [...w.geez][0] })),
    ),
  }
}
