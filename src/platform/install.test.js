import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { installState, isStandalone, isIOS, dismissInstall, promptInstall } from './install'

const setUA = (ua) => Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
const setStandalone = (on) => {
  window.matchMedia = (q) => ({ matches: on && q.includes('standalone'), media: q, addEventListener() {}, removeEventListener() {} })
}

beforeEach(() => {
  localStorage.clear()
  setStandalone(false)
  setUA('Mozilla/5.0 (Linux; Android 10)')
})
afterEach(() => vi.restoreAllMocks())

describe('add-to-home-screen state (growth)', () => {
  it('is none on a plain desktop/android with no captured prompt', () => {
    expect(installState()).toBe('none')
  })

  it('is none once installed/standalone', () => {
    setStandalone(true)
    expect(isStandalone()).toBe(true)
    expect(installState()).toBe('none')
  })

  it('surfaces manual iOS steps on iPhone Safari', () => {
    setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit')
    expect(isIOS()).toBe(true)
    expect(installState()).toBe('ios')
  })

  it('never nags again after a dismissal', () => {
    setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')
    expect(installState()).toBe('ios')
    dismissInstall()
    expect(installState()).toBe('none')
  })

  it('shows the native prompt once beforeinstallprompt is captured, and fires it', async () => {
    let choiceResolve
    const evt = new Event('beforeinstallprompt')
    evt.prompt = vi.fn()
    evt.userChoice = new Promise((r) => (choiceResolve = r))
    window.dispatchEvent(evt)
    expect(installState()).toBe('prompt')

    const p = promptInstall()
    expect(evt.prompt).toHaveBeenCalled()
    choiceResolve({ outcome: 'accepted' })
    expect(await p).toBe('accepted')
    // Consumed; no longer offered.
    expect(installState()).toBe('none')
  })
})
