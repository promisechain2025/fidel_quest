import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const played = []
const effects = []
const clips = []
vi.mock('../platform/audioEngine', async (orig) => {
  const real = await orig()
  real.audio.play = (key) => { clips.push(key) }
  return {
    ...real,
    playForm: (form) => played.push(form.audioKey),
    playEffect: (kind) => effects.push(kind),
    afterVoice: (cb) => { cb(); return () => {} },
  }
})

import BrickWords from './BrickWords'
import { BRICK_WORDS, wordAt, initBrickWord } from '../brickWordsCore'
import { wordToKeys } from '../workshopCore'
import { expectGuideOnlyLatin } from './brickTestUtils'

const SEED = 3
const word = wordAt(SEED, 0)
const target = wordToKeys(word.geez)
const brick = (k) => document.querySelector(`[data-testid="piece"][data-order="${k}"]`)
const tap = (el) => { fireEvent.pointerDown(el, { clientX: 0, clientY: 0, pointerId: 1 }); fireEvent.pointerUp(el, { clientX: 0, clientY: 0, pointerId: 1 }) }

beforeEach(() => { played.length = 0; effects.length = 0; clips.length = 0; vi.useFakeTimers() })

describe('BrickWords sample', () => {
  it('shows the picture, one slot per letter, says the word, with i18n guide text and no transliteration', () => {
    render(<BrickWords soundOn onBack={() => {}} seed={SEED} />)
    act(() => { vi.advanceTimersByTime(500) })
    expect(clips).toContain(`words/${word.latin}`)
    expect(document.querySelectorAll('[data-testid="slot"]').length).toBe(target.length)
    expect(document.querySelector('[data-testid="picture"] img').getAttribute('src')).toContain(`/bw/${word.pic}.webp`)
    expectGuideOnlyLatin(screen.getByTestId('brick-words'), 'Build the word')
    expect(document.querySelectorAll('[data-testid="piece"]').length).toBe(initBrickWord(word, 102 + SEED, 0).tray.length)
  })

  it('a wrong brick wobbles with a soft cue and builds nothing; right bricks win the word', () => {
    render(<BrickWords soundOn onBack={() => {}} seed={SEED} />)
    const wrongKey = [...document.querySelectorAll('[data-testid="piece"]')].map((b) => b.dataset.order).find((k) => k !== target[0])
    tap(brick(wrongKey))
    expect(effects).toContain('bad')
    expectGuideOnlyLatin(screen.getByTestId('brick-words'), 'Try again!')
    act(() => { vi.advanceTimersByTime(400) })
    expect(played).toContain(target[0]) // re-cues the wanted letter
    expect(document.querySelectorAll('[data-testid="placed"]').length).toBe(0)
    for (const k of target) { tap(brick(k)); expect(played).toContain(k) }
    expect(document.querySelectorAll('[data-testid="placed"]').length).toBe(target.length)
    act(() => { vi.advanceTimersByTime(600) })
    expect(effects).toContain('win')
    expect(screen.getByTestId('confetti')).toBeTruthy()
    expect(screen.getByTestId('next')).toBeTruthy()
    expectGuideOnlyLatin(screen.getByTestId('brick-words'), 'Nice!')
  })

  it('next goes to a different word and every sample word is spellable from real forms', () => {
    render(<BrickWords soundOn onBack={() => {}} seed={SEED} />)
    for (const k of target) tap(brick(k))
    fireEvent.click(screen.getByTestId('next'))
    act(() => { vi.advanceTimersByTime(500) })
    expect(clips).toContain(`words/${wordAt(SEED, 1).latin}`)
    for (const w of BRICK_WORDS) expect(wordToKeys(w.geez).length).toBe(Array.from(w.geez).length)
  })

  it('shrinks the picture board to the room above the baseplate so the baseplate never covers it', () => {
    const rect = (top, height) => ({ top, height, bottom: top + height, left: 0, right: 390, width: 390, x: 0, y: top })
    const spy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
      if (this.firstElementChild?.dataset?.testid === 'baseplate') return rect(300, 150) // baseplate wrapper: starts at y=300
      if (this.querySelector(':scope > [data-testid="picture-fit"]')) return rect(0, 700) // the scene
      return rect(0, 0)
    })
    try {
      render(<BrickWords soundOn onBack={() => {}} seed={SEED} />)
      const fit = screen.getByTestId('picture-fit')
      // room = 300 - 132 (board top) - 22 (badge + air) = 146 of 262 => ~0.56
      expect(Number(fit.dataset.scale)).toBeGreaterThan(0.5)
      expect(Number(fit.dataset.scale)).toBeLessThan(0.6)
      expect(fit.style.transform).toContain('scale(')
    } finally { spy.mockRestore() }
  })

  it('keeps the picture board at full size when there is room (no layout in jsdom)', () => {
    render(<BrickWords soundOn onBack={() => {}} seed={SEED} />)
    expect(screen.getByTestId('picture-fit').dataset.scale).toBe('1')
  })
})
