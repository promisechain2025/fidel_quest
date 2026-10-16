import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PrayerBook from './PrayerBook'

beforeEach(() => localStorage.clear())

describe('PrayerBook', () => {
  it('opens on clean text: no marks until asked', () => {
    const { container } = render(<PrayerBook onBack={() => {}} />)
    expect(container.textContent).toContain('አአትብ')
    expect(container.querySelectorAll('.pb-mark').length).toBe(0)
  })

  it('the eye toggle shows every mark on the page, with the legend', () => {
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
})
