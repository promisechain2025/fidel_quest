import { describe, it, expect, afterEach, vi } from 'vitest'
import { detectPreferredPack, localePack, needsLanguageChoice } from './ethiopic'

const setLangs = (langs) => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(langs)
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(langs[0] || '')
}
afterEach(() => { vi.restoreAllMocks(); localStorage.setItem('fq.pack', 'am') })

describe('first-visit language pack', () => {
  it('defaults to Amharic on a device that is neither Amharic nor Tigrinya', () => {
    setLangs(['en-US', 'en'])
    expect(localePack()).toBe(null)
    expect(detectPreferredPack()).toBe('am')
  })
  it('follows an Amharic or Tigrinya device language', () => {
    setLangs(['ti-ER'])
    expect(detectPreferredPack()).toBe('ti')
    setLangs(['en-GB', 'am-ET'])
    expect(detectPreferredPack()).toBe('am')
  })
  it('asks once only when nothing is stored and the locale did not decide', () => {
    localStorage.removeItem('fq.pack') // test setup pins 'am'
    setLangs(['en-US'])
    expect(needsLanguageChoice()).toBe(true)
    localStorage.setItem('fq.pack', 'ti')
    expect(needsLanguageChoice()).toBe(false)
    localStorage.removeItem('fq.pack')
    setLangs(['am-ET'])
    expect(needsLanguageChoice()).toBe(false)
  })
})
