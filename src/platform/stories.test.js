import { describe, it, expect } from 'vitest'
import { STORIES, storyWords, storyUnlocked, storyStage, storyMissingFamilies, storyLibrary, bandUnlockIndex } from './stories'
import { FIDEL_FAMILIES } from './ethiopic'

const familyIds = FIDEL_FAMILIES.map((f) => f.id)
const learnedUpTo = (stage) => familyIds.slice(0, stage + 1)

describe('story engine', () => {
  it('tokenizes around Ethiopic punctuation and Latin marks', () => {
    expect(storyWords('ሰላም ሳራ።')).toEqual(['ሰላም', 'ሳራ'])
    expect(storyWords('ሎሚ! ማር፣ ውሃ?')).toEqual(['ሎሚ', 'ማር', 'ውሃ'])
    expect(storyWords('"ልጆች ይምጡ" አለ።')).toEqual(['ልጆች', 'ይምጡ', 'አለ']) // quotes stripped
    expect(storyWords('')).toEqual([])
  })

  it('a story unlocks exactly at its band gate, not one family sooner', () => {
    for (const s of STORIES) {
      const stage = storyStage(s)
      expect(Number.isFinite(stage), `${s.id} stage is a real index`).toBe(true)
      expect(storyUnlocked(s, learnedUpTo(stage)), `${s.id} at its own gate`).toBe(true)
      if (stage > 0) expect(storyUnlocked(s, learnedUpTo(stage - 1)), `${s.id} one family early`).toBe(false)
    }
  })

  it('bands map to chapter gates (1->7, 2->15, 3->23, 4->last)', () => {
    expect(bandUnlockIndex(1)).toBe(7)
    expect(bandUnlockIndex(2)).toBe(15)
    expect(bandUnlockIndex(3)).toBe(23)
    expect(bandUnlockIndex(4)).toBe(FIDEL_FAMILIES.length - 1)
  })

  it('missing families are reported in journey order and empty when unlocked', () => {
    const s = STORIES.find((x) => x.id === 'good-shepherd') // band 2
    const missing = storyMissingFamilies(s, ['ha', 'le', 'hha', 'me'])
    expect(missing.length).toBeGreaterThan(0)
    const idx = missing.map((id) => familyIds.indexOf(id))
    expect([...idx].sort((a, b) => a - b)).toEqual(idx)
    expect(storyMissingFamilies(s, learnedUpTo(storyStage(s)))).toEqual([])
  })

  it('the library sorts unlocked-first by stage and tags missing letters', () => {
    // After chapter 1 (through she, index 7) the band-1 stories are open.
    const lib = storyLibrary(familyIds.slice(0, 8))
    expect(lib[0].unlocked).toBe(true)
    expect(lib[0].stage).toBe(7) // a band-1 story
    const lockedIdx = lib.findIndex((s) => !s.unlocked)
    expect(lockedIdx).toBeGreaterThan(0)
    expect(lib[lockedIdx].missing.length).toBeGreaterThan(0)
  })
})

describe('starter library content contract', () => {
  it('has at least 10 stories with a real band ramp', () => {
    expect(STORIES.length).toBeGreaterThanOrEqual(10)
    const bands = STORIES.map((s) => s.band).sort((a, b) => a - b)
    expect(bands[0]).toBe(1) // at least one opens after chapter 1
    expect(bands[bands.length - 1]).toBe(4) // and one stretches to the last chapter
  })

  it('band-1 stories exist so the first story node is never empty', () => {
    const band1 = STORIES.filter((s) => (s.band || 1) === 1)
    expect(band1.length).toBeGreaterThanOrEqual(1)
    // A band-1 story is unlocked the moment chapter 1 is finished.
    for (const s of band1) expect(storyUnlocked(s, familyIds.slice(0, 8))).toBe(true)
  })

  it('every story: unique ids, band 1-4, 4+ pages, every page carries latin + meaning + picture', () => {
    expect(new Set(STORIES.map((s) => s.id)).size).toBe(STORIES.length)
    for (const s of STORIES) {
      expect([1, 2, 3, 4], `${s.id} band`).toContain(s.band || 1)
      expect(s.pages.length, s.id).toBeGreaterThanOrEqual(4)
      expect(s.title?.g && s.title?.en, s.id).toBeTruthy()
      for (const p of s.pages) {
        expect(storyWords(p.g).length, `${s.id} page`).toBeGreaterThan(0)
        expect(storyWords(p.g).length, `${s.id} pre-reader page length`).toBeLessThanOrEqual(5)
        expect(p.lt, `${s.id} latin`).toBeTruthy()
        expect(p.en, `${s.id} meaning`).toBeTruthy()
        expect(p.pic, `${s.id} picture`).toBeTruthy()
      }
    }
  })
})
