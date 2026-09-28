import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
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
    expect(SCHOOL_PATH_STORIES.find((s) => s.id === 'walk-to-school').unlockAfterUnitId).toBe('u11')
    expect(SCHOOL_PATH_STORIES.find((s) => s.id === 'sun-all-week').unlockAfterUnitId).toBe('u11')
  })

  it('uses natural Tigrinya lines, feminine verbs, and ኣ not አ', () => {
    const byId = Object.fromEntries(SCHOOL_PATH_STORIES.map((s) => [s.id, s]))
    const blob = SCHOOL_PATH_STORIES.map((s) => [s.titleTi, s.refrain.geez, ...s.pages.map((p) => p.geez)].join('\n')).join('\n')
    expect(blob.includes('አ')).toBe(false)
    expect(blob.includes('ሓበይቲ')).toBe(false)
    expect(blob.includes('ሳም')).toBe(false)
    const sam = byId['where-is-sam']
    expect(sam.titleTi).toBe('ሴም ኣበይ ኣሎ?')
    expect(sam.refrain.geez).toBe('ሴም ኣበይ ኣሎ?')
    expect(sam.pages[0].geez).toBe('ሴም ኣበይ ኣሎ?')
    expect(sam.pages[0].familyIds[0]).toBe('se')
    expect(sam.pages[1].geez).toBe('ሴም ኣብ ክሽነ የለን።')
    expect(sam.pages[1].meaningEn).toBe('Sam is not in the kitchen.')
    expect(sam.pages[1].familyIds[0]).toBe('se')
    expect(sam.pages[2].geez).toBe('ሴም ኣብ ቤት የለን።')
    expect(sam.pages[2].meaningEn).toBe('Sam is not in the house.')
    expect(sam.pages[2].familyIds).toEqual(['se', 'me', 'a', 'be', 'te', 'ye', 'le', 'ne'])
    expect(sam.pages[3].geez).toBe('ሴም ኣብ መደቀሲ የለን።')
    expect(sam.pages[4].geez).toBe('ሴም ምስ ከልቢ ኣሎ።')
    expect(sam.titleEn).toBe('Where Is Sam?')
    expect(byId['walk-to-school'].titleTi).toBe('ናብ ቤት ትምህርቲ')
    expect(byId['walk-to-school'].pages[0].geez).toBe('ቆልዓ ናብ ቤት ትምህርቲ ከደ።')
    expect(byId['walk-to-school'].pages.at(-1).geez).toBe('ቆልዓ ናብ ቤት ትምህርቲ በጽሐ።')
    expect(byId['walk-to-school'].pages[2].geez).toBe('ጭሩ ኣሎ።')
    expect(byId['walk-to-school'].pages[2].meaningEn).toBe('A little bird is there.')
    expect(byId['walk-to-school'].pages[2].familyIds).toEqual(['chhe', 're', 'a', 'le'])
    expect(byId['coffee-with-grandma'].titleTi).toBe('ጀበና ምስ ዓባየይ')
    expect(byId['coffee-with-grandma'].pages[3].geez).toBe('ዓባየይ ሰተየት።')
    expect(byId['coffee-with-grandma'].pages[3].meaningEn).toBe('Grandma drank.')
    expect(byId['coffee-with-grandma'].pages[3].familyIds).toEqual(['ae', 'be', 'ye', 'se', 'te'])
    expect(byId['baby-wont-sleep'].pages[1].geez).toBe('ማማ ዘመረት።')
    expect(byId['baby-wont-sleep'].pages[2].geez).toBe('ማማ ቆልዓ ሓዘት።')
    const sun = byId['sun-all-week']
    expect(sun.titleTi).toBe('ኩሉ ሰሙን ጸሓይ ኣሎ')
    expect(sun.pages.slice(0, 7).map((p) => storyWords(p.geez)[0])).toEqual(['ሰኑይ', 'ሰሉስ', 'ረቡዕ', 'ሓሙስ', 'ዓርቢ', 'ቀዳም', 'ሰንበት'])
    expect(sun.pages.slice(0, 7).every((p) => p.geez.endsWith('ጸሓይ ኣሎ።'))).toBe(true)
    const tiTitles = storyLibrary([], undefined, 'ti').map((s) => s.title.g)
    expect(tiTitles).toContain('ሴም ኣበይ ኣሎ?')
    expect(tiTitles).toContain('ናብ ቤት ትምህርቲ')
    expect(tiTitles).toContain('ጀበና ምስ ዓባየይ')
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

  it('gives every School Path page a Meet-style painting on disk', () => {
    for (const entry of schoolPathStoryTimeEntries()) {
      entry.pages.forEach((page, i) => {
        const src = `/art/stories/${entry.id}-${i + 1}.webp`
        expect(page.scene.src, `${entry.id} ${i}`).toBe(src)
        expect(existsSync(resolve('public', src.slice(1))), src).toBe(true)
      })
    }
  })

  it('puts a story node on each Tigrinya chapter and leaves Amharic stories in place', () => {
    const ti = buildJourney('ti').filter((n) => n.kind === NodeKind.STORY)
    const am = buildJourney('am').filter((n) => n.kind === NodeKind.STORY)
    expect(ti.map((n) => n.id)).toEqual(['story:1', 'story:2', 'story:3', 'story:4'])
    expect(am.map((n) => n.id)).toEqual(['story:1', 'story:2', 'story:3', 'story:4'])
  })
})
