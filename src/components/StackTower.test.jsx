import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const played = []
const effects = []
vi.mock('../platform/audioEngine', async (orig) => {
  const real = await orig()
  return {
    ...real,
    playForm: (form) => played.push(form.audioKey),
    playEffect: (kind) => effects.push(kind),
    afterVoice: (cb) => { cb(); return () => {} },
  }
})

import StackTower from './StackTower'
import { initLadder } from '../ladderCore'
import { expectGuideOnlyLatin } from './brickTestUtils'

const SEED = 5
const ctx = initLadder('me', SEED)
const brick = (k) => document.querySelector(`[data-testid="piece"][data-order="${k}"]`)
const tap = (el) => { fireEvent.pointerDown(el, { clientX: 0, clientY: 0, pointerId: 1 }); fireEvent.pointerUp(el, { clientX: 0, clientY: 0, pointerId: 1 }) }

beforeEach(() => { played.length = 0; effects.length = 0; vi.useFakeTimers() })

describe('StackTower sample', () => {
  it('starts with 7 bricks in the tray, 7 empty levels, says the first form, i18n guide sign, pips not numerals', () => {
    render(<StackTower soundOn onBack={() => {}} seed={SEED} />)
    act(() => { vi.advanceTimersByTime(600) })
    expect(played[0]).toBe(ctx.order[0])
    expect(document.querySelectorAll('[data-testid="piece"]').length).toBe(7)
    expect(document.querySelectorAll('[data-testid="level"]').length).toBe(7)
    expect(screen.getByTestId('baseplate')).toBeTruthy()
    expectGuideOnlyLatin(screen.getByTestId('stack-tower'), 'Drag the bricks in order')
    // number cues are pips (dots), 1..7 on the tray bricks and the ghost levels - no Ge'ez numerals
    const counts = [...document.querySelectorAll('[data-testid="piece"] [data-testid="pips"]')].map((e) => +e.dataset.n).sort()
    expect(counts).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(document.querySelectorAll('[data-testid="level"] [data-testid="pips"]').length).toBe(7)
    expect(screen.getByTestId('stack-tower').textContent).not.toMatch(/[\u1369-\u137C]/)
  })

  it('a wrong brick wobbles with a soft cue and stacks nothing', () => {
    render(<StackTower soundOn onBack={() => {}} seed={SEED} />)
    tap(brick(ctx.order[3]))
    expect(effects).toContain('bad')
    expectGuideOnlyLatin(screen.getByTestId('stack-tower'), 'Try again!')
    act(() => { vi.advanceTimersByTime(400) })
    expect(played).toContain(ctx.order[0])
    expect(document.querySelectorAll('[data-testid="tower-block"]').length).toBe(0)
  })

  it('stacking all seven in order wins: gold tower, cross arms, confetti, next', () => {
    render(<StackTower soundOn onBack={() => {}} seed={SEED} />)
    ctx.order.forEach((k, i) => {
      tap(brick(k))
      expect(document.querySelectorAll('[data-testid="tower-block"]').length).toBe(i + 1)
      expect(played).toContain(k)
    })
    act(() => { vi.advanceTimersByTime(600) })
    expect(effects).toContain('win')
    expect(document.querySelectorAll('[data-testid="cross-arm"]').length).toBe(2)
    expect(screen.getByTestId('confetti')).toBeTruthy()
    expect(screen.getByTestId('next')).toBeTruthy()
    expectGuideOnlyLatin(screen.getByTestId('stack-tower'), 'Nice!')
    fireEvent.click(screen.getByTestId('next'))
    act(() => { vi.advanceTimersByTime(600) })
    expect(document.querySelectorAll('[data-testid="tower-block"]').length).toBe(0)
    expect(document.querySelectorAll('[data-testid="piece"]').length).toBe(7)
  })
})
