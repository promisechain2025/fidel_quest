import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import ParentalGate from './ParentalGate'
import { BASE_LOCK_MS } from '../platform/gateCore'

const holdOpen = () => {
  fireEvent.pointerDown(screen.getByText('Hold me'))
  act(() => { vi.advanceTimersByTime(2100) })
}
const question = () => {
  const m = /What is (\d+) ([×+]) (\d+)\?/.exec(screen.getByText(/What is/).textContent)
  const [a, op, b] = [Number(m[1]), m[2], Number(m[3])]
  return op === '×' ? a * b : a + b
}
const type = (n) => {
  for (const d of String(n)) fireEvent.click(screen.getByRole('button', { name: d }))
  fireEvent.click(screen.getByRole('button', { name: 'OK' }))
}

beforeEach(() => { vi.useFakeTimers(); localStorage.removeItem('fq.gate.v1') })
afterEach(() => vi.useRealTimers())

describe('ParentalGate', () => {
  it('opens on the right arithmetic answer', () => {
    const onOpen = vi.fn()
    render(<ParentalGate onOpen={onOpen} />)
    holdOpen()
    type(question())
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('a wrong answer swaps in a new question; two lock the gate, even after reopening', () => {
    const onOpen = vi.fn()
    const { unmount } = render(<ParentalGate onOpen={onOpen} />)
    holdOpen()
    type(question() + 1)
    expect(screen.getByText(/Not quite/)).toBeTruthy()
    type(question() + 1)
    expect(screen.getByText('Too many tries.')).toBeTruthy()
    expect(screen.queryByText('Hold me')).toBeNull()
    unmount()
    render(<ParentalGate onOpen={onOpen} />) // closing and reopening does not reset it
    expect(screen.getByText('Too many tries.')).toBeTruthy()
    act(() => { vi.advanceTimersByTime(BASE_LOCK_MS + 600) })
    expect(screen.getByText('Hold me')).toBeTruthy()
    expect(onOpen).not.toHaveBeenCalled()
  })
})
