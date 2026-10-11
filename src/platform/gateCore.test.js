import { describe, it, expect, beforeEach } from 'vitest'
import { makeChallenge, recordMiss, recordPass, lockRemaining, MAX_MISSES, BASE_LOCK_MS, MAX_LOCK_MS, MIN_NUMBER, MAX_NUMBER } from './gateCore'
import { numberWords, NUMBER_WORD_LANGS } from './numberWords'
import { LANG_IDS } from './langpacks'

const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length] }

beforeEach(() => localStorage.removeItem('fq.gate.v1'))

describe('parental gate challenges', () => {
  it('are a random 11..99 number shown only in words', () => {
    const seen = new Set()
    for (let i = 0; i < 500; i++) {
      const c = makeChallenge('en')
      expect(c.answer).toBeGreaterThanOrEqual(MIN_NUMBER)
      expect(c.answer).toBeLessThanOrEqual(MAX_NUMBER)
      expect(c.text).toBe(numberWords(c.answer, 'en'))
      expect(c.text).not.toMatch(/\d/) // the digits never appear
      seen.add(c.answer)
    }
    expect(seen.size).toBeGreaterThan(60) // not a short fixed rotation
  })
  it('covers the full 11..99 range (1-in-89 guess odds)', () => {
    expect(makeChallenge('en', () => 0).answer).toBe(11)
    expect(makeChallenge('en', () => 0.99999).answer).toBe(99)
    expect(MAX_NUMBER - MIN_NUMBER + 1).toBe(89)
  })
  it('a "different number" never repeats the current one', () => {
    for (let n = MIN_NUMBER; n <= MAX_NUMBER; n++) {
      const r = (n - MIN_NUMBER + 0.5) / 89
      expect(makeChallenge('en', () => r).answer).toBe(n)
      expect(makeChallenge('en', () => r, n).answer).not.toBe(n)
    }
  })
  it('is deterministic for a given random source', () => {
    expect(makeChallenge('de', seq([0.4]))).toEqual(makeChallenge('de', seq([0.4])))
  })
  it('uses the app-text language, English for unknown ones', () => {
    expect(makeChallenge('de', () => (47 - 11 + 0.5) / 89)).toEqual({ text: 'siebenundvierzig', answer: 47 })
    expect(makeChallenge('xx', () => (47 - 11 + 0.5) / 89).text).toBe('forty-seven')
  })
})

describe('number words', () => {
  it('has a table for every UI language (plus Amharic and Tigrinya)', () => {
    for (const id of LANG_IDS) expect(NUMBER_WORD_LANGS).toContain(id)
    expect(NUMBER_WORD_LANGS).toEqual(expect.arrayContaining(['am', 'ti']))
  })
  it('spells every number, without digits, uniquely per language', () => {
    for (const lang of NUMBER_WORD_LANGS) {
      const all = new Set()
      for (let n = 11; n <= 99; n++) {
        const w = numberWords(n, lang)
        expect(w, `${lang} ${n}`).toMatch(/\S/)
        expect(w).not.toMatch(/\d|undefined/)
        all.add(w)
      }
      expect(all.size, lang).toBe(89)
    }
  })
  it('rejects numbers outside 10..99', () => {
    expect(() => numberWords(100)).toThrow(RangeError)
    expect(() => numberWords(9)).toThrow(RangeError)
  })
  const cases = {
    en: { 11: 'eleven', 13: 'thirteen', 20: 'twenty', 21: 'twenty-one', 47: 'forty-seven', 80: 'eighty', 99: 'ninety-nine' },
    de: { 11: 'elf', 16: 'sechzehn', 17: 'siebzehn', 21: 'einundzwanzig', 30: 'dreißig', 47: 'siebenundvierzig', 66: 'sechsundsechzig', 99: 'neunundneunzig' },
    it: { 11: 'undici', 17: 'diciassette', 21: 'ventuno', 23: 'ventitré', 28: 'ventotto', 31: 'trentuno', 47: 'quarantasette', 88: 'ottantotto', 99: 'novantanove' },
    sv: { 11: 'elva', 18: 'arton', 20: 'tjugo', 21: 'tjugoett', 47: 'fyrtiosju', 80: 'åttio', 99: 'nittionio' },
    nl: { 11: 'elf', 18: 'achttien', 21: 'eenentwintig', 22: 'tweeëntwintig', 33: 'drieëndertig', 47: 'zevenenveertig', 80: 'tachtig', 99: 'negenennegentig' },
    no: { 11: 'elleve', 17: 'sytten', 20: 'tjue', 21: 'tjueen', 47: 'førtisju', 88: 'åttiåtte', 99: 'nittini' },
    fr: { 11: 'onze', 17: 'dix-sept', 21: 'vingt et un', 22: 'vingt-deux', 47: 'quarante-sept', 61: 'soixante et un', 70: 'soixante-dix', 71: 'soixante et onze', 77: 'soixante-dix-sept', 80: 'quatre-vingts', 81: 'quatre-vingt-un', 90: 'quatre-vingt-dix', 91: 'quatre-vingt-onze', 99: 'quatre-vingt-dix-neuf' },
    am: { 11: 'አስራ አንድ', 15: 'አስራ አምስት', 20: 'ሃያ', 23: 'ሃያ ሶስት', 47: 'አርባ ሰባት', 60: 'ስልሳ', 78: 'ሰባ ስምንት', 99: 'ዘጠና ዘጠኝ' },
    ti: { 11: 'ዓሰርተ ሓደ', 19: 'ዓሰርተ ትሽዓተ', 20: 'ዕስራ', 21: 'ዕስራን ሓደን', 47: 'ኣርብዓን ሸውዓተን', 60: 'ሱሳ', 75: 'ሰብዓን ሓሙሽተን', 99: 'ተስዓን ትሽዓተን' },
  }
  for (const [lang, table] of Object.entries(cases)) {
    it(`spells ${lang} correctly`, () => {
      for (const [n, w] of Object.entries(table)) expect(numberWords(Number(n), lang)).toBe(w)
    })
  }
})

describe('wrong-answer lockout', () => {
  it('allows three misses before locking', () => {
    expect(MAX_MISSES).toBe(3)
    expect(recordMiss(0)).toBe(0)
    expect(recordMiss(0)).toBe(0)
    expect(recordMiss(0)).toBe(BASE_LOCK_MS)
  })
  it('locks after MAX_MISSES misses and doubles each time, capped', () => {
    const t0 = 1_000_000
    for (let i = 1; i < MAX_MISSES; i++) expect(recordMiss(t0)).toBe(0)
    expect(lockRemaining(t0)).toBe(0)
    expect(recordMiss(t0)).toBe(BASE_LOCK_MS)
    expect(lockRemaining(t0 + 1000)).toBe(BASE_LOCK_MS - 1000)
    expect(lockRemaining(t0 + BASE_LOCK_MS)).toBe(0)
    for (let i = 0; i < MAX_MISSES - 1; i++) recordMiss(t0)
    expect(recordMiss(t0)).toBe(BASE_LOCK_MS * 2)
    for (let k = 0; k < 10; k++) for (let i = 0; i < MAX_MISSES; i++) recordMiss(t0)
    expect(lockRemaining(t0)).toBe(MAX_LOCK_MS)
  })
  it('a pass clears misses and escalation', () => {
    recordMiss(0)
    recordPass()
    expect(recordMiss(0)).toBe(0)
  })
})
