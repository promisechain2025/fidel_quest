import { describe, it, expect, beforeEach } from 'vitest'
import { buildProgressSnapshot, encodeProgressCard, decodeProgressCard, progressCardUrl, TOTAL_LETTERS } from './progressCard'
import { decodeProgressCard as siteDecode } from '../../website/src/progressCard.js'
import { JOURNEY, NodeKind, loadJourney, saveJourney } from '../journey'
import { b64urlEncode } from '../utils/challenge'
import { srsReview, epochDay } from './srs'

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
    // Five unfailable lessons introduce 35 forms and prove none of them.
    expect(s.seen).toBe(35)
    expect(s.mastered).toBe(0)
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
      expect(d.seen).toBe(56)
      expect(d.mastered).toBe(0) // attendance is never reported as mastery
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
    const url = progressCardUrl(buildProgressSnapshot(loadJourney(), '2026-07-26'), 'https://egeez.app/')
    expect(url).toMatch(/^https:\/\/egeez\.app\/progress#p=/)
  })

  it('total letters constant matches the fidel table', () => {
    expect(TOTAL_LETTERS).toBe(231)
  })
})

/* The card is the app's explicit CLAIM to a parent, grandparent or teacher.
   It used to report families x 7 - so 33 finished-but-unfailable lessons
   arrived as "231 letters learned". These pin the distinction. */
describe('the card reports proof, not attendance', () => {
  beforeEach(() => localStorage.clear())

  const seedProgress = (learnCount) => {
    const p = loadJourney()
    JOURNEY.filter((n) => n.kind === NodeKind.LEARN).slice(0, learnCount)
      .forEach((n) => { p.done[n.id] = true })
    saveJourney(p)
    return p
  }

  it('counts only forms recalled correctly on two different days', () => {
    seedProgress(3) // 21 forms introduced
    const D = epochDay()
    srsReview('ha-1', true, D)
    srsReview('ha-1', true, D + 1) // proven
    srsReview('le-1', true, D)
    srsReview('le-1', true, D) // same day: the cram guard rejects it
    const s = buildProgressSnapshot(loadJourney(), '2026-07-26')
    expect(s.seen).toBe(21)
    expect(s.mastered).toBe(1)
  })

  it('carries both numbers through encode -> decode, in both decoders', () => {
    seedProgress(4)
    const D = epochDay()
    srsReview('ha-1', true, D)
    srsReview('ha-1', true, D + 1)
    const token = encodeProgressCard(buildProgressSnapshot(loadJourney(), '2026-07-26'))
    for (const decode of [decodeProgressCard, siteDecode]) {
      const d = decode(token)
      expect(d.mastered).toBe(1)
      expect(d.seen).toBe(28)
    }
  })

  // An old link measured only attendance. Relabelling it as mastery would make
  // the app assert evidence that was never collected.
  it('decodes a v1 link as introduced-only, with mastery unknown', () => {
    const v1 = b64urlEncode(JSON.stringify({
      v: 1, n: 'Selam', d: '2026-07-26', s: 3,
      L: 56, m: '1'.repeat(8) + '0'.repeat(25), c: 8, T: JOURNEY.length,
    }))
    for (const decode of [decodeProgressCard, siteDecode]) {
      const d = decode(v1)
      expect(d).not.toBeNull()
      expect(d.seen).toBe(56)
      expect(d.mastered).toBeNull()
    }
  })
})
