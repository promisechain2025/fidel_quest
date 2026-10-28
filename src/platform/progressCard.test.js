import { describe, it, expect, beforeEach } from 'vitest'
import { CARD_FAMILY_COUNTS as APP_COUNTS, MAX_CARD_LETTERS, buildProgressSnapshot, encodeProgressCard, decodeProgressCard, progressCardUrl, TOTAL_LETTERS, APP_AREA_COUNT, APP_GROUP_SIZES } from './progressCard'
import { decodeProgressCard as siteDecode, APP_AREA_COUNT as SITE_AREAS, APP_GROUP_SIZES as SITE_GROUPS, CARD_FAMILY_COUNTS as SITE_COUNTS, QHE_AFTER, QHE_CHARS } from '../../website/src/progressCard.js'
import { noteDone, noteVisit, setActiveArea } from './appProgress'
import { b64urlEncode, b64urlDecode } from '../utils/challenge'
import { JOURNEY, NodeKind, loadJourney, saveJourney } from '../journey'

describe('progress card (shareable child-progress snapshot)', () => {
  beforeEach(() => localStorage.clear())

  const seedProgress = (learnCount) => {
    const p = loadJourney()
    JOURNEY.filter((n) => n.kind === NodeKind.LEARN).slice(0, learnCount)
      .forEach((n) => { p.done[n.id] = true })
    saveJourney(p)
    return p
  }

  it('snapshot reflects real journey progress', () => {
    const p = seedProgress(5)
    const s = buildProgressSnapshot(p, '2026-07-26')
    expect(s.letters).toBe(35)
    expect(s.mask).toHaveLength(33)
    expect([...s.mask].filter((c) => c === '1')).toHaveLength(5)
    expect(s.nodesDone).toBe(5)
    expect(s.nodesTotal).toBe(JOURNEY.length)
  })

  it('encode -> decode round-trips, and the WEBSITE decoder agrees', () => {
    const p = seedProgress(8)
    const s = { ...buildProgressSnapshot(p, '2026-07-26'), name: 'ሰላም Selam', streak: 12 }
    const token = encodeProgressCard(s)
    for (const decode of [decodeProgressCard, siteDecode]) {
      const d = decode(token)
      expect(d).not.toBeNull()
      expect(d.letters).toBe(56)
      expect(d.streak).toBe(12)
      expect(d.mask).toBe(s.mask)
      expect(d.day).toBe('2026-07-26')
      expect(d.name).toBe('ሰላም Selam')
    }
  })

  it('rejects tampered and malformed tokens in both decoders', () => {
    const token = encodeProgressCard(buildProgressSnapshot(seedProgress(2), '2026-07-26'))
    const bad = [
      'garbage', '', token.slice(0, 8),
      encodeProgressCard({ ...buildProgressSnapshot(seedProgress(2), '2026-07-26'), mask: '1'.repeat(33) })?.replace(/^./, 'X'),
    ]
    for (const b of bad) {
      expect(decodeProgressCard(b)).toBeNull()
      expect(siteDecode(b)).toBeNull()
    }
    // over-limit letters clamp at encode; forged over-limit decode fails
    const forged = btoa(JSON.stringify({ v: 1, m: '1'.repeat(33), d: '2026-07-26', L: 999 }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(decodeProgressCard(forged)).toBeNull()
    expect(siteDecode(forged)).toBeNull()
  })

  it('builds the /progress URL on the site origin', () => {
    seedProgress(3)
    const url = progressCardUrl(buildProgressSnapshot(loadJourney(), '2026-07-26'), 'https://easygeez.com/')
    expect(url).toMatch(/^https:\/\/easygeez\.com\/progress#p=/)
  })

  it('total letters constant matches the fidel table', () => {
    expect(TOTAL_LETTERS).toBe(231)
  })

  describe('Tigrinya cards (34 families: ቐ after Qe)', () => {
    const mk = (m, L) => b64urlEncode(JSON.stringify({ v: 1, n: 'Abel', d: '2026-07-26', s: 1, L, m, c: 1, T: 108 }))

    it('the website accepts the same family counts as the app, and ቐ sits after Qe', () => {
      expect(SITE_COUNTS).toEqual(APP_COUNTS)
      expect(SITE_COUNTS).toEqual([33, 34])
      expect(MAX_CARD_LETTERS).toBe(238)
      expect(QHE_AFTER).toBe(8)
      expect(QHE_CHARS.codePointAt(0)).toBe(0x1250)
    })

    it('a 34-family Tigrinya card round-trips through BOTH decoders (it was rejected before)', () => {
      const mask = '1'.repeat(34)
      const tok = encodeProgressCard({ name: 'Abel', day: '2026-07-26', streak: 1, letters: 238, mask, nodesDone: 1, nodesTotal: 108 })
      expect(tok).toBeTruthy()
      for (const decode of [decodeProgressCard, siteDecode]) {
        const d = decode(tok)
        expect(d).not.toBeNull()
        expect(d.mask).toBe(mask)
        expect(d.letters).toBe(238)
      }
    })

    it('the letter ceiling follows the mask: 238 is fine at 34, forged at 33; other lengths fail', () => {
      for (const decode of [decodeProgressCard, siteDecode]) {
        expect(decode(mk('0'.repeat(34), 238))).not.toBeNull()
        expect(decode(mk('0'.repeat(33), 238))).toBeNull()
        expect(decode(mk('0'.repeat(35), 7))).toBeNull()
        expect(decode(mk('0'.repeat(32), 7))).toBeNull()
        expect(decode(mk('0'.repeat(34), 239))).toBeNull()
      }
    })

    it('the app encoder refuses a mask that is not a clean 33/34 string', () => {
      const base = { name: 'A', day: '2026-07-26', streak: 0, letters: 0, nodesDone: 0, nodesTotal: 1 }
      expect(encodeProgressCard({ ...base, mask: '0'.repeat(35) })).toBeNull()
      expect(encodeProgressCard({ ...base, mask: 'x'.repeat(33) })).toBeNull()
    })
  })

  describe('app-level tracker + ጸሎት travel in the card', () => {
    it('the website constants equal the app constants', () => {
      expect(SITE_AREAS).toBe(APP_AREA_COUNT)
      expect(SITE_GROUPS).toEqual(APP_GROUP_SIZES)
    })

    it('snapshot -> encode -> BOTH decoders carry the tried mask, prayer minutes and pages', () => {
      localStorage.setItem('fq.practice.v1', JSON.stringify({ v: 1, days: { '2026-07-26': { day: '2026-07-26', activeMs: 0, prayerMs: 7 * 60000, flags: {} } }, goal: null }))
      setActiveArea(null)
      noteVisit('echo'); noteDone('prayer'); noteDone('prayer'); noteDone('prayer')
      const snap = { ...buildProgressSnapshot(seedProgress(2), '2026-07-26'), name: 'Selam' }
      expect(snap.apps).toHaveLength(APP_AREA_COUNT)
      for (const decode of [decodeProgressCard, siteDecode]) {
        const d = decode(encodeProgressCard(snap))
        expect(d.apps).toBe(snap.apps)
        expect([...d.apps].filter((c) => c === '1')).toHaveLength(2) // echo + prayer
        expect(d.prayerMin).toBe(7)
        expect(d.prayerPages).toBe(3)
      }
    })

    it('shares counts only: no answers, ledger or timestamps beyond the card day', () => {
      noteVisit('echo'); noteDone('prayer')
      const raw = JSON.parse(b64urlDecode(encodeProgressCard(buildProgressSnapshot(seedProgress(1), '2026-07-26'))))
      expect(Object.keys(raw).sort()).toEqual(['T', 'L', 'a', 'c', 'd', 'm', 'n', 'r', 's', 'v'].sort())
      expect(raw.r).toHaveLength(2)
    })

    it('an older v1 card without the new fields still decodes, with apps null', () => {
      const old = b64urlEncode(JSON.stringify({ v: 1, n: 'Old', d: '2026-07-26', s: 1, L: 7, m: '1' + '0'.repeat(32), c: 1, T: 20 }))
      for (const decode of [decodeProgressCard, siteDecode]) {
        const d = decode(old)
        expect(d.letters).toBe(7)
        expect(d.apps).toBeNull()
        expect(d.prayerMin).toBe(0)
      }
    })

    it('malformed a/r are dropped and clamped, never fail the card or inject markup', () => {
      const base = { v: 1, n: 'A', d: '2026-07-26', s: 0, L: 0, m: '0'.repeat(33), c: 0, T: 5 }
      const mk = (x) => b64urlEncode(JSON.stringify({ ...base, ...x }))
      for (const decode of [decodeProgressCard, siteDecode]) {
        expect(decode(mk({ a: '1'.repeat(29) })).apps).toBeNull()
        expect(decode(mk({ a: 'x'.repeat(30) })).apps).toBeNull()
        expect(decode(mk({ a: 42 })).apps).toBeNull()
        const d = decode(mk({ a: '1'.repeat(30), r: [9999999, -4] }))
        expect(d.apps).toBe('1'.repeat(30))
        expect(d.prayerMin).toBe(7 * 24 * 60)
        expect(d.prayerPages).toBe(0)
        expect(decode(mk({ a: '1'.repeat(30), r: 'zz' })).prayerMin).toBe(0)
      }
    })
  })
})
