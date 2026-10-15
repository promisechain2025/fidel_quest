import { describe, it, expect } from 'vitest'
import BOOK from '../data/tselotMarks.json'
import { paginate, pageOfUnit, nextRecorded, glowLetter, geezNumeral, unitLetterCount, MARK_TYPES } from './prayerBook'
import { passageCoverage } from './passageTiming'

describe('prayer book data', () => {
  it('every unit has a known mark on a real letter of its last word', () => {
    for (const u of BOOK.units) {
      expect(MARK_TYPES).toContain(u.m)
      const last = [...u.w[u.w.length - 1]]
      expect(u.li).toBeGreaterThanOrEqual(0)
      expect(u.li).toBeLessThan(last.length)
    }
  })
  it('text is clean Ethiopic (no copy artifacts, no Latin)', () => {
    const text = BOOK.units.map((u) => u.w.join(' ') + (u.p || '')).join(' ')
    expect(/[A-Za-z]/.test(text)).toBe(false)
    const cov = passageCoverage(text)
    expect(cov.unknown).toEqual([])
  })
  it('clip paths stay under reader/', () => {
    for (const u of BOOK.units) if (u.a) expect(u.a).toMatch(/^reader\/tselot\/\d{3}\.mp3$/)
  })
})

describe('paginate', () => {
  const pages = paginate(BOOK.units)
  it('covers every unit once, in order', () => {
    expect(pages.flat()).toEqual(BOOK.units.map((_, i) => i))
  })
  it('respects the letter budget', () => {
    for (const p of pages) {
      const n = p.reduce((s, i) => s + unitLetterCount(BOOK.units[i]) + 1, 0)
      expect(p.length === 1 || n <= 96).toBe(true)
    }
  })
  it('finds the page of a unit', () => {
    expect(pageOfUnit(pages, pages[2][0])).toBe(2)
  })
})

describe('helpers', () => {
  it('Ge\u2019ez page numerals', () => {
    expect(geezNumeral(1)).toBe('፩')
    expect(geezNumeral(10)).toBe('፲')
    expect(geezNumeral(12)).toBe('፲፪')
    expect(geezNumeral(30)).toBe('፴')
    expect(geezNumeral(100)).toBe('፻')
    expect(geezNumeral(123)).toBe('፻፳፫')
  })
  it('glow walks letters across the clip', () => {
    const u = { w: ['በከመ', 'በሰማይ'] }
    expect(glowLetter(u, 0)).toBe(0)
    expect(glowLetter(u, 0.999)).toBe(6)
    expect(glowLetter(u, 1)).toBe(6)
  })
  it('skips unrecorded units', () => {
    const units = [{ a: 'x' }, {}, {}, { a: 'y' }]
    expect(nextRecorded(units, 0)).toBe(3)
    expect(nextRecorded(units, 3)).toBe(-1)
  })
})
