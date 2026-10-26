import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PrayerBook from './PrayerBook'

const lastPage = (id) => localStorage.setItem('fq.prayer.v1', JSON.stringify({ ...JSON.parse(localStorage.getItem('fq.prayer.v1') || '{}'), [id]: { page: 999, unit: -1 } }))
const title = () => screen.getByTestId('book-picker').textContent

beforeEach(() => localStorage.clear())

describe('PrayerBook Next continues from one day to the next (all days open)', () => {
  it('Monday -> Tuesday on the last page of Monday, starting Tuesday at its first page', () => {
    localStorage.setItem('fq.prayer.book', 'wudase-monday')
    lastPage('wudase-monday')
    lastPage('wudase-tuesday') // a stale resume on Tuesday must not win
    render(<PrayerBook onBack={() => {}} />)
    expect(title()).toBe('ውዳሴ ማርያም ዘሰኑይ')
    const next = screen.getByTestId('page-next')
    expect(next.disabled).toBe(false)
    expect(next.getAttribute('data-locked')).toBeNull()
    fireEvent.click(next)
    expect(title()).toBe('ውዳሴ ማርያም ዘሰሉስ')
    expect(localStorage.getItem('fq.prayer.book')).toBe('wudase-tuesday')
    expect(screen.getByTestId('page-back').disabled).toBe(true) // first page of Tuesday
  })

  it('walks Monday -> Tuesday -> ... -> Sunday, and Sunday (the last day) ends with no Next', () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    localStorage.setItem('fq.prayer.book', 'wudase-monday')
    days.forEach((d) => lastPage(`wudase-${d}`))
    let view = render(<PrayerBook onBack={() => {}} />)
    for (let i = 0; i < days.length - 1; i++) {
      expect(screen.getByTestId('page-next').getAttribute('data-next-book')).toBe(`wudase-${days[i + 1]}`)
      fireEvent.click(screen.getByTestId('page-next'))
      expect(localStorage.getItem('fq.prayer.book')).toBe(`wudase-${days[i + 1]}`)
      expect(title()).toContain(['ሰሉስ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቀዳሚት', 'እሁድ'][i])
      // reopen on the new day's last page (the real reader gets there by turning pages)
      view.unmount(); lastPage(`wudase-${days[i + 1]}`); view = render(<PrayerBook onBack={() => {}} />)
    }
    expect(screen.getByTestId('page-next').disabled).toBe(true)
  })

  it('Sunday last page: Next is disabled (the week ends there)', () => {
    localStorage.setItem('fq.prayer.book', 'wudase-sunday')
    lastPage('wudase-sunday')
    render(<PrayerBook onBack={() => {}} />)
    expect(screen.getByTestId('page-next').disabled).toBe(true)
  })

  it('ጸሎት ዘዘወትር last page continues to ሰኑይ', () => {
    lastPage('tselot-zezewetir')
    render(<PrayerBook onBack={() => {}} />)
    expect(screen.getByTestId('page-next').getAttribute('data-next-book')).toBe('wudase-monday')
    fireEvent.click(screen.getByTestId('page-next'))
    expect(title()).toBe('ውዳሴ ማርያም ዘሰኑይ')
  })
})
