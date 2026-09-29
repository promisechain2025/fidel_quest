import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { ETHIOPIC_SCRIPT } from '../script/ethiopic'
import { STORIES, storyLibrary, storyMissingFamilies, storyShelves, storyUnlocked, storyWords } from '../platform/stories'
import { SCHOOL_PATH_STORIES } from './schoolPathGr1Stories'
import { BIBLE_SHELF, BIBLE_STORIES, bibleStoryTimeEntries } from './bibleStories'

const BGS = new Set(['day', 'field', 'night', 'indoor', 'kitchen', 'stable', 'sea', 'garden', 'den'])

function familiesOfGeez(geez) {
  const ids = []
  for (const ch of geez) {
    let id = null
    for (const family of ETHIOPIC_SCRIPT.families) {
      if (family.chars.includes(ch) || family.labial === ch) {
        id = family.id
        break
      }
    }
    if (!id || ids.includes(id)) continue
    ids.push(id)
  }
  return ids
}

describe('bible stories shelf', () => {
  const book = BIBLE_STORIES[0]
  const entry = bibleStoryTimeEntries()[0]
  const blob = [
    BIBLE_SHELF.titleTi,
    book.titleTi,
    book.refrain.geez,
    book.question.geez,
    ...book.pages.map((p) => p.geez),
  ].join('\n')

  it('is one Creation book, separate from Story Path and from Amharic', () => {
    expect(BIBLE_STORIES.map((s) => s.id)).toEqual(['bible-creation'])
    expect(SCHOOL_PATH_STORIES.some((s) => s.id === 'bible-creation')).toBe(false)
    expect(STORIES.some((s) => s.id === 'bible-creation')).toBe(false)
    expect(STORIES.find((s) => s.id === 'creation').pack).toBe('am')
    expect(entry.shelf).toBe('bible')
    expect(entry.pack).toBe('ti')
    expect(entry.schoolPath).toBeUndefined()
    expect(entry.free).toBe(true)
  })

  it('uses eight original Tigrinya lines with ኣ, not አ', () => {
    expect(book.titleTi).toBe('ኣብ መጀመርታ')
    expect(book.titleEn).toBe('In the Beginning')
    expect(book.refrain.geez).toBe('እግዚኣብሔር ፈጠረ።')
    expect(book.refrain.meaningEn).toBe('God made it.')
    expect(book.pages.map((p) => p.geez)).toEqual([
      'እግዚኣብሔር ብርሃን ፈጠረ።',
      'እግዚኣብሔር ሰማይ ፈጠረ።',
      'እግዚኣብሔር ምድሪን ባሕሪን ፈጠረ።',
      'እግዚኣብሔር ሳዕሪን ኦምን ፈጠረ።',
      'እግዚኣብሔር ጸሓይን ወርሒን ፈጠረ።',
      'እግዚኣብሔር ኣዕዋፍን ዓሳን ፈጠረ።',
      'እግዚኣብሔር ሰብኣይን ሰበይቲን ፈጠረ።',
      'እግዚኣብሔር ዓረፈ። ኩሉ ጽቡቕ ነበረ።',
    ])
    expect(book.pages.map((p) => p.meaningEn)).toEqual([
      'God made the light.',
      'God made the sky.',
      'God made the land and the sea.',
      'God made the grass and the trees.',
      'God made the sun and the moon.',
      'God made the birds and the fish.',
      'God made a man and a woman.',
      'God rested. Everything was good.',
    ])
    expect(blob.includes('አ')).toBe(false)
    expect(book.pages.length).toBeGreaterThanOrEqual(6)
    expect(book.pages.length).toBeLessThanOrEqual(8)
    const amharicLines = new Set(STORIES.flatMap((s) => s.pages.map((p) => p.g)))
    for (const page of book.pages) {
      expect(amharicLines.has(page.geez), page.geez).toBe(false)
      expect(storyWords(page.geez).length, page.geez).toBeGreaterThan(0)
      expect(storyWords(page.geez).length, page.geez).toBeLessThanOrEqual(5)
      expect(page.latin, page.geez).toBeTruthy()
      expect(page.meaningEn, page.geez).toBeTruthy()
      expect(page.pictureHint, page.geez).toBeTruthy()
      expect(page.familyIds, page.geez).toEqual(familiesOfGeez(page.geez))
    }
    expect(book.question.geez).toBe('መን ሰብኣይን ሰበይቲን ፈጠረ?')
    expect(book.question.meaningEn).toBe('Who made the man and the woman?')
  })

  it('is a free taste on the Tigrinya Bible shelf only', () => {
    expect(storyUnlocked(entry, [])).toBe(true)
    expect(storyMissingFamilies(entry, [])).toEqual([])
    expect(entry.pages).toHaveLength(8)
    expect(entry.cover).toBe('/art/stories/bible-creation-cover.webp')
    expect(existsSync(resolve('public', entry.cover.slice(1)))).toBe(true)
    entry.pages.forEach((page, i) => {
      const src = `/art/stories/bible-creation-${i + 1}.webp`
      expect(page.scene.src).toBe(src)
      expect(page.g && page.lt && page.en && page.pic).toBeTruthy()
      expect(BGS.has(page.scene.bg)).toBe(true)
      expect(existsSync(resolve('public', src.slice(1))), src).toBe(true)
    })
    const ti = storyLibrary([], undefined, 'ti')
    const shelves = storyShelves(ti)
    expect(shelves.map((s) => s.id)).toEqual(['path', 'bible'])
    expect(shelves[0].stories.every((s) => s.schoolPath && s.shelf !== 'bible')).toBe(true)
    expect(shelves[1].stories.map((s) => s.id)).toEqual(['bible-creation'])
    expect(shelves[1].stories[0].unlocked).toBe(true)
    const am = storyLibrary([], undefined, 'am')
    expect(storyShelves(am).map((s) => s.id)).toEqual(['library'])
    expect(am.some((s) => s.shelf === 'bible' || s.id === 'bible-creation')).toBe(false)
    expect(am.length).toBe(STORIES.length)
  })
})
