/* Latin -> Fidel name transliteration for the Home teaser widget.
   A deliberately simple, honest approximation: consonant(+vowel) syllables
   map to family x vowel-order using the same table the app validates
   (fidelData.js). Real Amharic spelling has conventions the app teaches -
   the widget says so on screen. */
import { FAMILIES } from './fidelData.js'

/* Canonical family per latin consonant (twins resolved to the common one). */
const FAMILY_BY_NAME = Object.fromEntries(FAMILIES.map((f) => [f.name, f]))
const CONSONANTS = {
  sh: 'She', ch: 'Che', ny: 'Nye', kh: 'Khe', zh: 'Zhe', ts: 'Tse', gn: 'Nye',
  b: 'Be', d: 'De', f: 'Fe', g: 'Ge', h: 'Ha', j: 'Je', k: 'Ke', l: 'Le',
  m: 'Me', n: 'Ne', p: 'Pe', q: 'Qe', r: 'Re', s: 'Se', t: 'Te', w: 'We',
  y: 'Ye', z: 'Ze',
  // practical approximations for sounds Ge'ez does not have classically
  v: 'Be', c: 'Ke',
}
/* vowel -> order index: 1:a(u)2:u 3:i 4:a 5:e 6:bare 7:o */
const VOWELS = { ee: 2, oo: 1, a: 3, e: 4, i: 2, o: 6, u: 1 }
const BARE = 5 // sadis - consonant with no vowel

/** Transliterate a Latin name; returns { geez, ok }. Unknown chars are
    skipped; empty result means nothing usable was typed. */
export function nameToFidel(input) {
  // x has no single fidel: expand to "ks" up front (Alex -> Aleks)
  const s = String(input || '').toLowerCase().replace(/[^a-z]/g, '').replace(/x/g, 'ks')
  let out = ''
  let i = 0
  while (i < s.length && out.length < 24) {
    // consonant (digraphs first)
    let famName = null
    for (const len of [2, 1]) {
      const part = s.slice(i, i + len)
      if (CONSONANTS[part] && !(len === 1 && VOWELS[part] !== undefined)) { famName = CONSONANTS[part]; i += len; break }
    }
    // vowel (digraphs first)
    let order = null
    for (const len of [2, 1]) {
      const part = s.slice(i, i + len)
      if (VOWELS[part] !== undefined) { order = VOWELS[part]; i += len; break }
    }
    if (famName === null && order === null) { i += 1; continue } // unknown char
    if (famName === null) {
      famName = 'A' // vowel-initial syllable
      if (order === 3) order = 0 // plain 'a' is the 1st-order አ by convention
    }
    const fam = FAMILY_BY_NAME[famName]
    if (fam) out += fam.chars[order === null ? BARE : order]
  }
  return { geez: out, ok: out.length > 0 }
}
