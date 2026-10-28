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
import { churchStore, CHURCH_KEY } from '../platform/churchProgress'
import { FIDEL_FAMILIES } from '../platform/ethiopic'
import { expectGuideOnlyLatin } from './brickTestUtils'

const SEED = 5
const piece = (o) => document.querySelector(`[data-testid="piece"][data-order="${o}"]`)
const tap = (el) => { fireEvent.pointerDown(el, { clientX: 0, clientY: 0, pointerId: 1 }); fireEvent.pointerUp(el, { clientX: 0, clientY: 0, pointerId: 1 }) }
const flush = () => act(() => { while (waits.length) waits.shift()() })
const tile = (id) => document.querySelector(`[data-testid="family-tile"][data-family="${id}"]`)
const bricks = () => document.querySelectorAll('[data-testid="church-block"]').length
const root = () => screen.getByTestId('block-church')

/** Play a whole family round by tapping the right piece each time. */
function playRound(queue, familyId) {
  for (let i = 0; i < 7; i++) {
    tap(piece(queue[i]))
    expect(played).toContain(`${familyId}-${queue[i]}`)
    flush()
    act(() => { vi.advanceTimersByTime(500) })
  }
}

beforeEach(() => { localStorage.clear(); played.length = 0; effects.length = 0; waits.length = 0; vi.useFakeTimers() })

describe('BlockChurch: every consonant family', () => {
  it('starts on a picker with one tile per family and a guide sign without transliteration', () => {
    render(<BlockChurch soundOn onBack={() => {}} seed={SEED} />)
    expect(root().dataset.mode).toBe('pick')
    expect(document.querySelectorAll('[data-testid="family-tile"]').length).toBe(FIDEL_FAMILIES.length)
    expect(FIDEL_FAMILIES.length).toBeGreaterThan(30)
    expect(document.querySelectorAll('[data-testid="family-tile"][data-next="1"]').length).toBe(1)
    expect(tile(FIDEL_FAMILIES[0].id).dataset.next).toBe('1')
    expect(document.querySelectorAll('[data-testid="wall-ghost"]').length).toBe(FIDEL_FAMILIES.length)
    expectGuideOnlyLatin(root(), 'Pick a letter to build')
  })

  it('picking a family shows its consonant with 7 pieces and plays the target clip', () => {
    render(<BlockChurch soundOn onBack={() => {}} seed={SEED} />)
    const fam = FIDEL_FAMILIES[3]
    fireEvent.click(tile(fam.id))
    expect(root().dataset.mode).toBe('play')
    expect(screen.getByTestId('big-glyph').textContent.length).toBeGreaterThan(0)
    expect(document.querySelectorAll('[data-testid="piece"]').length).toBe(7)
    const queue = initRound(SEED + 1).queue
    act(() => { vi.advanceTimersByTime(500) })
    expect(played).toEqual([`${fam.id}-${queue[0]}`])
    expectGuideOnlyLatin(root(), 'Drag the matching block')
  })

  it('a wrong piece does not build; 7 right ones finish the family, save it and grow the wall', () => {
    render(<BlockChurch soundOn onBack={() => {}} seed={SEED} />)
    const fam = FIDEL_FAMILIES[1]
    fireEvent.click(tile(fam.id))
    const queue = initRound(SEED + 1).queue
    const wrong = queue[0] === 1 ? 2 : 1
    tap(piece(wrong))
    expect(effects).toContain('bad')
    expectGuideOnlyLatin(root(), 'Try again!')
    expect(bricks()).toBe(0)
    expect(screen.getByTestId('church-wall').dataset.built).toBe('0')
    playRound(queue, fam.id)
    expect(bricks()).toBe(7)
    expect(screen.getByTestId('dome-done')).toBeTruthy()
    expect(effects).toContain('win')
    expectGuideOnlyLatin(root(), 'Nice!')
    expect(churchStore.load().done[fam.id]).toBe(2) // one miss -> 2 stars
    expect(JSON.parse(localStorage.getItem(CHURCH_KEY)).done[fam.id]).toBe(2)
    expect(screen.getByTestId('church-wall').dataset.built).toBe('1')
    expect(document.querySelectorAll('[data-testid="wall-brick"]').length).toBe(1)
  })

  it('Next moves on to the following unbuilt family, and back returns to the picker', () => {
    const onBack = vi.fn()
    render(<BlockChurch soundOn onBack={onBack} seed={SEED} />)
    fireEvent.click(tile(FIDEL_FAMILIES[0].id))
    playRound(initRound(SEED + 1).queue, FIDEL_FAMILIES[0].id)
    fireEvent.click(screen.getByTestId('next'))
    expect(root().dataset.mode).toBe('play')
    expect(bricks()).toBe(0)
    act(() => { vi.advanceTimersByTime(500) })
    expect(played[played.length - 1].startsWith(`${FIDEL_FAMILIES[1].id}-`)).toBe(true)
    fireEvent.click(screen.getByTestId('church-back'))
    expect(root().dataset.mode).toBe('pick')
    expect(onBack).not.toHaveBeenCalled()
    expect(tile(FIDEL_FAMILIES[0].id).dataset.built).toBe('1')
    expect(tile(FIDEL_FAMILIES[1].id).dataset.next).toBe('1')
    fireEvent.click(screen.getByTestId('church-back'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('remembers built families next time the game opens', () => {
    localStorage.setItem(CHURCH_KEY, JSON.stringify({ done: { [FIDEL_FAMILIES[0].id]: 3, [FIDEL_FAMILIES[1].id]: 1 } }))
    render(<BlockChurch soundOn onBack={() => {}} seed={SEED} />)
    expect(screen.getByTestId('church-wall').dataset.built).toBe('2')
    expect(tile(FIDEL_FAMILIES[2].id).dataset.next).toBe('1')
    expect(tile(FIDEL_FAMILIES[0].id).dataset.built).toBe('1')
  })

  it('a finished church (every family built) shows the dome and the finished sign', () => {
    const done = Object.fromEntries(FIDEL_FAMILIES.map((f) => [f.id, 3]))
    localStorage.setItem(CHURCH_KEY, JSON.stringify({ done }))
    render(<BlockChurch soundOn onBack={() => {}} seed={SEED} />)
    expect(screen.getByTestId('dome-done')).toBeTruthy()
    expect(document.querySelectorAll('[data-testid="family-tile"][data-next="1"]').length).toBe(0)
    expectGuideOnlyLatin(root(), 'The church is finished!')
  })

  it('can open straight on a family via the family prop', () => {
    render(<BlockChurch soundOn onBack={() => {}} family="le" seed={SEED} />)
    expect(screen.getByTestId('big-glyph').textContent).toBe('ለ')
    expect(document.querySelectorAll('[data-testid="piece"]').length).toBe(7)
  })
})
