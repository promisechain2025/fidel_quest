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

const SEED = 3
const word = wordAt(SEED, 0)
const target = wordToKeys(word.geez)
const brick = (k) => document.querySelector(`[data-testid="piece"][data-order="${k}"]`)
const tap = (el) => { fireEvent.pointerDown(el, { clientX: 0, clientY: 0, pointerId: 1 }); fireEvent.pointerUp(el, { clientX: 0, clientY: 0, pointerId: 1 }) }

beforeEach(() => { played.length = 0; effects.length = 0; clips.length = 0; vi.useFakeTimers() })

describe('BrickWords sample', () => {
  it('shows the picture, one slot per letter, says the word, and has no English text', () => {
    render(<BrickWords soundOn onBack={() => {}} seed={SEED} />)
    act(() => { vi.advanceTimersByTime(500) })
    expect(clips).toContain(`words/${word.latin}`)
    expect(document.querySelectorAll('[data-testid="slot"]').length).toBe(target.length)
    expect(document.querySelector('[data-testid="picture"] img').getAttribute('src')).toContain(`/bw/${word.pic}.webp`)
    expect(screen.getByTestId('brick-words').textContent).not.toMatch(/[A-Za-z]/)
    expect(document.querySelectorAll('[data-testid="piece"]').length).toBe(initBrickWord(word, 102 + SEED, 0).tray.length)
  })

  it('a wrong brick wobbles with a soft cue and builds nothing; right bricks win the word', () => {
    render(<BrickWords soundOn onBack={() => {}} seed={SEED} />)
    const wrongKey = [...document.querySelectorAll('[data-testid="piece"]')].map((b) => b.dataset.order).find((k) => k !== target[0])
    tap(brick(wrongKey))
    expect(effects).toContain('bad')
    act(() => { vi.advanceTimersByTime(400) })
    expect(played).toContain(target[0]) // re-cues the wanted letter
    expect(document.querySelectorAll('[data-testid="placed"]').length).toBe(0)
    for (const k of target) { tap(brick(k)); expect(played).toContain(k) }
    expect(document.querySelectorAll('[data-testid="placed"]').length).toBe(target.length)
    act(() => { vi.advanceTimersByTime(600) })
    expect(effects).toContain('win')
    expect(screen.getByTestId('confetti')).toBeTruthy()
    expect(screen.getByTestId('next')).toBeTruthy()
    expect(screen.getByTestId('brick-words').textContent).not.toMatch(/[A-Za-z]/)
  })

  it('next goes to a different word and every sample word is spellable from real forms', () => {
    render(<BrickWords soundOn onBack={() => {}} seed={SEED} />)
    for (const k of target) tap(brick(k))
    fireEvent.click(screen.getByTestId('next'))
    act(() => { vi.advanceTimersByTime(500) })
    expect(clips).toContain(`words/${wordAt(SEED, 1).latin}`)
    for (const w of BRICK_WORDS) expect(wordToKeys(w.geez).length).toBe(Array.from(w.geez).length)
  })
})
