import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  alphabetLabel, confirmActivePack, getActivePackId, languageChoicePending,
  needsLanguageChoice, PACKS, savedPackChoice, shareAlphabetLines,
} from './ethiopic'
import { effectiveKey } from './audioEngine'
import { setLang, getLang } from './i18n'
import { addProfile, loadProfiles, switchProfile } from './profiles'
import { wipeProgress } from './progress'
import { redeemUnlockCode } from './webTrial'
import { mintAppCode } from './appCodes'
import { storyLibrary } from './stories'
import { buildJourney } from '../journey'
import { teeGezzName } from '../tees'

const setLangs = (langs) => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(langs)
  vi.spyOn(navigator, 'language', 'get').mockReturnValue(langs[0] || '')
}

afterEach(() => { vi.restoreAllMocks() })

describe('learning language persistence', () => {
  it('keeps a saved Tigrinya pack when the device language list includes Amharic', () => {
    localStorage.setItem('fq.pack', 'ti')
    setLangs(['en-GB', 'am-ET'])
    expect(savedPackChoice()).toBe('ti')
    expect(getActivePackId()).toBe('ti')
    expect(needsLanguageChoice()).toBe(false)
    expect(localStorage.getItem('fq.pack')).toBe('ti')
  })

  it('does not write the soft default just by reading it, so the first-launch sheet can still ask', () => {
    localStorage.removeItem('fq.pack')
    setLangs(['en-US', 'en'])
    expect(getActivePackId()).toBe('ti')
    expect(localStorage.getItem('fq.pack')).toBeNull()
    expect(needsLanguageChoice()).toBe(true)
    expect(languageChoicePending()).toBe(true)
  })

  it('seals the kept Tigrinya default so a later Amharic locale cannot replace it', () => {
    localStorage.removeItem('fq.pack')
    setLangs(['en-US'])
    expect(confirmActivePack()).toBe(true)
    expect(localStorage.getItem('fq.pack')).toBe('ti')
    setLangs(['en-GB', 'am-ET'])
    expect(getActivePackId()).toBe('ti')
    expect(needsLanguageChoice()).toBe(false)
    expect(languageChoicePending()).toBe(false)
  })

  it('adopts a legacy fq.lang of ti as the learn pack and writes fq.pack', () => {
    localStorage.removeItem('fq.pack')
    localStorage.setItem('fq.lang', 'ti')
    setLangs(['am-ET', 'en'])
    expect(getLang()).toBe('en')
    expect(savedPackChoice()).toBe('ti')
    expect(getActivePackId()).toBe('ti')
    expect(needsLanguageChoice()).toBe(false)
    confirmActivePack()
    expect(localStorage.getItem('fq.pack')).toBe('ti')
    setLang('de')
    expect(getLang()).toBe('de')
    expect(getActivePackId()).toBe('ti')
    expect(localStorage.getItem('fq.lang')).toBe('de')
  })

  it('infers Tigrinya from School Path progress and ignores classic Amharic quiz ids', () => {
    localStorage.removeItem('fq.pack')
    localStorage.setItem('fq.journey.v1', JSON.stringify({ version: 1, done: { 'quiz:u01': { stars: 2 }, 'blend:u01': { stars: 1 } } }))
    setLangs(['am-ET'])
    expect(getActivePackId()).toBe('ti')
    confirmActivePack()
    expect(localStorage.getItem('fq.pack')).toBe('ti')

    localStorage.removeItem('fq.pack')
    localStorage.setItem('fq.journey.v1', JSON.stringify({ version: 1, done: { 'learn:ha': { stars: 3 }, 'quiz:1': { stars: 3 } } }))
    setLangs(['am-ET'])
    expect(savedPackChoice()).toBeNull()
    expect(getActivePackId()).toBe('am')
    setLangs(['en-US'])
    expect(getActivePackId()).toBe('ti')
    expect(languageChoicePending()).toBe(false)
  })

  it('leaves the learning pack in place across profiles, progress wipe, and unlock', () => {
    localStorage.setItem('fq.pack', 'ti')
    localStorage.setItem('fq.lang', 'en')
    localStorage.setItem('fq.familypack.v1', JSON.stringify({ unlocked: true, method: 'store' }))
    const first = loadProfiles().active
    const p2 = addProfile('Abel')
    expect(p2).toBeTruthy()
    expect(localStorage.getItem('fq.pack')).toBe('ti')
    expect(switchProfile(first)).toBe(true)
    expect(localStorage.getItem('fq.pack')).toBe('ti')
    expect(switchProfile(p2.id)).toBe(true)
    expect(localStorage.getItem('fq.pack')).toBe('ti')
    wipeProgress()
    expect(localStorage.getItem('fq.pack')).toBe('ti')
    expect(localStorage.getItem('fq.lang')).toBe('en')
    expect(redeemUnlockCode(mintAppCode('ABCD'))).toBe(true)
    expect(localStorage.getItem('fq.pack')).toBe('ti')
  })
})

describe('Tigrinya content does not fall back to Amharic', () => {
  it('names Tigrinya on the share card and share text', () => {
    const lines = shareAlphabetLines('ti')
    expect(alphabetLabel('ti')).toBe('Tigrinya')
    expect(lines.footer).toBe('Learn the Tigrinya alphabet - free & offline')
    expect(lines.share).toContain('Tigrinya')
    expect(lines.share).not.toContain('Amharic')
    expect(lines.nameBare).toContain('Tigrinya')
    expect(lines.nameWithLatin('Selam')).toContain('Tigrinya')
    expect(shareAlphabetLines('am').footer).toContain('Amharic')
  })

  it('keeps Amharic story titles out of the Tigrinya library and builds the school path', () => {
    const ti = storyLibrary([], undefined, 'ti')
    expect(ti.some((s) => s.title.g === 'የኖኅ መርከብ')).toBe(false)
    expect(ti.some((s) => s.shelf === 'bible' || s.pack === 'ti')).toBe(true)
    const am = storyLibrary([], undefined, 'am')
    expect(am.some((s) => s.title.g === 'የኖኅ መርከብ')).toBe(true)
    expect(buildJourney('ti').some((n) => n.id.startsWith('quiz:u') || n.id.startsWith('blend:'))).toBe(true)
    expect(buildJourney('am').some((n) => n.id.startsWith('quiz:u'))).toBe(false)
  })

  it('voices Tigrinya ha as order 1 and sends distinct consonants to letters/ti/', () => {
    expect(PACKS.ti.audioOverride.orderRemap).toBeUndefined()
    expect(effectiveKey('letters/ha-1', PACKS.ti.audioOverride)).toBe('letters/ha-1')
    expect(effectiveKey('letters/hha-1', PACKS.ti.audioOverride)).toBe('letters/ti/hha-1')
    expect(effectiveKey('letters/ha-1', PACKS.am.audioOverride)).toBe('letters/ha-4')
  })

  it('shows the Tigrinya Ge\'ez tee name when that pack is active', () => {
    const design = { name: 'Fidel Explorer', am: 'የፊደል አሳሽ', ti: 'መርማሪ ፊደል' }
    expect(teeGezzName(design, 'ti')).toBe('መርማሪ ፊደል')
    expect(teeGezzName(design, 'am')).toBe('የፊደል አሳሽ')
  })
})
