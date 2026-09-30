import { describe, it, expect } from 'vitest'
import {
  tokenizePassage, passageWords, letterUnits, letterClipFor,
  isFidelGlyph, isLetterGlyph, isEthiopicNumber, isEthiopicPunct,
  activeTokenAt, progressWithin, nextBoundaryAfter,
  validatePassageMap, passageCoverage, validatePassage,
} from './passageTiming'
import { INDEXES } from './ethiopic'

// Neutral fidel letters known to exist (NOT sacred text - a test fixture).
const HA = 'ሀ', LE = 'ለ', ME = 'መ', SE = 'ሰ'
const LABIAL = 'ሏ' // a labiovelar: a real glyph with no letter clip

describe('character classes', () => {
  it('recognizes fidel glyphs, numerals, and punctuation by codepoint', () => {
    expect(isFidelGlyph(HA)).toBe(true)
    expect(isFidelGlyph(LABIAL)).toBe(true)
    expect(isFidelGlyph('A')).toBe(false)
    expect(isEthiopicNumber('፩')).toBe(true)
    expect(isEthiopicNumber(HA)).toBe(false)
    expect(isEthiopicPunct('፡')).toBe(true)
    expect(isEthiopicPunct('።')).toBe(true)
    expect(isLetterGlyph(HA)).toBe(true)
    expect(isLetterGlyph('፩')).toBe(true)
    expect(isLetterGlyph('፡')).toBe(false)
  })
})

describe('tokenizePassage', () => {
  it('splits on the ፡ wordspace and ። sentence end, keeping separators for stable indices', () => {
    const toks = tokenizePassage(`${HA}${LE}፡${ME}${SE}።`)
    expect(toks.map((t) => [t.kind, t.text, t.wi])).toEqual([
      ['word', `${HA}${LE}`, 0],
      ['sep', '፡', -1],
      ['word', `${ME}${SE}`, 1],
      ['end', '።', -1],
    ])
  })
  it('collapses runs of whitespace/punctuation and assigns sequential word indices', () => {
    const toks = tokenizePassage(`${HA}  ፡ ${LE}`)
    const words = toks.filter((t) => t.kind === 'word')
    expect(words.map((t) => t.wi)).toEqual([0, 1])
    expect(words.map((t) => t.text)).toEqual([HA, LE])
  })
  it('is a pure function of the string (same input, same tokens)', () => {
    const a = tokenizePassage(`${HA}፡${LE}`)
    const b = tokenizePassage(`${HA}፡${LE}`)
    expect(a).toEqual(b)
  })
  it('handles empty / nullish input', () => {
    expect(tokenizePassage('')).toEqual([])
    expect(tokenizePassage(null)).toEqual([])
  })
})

describe('passageWords', () => {
  it('returns just the word strings in order', () => {
    expect(passageWords(`${HA}${LE}፡${ME}።`)).toEqual([`${HA}${LE}`, ME])
  })
})

describe('letterUnits', () => {
  it('lists letter glyphs in codepoint order with their word index and clip key', () => {
    const units = letterUnits(`${HA}${LE}፡${ME}`)
    expect(units.map((u) => u.char)).toEqual([HA, LE, ME])
    expect(units.map((u) => u.ci)).toEqual([0, 1, 2])
    expect(units.map((u) => u.wi)).toEqual([0, 0, 1]) // ha,le in word 0; me in word 1
    expect(units[0].audioKey).toBe(INDEXES.byChar.get(HA).audioKey)
  })
  it('includes labiovelars/numerals as highlightable but with no clip', () => {
    const units = letterUnits(`${LABIAL}፩`)
    expect(units.map((u) => u.char)).toEqual([LABIAL, '፩'])
    expect(units.every((u) => u.audioKey === null)).toBe(true)
  })
})

describe('letterClipFor', () => {
  it('maps a known fidel to its clip key and unknown glyphs to null', () => {
    expect(letterClipFor(HA)).toBe(INDEXES.byChar.get(HA).audioKey)
    expect(letterClipFor(LABIAL)).toBeNull()
    expect(letterClipFor('x')).toBeNull()
  })
})

describe('activeTokenAt (the highlight heart)', () => {
  const map = [{ i: 0, s: 0, e: 1 }, { i: 1, s: 1, e: 2 }, { i: 2, s: 2, e: 5 }]
  it('returns the active token index, or -1 before/after/outside', () => {
    expect(activeTokenAt(map, 0)).toBe(0)
    expect(activeTokenAt(map, 0.5)).toBe(0)
    expect(activeTokenAt(map, 1)).toBe(1)
    expect(activeTokenAt(map, 1.999)).toBe(1)
    expect(activeTokenAt(map, 5)).toBe(-1) // exactly at the end is past
    expect(activeTokenAt(map, -1)).toBe(-1)
    expect(activeTokenAt(map, 99)).toBe(-1)
  })
  it('holds a melismatic (long) syllable across its whole span with no special case', () => {
    expect(activeTokenAt(map, 2)).toBe(2)
    expect(activeTokenAt(map, 3.5)).toBe(2)
    expect(activeTokenAt(map, 4.99)).toBe(2)
  })
  it('returns -1 inside a gap (silence between phrases)', () => {
    const gapped = [{ i: 0, s: 0, e: 1 }, { i: 1, s: 2, e: 3 }]
    expect(activeTokenAt(gapped, 1.5)).toBe(-1)
  })
  it('is safe on empty / bad input', () => {
    expect(activeTokenAt([], 1)).toBe(-1)
    expect(activeTokenAt(null, 1)).toBe(-1)
  })
})

describe('progressWithin', () => {
  it('reports 0..1 across the active entry and 0 in a gap', () => {
    const map = [{ i: 0, s: 0, e: 2 }, { i: 1, s: 4, e: 5 }]
    expect(progressWithin(map, 1)).toBeCloseTo(0.5, 5)
    expect(progressWithin(map, 0)).toBeCloseTo(0, 5)
    expect(progressWithin(map, 3)).toBe(0) // gap
    expect(progressWithin(map, 4.75)).toBeCloseTo(0.75, 5)
  })
})

describe('nextBoundaryAfter', () => {
  it('finds the next start/end boundary strictly after t', () => {
    const map = [{ i: 0, s: 0, e: 1 }, { i: 1, s: 2, e: 3 }]
    expect(nextBoundaryAfter(map, 0)).toBe(1)
    expect(nextBoundaryAfter(map, 1)).toBe(2)
    expect(nextBoundaryAfter(map, 2.5)).toBe(3)
    expect(nextBoundaryAfter(map, 3)).toBe(Infinity)
  })
})

describe('validatePassageMap', () => {
  it('accepts a well-formed sorted, non-overlapping map', () => {
    const v = validatePassageMap([{ i: 0, s: 0, e: 1 }, { i: 1, s: 1, e: 2.5 }], 2)
    expect(v.ok).toBe(true)
    expect(v.errors).toEqual([])
  })
  it('rejects out-of-range indices, overlaps, bad spans and duplicates', () => {
    expect(validatePassageMap([{ i: 5, s: 0, e: 1 }], 2).ok).toBe(false) // index out of range
    expect(validatePassageMap([{ i: 0, s: 0, e: 1 }, { i: 1, s: 0.5, e: 2 }], 2).ok).toBe(false) // overlap
    expect(validatePassageMap([{ i: 0, s: 2, e: 1 }], 1).ok).toBe(false) // s >= e
    expect(validatePassageMap([{ i: 0, s: 0, e: 1 }, { i: 0, s: 1, e: 2 }], 2).ok).toBe(false) // duplicate i
  })
})

describe('passageCoverage (sacred-text character audit)', () => {
  it('passes clean text and counts letters + clip coverage', () => {
    const cov = passageCoverage(`${HA}${LE}፡${ME}${SE}።`)
    expect(cov.ok).toBe(true)
    expect(cov.letters).toBe(4)
    expect(cov.withClip).toBe(4)
    expect(cov.noClip).toEqual([])
  })
  it('flags unknown (non-Ethiopic) characters that a PDF copy might smuggle in', () => {
    const cov = passageCoverage(`${HA}Q${LE}`) // stray latin Q
    expect(cov.ok).toBe(false)
    expect(cov.unknown.map((u) => u.ch)).toContain('Q')
  })
  it('reports letters that have no clip yet (labiovelars) without failing', () => {
    const cov = passageCoverage(`${LABIAL}`)
    expect(cov.ok).toBe(true) // it IS a valid glyph
    expect(cov.noClip).toContain(LABIAL)
  })
})

describe('validatePassage (whole-bundle invariant)', () => {
  const geez = `${HA}${LE}፡${ME}${SE}።` // 2 words, 4 letters
  it('accepts a bundle whose maps match the token counts', () => {
    const passage = {
      id: 'fixture', geez,
      modes: {
        word: { unit: 'word', map: [{ i: 0, s: 0, e: 1 }, { i: 1, s: 1, e: 2 }] },
        letter: { unit: 'letter', map: [{ i: 0, s: 0, e: 0.5 }, { i: 1, s: 0.5, e: 1 }, { i: 2, s: 1, e: 1.5 }, { i: 3, s: 1.5, e: 2 }] },
      },
    }
    expect(validatePassage(passage)).toEqual({ ok: true, errors: [] })
  })
  it('rejects a bundle with a map index beyond its token count', () => {
    const bad = { id: 'x', geez, modes: { word: { unit: 'word', map: [{ i: 4, s: 0, e: 1 }] } } }
    expect(validatePassage(bad).ok).toBe(false)
  })
  it('rejects a bundle whose text carries an unknown character', () => {
    const bad = { id: 'x', geez: `${HA}Z`, modes: {} }
    expect(validatePassage(bad).ok).toBe(false)
  })
})
