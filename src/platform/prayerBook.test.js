import { existsSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import BOOK from '../data/tselotMarks.json'
import MON from '../data/wudaseMondayMarks.json'
import TUE from '../data/wudaseTuesdayMarks.json'
import WED from '../data/wudaseWednesdayMarks.json'
import THU from '../data/wudaseThursdayMarks.json'
import FRI from '../data/wudaseFridayMarks.json'
import SAT from '../data/wudaseSaturdayMarks.json'
import SUN from '../data/wudaseSundayMarks.json'
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
  it('carries the owner review of 19 Oct: ትንሣኤ/ሰማያዊ ወዳቂ, ወላዲተ‿ኣምላክ joined ተጣይ, ለመንፈስ‿ቅዱስ ተጣይ', () => {
    expect(BOOK.units[254]).toMatchObject({ w: ['ትንሣኤ'], m: 'wedaqi', li: 3 })
    expect(BOOK.units[274]).toMatchObject({ w: ['ሰማያዊ'], m: 'wedaqi', li: 3 })
    expect(BOOK.units[326]).toMatchObject({ w: ['ለመንፈስ', 'ቅዱስ'], m: 'tetay' })
    expect(BOOK.units[419]).toMatchObject({ w: ['ወላዲተ', 'ኣምላክ'], m: 'tetay', li: 2, p: '።' })
    expect(BOOK.units.some((u) => u.w.length === 1 && u.w[0] === 'ወላዲተ')).toBe(false)
    expect(BOOK.units[47]).toMatchObject({ w: ['ይትቀነይ'], m: 'seyaf' })
    expect(BOOK.units[79]).toMatchObject({ w: ['በከመ', 'በሰማይ'], m: 'tetay' })
    expect(BOOK.units[80]).toMatchObject({ w: ['ከማሁ'], m: 'wedaqi' })
    expect(BOOK.units[84]).toMatchObject({ w: ['ሃበነ'], m: 'tenesh' })
    expect(BOOK.units[449]).toMatchObject({ w: ['ሕሊና', 'ልቦሙ'], m: 'tenesh' })
  })
  it('carries the owner review of 19 Oct (2nd round): ኦ always ወዳቂ, ድንግል always ተጣይ, እሁድ/ረቡዕ/ሠሉስ/ቀዳሚት answers', async () => {
    const files = ['tselot', 'wudaseMonday', 'wudaseTuesday', 'wudaseWednesday', 'wudaseThursday', 'wudaseFriday', 'wudaseSaturday', 'wudaseSunday']
    let dingil = 0
    for (const f of files) {
      const B = (await import(`../data/${f === 'tselot' ? 'tselotMarks' : f + 'Marks'}.json`)).default
      for (const u of B.units) {
        if (u.w.length === 1 && u.w[0] === 'ኦ') expect([f, u.m, u.li]).toEqual([f, 'wedaqi', 0])
        if (u.w.length === 1 && u.w[0] === 'ድንግል') { dingil++; expect([f, u.m]).toEqual([f, 'tetay']) }
      }
    }
    expect(dingil).toBeGreaterThanOrEqual(17)
    const SUN = (await import('../data/wudaseSundayMarks.json')).default.units
    for (const i of [74, 187, 207]) expect(SUN[i]).toMatchObject({ w: ['ዘእግዚአብሔር'], m: 'tetay', li: 6 })
    expect(SUN[80]).toMatchObject({ w: ['መለኮት'], m: 'tetay', li: 2 })
    expect((await import('../data/wudaseWednesdayMarks.json')).default.units[392]).toMatchObject({ w: ['ምሕረተ'], m: 'tenesh' })
    const TUE = (await import('../data/wudaseTuesdayMarks.json')).default.units
    expect(TUE[16]).toMatchObject({ w: ['ቃለ'], m: 'tenesh' })
    expect(TUE[31]).toMatchObject({ w: ['ኃይለ', 'ወሊዶታ'], m: 'wedaqi' })
    expect(TUE[60]).toMatchObject({ m: 'tetay' }); expect(TUE[72]).toMatchObject({ m: 'tetay' })
    for (const i of [45, 96, 153, 293]) expect(BOOK.units[i].m).toBe('tetay')
    expect(BOOK.units[293]).toMatchObject({ w: ['በመለኮት'], p: '።' })
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

describe('ውዳሴ ማርያም ዘሰሉስ data', () => {
  it('every unit has a mark on a real letter, a clip on disk, and the ሰያፍ⇔ሳድስ rule holds', () => {
    const sadis = (c) => { const o = c.codePointAt(0); return (o >= 0x1200 && o <= 0x1357 && (o - 0x1200) % 8 === 5) || 'ቍኍኵጕ'.includes(c) }
    expect(TUE.units.length).toBe(402)
    for (const [i, u] of TUE.units.entries()) {
      expect(MARK_TYPES).toContain(u.m)
      const last = [...u.w[u.w.length - 1]]
      expect(u.li).toBeLessThan(last.length)
      if (u.m === 'seyaf' || u.m === 'tenesh') expect(u.m).toBe(sadis(last[last.length - 1]) ? 'seyaf' : 'tenesh')
      expect(u.a).toBe(`reader/wudase-tue/${String(i).padStart(3, '0')}.mp3`)
      expect(existsSync(`${process.cwd()}/public/audio/fidel/${u.a}`)).toBe(true)
    }
  })
  it('ሙሴ stays ወዳቂ pending review', () => {
    expect(TUE.units[71]).toMatchObject({ w: ['ሙሴ'], m: 'wedaqi' })
  })
})

describe('ውዳሴ ማርያም ረቡዕ–እሁድ', () => {
  const sadis = (c) => { const o = c.codePointAt(0); return (o >= 0x1200 && o <= 0x1357 && (o - 0x1200) % 8 === 5) || 'ቍኍኵጕ'.includes(c) }
  const DAYS = [[WED, 'wudase-wednesday', 425], [THU, 'wudase-thursday', 474], [FRI, 'wudase-friday', 319], [SAT, 'wudase-saturday', 250], [SUN, 'wudase-sunday', 279]]
  // Units with no clip: cut-off first words (ረቡዕ 0, 71, 146), lines the reading skips (ሐሙስ 386–387, 436–438),
  // and ቀዳሚት ፯ (158–175, not recorded yet). ዓርብ is complete; እሁድ has no recording yet.
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k)
  const VOICED = [
    [WED, 'wed', [0, 71, 146]],
    [THU, 'thu', [386, 387, 436, 437, 438]],
    [FRI, 'fri', []],
    [SAT, 'sat', range(158, 175)],
  ]
  it.each(VOICED)('%#: every voiced unit has its clip on disk; the unvoiced list is exact', (B, sh, none) => {
    const missing = []
    for (const [i, u] of B.units.entries()) {
      if (!u.a) { missing.push(i); continue }
      expect(u.a).toBe(`reader/wudase-${sh}/${String(i).padStart(3, '0')}.mp3`)
      expect(existsSync(`${process.cwd()}/public/audio/fidel/${u.a}`)).toBe(true)
    }
    expect(missing).toEqual(none)
  })
  it('ቀዳሚት ፯ is one whole prayer without audio; every other ቀዳሚት prayer is voiced', () => {
    const starts = SAT.units.flatMap((u, i) => (u.s ? [i] : []))
    expect(starts[7]).toBe(158)
    expect(starts[8]).toBe(176)
    starts.forEach((a, k) => {
      const b = (starts[k + 1] ?? SAT.units.length) - 1
      const voiced = SAT.units.slice(a, b + 1).some((u) => u.a)
      expect(voiced).toBe(k !== 7)
    })
  })
  it('እሁድ stays text-only', () => {
    for (const u of SUN.units) expect(u.a).toBeUndefined()
  })
  it.each(DAYS)('%#: marks valid, ሰያፍ⇔ሳድስ, Ge\u2019ez only, paragraphs open red', (B, id, n) => {
    expect(B.id).toBe(id)
    expect(B.units.length).toBe(n)
    expect(B.title.startsWith('ውዳሴ ማርያም ዘ')).toBe(true)
    for (const u of B.units) {
      expect(MARK_TYPES).toContain(u.m)
      for (const w of u.w) expect(/^[\u1200-\u137F]+$/.test(w)).toBe(true)
      const last = [...u.w[u.w.length - 1]]
      expect(u.li).toBeLessThan(last.length)
      if (u.m === 'seyaf' || u.m === 'tenesh') expect(u.m).toBe(sadis(last[last.length - 1]) ? 'seyaf' : 'tenesh')
      if (u.s) expect(u.h).toContain(0)
    }
    expect(B.units.filter((u) => u.s).length).toBeGreaterThan(5)
  })
  it('ወመጠዉ ወከዓዉ keep ዉ (Yosief) in every day; Tuesday reads ተሰዓተ (no numeral guide left)', () => {
    const thu = THU.units.flatMap((u) => u.w)
    expect(thu).toContain('ወመጠዉ'); expect(thu).toContain('ወከዓዉ')
    for (const B of [MON, TUE, WED, THU, FRI, SAT, SUN]) { const all = B.units.flatMap((u) => u.w); expect(all).not.toContain('ወመጠው'); expect(all).not.toContain('ወከዓው') }
    expect(TUE.units[268]).toMatchObject({ w: ['ተሰዓተ'], a: 'reader/wudase-tue/268.mp3' })
    for (const u of TUE.units) for (const w of u.w) expect(/^[\u1200-\u137F]+$/.test(w)).toBe(true)
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
