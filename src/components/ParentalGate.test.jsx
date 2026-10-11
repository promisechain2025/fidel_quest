import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ParentalGate from './ParentalGate'
import { BASE_LOCK_MS } from '../platform/gateCore'
import { wordsToNumber, numberWords } from '../platform/numberWords'

const holdOpen = () => {
  fireEvent.pointerDown(screen.getByText('Hold me'))
  act(() => { vi.advanceTimersByTime(2100) })
}
const words = () => screen.getByTestId('gate-words').textContent
// Read the spelled-out number back to digits, the way a grown-up would.
const shown = () => wordsToNumber(words())
const wrong = () => (shown() === 99 ? 11 : shown() + 1)
const type = (n) => {
  for (const d of String(n)) fireEvent.click(screen.getByRole('button', { name: d }))
  fireEvent.click(screen.getByRole('button', { name: 'OK' }))
}

beforeEach(() => {
  vi.useFakeTimers()
  for (const k of ['fq.gate.v1', 'fq.gate.words', 'fq.pack', 'fq.lang']) localStorage.removeItem(k)
})
afterEach(() => vi.useRealTimers())

describe('ParentalGate', () => {
  it('shows friendly feedback while holding and resets if let go early', () => {
    render(<ParentalGate onOpen={vi.fn()} />)
    expect(screen.getByText('Press and hold for two seconds')).toBeTruthy()
    fireEvent.pointerDown(screen.getByText('Hold me'))
    act(() => { vi.advanceTimersByTime(800) })
    expect(screen.getByText('Keep holding…')).toBeTruthy()
    fireEvent.pointerUp(screen.getByText('Hold me'))
    expect(screen.getByText('Press and hold for two seconds')).toBeTruthy()
    expect(screen.queryByText('Type this number:')).toBeNull()
  })

  it('opens when the number shown in words is typed, and never shows its digits', () => {
    const onOpen = vi.fn()
    const { container } = render(<ParentalGate onOpen={onOpen} />)
    holdOpen()
    expect(screen.getByText('Type this number:')).toBeTruthy()
    expect(words()).not.toMatch(/\d/)
    // no text on screen (outside the single-digit keypad keys) holds the digits
    const texts = [...container.querySelectorAll('p, output, span, div')].filter((el) => !el.closest('button')).map((el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(''))
    expect(texts.some((tx) => tx.includes(String(shown())))).toBe(false)
    type(shown())
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('"Different number" swaps the number without counting as a miss', () => {
    const onOpen = vi.fn()
    render(<ParentalGate onOpen={onOpen} />)
    holdOpen()
    for (let i = 0; i < 10; i++) {
      const before = words()
      fireEvent.click(screen.getByRole('button', { name: 'Different number' }))
      expect(words()).not.toBe(before)
    }
    expect(screen.queryByText(/Not quite/)).toBeNull()
    expect(JSON.parse(localStorage.getItem('fq.gate.v1') || '{}').misses || 0).toBe(0)
    type(shown())
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('a wrong answer swaps in a new number; three lock the gate, even after reopening', () => {
    const onOpen = vi.fn()
    const { unmount } = render(<ParentalGate onOpen={onOpen} />)
    holdOpen()
    type(wrong())
    expect(screen.getByText(/Not quite/)).toBeTruthy()
    type(wrong())
    expect(screen.queryByText('Too many tries.')).toBeNull() // two misses are still allowed
    type(wrong())
    expect(screen.getByText('Too many tries.')).toBeTruthy()
    expect(screen.queryByText('Hold me')).toBeNull()
    unmount()
    render(<ParentalGate onOpen={onOpen} />) // closing and reopening does not reset it
    expect(screen.getByText('Too many tries.')).toBeTruthy()
    act(() => { vi.advanceTimersByTime(BASE_LOCK_MS + 600) })
    expect(screen.getByText('Hold me')).toBeTruthy()
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('shows the words in the learn language by default (Tigrinya pack)', () => {
    localStorage.setItem('fq.pack', 'ti')
    render(<ParentalGate onOpen={vi.fn()} />)
    holdOpen()
    expect(words()).toBe(numberWords(shown(), 'ti'))
    expect(words()).toMatch(/[\u1200-\u137F]/)
    expect(screen.getByRole('button', { name: 'ትግርኛ' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('shows Amharic words for the Amharic pack', () => {
    localStorage.setItem('fq.pack', 'am')
    render(<ParentalGate onOpen={vi.fn()} />)
    holdOpen()
    expect(words()).toBe(numberWords(shown(), 'am'))
    expect(screen.getByRole('button', { name: 'አማርኛ' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'ትግርኛ' })).toBeNull()
  })

  it('the language toggle keeps the number, is not a miss, and is remembered', () => {
    localStorage.setItem('fq.pack', 'ti')
    const onOpen = vi.fn()
    const { unmount } = render(<ParentalGate onOpen={onOpen} />)
    holdOpen()
    const n = shown()
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'English' }))
      expect(words()).toBe(numberWords(n, 'en'))
      fireEvent.click(screen.getByRole('button', { name: 'ትግርኛ' }))
      expect(words()).toBe(numberWords(n, 'ti'))
    }
    fireEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(screen.queryByText(/Not quite/)).toBeNull()
    expect(JSON.parse(localStorage.getItem('fq.gate.v1') || '{}').misses || 0).toBe(0)
    unmount()
    render(<ParentalGate onOpen={onOpen} />)
    holdOpen()
    expect(words()).toBe(numberWords(shown(), 'en')) // English remembered
    expect(screen.getByRole('button', { name: 'English' }).getAttribute('aria-pressed')).toBe('true')
    type(shown())
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
