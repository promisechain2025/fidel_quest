import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import PrayerBook from './PrayerBook'
import TSELOT from '../data/tselotMarks.json'
import { isPracticeMode, PRACTICE_EVENT, _resetPracticeMode, prayerRange } from '../platform/prayerPractice'

let played = []
let last = null
class FakeAudio {
  constructor() { this.paused = true; this.duration = 1; this.currentTime = 0; last = this }
  set src(v) { this._src = v; played.push(v) }
  get src() { return this._src }
  play() { this.paused = false; return Promise.resolve() }
  pause() { this.paused = true }
}
const flush = () => act(async () => { await Promise.resolve() })
const events = []
const onBus = (e) => events.push(e.detail)

beforeEach(() => {
  localStorage.clear(); played = []; events.length = 0; _resetPracticeMode()
  vi.stubGlobal('Audio', FakeAudio)
  window.addEventListener(PRACTICE_EVENT, onBus)
})
afterEach(() => { vi.unstubAllGlobals(); window.removeEventListener(PRACTICE_EVENT, onBus) })

describe('PrayerBook practice mode (practice tracking contract)', () => {
  it('icon-only entry toggles practice mode; leaving the book ends it', () => {
    const { unmount } = render(<PrayerBook onBack={() => {}} />)
    const btn = screen.getByTestId('practice-toggle')
    expect(/[A-Za-z]/.test(btn.textContent + btn.getAttribute('aria-label'))).toBe(false)
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(btn)
    expect(isPracticeMode()).toBe(true)
    expect(screen.getByTestId('practice-toggle').getAttribute('aria-pressed')).toBe('true')
    unmount()
    expect(isPracticeMode()).toBe(false)
    expect(events.map((e) => e.type)).toEqual(['prayerOpen', 'practiceStart', 'prayerAudio', 'prayerClose', 'practiceEnd'])
  })

  it('in practice mode playback stops at the end of the current prayer (no auto-advance)', async () => {
    render(<PrayerBook onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('practice-toggle'))
    fireEvent.click(screen.getByTestId('play'))
    await flush()
    const [, end] = prayerRange(TSELOT.units, 0)
    for (let k = 0; k < 40 && last.onended; k++) {
      const n = played.length
      await act(async () => { last.onended() })
      await flush()
      if (played.length === n) break
    }
    const idx = played.map((s) => Number(s.match(/(\d+)\.mp3$/)[1]))
    expect(Math.max(...idx)).toBeLessThanOrEqual(end)
    expect(screen.getByTestId('play').getAttribute('aria-label')).toBe('አንብብ') // stopped
    const audioEv = events.filter((e) => e.type === 'prayerAudio')
    expect(audioEv[0]).toEqual({ type: 'prayerAudio', playing: true, key: 0 })
    expect(audioEv[audioEv.length - 1].playing).toBe(false)
  })

  it('outside practice mode playback still continues past the prayer (unchanged)', async () => {
    render(<PrayerBook onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('play'))
    await flush()
    const [, end] = prayerRange(TSELOT.units, 0)
    for (let k = 0; k <= end + 2; k++) { await act(async () => { last.onended() }); await flush() }
    const idx = played.map((s) => Number(s.match(/(\d+)\.mp3$/)[1]))
    expect(Math.max(...idx)).toBeGreaterThan(end)
  })

  it('ቀዳሚት ፯ (no recording): practice mode plays nothing there, instead of jumping to the next prayer', async () => {
    const SAT = (await import('../data/wudaseSaturdayMarks.json')).default
    const { startUnitForPage } = await import('../platform/prayerPractice')
    const page = Array.from({ length: 18 }, (_, k) => 158 + k)
    expect(startUnitForPage(SAT.units, page, -1, true)).toBe(-1)
    expect(startUnitForPage(SAT.units, page, -1, false)).toBe(176)
  })

  it('a newly voiced day (ረቡዕ) plays its own clips and, in practice mode, stops at the prayer end', async () => {
    const WED = (await import('../data/wudaseWednesdayMarks.json')).default
    render(<PrayerBook onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('book-picker'))
    fireEvent.click(screen.getByTestId('book-wudase-wednesday'))
    fireEvent.click(screen.getByTestId('practice-toggle'))
    fireEvent.click(screen.getByTestId('play'))
    await flush()
    expect(played[0]).toMatch(/reader\/wudase-wed\/001\.mp3$/) // ፩ ዉዳሴሃ has no clip (cut off in the recording)
    for (let k = 0; k < 60 && last.onended; k++) {
      const n = played.length
      await act(async () => { last.onended() })
      await flush()
      if (played.length === n) break
    }
    const idx = played.map((s) => Number(s.match(/(\d+)\.mp3$/)[1]))
    const [, end] = prayerRange(WED.units, 1)
    expect(Math.max(...idx)).toBe(end)
  })
})
