import { existsSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import BOOK from '../data/tselotMarks.json'
import MON from '../data/wudaseMondayMarks.json'
import { markNames, paginate, pageOfUnit, nextRecorded, glowLetter, geezNumeral, unitLetterCount, MARK_TYPES } from './prayerBook'
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
  it('every unit, incl. 321-471, has a word clip that exists on disk', () => {
    for (const [i, u] of BOOK.units.entries()) {
      expect(u.a).toBe(`reader/tselot/${String(i).padStart(3, '0')}.mp3`)
      expect(existsSync(`${process.cwd()}/public/audio/fidel/${u.a}`)).toBe(true)
    }
  })
  it('carries the owner review: #200 ብእሴ ወዳቂ, ወነበረ / በየማነ‿አቡሁ split', () => {
    expect(BOOK.units[200]).toMatchObject({ w: ['ብእሴ'], m: 'wedaqi' })
    expect(BOOK.units[218].w).toEqual(['ወነበረ'])
    expect(BOOK.units[219].w).toEqual(['በየማነ', 'አቡሁ'])
  })
  it('red only for the holy names and each paragraph opener', () => {
    const STEMS = ['እግዚአብሔር', 'ሥላሴ', 'ስላሴ', 'ኢየሱስ', 'ክርስቶስ', 'ማርያም']
    for (const u of BOOK.units) {
      for (const k of u.h || []) expect(STEMS.some((t) => u.w[k].includes(t)) || (u.s && k === 0)).toBe(true)
      if (u.s) expect(u.h).toContain(0)
    }
    expect(BOOK.units.filter((u) => u.s).length).toBe(13)
  })
  it('clip paths stay under reader/', () => {
    for (const u of BOOK.units) if (u.a) expect(u.a).toMatch(/^reader\/tselot\/\d{3}\.mp3$/)
  })
})

describe('owner rules', () => {
  const sadis = (c) => { const o = c.codePointAt(0); return (o >= 0x1200 && o <= 0x1357 && (o - 0x1200) % 8 === 5) || 'ቍኍኵጕ'.includes(c) }
  it('ሰያፍ exactly when the last letter of the last word is ሳድስ (else ተነሽ)', () => {
    for (const u of BOOK.units) {
      if (u.m !== 'seyaf' && u.m !== 'tenesh') continue
      const last = [...u.w[u.w.length - 1]].pop()
      expect([u.w.join('‿'), u.m]).toEqual([u.w.join('‿'), sadis(last) ? 'seyaf' : 'tenesh'])
    }
    expect(BOOK.units[88]).toMatchObject({ w: ['አበሳነ'], m: 'tenesh' })
  })
  it('legend names follow the learn language', () => {
    expect(markNames('am')).toMatchObject({ tenesh: 'ተነሽ', tetay: 'ተጣይ', seyaf: 'ሰያፍ', wedaqi: 'ወዳቂ' })
    expect(markNames('ti')).toMatchObject({ tenesh: 'ተለዓሊ', tetay: 'ተዋሓጢ', seyaf: 'ሰያፍ', wedaqi: 'ወዳቂ', tie: 'ተናባቢ', tebqo: 'ጠብቆ' })
  })
})

describe('ውዳሴ ማርያም ዘሰኑይ data', () => {
  it('every unit has a mark on a real letter, a clip on disk, and the ሰያፍ⇔ሳድስ rule holds', () => {
    const sadis = (c) => { const o = c.codePointAt(0); return (o >= 0x1200 && o <= 0x1357 && (o - 0x1200) % 8 === 5) || 'ቍኍኵጕ'.includes(c) }
    expect(MON.units.length).toBe(228)
    for (const [i, u] of MON.units.entries()) {
      expect(MARK_TYPES).toContain(u.m)
      const last = [...u.w[u.w.length - 1]]
      expect(u.li).toBeLessThan(last.length)
      if (u.m === 'seyaf' || u.m === 'tenesh') expect(u.m).toBe(sadis(last[last.length - 1]) ? 'seyaf' : 'tenesh')
      expect(u.a).toBe(`reader/wudase-mon/${String(i).padStart(3, '0')}.mp3`)
      expect(existsSync(`${process.cwd()}/public/audio/fidel/${u.a}`)).toBe(true)
    }
  })
  it('one paragraph per stanza, opener red; Yosief spellings in', () => {
    const paras = MON.units.filter((u) => u.s)
    expect(paras.length).toBe(10)
    for (const u of paras) expect(u.h).toContain(0)
    expect(MON.units[86]).toMatchObject({ w: ['ከመ', 'የሕየው'], m: 'seyaf' })
    expect(MON.units.flatMap((u) => u.w)).not.toContain('ሕያዉ')
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
