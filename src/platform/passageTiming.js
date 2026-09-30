/* ============================================================================
   PASSAGE TIMING - the pure brain of the Read-Along Reader
   ----------------------------------------------------------------------------
   The Reader plays a recording of a Ge'ez passage and highlights each word (or
   each letter) exactly as it is pronounced - "reading karaoke". Everything that
   is DECISION lives here as pure functions of (data, time); the component and
   the HTMLAudioElement player stay dumb.

   Two token granularities:
     - WORD  (modes: spoken, chanted) - Ge'ez words split on the ፡ wordspace,
       clauses closed by ። . A timing map indexes WORD tokens.
     - LETTER (mode: each-letter) - the individual fidel glyphs, in codepoint
       order (Array.from, never .length - Ethiopic is multi-byte). A timing map
       indexes LETTER units.

   A timing map is a flat, sorted array of { i, s, e } (token index, start &
   end seconds into that mode's recording). A held/melismatic chant syllable is
   simply ONE entry with a large (e - s) - so chant needs no special case: the
   selector returns the same token for the whole sustained span.

   Sacred-text contract: this file NEVER throws on bad data. A gap, an overlap,
   a missing clip, an unknown glyph - all degrade to "hold / no highlight / no
   audio", never a crash and never a blocked child. Correctness is enforced by
   validators (run in tests), not by runtime exceptions.
   ========================================================================== */

import { INDEXES } from './ethiopic'

/* ── character classes (by Unicode codepoint, so multi-byte safe) ── */

/** Ethiopic syllabic block (base + vocalized + labiovelar forms): U+1200..U+135A. */
export function isFidelGlyph(ch) {
  const c = (ch || '').codePointAt(0)
  return c >= 0x1200 && c <= 0x135a
}
/** Ethiopic numerals and digits: U+1369..U+137C (፩ ፪ ... ፻ ፼). */
export function isEthiopicNumber(ch) {
  const c = (ch || '').codePointAt(0)
  return c >= 0x1369 && c <= 0x137c
}
/** Ethiopic word/section punctuation: U+1360..U+1368 (፡ wordspace, ። full stop, ፣ ፤ ...). */
export function isEthiopicPunct(ch) {
  const c = (ch || '').codePointAt(0)
  return c >= 0x1360 && c <= 0x1368
}
const isSpace = (ch) => /\s/.test(ch || '')
/** The ። full stop and its clause-ending siblings (፣ ፤ ፥ ፦ ፧ ፨) plus latin . ! ? */
const isSentenceEnd = (ch) => {
  const c = (ch || '').codePointAt(0)
  return (c >= 0x1362 && c <= 0x1368) || ch === '.' || ch === '!' || ch === '?'
}
/** A glyph the Reader highlights as a "letter" (fidel or numeral) - not space/punct. */
export function isLetterGlyph(ch) {
  return isFidelGlyph(ch) || isEthiopicNumber(ch)
}

/* ── tokenization (pure, deterministic; index is a pure fn of the string) ── */

/**
 * Split a passage into ordered typed tokens. `kind`:
 *   'word' - a run of letter glyphs (carries `wi`, its 0-based word index)
 *   'sep'  - the ፡ wordspace or whitespace (carries wi:-1)
 *   'end'  - a clause/sentence terminator ። ፣ ... . ! ? (wi:-1)
 * Keeping sep/end IN the array (unlike storyWords, which drops them) means a
 * word's index never shifts when surrounding punctuation is edited - critical,
 * because the timing map is keyed by word index.
 */
export function tokenizePassage(text) {
  const s = String(text || '')
  const chars = Array.from(s)
  const tokens = []
  let wi = 0
  let i = 0
  const classOf = (ch) => (isEthiopicPunct(ch) && !isSentenceEnd(ch)) || isSpace(ch)
    ? 'sep'
    : isSentenceEnd(ch)
      ? 'end'
      : 'word'
  while (i < chars.length) {
    const kind = classOf(chars[i])
    let j = i
    // group consecutive same-class chars; 'end' marks stay single-run too
    while (j < chars.length && classOf(chars[j]) === kind) j++
    const piece = chars.slice(i, j).join('')
    if (kind === 'word') tokens.push({ text: piece, kind, wi: wi++ })
    else tokens.push({ text: piece, kind, wi: -1 })
    i = j
  }
  return tokens
}

/** Just the word strings, in order (the words a WORD timing map indexes). */
export function passageWords(text) {
  return tokenizePassage(text).filter((t) => t.kind === 'word').map((t) => t.text)
}

/**
 * The individual letter units, in codepoint order, for the each-letter mode.
 * Each: { ci, char, wi, audioKey }. `ci` is the letter index a LETTER timing
 * map references; `wi` is the word it belongs to (for word-aware highlighting);
 * `audioKey` is its clip key or null (labiovelars, numerals have no clip yet -
 * they still highlight; audio is optional by contract).
 */
export function letterUnits(text) {
  const out = []
  let wi = -1
  let inWord = false
  for (const ch of Array.from(String(text || ''))) {
    if (isLetterGlyph(ch)) {
      if (!inWord) { wi++; inWord = true }
      out.push({ ci: out.length, char: ch, wi, audioKey: letterClipFor(ch) })
    } else {
      inWord = false
    }
  }
  return out
}

/** The letter clip key for a glyph, or null if none exists (no crash, no audio). */
export function letterClipFor(ch) {
  return INDEXES.byChar.get(ch)?.audioKey ?? null
}

/* ── the active-token selector (the highlight heart; pure over (map, t)) ── */

/**
 * Which timing entry is active at time `t` (seconds). Returns the entry's token
 * index `i`, or -1 in a gap / before the first / after the last. Binary search
 * over the sorted map, so it is O(log n) per animation frame.
 * A held syllable is one wide entry, so this returns the same `i` across the
 * whole sustained span with no special casing.
 */
export function activeTokenAt(map, t) {
  if (!Array.isArray(map) || !map.length) return -1
  let lo = 0
  let hi = map.length - 1
  let hit = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (map[mid].s <= t) { hit = mid; lo = mid + 1 }
    else hi = mid - 1
  }
  if (hit === -1) return -1
  const e = map[hit]
  return t < e.e ? e.i : -1
}

/** 0..1 progress through the currently active entry at time `t` (0 if in a gap).
    Lets the UI sweep a fill/underline across a long chanted word. */
export function progressWithin(map, t) {
  if (!Array.isArray(map) || !map.length) return 0
  let lo = 0
  let hi = map.length - 1
  let hit = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (map[mid].s <= t) { hit = mid; lo = mid + 1 }
    else hi = mid - 1
  }
  if (hit === -1) return 0
  const e = map[hit]
  if (t >= e.e || e.e <= e.s) return 0
  return Math.max(0, Math.min(1, (t - e.s) / (e.e - e.s)))
}

/**
 * The next time strictly greater than `t` at which the active token changes
 * (a start or an end boundary), or Infinity if none remain. The rAF loop uses
 * this to avoid recomputing every frame on a low-end device.
 */
export function nextBoundaryAfter(map, t) {
  if (!Array.isArray(map)) return Infinity
  let best = Infinity
  for (const e of map) {
    if (e.s > t && e.s < best) best = e.s
    if (e.e > t && e.e < best) best = e.e
  }
  return best
}

/* ── validators (run in tests; make "reverence" a green build, not a hope) ── */

/**
 * Validate one timing map against its token count. Returns { ok, errors }.
 * Rules: entries sorted by start; s < e; non-overlapping (e[k] <= s[k+1]);
 * every i an in-range integer; no duplicate i. Gaps (silence) are allowed.
 */
export function validatePassageMap(map, count, eps = 0.001) {
  const errors = []
  if (!Array.isArray(map)) return { ok: false, errors: ['map is not an array'] }
  const seen = new Set()
  let prevEnd = -Infinity
  map.forEach((e, k) => {
    if (typeof e.i !== 'number' || !Number.isInteger(e.i) || e.i < 0 || e.i >= count) {
      errors.push(`entry ${k}: token index ${e.i} out of range 0..${count - 1}`)
    }
    if (seen.has(e.i)) errors.push(`entry ${k}: duplicate token index ${e.i}`)
    seen.add(e.i)
    if (!(typeof e.s === 'number' && typeof e.e === 'number')) errors.push(`entry ${k}: s/e must be numbers`)
    else {
      if (e.s >= e.e) errors.push(`entry ${k}: start ${e.s} not before end ${e.e}`)
      if (e.s + eps < prevEnd) errors.push(`entry ${k}: starts ${e.s} before previous end ${prevEnd} (overlap)`)
      prevEnd = e.e
    }
  })
  return { ok: errors.length === 0, errors }
}

/**
 * Character audit of a passage's raw text. Every character must be a known
 * fidel glyph, a numeral, punctuation, or whitespace - anything else (a copy
 * artifact from a PDF, a presentation-form codepoint, an invisible mark) is
 * reported so it never silently ships in sacred text. Returns
 * { ok, unknown:[{ch, code}], letters, withClip, noClip:[chars] }.
 */
export function passageCoverage(text) {
  const unknown = []
  const noClip = []
  let letters = 0
  let withClip = 0
  for (const ch of Array.from(String(text || ''))) {
    if (isSpace(ch) || isEthiopicPunct(ch) || ch === '.' || ch === '!' || ch === '?') continue
    if (isLetterGlyph(ch)) {
      letters++
      if (letterClipFor(ch)) withClip++
      else if (!noClip.includes(ch)) noClip.push(ch)
    } else {
      unknown.push({ ch, code: 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0') })
    }
  }
  return { ok: unknown.length === 0, unknown, letters, withClip, noClip }
}

/**
 * Full passage-bundle validation (the invariant a passage test asserts). Checks
 * the text is all-known characters and that every mode's map length + indices
 * match the token count for its unit (word vs letter). Returns { ok, errors }.
 */
export function validatePassage(passage) {
  const errors = []
  if (!passage || typeof passage !== 'object') return { ok: false, errors: ['passage is not an object'] }
  const text = passage.geez || passage.text || ''
  const cov = passageCoverage(text)
  if (!cov.ok) errors.push(`unknown characters: ${cov.unknown.map((u) => u.code).join(', ')}`)
  const wordCount = passageWords(text).length
  const letterCount = letterUnits(text).length
  for (const [name, mode] of Object.entries(passage.modes || {})) {
    if (!mode || typeof mode !== 'object') { errors.push(`mode ${name}: not an object`); continue }
    const unit = mode.unit === 'letter' ? 'letter' : 'word'
    const count = unit === 'letter' ? letterCount : wordCount
    const v = validatePassageMap(mode.map || [], count)
    if (!v.ok) errors.push(`mode ${name}: ${v.errors.join('; ')}`)
  }
  return { ok: errors.length === 0, errors }
}
