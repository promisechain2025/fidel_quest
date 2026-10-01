import { describe, it, expect } from 'vitest'
import { privacyUrl, DEFAULT_PRIVACY_URL, qaUnlockEnabled } from './support'

describe('in-app privacy policy link (Apple 5.1.1(i))', () => {
  it('is never empty: falls back to the site privacy page', () => {
    expect(privacyUrl({})).toBe(DEFAULT_PRIVACY_URL)
    expect(privacyUrl({ VITE_PRIVACY_URL: '   ' })).toBe(DEFAULT_PRIVACY_URL)
    expect(DEFAULT_PRIVACY_URL).toMatch(/^https:\/\/.+\/privacy$/)
  })
  it('honours VITE_PRIVACY_URL when set', () => {
    expect(privacyUrl({ VITE_PRIVACY_URL: ' https://example.org/p ' })).toBe('https://example.org/p')
  })
})

describe('QA "Open everything" button', () => {
  it('is hidden in production builds', () => {
    expect(qaUnlockEnabled({ DEV: false, PROD: true })).toBe(false)
    expect(qaUnlockEnabled({})).toBe(false)
  })
  it('shows in dev, or when a QA build opts in', () => {
    expect(qaUnlockEnabled({ DEV: true })).toBe(true)
    expect(qaUnlockEnabled({ DEV: false, VITE_QA_UNLOCK: 'true' })).toBe(true)
  })
})
