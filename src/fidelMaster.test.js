import { describe, it, expect } from 'vitest'
import { mulberry32, shuffleSeeded, buildMasterSequence, gradePronunciation, sessionAccuracy, AUTOPLAY_SPEEDS, SPEED_ORDER, nextOrder } from './fidelMaster'

describe('mix sequence', () => {
  const forms = Array.from({ length: 231 }, (_, i) => ({ audioKey: `f-${i}`, i }))

  it('is a deterministic permutation of every form', () => {
    const a = buildMasterSequence(forms, { seed: 5, mix: true })
    const b = buildMasterSequence(forms, { seed: 5, mix: true })
    expect(a.map((f) => f.i)).toEqual(b.map((f) => f.i)) // same seed -> same order
    expect([...a].sort((x, y) => x.i - y.i)).toEqual(forms) // no letter lost or duped
    expect(a).toHaveLength(forms.length)
  })

  it('different seeds give different orders; in-order keeps the table order', () => {
    const a = buildMasterSequence(forms, { seed: 1, mix: true })
    const b = buildMasterSequence(forms, { seed: 2, mix: true })
    expect(a.map((f) => f.i)).not.toEqual(b.map((f) => f.i))
    expect(buildMasterSequence(forms, { mix: false }).map((f) => f.i)).toEqual(forms.map((f) => f.i))
  })

  it('narrows to a single vowel order when asked', () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({ audioKey: `f-${i}`, order: (i % 7) + 1 }))
    const only4 = buildMasterSequence(rows, { mix: false, order: 4 })
    expect(only4).toHaveLength(3)
    expect(only4.every((f) => f.order === 4)).toBe(true)
    expect(buildMasterSequence(rows, { mix: false, order: null })).toHaveLength(21)
  })

  it('nextOrder round-robins 1..7', () => {
    expect(nextOrder(1)).toBe(2)
    expect(nextOrder(6)).toBe(7)
    expect(nextOrder(7)).toBe(1)
  })

  it('mulberry32 is stable and shuffle tolerates a zero seed', () => {
    expect(mulberry32(42)()).toBeCloseTo(mulberry32(42)(), 12)
    expect(shuffleSeeded(forms, 0)).toHaveLength(forms.length)
  })
})

describe('on-device pronunciation grading', () => {
  it('asks again when it heard nothing', () => {
    expect(gradePronunciation({ peakRms: 0.005, voicedMs: 0 })).toMatchObject({ accept: false, reason: 'quiet' })
  })
  it('celebrates a clear, sustained syllable', () => {
    expect(gradePronunciation({ peakRms: 0.2, voicedMs: 600 })).toMatchObject({ grade: 'great', accept: true })
  })
  it('accepts a shorter attempt as a good try', () => {
    expect(gradePronunciation({ peakRms: 0.08, voicedMs: 160 })).toMatchObject({ grade: 'good', accept: true })
  })
  it('asks again for a too-brief blip', () => {
    expect(gradePronunciation({ peakRms: 0.08, voicedMs: 40 })).toMatchObject({ accept: false, reason: 'short' })
  })
  it('never throws on empty input', () => {
    expect(() => gradePronunciation()).not.toThrow()
    expect(gradePronunciation().accept).toBe(false)
  })
})

describe('session accuracy + pacing', () => {
  it('is null before any attempt, else a rounded percent', () => {
    expect(sessionAccuracy({ correct: 0, total: 0 })).toBeNull()
    expect(sessionAccuracy({ correct: 3, total: 4 })).toBe(75)
  })
  it('exposes three ascending-speed paces', () => {
    expect(SPEED_ORDER).toEqual(['slow', 'normal', 'fast'])
    expect(AUTOPLAY_SPEEDS.slow).toBeGreaterThan(AUTOPLAY_SPEEDS.normal)
    expect(AUTOPLAY_SPEEDS.normal).toBeGreaterThan(AUTOPLAY_SPEEDS.fast)
  })
})
