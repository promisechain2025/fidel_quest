import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import PrayerBook from './PrayerBook'
import { splitTitle } from '../platform/prayerBook'
import { loadAppProgress } from '../platform/appProgress'

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

  it('shelf offers ውዳሴ ማርያም ዘሠሉስ as the third book', () => {
    render(<PrayerBook onBack={() => {}} />)
    fireEvent.click(screen.getByTestId('book-picker'))
    fireEvent.click(screen.getByTestId('book-wudase-tuesday'))
    expect(screen.getByTestId('book-picker').textContent).toBe('ውዳሴ ማርያም ዘሠሉስ')
    expect(localStorage.getItem('fq.prayer.book')).toBe('wudase-tuesday')
  })

  it('compact controls: one slim always-visible footer: speed | play | size, no options button', () => {
    const { container } = render(<PrayerBook onBack={() => {}} />)
    expect(container.querySelector('.pb-bottom')).toBeNull()
    expect(screen.queryByTestId('tray-toggle')).toBeNull()
    const row = screen.getByTestId('controls')
    for (const id of ['speed', 'size-up', 'size-down', 'play']) expect(row.querySelector(`[data-testid="${id}"]`)).toBeTruthy()
    const order = [...row.children].map((e) => e.dataset.testid || e.className)
    expect(order).toEqual(['speed', 'play', 'pb-size'])
    fireEvent.pointerDown(container.querySelector('.pb-stage'))
    expect(row.className).toBe('pb-fb')
  })
  it('speed: tortoise/hare steps 0.5–1.25, default 1, remembered', () => {
    const { unmount } = render(<PrayerBook onBack={() => {}} />)
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
    expect(screen.queryByTestId('speed')).toBeNull()
    expect(screen.getByTestId('no-voice')).toBeTruthy()
    expect(container.querySelectorAll('.pb-base .pb-mark').length).toBe(0)
    expect(/[A-Za-z]/.test(container.textContent)).toBe(false)
    fireEvent.click(screen.getByTestId('book-picker'))
    fireEvent.click(screen.getByTestId('book-wudase-tuesday'))
    expect(screen.getByTestId('play')).toBeTruthy()
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
  it('page turn: edge arrows present, back hidden on first page, labels are not English', () => {
    render(<PrayerBook onBack={() => {}} />)
    const back = screen.getByTestId('page-back'), next = screen.getByTestId('page-next')
    expect(back.disabled).toBe(true)
    for (const b of [back, next]) expect(b.getAttribute('aria-label')).not.toMatch(/[A-Za-z]/)
  })

  it('ጸሎት has no refrain cross; ውዳሴ shows one after ቅድስት, outside the word', () => {
    const plain = render(<PrayerBook onBack={() => {}} />)
    expect(plain.container.querySelector('.pb-cross')).toBeNull()
    plain.unmount()
    localStorage.setItem('fq.prayer.book', 'wudase-monday')
    localStorage.setItem('fq.prayer.v1', JSON.stringify({ 'wudase-monday': { page: 0, unit: 18 } }))
    const { container } = render(<PrayerBook onBack={() => {}} />)
    const base = container.querySelector('.pb-base')
    const unit = base.querySelector('[data-unit="18"]')
    expect(unit.textContent).toContain('ቅድስት')
    const cross = unit.parentElement.querySelector('.pb-cross')
    expect(cross).toBeTruthy()
    expect(cross.getAttribute('aria-hidden')).toBe('true')
    expect(cross.closest('[data-unit]')).toBeNull()
    expect(unit.parentElement.classList.contains('pb-keep')).toBe(true)
  })

  it('turning a page reports a ጸሎት page to the app-level tracker (the first page does not)', async () => {
    render(<PrayerBook onBack={() => {}} />)
    expect(loadAppProgress().areas.prayer?.done || 0).toBe(0)
    fireEvent.click(screen.getByTestId('page-next'))
    await waitFor(() => expect(loadAppProgress().areas.prayer?.done).toBe(1), { timeout: 4000 })
  })
})

describe('PrayerBook reading modes highlight a sounding word', () => {
  let failPlay = false
  class FakeAudio {
    constructor() { this.paused = true; this.duration = 1; this.currentTime = 0; this.onended = null; FakeAudio.latest = this }
    set src(v) { this._src = v }
    get src() { return this._src }
    play() { this.paused = false; return failPlay ? Promise.reject(new Error('no audio')) : Promise.resolve() }
    pause() { this.paused = true }
  }
  const flush = () => act(async () => { await Promise.resolve() })
  const base = (container) => container.querySelector('.pb-base')
  const pick = async (id) => {
    if (screen.getByTestId('read-mode').dataset.mode === id) return
    fireEvent.click(screen.getByTestId('read-mode'))
    fireEvent.click(screen.getByTestId(`read-mode-${id}`))
  }
  const expectHighlight = (container, id) => {
    const root = base(container)
    const glow = root.querySelectorAll('.pb-glow').length
    const current = root.querySelectorAll('.pb-current').length
    if (id === 'letter') {
      expect(glow).toBeGreaterThan(0)
      expect(current).toBe(0)
      expect(root.querySelector('[data-unit="0"] .pb-glow')).toBeTruthy()
    } else if (id === 'word') {
      expect(current).toBeGreaterThan(0)
      expect(glow).toBe(0)
      expect(root.querySelector('[data-unit="0"]').classList.contains('pb-current')).toBe(true)
    } else {
      expect(glow).toBe(0)
      expect(current).toBe(0)
    }
  }

  beforeEach(() => { failPlay = false; vi.stubGlobal('Audio', FakeAudio) })
  afterEach(() => { vi.unstubAllGlobals() })

  it.each(['letter', 'word', 'listen'])('a tapped word shows the %s highlight and does not start auto-advance', async (id) => {
    const { container } = render(<PrayerBook onBack={() => {}} />)
    await pick(id)
    fireEvent.click(base(container).querySelector('[data-unit="0"]'))
    await flush()
    expectHighlight(container, id)
    expect(screen.getByTestId('play').getAttribute('aria-label')).toBe('አንብብ')
  })

  it.each(['letter', 'word', 'listen'])('Play shows the %s highlight', async (id) => {
    const { container } = render(<PrayerBook onBack={() => {}} />)
    await pick(id)
    fireEvent.click(screen.getByTestId('play'))
    await flush()
    expectHighlight(container, id)
    expect(screen.getByTestId('play').getAttribute('aria-label')).toBe('አቁም')
  })

  it('a finished tap and a pause both clear the highlight', async () => {
    const { container } = render(<PrayerBook onBack={() => {}} />)
    fireEvent.click(base(container).querySelector('[data-unit="0"]'))
    await flush()
    expect(base(container).querySelector('.pb-glow')).toBeTruthy()
    await act(async () => { FakeAudio.latest.onended() })
    expect(base(container).querySelector('.pb-glow')).toBeNull()
    expect(base(container).querySelector('.pb-current')).toBeNull()

    await pick('word')
    fireEvent.click(screen.getByTestId('play'))
    await flush()
    expect(base(container).querySelector('.pb-current')).toBeTruthy()
    fireEvent.click(screen.getByTestId('play'))
    expect(base(container).querySelector('.pb-current')).toBeNull()
    expect(base(container).querySelector('.pb-glow')).toBeNull()
    expect(screen.getByTestId('play').getAttribute('aria-label')).toBe('አንብብ')
  })

  it('a play error leaves no highlight', async () => {
    failPlay = true
    const { container } = render(<PrayerBook onBack={() => {}} />)
    fireEvent.click(base(container).querySelector('[data-unit="0"]'))
    await flush()
    expect(base(container).querySelector('.pb-glow')).toBeNull()
    expect(base(container).querySelector('.pb-current')).toBeNull()
  })
})

describe('PrayerBook reading modes', () => {
  it('offers three modes and remembers the choice', async () => {
    const { render, screen, fireEvent } = await import('@testing-library/react')
    const { default: PB } = await import('./PrayerBook')
    localStorage.removeItem('fq.prayer.readmode')
    const r = render(<PB onBack={() => {}} pack="ti" />)
    expect(screen.getByTestId('read-mode').dataset.mode).toBe('letter')
    fireEvent.click(screen.getByTestId('read-mode'))
    expect(screen.getByTestId('read-mode-menu').querySelectorAll('button')).toHaveLength(3)
    expect([...screen.getByTestId('read-mode-menu').querySelectorAll('button')].map((b) => b.textContent.replace('ሰላም', ''))).toEqual(['ቅጽሪ', 'ወርድ', 'ንባብ'])
    fireEvent.click(screen.getByTestId('read-mode-word'))
    expect(localStorage.getItem('fq.prayer.readmode')).toBe('word')
    r.unmount()
    render(<PB onBack={() => {}} pack="ti" />)
    expect(screen.getByTestId('read-mode').dataset.mode).toBe('word')
  })
})
