import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PrayerBook from './PrayerBook'
import { splitTitle } from '../platform/prayerBook'

beforeEach(() => localStorage.clear())

describe('PrayerBook', () => {
  it('header title: one centered line, the day for ውዳሴ, the whole title for ጸሎት ዘዘወትር', () => {
    expect(splitTitle('ውዳሴ ማርያም ዘሰኑይ')).toEqual(['ውዳሴ ማርያም', 'ዘሰኑይ'])
    expect(splitTitle('ጸሎት ዘዘወትር')).toEqual([null, 'ጸሎት ዘዘወትር'])
    const { container } = render(<PrayerBook onBack={() => {}} />)
    expect(container.querySelector('.pb-sr')).toBeNull()
    expect(container.querySelector('.pb-title-main').textContent).toBe('ጸሎት ዘዘወትር')
    fireEvent.click(screen.getByTestId('book-picker'))
    fireEvent.click(screen.getByTestId('book-wudase-friday'))
    expect(container.querySelector('.pb-sr').textContent.trim()).toBe('ውዳሴ ማርያም')
    expect(container.querySelector('.pb-title-main').textContent).toBe('ዘዓርብ')
    expect(screen.getByTestId('book-picker').getAttribute('aria-label')).toBe('ውዳሴ ማርያም ዘዓርብ')
  })

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

  it('compact controls: floating play, speed/size hidden until the options button, fades while the page is touched', () => {
    const { container } = render(<PrayerBook onBack={() => {}} />)
    expect(container.querySelector('.pb-bottom')).toBeNull()
    expect(screen.getByTestId('play')).toBeTruthy()
    expect(screen.queryByTestId('speed')).toBeNull()
    fireEvent.click(screen.getByTestId('tray-toggle'))
    expect(screen.getByTestId('speed')).toBeTruthy()
    expect(screen.getByTestId('size-up')).toBeTruthy()
    fireEvent.click(screen.getByTestId('tray-toggle'))
    fireEvent.pointerDown(container.querySelector('.pb-stage'))
    expect(container.querySelector('.pb-fb').classList.contains('pb-busy')).toBe(true)
    fireEvent.pointerUp(container.querySelector('.pb-stage'))
    expect(container.querySelector('.pb-fb').classList.contains('pb-busy')).toBe(false)
  })
  it('speed: tortoise/hare steps 0.5–1.25, default 1, remembered', () => {
    const { unmount } = render(<PrayerBook onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('tray-toggle'))
    const g = () => screen.getByTestId('speed').dataset.rate
    expect(g()).toBe('1')
    fireEvent.click(screen.getByTestId('speed-up'))
    expect(g()).toBe('1.25')
    expect(screen.getByTestId('speed-up').disabled).toBe(true)
    fireEvent.click(screen.getByTestId('speed-up'))
    expect(g()).toBe('1.25')
    for (let k = 0; k < 5; k++) fireEvent.click(screen.getByTestId('speed-down'))
    expect(g()).toBe('0.5')
    expect(screen.getByTestId('speed-down').disabled).toBe(true)
    fireEvent.click(screen.getByTestId('speed-up'))
    expect(localStorage.getItem('fq.prayer.speed')).toBe('1')
    unmount()
    render(<PrayerBook onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('tray-toggle'))
    expect(g()).toBe('0.75')
    expect(screen.getByTestId('speed').textContent).not.toMatch(/[A-Za-z]/)
  })

  it('marks hidden by default; eye choice remembered; legend opens by button and closes on tap', () => {
    const { container, unmount } = render(<PrayerBook onBack={() => {}} />)
    expect(container.querySelectorAll('.pb-base .pb-mark').length).toBe(0)
    expect(screen.queryByTestId('legend-toggle')).toBeNull()
    fireEvent.click(screen.getByTestId('marks-toggle'))
    expect(screen.queryByTestId('legend')).toBeNull()
    expect(localStorage.getItem('fq.prayer.marks')).toBe('1')
    fireEvent.click(screen.getByTestId('legend-toggle'))
    const lg = screen.getByTestId('legend')
    expect(lg.closest('.pb-stage')).toBeNull()
    expect(/[A-Za-z]/.test(lg.textContent)).toBe(false)
    fireEvent.click(lg)
    expect(screen.queryByTestId('legend')).toBeNull()
    unmount()
    const r2 = render(<PrayerBook onBack={() => {}} />)
    expect(r2.container.querySelectorAll('.pb-base .pb-mark').length).toBeGreaterThan(0)
    expect(screen.queryByTestId('legend')).toBeNull()
    fireEvent.click(screen.getByTestId('legend-toggle'))
    fireEvent.click(screen.getByTestId('marks-toggle'))
    expect(screen.queryByTestId('legend')).toBeNull()
    expect(localStorage.getItem('fq.prayer.marks')).toBe('0')
  })

  it('a day without a recording shows no play or speed controls, and marks stay hidden', () => {
    const { container } = render(<PrayerBook onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('book-picker'))
    for (const d of ['wednesday', 'thursday', 'friday', 'saturday', 'sunday']) expect(screen.getByTestId(`book-wudase-${d}`)).toBeTruthy()
    // ረቡዕ–ቀዳሚት are voiced now; እሁድ is the one day still without a recording
    fireEvent.click(screen.getByTestId('book-wudase-sunday'))
    expect(screen.getByTestId('book-picker').textContent).toBe('ውዳሴ ማርያም ዘእሁድ')
    expect(screen.queryByTestId('play')).toBeNull()
    fireEvent.click(screen.getByTestId('tray-toggle'))
    expect(screen.queryByTestId('speed')).toBeNull()
    expect(screen.getByTestId('no-voice')).toBeTruthy()
    expect(container.querySelectorAll('.pb-base .pb-mark').length).toBe(0)
    expect(/[A-Za-z]/.test(container.textContent)).toBe(false)
    fireEvent.click(screen.getByTestId('book-picker'))
    fireEvent.click(screen.getByTestId('book-wudase-tuesday'))
    expect(screen.getByTestId('play')).toBeTruthy()
    fireEvent.click(screen.getByTestId('tray-toggle'))
    expect(screen.getByTestId('speed')).toBeTruthy()
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
    fireEvent.click(screen.getByTestId('legend-toggle'))
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
    fireEvent.click(screen.getByTestId('legend-toggle'))
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
    fireEvent.click(screen.getByTestId('legend-toggle'))
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
    fireEvent.click(screen.getByTestId('tray-toggle'))
    fireEvent.click(screen.getByTestId('size-down'))
    expect(container.querySelector('.pb-root').dataset.fit).toBe('user')
    expect(container.querySelector('.pb-root').style.getPropertyValue('--pb-scale')).toBe('0.9')
  })
  it('font size steps are remembered on this device and scale the text', () => {
    const { container, unmount } = render(<PrayerBook onBack={() => {}} />)
    const root = container.querySelector('.pb-root')
    expect(root.style.getPropertyValue('--pb-scale')).toBe('1')
    fireEvent.click(screen.getByTestId('tray-toggle'))
    fireEvent.click(screen.getByTestId('size-up'))
    fireEvent.click(screen.getByTestId('size-up'))
    expect(localStorage.getItem('fq.prayer.size')).toBe('4')
    expect(screen.getByTestId('size-up').disabled).toBe(true)
    unmount()
    const again = render(<PrayerBook onBack={() => {}} />)
    expect(again.container.querySelector('.pb-root').style.getPropertyValue('--pb-scale')).toBe('1.32')
  })
})
