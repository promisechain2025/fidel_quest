import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import AddToHomeScreen from './AddToHomeScreen'
import RepCodeCard from './RepCodeCard'
import { deviceOs, installStepAvailable } from '../platform/installPrompt'

const ETHIOPIC = /[\u1200-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/

describe('deviceOs', () => {
  it('detects iPhone, iPadOS and Android', () => {
    expect(deviceOs('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios')
    expect(deviceOs('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', { maxTouchPoints: 5 })).toBe('ios')
    expect(deviceOs('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120')).toBe('android')
    expect(deviceOs('Mozilla/5.0 (Windows NT 10.0)')).toBe('other')
  })
  it('is never available in the native apps', () => {
    expect(installStepAvailable(true)).toBe(false)
  })
  it('is hidden when running standalone', () => {
    const mm = window.matchMedia
    window.matchMedia = (q) => ({ matches: q === '(display-mode: standalone)', addListener() {}, removeListener() {} })
    expect(installStepAvailable(false)).toBe(false)
    window.matchMedia = mm
  })
})

describe('AddToHomeScreen', () => {
  it('shows iPhone steps first on iOS, English only', () => {
    const { container } = render(<AddToHomeScreen os="ios" available />)
    expect(screen.getByText('Add eGeez to your home screen')).toBeTruthy()
    const ios = screen.getByTestId('a2hs-ios')
    const and = screen.getByTestId('a2hs-android')
    expect(ios.compareDocumentPosition(and) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container.textContent).toMatch(/Add to Home Screen/)
    expect(screen.queryByTestId('a2hs-install')).toBeNull()
    expect(container.textContent).not.toMatch(ETHIOPIC)
  })
  it('shows Android steps first and the install button when the prompt fired', async () => {
    const e = new Event('beforeinstallprompt')
    e.prompt = vi.fn(() => Promise.resolve())
    e.userChoice = Promise.resolve({ outcome: 'accepted' })
    window.dispatchEvent(e)
    render(<AddToHomeScreen os="android" available />)
    const and = screen.getByTestId('a2hs-android')
    expect(and.compareDocumentPosition(screen.getByTestId('a2hs-ios')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(screen.getByTestId('a2hs-install'))
    await waitFor(() => expect(screen.getByTestId('a2hs-done')).toBeTruthy())
    expect(e.prompt).toHaveBeenCalled()
  })
  it('renders nothing when unavailable', () => {
    const { container } = render(<AddToHomeScreen os="android" available={false} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('RepCodeCard redeem success', () => {
  beforeEach(() => localStorage.clear())
  it('shows the home-screen step after a code unlocks', async () => {
    const redeem = vi.fn(() => Promise.resolve({ ok: true, pkg: 'core' }))
    render(<RepCodeCard available redeem={redeem} installProps={{ os: 'ios', available: true }} />)
    expect(screen.queryByTestId('a2hs')).toBeNull()
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'EGR-C1-AAAA-BBBB' } })
    fireEvent.click(screen.getByTestId('rep-code-submit'))
    await waitFor(() => expect(screen.getByTestId('a2hs')).toBeTruthy())
    expect(screen.getByTestId('rep-unlocked')).toBeTruthy()
  })
})

describe('representatives page + manifest', () => {
  it('reps page has English home-screen instructions', () => {
    const html = readFileSync(resolve(process.cwd(), 'public/representatives.html'), 'utf8')
    expect(html).toMatch(/id="how"/)
    expect(html).toMatch(/easygeez\.com\/app/)
    expect(html).toMatch(/Add to Home Screen/)
    expect(html).toMatch(/Add to Home screen/)
    const how = html.slice(html.indexOf('<section id="how">'), html.indexOf('</section>'))
    expect(how).not.toMatch(ETHIOPIC)
  })
  it('PWA manifest is installable', () => {
    const cfg = readFileSync(resolve(process.cwd(), 'vite.config.js'), 'utf8')
    expect(cfg).toMatch(/short_name: 'eGeez'/)
    expect(cfg).toMatch(/display: 'standalone'/)
    expect(cfg).toMatch(/start_url: BASE/)
    expect(cfg).toMatch(/icon-512\.png/)
  })
})
