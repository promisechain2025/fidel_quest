import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

const played = []
const effects = []
const waits = []
vi.mock('../platform/audioEngine', async (orig) => ({
  ...(await orig()),
  playForm: (form) => played.push(form.audioKey),
  playEffect: (kind) => effects.push(kind),
  afterVoice: (cb) => { waits.push(cb); return () => {} },
}))

import BlockChurch from './BlockChurch'
import { initRound } from '../blockChurchCore'
import { expectGuideOnlyLatin } from './brickTestUtils'

const SEED = 5
const queue = initRound(SEED).queue
const piece = (o) => document.querySelector(`[data-testid="piece"][data-order="${o}"]`)
const tap = (el) => { fireEvent.pointerDown(el, { clientX: 0, clientY: 0, pointerId: 1 }); fireEvent.pointerUp(el, { clientX: 0, clientY: 0, pointerId: 1 }) }
const flush = () => act(() => { while (waits.length) waits.shift()() })

beforeEach(() => { played.length = 0; effects.length = 0; waits.length = 0; vi.useFakeTimers() })

describe('BlockChurch sample', () => {
  it('shows ለ with 7 pieces, plays the target clip, with an i18n guide sign and no transliteration', () => {
    render(<BlockChurch soundOn onBack={() => {}} seed={SEED} />)
    expect(screen.getByTestId('big-glyph').textContent).toBe('ለ')
    expect(document.querySelectorAll('[data-testid="piece"]').length).toBe(7)
    act(() => { vi.advanceTimersByTime(500) })
    expect(played).toEqual([`le-${queue[0]}`])
    expectGuideOnlyLatin(screen.getByTestId('block-church'), 'Drag the matching block')
  })

  it('wrong piece does not build; right pieces build the church to completion', () => {
    render(<BlockChurch soundOn onBack={() => {}} seed={SEED} />)
    const wrong = queue[0] === 1 ? 2 : 1
    tap(piece(wrong))
    expect(effects).toContain('bad')
    expectGuideOnlyLatin(screen.getByTestId('block-church'), 'Try again!')
    expect(document.querySelectorAll('[data-testid="church-block"]').length).toBe(0)
    for (let i = 0; i < 7; i++) {
      tap(piece(queue[i]))
      expect(played).toContain(`le-${queue[i]}`)
      flush()
      act(() => { vi.advanceTimersByTime(500) })
    }
    expect(document.querySelectorAll('[data-testid="church-block"]').length).toBe(7)
    expect(screen.getByTestId('dome-done')).toBeTruthy()
    expect(effects).toContain('win')
    expectGuideOnlyLatin(screen.getByTestId('block-church'), 'Nice!')
  })
})
