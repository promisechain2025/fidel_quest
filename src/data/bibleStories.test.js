import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { ETHIOPIC_SCRIPT } from '../script/ethiopic'
import { FIDEL_FAMILIES } from '../platform/ethiopic'
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

  it('is the Creation book, separate from Story Path and from Amharic', () => {
    expect(BIBLE_STORIES.map((s) => s.id)).toEqual(['bible-creation', 'bible-noah'])
    expect(SCHOOL_PATH_STORIES.some((s) => s.id === 'bible-creation' || s.id === 'bible-noah')).toBe(false)
    expect(STORIES.some((s) => s.id === 'bible-creation' || s.id === 'bible-noah')).toBe(false)
    expect(STORIES.find((s) => s.id === 'creation').pack).toBe('am')
    expect(STORIES.find((s) => s.id === 'noah').pack).toBe('am')
    expect(entry.shelf).toBe('bible')
    expect(entry.pack).toBe('ti')
    expect(entry.schoolPath).toBeUndefined()
    expect(entry.free).toBe(true)
  })

  it('names each creation weekday, with Friday for people and Saturday for rest', () => {
    expect(book.titleTi).toBe('ኣብ መጀመርታ')
    expect(book.titleEn).toBe('In the Beginning')
    expect(book.refrain.geez).toBe('እግዚኣብሄር ፈጠረ።')
    expect(book.refrain.meaningEn).toBe('God made it.')
    expect(book.pages.map((p) => p.geez)).toEqual([
      'እግዚኣብሄር ብዕለት ሰንበት ብርሃን ፈጠረ።',
      'እግዚኣብሄር ብዕለት ሰኑይ ሰማይ ፈጠረ።',
      'እግዚኣብሄር ብዕለት ሰሉስ ምድሪን ባሕሪን ፈጠረ።',
      'እግዚኣብሄር ብዕለት ሰሉስ ሳዕሪን ኣእዋምን ፈጠረ።',
      'እግዚኣብሄር ብዕለት ረቡዕ ጸሓይን ወርሒን ፈጠረ።',
      'እግዚኣብሄር ብዕለት ሓሙስ ኣዕዋፍን ዓሳን ፈጠረ።',
      'እግዚኣብሄር ብዕለት ዓርቢ ሰብኣይን ሰበይቲን ፈጠረ።',
      'እግዚኣብሄር ብዕለት ቀዳም ዓረፈ። ኩሉ ጽቡቕ።',
    ])
    expect(book.pages.map((p) => p.meaningEn)).toEqual([
      'On Sunday God made the light.',
      'On Monday God made the sky.',
      'On Tuesday God made the land and the sea.',
      'On Tuesday God made the grass and the trees.',
      'On Wednesday God made the sun and the moon.',
      'On Thursday God made the birds and the fish.',
      'On Friday God made a man and a woman.',
      'On Saturday God rested. Everything was good.',
    ])
    expect(blob.includes('አ')).toBe(false)
    expect(blob.includes('ሔ')).toBe(false)
    expect(blob.includes('እግዚኣብሄር')).toBe(true)
    expect(book.pages.length).toBeGreaterThanOrEqual(6)
    expect(book.pages.length).toBeLessThanOrEqual(8)
    const amharicLines = new Set(STORIES.flatMap((s) => s.pages.map((p) => p.g)))
    for (const page of book.pages) {
      expect(amharicLines.has(page.geez), page.geez).toBe(false)
      expect(storyWords(page.geez).length, page.geez).toBeGreaterThan(0)
      expect(storyWords(page.geez).length, page.geez).toBeLessThanOrEqual(6)
      expect(page.latin, page.geez).toBeTruthy()
      expect(page.meaningEn, page.geez).toBeTruthy()
      expect(page.pictureHint, page.geez).toBeTruthy()
      expect(page.familyIds, page.geez).toEqual(familiesOfGeez(page.geez))
    }
    expect(book.question.geez).toBe('እግዚኣብሄር ብዓርቢ እንታይ ፈጠረ?')
    expect(book.question.meaningEn).toBe('What did God make on Friday?')
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
    expect(shelves[1].stories.map((s) => s.id)).toEqual(['bible-creation', 'bible-noah'])
    expect(shelves[1].stories[0].unlocked).toBe(true)
    expect(shelves[1].stories[1].unlocked).toBe(false)
    const am = storyLibrary([], undefined, 'am')
    expect(storyShelves(am).map((s) => s.id)).toEqual(['library'])
    expect(am.some((s) => s.shelf === 'bible' || s.id === 'bible-creation' || s.id === 'bible-noah')).toBe(false)
    expect(am.length).toBe(STORIES.length)
  })
})

describe('noah bible book', () => {
  const book = BIBLE_STORIES[1]
  const entry = bibleStoryTimeEntries()[1]
  const chapter1 = FIDEL_FAMILIES.slice(0, 8).map((f) => f.id)
  const blob = [book.titleTi, book.refrain.geez, book.question.geez, ...book.pages.map((p) => p.geez)].join('\n')

  it('paraphrases Genesis 6-9 as one connected story', () => {
    expect(book.id).toBe('bible-noah')
    expect(book.titleTi).toBe('መርከብ ኖህ')
    expect(book.titleEn).toBe("Noah's Ark")
    expect(book.free).toBe(false)
    expect(book.refrain.geez).toBe('ኖህ ንእግዚኣብሄር ሰምዖ።')
    expect(book.refrain.meaningEn).toBe('Noah obeyed God.')
    expect(book.pages.map((p) => p.geez)).toEqual([
      'እግዚኣብሄር ሰብ ኣብ ምድሪ ክፋእ ከም ዝገብር ረኣየ።',
      'ኖህ ግና ፃድቕ ሰብ ነበረ። ንእግዚኣብሄር ድማ ይስምዖ ነበረ።',
      'ማይ ብዙሕ ስለ ዝመጽእ፡ እግዚኣብሄር ንኖህ ዓባይ መርከብ ክሰርሕ ኣዘዞ።',
      'ኖህን ሰበይቱን ደቁን ነታ መርከብ ሰርሑ።',
      'ድሕሪኡ ኖህን ሰበይቱን ደቁን ናብታ መርከብ ኣተዉ።',
      'እንስሳታት ከኣ ክልተ ክልተ ምስኦም ኣተዉ።',
      'እግዚኣብሄር ናይታ መርከብ ማዕጾ ዓፀዎ። ሽዑ ዝናብ መጸ።',
      'ማይ ነታ ምድሪ ሸፈነ። እታ መርከብ ግና ኣብ ልዕሊኡ ሰላም ነበረት።',
      'ዝናብ ደው ምስ በለ፡ ኖህ ቅድም ንኳዅ ሰደዶ። ኳዅ ግና ኣይተመለሰን።',
      'ድሕሪኡ ንርግቢ ሰደዳ። ርግቢ ቘፅሊ ኣውሊዕ ሒዛ ናብ ኖህ ተመለሰት።',
      'ኖህን ስድራቤቱን ናብ ንቑጽ ምድሪ ወፁ።',
      'እግዚኣብሄር ቀስቲ ኣብ ሰማይ ኣንበረ። እዚ ኪዳን እዩ።',
    ])
    expect(book.pages.map((p) => p.meaningEn)).toEqual([
      'God saw that people were doing evil on the earth.',
      'But Noah was a righteous man. He obeyed God.',
      'Because a lot of water was coming, God commanded Noah to build a big ark.',
      'Noah, his wife, and his children built the ark.',
      'After that, Noah, his wife, and his children went into the ark.',
      'And the animals went in with them, two by two.',
      'God shut the door of the ark. Then the rain came.',
      'Water covered the land. But the ark was safe on the water.',
      'When the rain stopped, Noah first sent the raven. But the raven did not come back.',
      'Then he sent the dove. The dove came back to Noah holding an olive leaf.',
      'Noah and his family went out onto dry land.',
      'God set a rainbow in the sky. This is his promise.',
    ])
    expect(blob.includes('አ')).toBe(false)
    expect(blob.includes('ሔ')).toBe(false)
    expect(blob.includes('ኣይነበሩን')).toBe(false)
    expect(blob.includes('እግዚኣብሄር')).toBe(true)
    expect(blob.includes('ኖህ')).toBe(true)
    expect(blob.includes('ኖሕ')).toBe(false)
    expect(blob.includes('ክፋእ')).toBe(true)
    expect(blob.includes('ፃድቕ')).toBe(true)
    expect(blob.includes('ኪዳን')).toBe(true)
    expect(book.pages.length).toBe(12)
    expect(blob.includes('ኳዅ')).toBe(true)
    expect(blob.includes('ቑራዕ')).toBe(false)
    expect(blob.includes('ንቑጽ')).toBe(true)
    expect(blob.includes('ነቒጣ')).toBe(false)
    expect(blob.includes('ኣዘዞ')).toBe(true)
    for (const page of book.pages) {
      expect(storyWords(page.geez).length, page.geez).toBeGreaterThan(0)
      expect(storyWords(page.geez).length, page.geez).toBeLessThanOrEqual(16)
      expect(page.latin && page.meaningEn && page.pictureHint).toBeTruthy()
      expect(page.familyIds).toEqual(familiesOfGeez(page.geez))
    }
    expect(book.question.geez).toBe('እግዚኣብሄር ኣብ ሰማይ እንታይ ኣንበረ?')
    expect(book.question.meaningEn).toBe('What did God set in the sky?')
    expect(book.question.answers.filter((a) => a.ok)).toHaveLength(1)
    expect(book.question.answers.find((a) => a.ok).pic).toBe('🌈')
  })

  it('sits behind the band-1 progress gate and does not open the Amharic ark', () => {
    expect(entry.free).toBe(false)
    expect(entry.shelf).toBe('bible')
    expect(entry.pack).toBe('ti')
    expect(entry.band).toBe(1)
    expect(entry.schoolPath).toBeUndefined()
    expect(storyUnlocked(entry, [])).toBe(false)
    expect(storyUnlocked(entry, chapter1.slice(0, -1))).toBe(false)
    expect(storyUnlocked(entry, chapter1)).toBe(true)
    expect(storyMissingFamilies(entry, []).length).toBeGreaterThan(0)
    expect(storyMissingFamilies(entry, chapter1)).toEqual([])
    expect(storyUnlocked(bibleStoryTimeEntries()[0], [])).toBe(true)
    expect(entry.cover).toBe('/art/stories/bible-noah-cover.webp')
    expect(existsSync(resolve('public', entry.cover.slice(1)))).toBe(true)
    entry.pages.forEach((page, i) => {
      const src = `/art/stories/bible-noah-${i + 1}.webp`
      expect(page.scene.src).toBe(src)
      expect(page.g && page.lt && page.en && page.pic).toBeTruthy()
      expect(BGS.has(page.scene.bg)).toBe(true)
      expect(existsSync(resolve('public', src.slice(1))), src).toBe(true)
    })
    const amNoah = STORIES.find((s) => s.id === 'noah')
    expect(amNoah.title.g).toBe('የኖኅ መርከብ')
    expect(storyUnlocked(amNoah, [])).toBe(false)
  })
})
