/* ============================================================================
   PRAYER BOOK - pure helpers for the ጸሎት ዘዘወትር reading book
   ----------------------------------------------------------------------------
   Data (src/data/tselotMarks.json) is one entry per reading unit:
     { w: [words], m: 'tenesh'|'seyaf'|'tetay'|'wedaqi', li: letterIndex,
       p?: trailing punctuation, h?: holy-name word indexes, a?: clip path }
   A unit with several words is read joined (ተናባቢ). The mark sits above
   letter `li` of the LAST word. `a` is the owner's own word clip; units
   without one are shown (marks via the eye toggle) but never auto-read.
   Everything here is pure so pagination/numerals/glow are unit-tested.
   ========================================================================== */

export const MARK_TYPES = Object.freeze(['tenesh', 'seyaf', 'tetay', 'wedaqi'])
export const MARK_NAMES = Object.freeze({
  tenesh: 'ተነሽ', seyaf: 'ሰያፍ', tetay: 'ተጣይ', wedaqi: 'ወዳቂ', tie: 'ተናባቢ', tebqo: 'ጠብቆ',
})
/** Tigrinya names given by the owner; the rest stay as in Amharic. */
export const MARK_NAMES_TI = Object.freeze({ ...MARK_NAMES, tenesh: 'ተለዓሊ', tetay: 'ተዋሓጢ' })
/** Legend names for the selected learn language ('am' | 'ti'). */
export function markNames(pack) {
  return pack === 'ti' ? MARK_NAMES_TI : MARK_NAMES
}

/** Header title split: "ውዳሴ ማርያም ዘሰኑይ" -> ["ውዳሴ ማርያም", "ዘሰኑይ"] (book small above the day); two-word titles stay one line. */
export function splitTitle(title) {
  const w = String(title || '').trim().split(/\s+/)
  return w.length > 2 ? [w.slice(0, -1).join(' '), w[w.length - 1]] : [null, w.join(' ')]
}

/** Letters (grapheme = one Ethiopic codepoint here) in a unit, all words. */
export function unitLetterCount(u) {
  return u.w.reduce((n, w) => n + [...w].length, 0)
}

/**
 * Split units into book pages by a letter budget, never splitting a unit.
 * A page also closes after a sentence end (።) once it is at least 70% full,
 * so pages tend to end at a natural breath.
 */
export function paginate(units, budget = 96) {
  const pages = []
  let cur = []
  let n = 0
  units.forEach((u, i) => {
    const c = unitLetterCount(u) + 1
    if (cur.length && n + c > budget) { pages.push(cur); cur = []; n = 0 }
    cur.push(i); n += c
    if (u.p && u.p.includes('።') && n >= budget * 0.7) { pages.push(cur); cur = []; n = 0 }
  })
  if (cur.length) pages.push(cur)
  return pages
}

/** Page index holding unit `i` (or 0). */
export function pageOfUnit(pages, i) {
  const k = pages.findIndex((p) => p.includes(i))
  return k < 0 ? 0 : k
}

/** Next unit index after `i` that has a recording, or -1. */
export function nextRecorded(units, i) {
  for (let k = i + 1; k < units.length; k++) if (units[k].a) return k
  return -1
}

/** Which letter (flat index across the unit's words) glows at progress 0..1. */
export function glowLetter(u, progress) {
  const n = unitLetterCount(u)
  if (!(progress >= 0)) return -1
  return Math.min(n - 1, Math.floor(Math.min(progress, 0.9999) * n))
}

const ONES = ['', '፩', '፪', '፫', '፬', '፭', '፮', '፯', '፰', '፱']
const TENS = ['', '፲', '፳', '፴', '፵', '፶', '፷', '፸', '፹', '፺']
/** Ethiopic numeral for 1..9999 (book page numbers). */
export function geezNumeral(n) {
  n = Math.floor(n)
  if (!(n > 0)) return ''
  if (n >= 10000) return String(n)
  const hi = Math.floor(n / 100)
  const lo = n % 100
  const two = (x) => TENS[Math.floor(x / 10)] + ONES[x % 10]
  if (!hi) return two(lo)
  return (hi === 1 ? '' : two(hi)) + '፻' + two(lo)
}

const KEY = 'fq.prayer.v1'
/** Resume point: { book, page, unit }. Fails soft without storage. */
export function loadResume(book) {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}')
    return v && v[book] ? v[book] : null
  } catch { return null }
}
export function saveResume(book, pos) {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}') || {}
    v[book] = pos
    localStorage.setItem(KEY, JSON.stringify(v))
  } catch { /* storage full/blocked - ignore */ }
}
