import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
const rd = (rel) => readFileSync(resolve(process.cwd(), 'src', rel), 'utf8')
import CoreLockSheet from './CoreLockSheet'
import PackageOffer from './PackageOffer'
import { PKG_NAMES } from './RepCodeCard'

const ETHIOPIC = /[\u1200-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/

describe('lock sheet (English, no price)', () => {
  it('prayer sheet asks for a grown-up and passes the package', () => {
    const onGrownUps = vi.fn()
    const { container } = render(<CoreLockSheet pkg="prayer" onClose={() => {}} onGrownUps={onGrownUps} />)
    expect(screen.getByText('This part is locked')).toBeTruthy()
    expect(screen.getByText('Ask a grown-up to unlock the Prayer Book')).toBeTruthy()
    expect(container.textContent).not.toMatch(ETHIOPIC)
    expect(container.textContent).not.toMatch(/\$|\d+\.\d\d/)
    fireEvent.click(screen.getByTestId('core-lock-grownups'))
    expect(onGrownUps).toHaveBeenCalledWith('prayer')
  })
  it('core sheet defaults to the full course', () => {
    render(<CoreLockSheet onClose={() => {}} onGrownUps={() => {}} />)
    expect(screen.getByText('Ask a grown-up to unlock the full course')).toBeTruthy()
    expect(screen.getByTestId('core-lock').dataset.pkg).toBe('core')
  })
})

describe('purchase panel', () => {
  beforeEach(() => { localStorage.clear() })
  it('uses English product names and highlights the asked-for package', () => {
    Element.prototype.scrollIntoView = vi.fn()
    const { container } = render(<PackageOffer enabled store priceOf={() => Promise.resolve('')} highlight="prayer" />)
    expect(PKG_NAMES).toEqual({ core: 'Full course', prayer: 'Prayer Book', bundle: 'Full course + Prayer Book' })
    expect(screen.getByTestId('buy-prayer').dataset.highlighted).toBe('true')
    expect(screen.getByTestId('buy-core').dataset.highlighted).toBeUndefined()
    expect(container.textContent).not.toMatch(ETHIOPIC)
  })
})

describe('UI chrome source has no Amharic/Tigrinya strings', () => {
  for (const f of ['PackageOffer.jsx', 'RepCodeCard.jsx', 'RepRegion.jsx', 'CoreLockSheet.jsx']) {
    it(f, () => {
      const src = rd(`components/${f}`).replace(/\/\*[\s\S]*?\*\//g, '')
      expect(src).not.toMatch(ETHIOPIC)
    })
  }
})

describe('locked entry points are wired to a sheet', () => {
  const app = rd('FidelQuestApp.jsx')
  const pb = rd('components/PrayerBook.jsx')
  it('locked prayer tap opens the prayer sheet, not a dead tap', () => {
    expect(pb).toMatch(/if \(!prayerBookOpen\(b\.id\)\) \{ setShelf\(false\); onLocked\?\.\(b\.id\); return \}/)
    expect(app).toMatch(/<PrayerBook[^>]*onLocked=\{\(\) => setCoreLockOpen\('prayer'\)\}/)
  })
  it('sheet goes to Grown-ups with the package highlighted', () => {
    expect(app).toMatch(/setScreen\(\{ name: 'grownups', highlight: pkg \}\)/)
    expect(app).toMatch(/highlight=\{screen\.highlight\}/)
  })
  it('core-gated Backpack tiles carry a lock badge', () => {
    for (const n of ['workshop', 'train', 'echo', 'traffic', 'market', 'bingo', 'stories', 'twins', 'beats']) {
      expect(app).toContain(`locked={!coreScreenOpen({ name: '${n}' })}`)
    }
  })
})
