import { describe, it, expect } from 'vitest'
import { ETHIOPIC_SCRIPT } from '../script/ethiopic'
import { STORIES, storyLibrary, storyUnlocked, storyWords } from '../platform/stories'
import { NodeKind, buildJourney } from '../journey'
import { SCHOOL_PATH_UNITS } from './schoolPathGr1'
import {
  SCHOOL_PATH_STORIES,
  familiesThroughUnit,
  schoolPathStoryTimeEntries,
} from './schoolPathGr1Stories'

const IDS = [
  'where-is-sam',
  'walk-to-school',
  'coffee-with-grandma',
  'baby-wont-sleep',
  'sun-all-week',
]

const MOE_TITLES = ['ሓጋይ', 'ሓወይ ኣበይ ኣሎ']
const BGS = new Set(['day', 'field', 'night', 'indoor', 'kitchen', 'stable', 'sea', 'garden', 'den'])

function familyOfChar(ch) {
  for (const family of ETHIOPIC_SCRIPT.families) {
    if (family.chars.includes(ch) || family.labial === ch) return family.id
  }
  return null
}

function familiesOfGeez(geez) {
  const ids = []
  for (const ch of geez) {
    const id = familyOfChar(ch)
    if (!id || ids.includes(id)) continue
    ids.push(id)
  }
  return ids
}

const packWords = new Set(
  SCHOOL_PATH_UNITS.flatMap((u) => [...u.pictureWords, ...u.blendWords].map((w) => w.geez)),
)

describe('school path story pack', () => {
  it('ships five original stories and leaves the biblical library alone', () => {
    expect(SCHOOL_PATH_STORIES.map((s) => s.id)).toEqual(IDS)
    for (const id of IDS) expect(STORIES.some((s) => s.id === id)).toBe(false)
    expect(STORIES.every((s) => s.pack === 'am')).toBe(true)
  })

  it('keeps the schema: titles, unlock unit, pages, refrain', () => {
    const unitIds = new Set(SCHOOL_PATH_UNITS.map((u) => u.id))
    for (const story of SCHOOL_PATH_STORIES) {
      expect(story.titleEn, story.id).toBeTruthy()
      expect(story.titleTi, story.id).toBeTruthy()
      expect(unitIds.has(story.unlockAfterUnitId), story.id).toBe(true)
      expect(story.pages.length, story.id).toBeGreaterThanOrEqual(4)
      expect(story.refrain?.geez, story.id).toBeTruthy()
      expect(story.refrain.meaningEn, story.id).toBeTruthy()
      expect(MOE_TITLES, story.titleTi).not.toContain(story.titleTi)
      expect(story.titleTi.includes('ሓወይ'), story.titleTi).toBe(false)
      for (const page of story.pages) {
        expect(storyWords(page.geez).length, page.geez).toBeGreaterThan(0)
        expect(storyWords(page.geez).length, page.geez).toBeLessThanOrEqual(5)
        expect(page.meaningEn, page.geez).toBeTruthy()
        expect(page.pictureHint, page.geez).toBeTruthy()
        expect(page.familyIds, page.geez).toEqual(familiesOfGeez(page.geez))
      }
      expect(story.refrain.familyIds, story.refrain.geez).toEqual(familiesOfGeez(story.refrain.geez))
    }
  })

  it('recycles a School Path Meet or blend word in every story', () => {
    for (const story of SCHOOL_PATH_STORIES) {
      const tokens = story.pages.flatMap((p) => storyWords(p.geez))
      expect(tokens.some((w) => packWords.has(w)), story.id).toBe(true)
    }
  })

  it('unlocks only after the named unit’s families are learned', () => {
    for (const story of SCHOOL_PATH_STORIES) {
      const gate = familiesThroughUnit(story.unlockAfterUnitId)
      const entry = schoolPathStoryTimeEntries().find((s) => s.id === story.id)
      expect(entry.gateFamilyIds).toEqual(gate)
      expect(entry.pack).toBe('ti')
      expect(storyUnlocked(entry, gate)).toBe(true)
      expect(storyUnlocked(entry, gate.slice(0, -1))).toBe(false)
      expect(entry.pages.every((p) => p.g && p.lt && p.en && p.pic && BGS.has(p.scene.bg))).toBe(true)
    }
    const sam = SCHOOL_PATH_STORIES.find((s) => s.id === 'where-is-sam')
    expect(sam.unlockAfterUnitId).toBe('u09')
    expect(SCHOOL_PATH_STORIES.find((s) => s.id === 'walk-to-school').unlockAfterUnitId).toBe('u10')
    expect(SCHOOL_PATH_STORIES.find((s) => s.id === 'sun-all-week').unlockAfterUnitId).toBe('u11')
  })

  it('shows the five stories in the Tigrinya library and not in Amharic', () => {
    const ti = storyLibrary([], undefined, 'ti')
    expect(ti.map((s) => s.id).sort()).toEqual([...IDS].sort())
    expect(ti[0].id).toBe('where-is-sam')
    expect(ti.every((s) => s.pack === 'ti' && s.unlocked === false)).toBe(true)
    const am = storyLibrary([], undefined, 'am')
    expect(am.some((s) => IDS.includes(s.id))).toBe(false)
    expect(am.length).toBe(STORIES.length)
  })

  it('puts a story node on each Tigrinya chapter and leaves Amharic stories in place', () => {
    const ti = buildJourney('ti').filter((n) => n.kind === NodeKind.STORY)
    const am = buildJourney('am').filter((n) => n.kind === NodeKind.STORY)
    expect(ti.map((n) => n.id)).toEqual(['story:1', 'story:2', 'story:3', 'story:4'])
    expect(am.map((n) => n.id)).toEqual(['story:1', 'story:2', 'story:3', 'story:4'])
  })
})
