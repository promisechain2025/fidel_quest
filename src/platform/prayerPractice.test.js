import { describe, it, expect, beforeEach } from 'vitest'
import {
  startPractice, endPractice, isPracticeMode, practiceSource, subscribePracticeMode,
  prayerRange, playCurrentPrayerOnly, prayerAudio, PRACTICE_EVENT, _resetPracticeMode,
} from './prayerPractice'

// three prayers: units 0-3, 4-6, 7-9 (s:1 marks a prayer start); unit 5 has no clip
const U = [
  { s: 1, a: '0' }, { a: '1' }, { a: '2' }, { a: '3' },
  { s: 1, a: '4' }, {}, { a: '6' },
  { s: 1, a: '7' }, { a: '8' }, { a: '9' },
]

beforeEach(() => _resetPracticeMode())

describe('practice mode', () => {
  it('start/end, source and subscribers', () => {
    const seen = []
    subscribePracticeMode((on) => seen.push(on))
    expect(isPracticeMode()).toBe(false)
    startPractice('class')
    expect([isPracticeMode(), practiceSource()]).toEqual([true, 'class'])
    endPractice()
    endPractice() // idempotent
    expect(seen).toEqual([true, false])
  })
  it('emits bus events the tracker listens to', () => {
    const got = []
    const fn = (e) => got.push(e.detail)
    window.addEventListener(PRACTICE_EVENT, fn)
    startPractice()
    prayerAudio(true, 4)
    window.removeEventListener(PRACTICE_EVENT, fn)
    expect(got).toEqual([{ type: 'practiceStart', source: 'button' }, { type: 'prayerAudio', playing: true, key: 4 }])
  })
})

describe('play only the current prayer', () => {
  it('prayer ranges follow s:1 section starts', () => {
    expect(prayerRange(U, 2)).toEqual([0, 3])
    expect(prayerRange(U, 4)).toEqual([4, 6])
    expect(prayerRange(U, 9)).toEqual([7, 9])
  })
  it('advances inside the prayer, skips unrecorded units, stops at its end', () => {
    expect(playCurrentPrayerOnly(U, 0)).toBe(1)
    expect(playCurrentPrayerOnly(U, 3)).toBe(-1) // never runs into the next prayer
    expect(playCurrentPrayerOnly(U, 4)).toBe(6)
    expect(playCurrentPrayerOnly(U, 6)).toBe(-1)
    expect(playCurrentPrayerOnly(U, 9)).toBe(-1) // no loop back to the start
  })
})
