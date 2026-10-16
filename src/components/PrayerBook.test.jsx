import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PrayerBook from './PrayerBook'

beforeEach(() => localStorage.clear())

describe('PrayerBook', () => {
  it('shelf switches to ውዳሴ ማርያም ዘሰኑይ and remembers it', () => {
    const { container, unmount } = render(<PrayerBook onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('book-picker'))
    fireEvent.click(screen.getByTestId('book-wudase-monday'))
    expect(screen.getByTestId('book-picker').textContent).toBe('ውዳሴ ማርያም ዘሰኑይ')
    expect(container.querySelectorAll('.pb-base .pb-mark').length).toBe(0)
    expect(localStorage.getItem('fq.prayer.book')).toBe('wudase-monday')
    unmount()
    render(<PrayerBook onBack={() => {}} />)
    expect(screen.getByTestId('book-picker').textContent).toBe('ውዳሴ ማርያም ዘሰኑይ')
  })

  it('shelf offers ውዳሴ ማርያም ዘሰሉስ as the third book', () => {
    render(<PrayerBook onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('book-picker'))
    fireEvent.click(screen.getByTestId('book-wudase-tuesday'))
    expect(screen.getByTestId('book-picker').textContent).toBe('ውዳሴ ማርያም ዘሰሉስ')
    expect(localStorage.getItem('fq.prayer.book')).toBe('wudase-tuesday')
  })

  it('opens on clean text: no marks until asked', () => {
    const { container } = render(<PrayerBook onBack={() => {}} />)
    expect(container.textContent).toContain('አአትብ')
    expect(container.querySelectorAll('.pb-mark').length).toBe(0)
  })

  it('legend uses Tigrinya names when the learn pack is ትግርኛ', () => {
    localStorage.setItem('fq.pack', 'ti')
    render(<PrayerBook onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('marks-toggle'))
    const t = screen.getByTestId('legend').textContent
    expect(t).toContain('ተለዓሊ')
    expect(t).toContain('ተዋሓጢ')
    expect(t).not.toContain('ተነሽ')
    expect(t).toContain('ሰያፍ')
  })

  it('legend uses Amharic names when the learn pack is አማርኛ', () => {
    localStorage.setItem('fq.pack', 'am')
    render(<PrayerBook onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('marks-toggle'))
    const t = screen.getByTestId('legend').textContent
    expect(t).toContain('ተነሽ')
    expect(t).toContain('ተጣይ')
  })

  it('the eye toggle shows every mark on the page, with the legend', () => {
    localStorage.setItem('fq.pack', 'am')
    const { container } = render(<PrayerBook onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('marks-toggle'))
    const units = container.querySelectorAll('.pb-base [data-unit]')
    expect(container.querySelectorAll('.pb-base .pb-mark').length).toBe(units.length)
    expect(screen.getByTestId('legend').textContent).toContain('ተነሽ')
    // አአትብ: ሰያፍ above ት (letter index 2)
    const first = container.querySelector('.pb-base [data-unit="0"]')
    const marked = first.querySelector('.pb-mark').parentElement
    expect(marked.textContent.charAt(0)).toBe('ት')
    expect(first.querySelector('[data-mark="seyaf"]')).toBeTruthy()
  })

  it('joined words get the tie only when marks show', () => {
    const { container } = render(<PrayerBook onBack={() => {}} />)
    expect(container.querySelectorAll('.pb-tie').length).toBe(0)
    fireEvent.click(screen.getByTestId('marks-toggle'))
    expect(container.querySelectorAll('.pb-tie').length).toBeGreaterThan(0)
  })

  it('shows the page number in Ge\u2019ez numerals and no Latin in the chrome', () => {
    const { container } = render(<PrayerBook onBack={() => {}} />)
    expect(container.querySelector('.pb-base .pb-folio').textContent).toBe('፩')
    expect(/[A-Za-z]/.test(container.textContent)).toBe(false)
  })

  it('resumes on the saved page', () => {
    localStorage.setItem('fq.prayer.v1', JSON.stringify({ 'tselot-zezewetir': { page: 2, unit: -1 } }))
    const { container } = render(<PrayerBook onBack={() => {}} />)
    expect(container.querySelector('.pb-base .pb-folio').textContent).toBe('፫')
  })
  it('default size is auto-fit (nothing stored) and the buttons override it', () => {
    const { container } = render(<PrayerBook onBack={() => {}} />)
    expect(container.querySelector('.pb-root').dataset.fit).toBe('auto')
    expect(localStorage.getItem('fq.prayer.size')).toBeNull()
    fireEvent.click(screen.getByTestId('size-down'))
    expect(container.querySelector('.pb-root').dataset.fit).toBe('user')
    expect(container.querySelector('.pb-root').style.getPropertyValue('--pb-scale')).toBe('0.9')
  })
  it('font size steps are remembered on this device and scale the text', () => {
    const { container, unmount } = render(<PrayerBook onBack={() => {}} />)
    const root = container.querySelector('.pb-root')
    expect(root.style.getPropertyValue('--pb-scale')).toBe('1')
    fireEvent.click(screen.getByTestId('size-up'))
    fireEvent.click(screen.getByTestId('size-up'))
    expect(localStorage.getItem('fq.prayer.size')).toBe('4')
    expect(screen.getByTestId('size-up').disabled).toBe(true)
    unmount()
    const again = render(<PrayerBook onBack={() => {}} />)
    expect(again.container.querySelector('.pb-root').style.getPropertyValue('--pb-scale')).toBe('1.32')
  })
})
