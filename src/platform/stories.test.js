import { describe, it, expect } from 'vitest'
import { STORIES, storyWords, storyDecodable, storyStage, storyMissingFamilies, storyLibrary } from './stories'
import { FIDEL_FAMILIES } from './ethiopic'

const familyIds = FIDEL_FAMILIES.map((f) => f.id)
const learnedUpTo = (stage) => familyIds.slice(0, stage + 1)

describe('story engine', () => {
  it('tokenizes around Ethiopic punctuation and Latin marks', () => {
    expect(storyWords('ሰላም ሳራ።')).toEqual(['ሰላም', 'ሳራ'])
    expect(storyWords('ሎሚ! ማር፣ ውሃ?')).toEqual(['ሎሚ', 'ማር', 'ውሃ'])
    expect(storyWords('')).toEqual([])
  })

  it('a story unlocks exactly at its stage, not one family sooner', () => {
    for (const s of STORIES) {
      const stage = storyStage(s)
      expect(Number.isFinite(stage), `${s.id} contains a non-script character`).toBe(true)
      expect(storyDecodable(s, learnedUpTo(stage)), `${s.id} at its own stage`).toBe(true)
      if (stage > 0) expect(storyDecodable(s, learnedUpTo(stage - 1)), `${s.id} one family early`).toBe(false)
    }
  })

  it('missing families are reported in journey order and empty when unlocked', () => {
    const s = STORIES.find((x) => x.id === 'selam-sara')
    const missing = storyMissingFamilies(s, ['ha', 'le', 'hha', 'me'])
    expect(missing.length).toBeGreaterThan(0)
    const idx = missing.map((id) => familyIds.indexOf(id))
    expect([...idx].sort((a, b) => a - b)).toEqual(idx)
    expect(storyMissingFamilies(s, learnedUpTo(storyStage(s)))).toEqual([])
  })

  it('the library sorts unlocked-first by stage and tags missing letters', () => {
    const lib = storyLibrary(['ha', 'le', 'hha', 'me'])
    expect(['lomi', 'lemlem']).toContain(lib[0].id) // both are stage-3 band-1 stories
    expect(lib[0].unlocked).toBe(true)
    const lockedIdx = lib.findIndex((s) => !s.unlocked)
    expect(lockedIdx).toBeGreaterThan(0)
    expect(lib[lockedIdx].missing.length).toBeGreaterThan(0)
  })
})

describe('starter library content contract', () => {
  it('has at least 10 stories with a real difficulty ramp', () => {
    expect(STORIES.length).toBeGreaterThanOrEqual(10)
    const stages = STORIES.map(storyStage).sort((a, b) => a - b)
    expect(stages[0]).toBeLessThanOrEqual(3) // readable after four families
    expect(stages[stages.length - 1]).toBeGreaterThanOrEqual(25) // stretches to the late alphabet
  })

  it('every story: unique ids, 4+ pages, every page carries latin + meaning + picture', () => {
    expect(new Set(STORIES.map((s) => s.id)).size).toBe(STORIES.length)
    for (const s of STORIES) {
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

  it('band-1 stories use ONLY the first four families', () => {
    const early = STORIES.filter((s) => storyStage(s) <= 3)
    expect(early.map((s) => s.id).sort()).toEqual(['lemlem', 'lomi'])
    for (const s of early) expect(storyDecodable(s, ['ha', 'le', 'hha', 'me'])).toBe(true)
  })
})
