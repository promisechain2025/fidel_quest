import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Packages are ON and nothing is owned: only ጸሎት ዘዘወትር and "today" (Monday here) are open.
vi.mock('../platform/packages', () => ({
  prayerBookOpen: (id) => id === 'tselot-zezewetir' || id === 'wudase-monday',
}))
import PrayerBook from './PrayerBook'

// Park a book on its last page (the resume page is clamped to the real last page).
const lastPage = (id) => localStorage.setItem('fq.prayer.v1', JSON.stringify({ ...JSON.parse(localStorage.getItem('fq.prayer.v1') || '{}'), [id]: { page: 999, unit: -1 } }))
const title = () => screen.getByTestId('book-picker').textContent

beforeEach(() => localStorage.clear())

describe('PrayerBook Next continues from one day to the next', () => {
  it('Monday -> Tuesday: locked Tuesday shows the lock and opens the purchase path, never a dead end', () => {
    localStorage.setItem('fq.prayer.book', 'wudase-monday')
    lastPage('wudase-monday')
    const onLocked = vi.fn()
    render(<PrayerBook onBack={() => {}} onLocked={onLocked} />)
    const next = screen.getByTestId('page-next')
    expect(next.disabled).toBe(false)
    expect(next.getAttribute('data-next-book')).toBe('wudase-tuesday')
    expect(next.getAttribute('data-locked')).toBe('true')
    fireEvent.click(next)
    expect(onLocked).toHaveBeenCalledWith('wudase-tuesday')
    expect(title()).toBe('ውዳሴ ማርያም ዘሰኑይ') // still on Monday
  })
})
