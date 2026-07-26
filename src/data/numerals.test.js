import { describe, it, expect } from 'vitest'
import {
  GEEZ_ONES, GEEZ_TENS, GEEZ_HUNDRED, GEEZ_DIGITS, GLYPH_VALUE,
  toGeez, fromGeez, GEEZ_NUMERALS,
} from './numerals'

describe('Ge\'ez numeral table integrity', () => {
  it('has nine distinct unit glyphs and nine distinct tens glyphs', () => {
    const ones = GEEZ_ONES.slice(1)
    const tens = GEEZ_TENS.slice(1)
    expect(ones.length).toBe(9)
    expect(tens.length).toBe(9)
    expect(new Set([...ones, ...tens, GEEZ_HUNDRED]).size).toBe(19) // all distinct
    expect(ones.every((g) => g.length > 0) && tens.every((g) => g.length > 0)).toBe(true)
  })
  it('keeps the back-compat GEEZ_DIGITS array (1..9) exactly', () => {
    expect(GEEZ_DIGITS).toEqual(['፩', '፪', '፫', '፬', '፭', '፮', '፯', '፰', '፱'])
  })
  it('anchors a few well-known glyphs so a bad edit is caught', () => {
    expect(toGeez(1)).toBe('፩')
    expect(toGeez(10)).toBe('፲')
    expect(toGeez(11)).toBe('፲፩')
    expect(toGeez(20)).toBe('፳')
    expect(toGeez(25)).toBe('፳፭')
    expect(toGeez(99)).toBe('፺፱')
    expect(toGeez(100)).toBe('፻')
  })
})

describe('toGeez / fromGeez', () => {
  it('round-trips every integer 1..100 (the whole table, exhaustively)', () => {
    for (let n = 1; n <= 100; n++) {
      const g = toGeez(n)
      expect(g.length).toBeGreaterThan(0)
      expect(fromGeez(g)).toBe(n)
    }
  })
  it('returns empty / zero outside the supported range (no Ge\'ez zero)', () => {
    for (const bad of [0, -1, 101, 1000, NaN]) expect(toGeez(bad)).toBe('')
  })
  it('rejects unknown glyphs and out-of-range totals in fromGeez', () => {
    expect(fromGeez('')).toBe(0)
    expect(fromGeez('A')).toBe(0)
    expect(fromGeez('፻፻')).toBe(0) // 200 is out of the 1..100 range
    expect(fromGeez('ሀ')).toBe(0) // a letter, not a numeral
  })
  it('GLYPH_VALUE maps hundred correctly', () => {
    expect(GLYPH_VALUE[GEEZ_HUNDRED]).toBe(100)
  })
})

describe('GEEZ_NUMERALS learning sequence', () => {
  it('covers 1..10 then the tens and a hundred, each with a real glyph', () => {
    expect(GEEZ_NUMERALS.slice(0, 10).map((x) => x.value)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(GEEZ_NUMERALS.map((x) => x.value)).toContain(100)
    expect(GEEZ_NUMERALS.every((x) => x.glyph.length > 0 && fromGeez(x.glyph) === x.value)).toBe(true)
  })
})
