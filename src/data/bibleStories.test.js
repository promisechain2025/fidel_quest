import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { ETHIOPIC_SCRIPT } from '../script/ethiopic'
import { FIDEL_FAMILIES } from '../platform/ethiopic'
import { STORIES, storyLibrary, storyMissingFamilies, storyShelves, storyUnlocked, storyWords } from '../platform/stories'
import { SCHOOL_PATH_STORIES } from './schoolPathGr1Stories'
import { publicUrl } from '../platform/publicUrl'
import { BIBLE_SHELF, BIBLE_STORIES, bibleStoryTimeEntries } from './bibleStories'

const BGS = new Set(['day', 'field', 'night', 'indoor', 'kitchen', 'stable', 'sea', 'garden', 'den'])

/** The painting URL follows the Vite base; the file on disk stays under public/. */
function expectPublicArt(actual, rootPath) {
  expect(actual).toBe(publicUrl(rootPath))
  expect(existsSync(resolve('public', rootPath.replace(/^\//, '')))).toBe(true)
}

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
    expect(BIBLE_STORIES.map((s) => s.id)).toEqual(['bible-creation', 'bible-noah', 'bible-moses', 'bible-jonah'])
    expect(SCHOOL_PATH_STORIES.some((s) => s.id === 'bible-creation' || s.id === 'bible-noah' || s.id === 'bible-moses' || s.id === 'bible-jonah')).toBe(false)
    expect(STORIES.some((s) => s.id === 'bible-creation' || s.id === 'bible-noah' || s.id === 'bible-moses' || s.id === 'bible-jonah')).toBe(false)
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
    expectPublicArt(entry.cover, '/art/stories/bible-creation-cover.webp')
    entry.pages.forEach((page, i) => {
      expectPublicArt(page.scene.src, `/art/stories/bible-creation-${i + 1}.webp`)
      expect(page.g && page.lt && page.en && page.pic).toBeTruthy()
      expect(BGS.has(page.scene.bg)).toBe(true)
    })
    const ti = storyLibrary([], undefined, 'ti')
    const shelves = storyShelves(ti)
    expect(shelves.map((s) => s.id)).toEqual(['path', 'bible'])
    expect(shelves[0].stories.every((s) => s.schoolPath && s.shelf !== 'bible')).toBe(true)
    expect(shelves[1].stories.map((s) => s.id)).toEqual(['bible-creation', 'bible-noah', 'bible-moses', 'bible-jonah'])
    expect(shelves[1].stories[0].unlocked).toBe(true)
    expect(shelves[1].stories[1].unlocked).toBe(false)
    expect(shelves[1].stories[2].unlocked).toBe(false)
    expect(shelves[1].stories[3].unlocked).toBe(false)
    const am = storyLibrary([], undefined, 'am')
    expect(storyShelves(am).map((s) => s.id)).toEqual(['library'])
    expect(am.some((s) => s.shelf === 'bible' || s.id === 'bible-creation' || s.id === 'bible-noah' || s.id === 'bible-moses' || s.id === 'bible-jonah')).toBe(false)
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
    expectPublicArt(entry.cover, '/art/stories/bible-noah-cover.webp')
    entry.pages.forEach((page, i) => {
      expectPublicArt(page.scene.src, `/art/stories/bible-noah-${i + 1}.webp`)
      expect(page.g && page.lt && page.en && page.pic).toBeTruthy()
      expect(BGS.has(page.scene.bg)).toBe(true)
    })
    const amNoah = STORIES.find((s) => s.id === 'noah')
    expect(amNoah.title.g).toBe('የኖኅ መርከብ')
    expect(storyUnlocked(amNoah, [])).toBe(false)
  })
})

describe('moses bible book', () => {
  const book = BIBLE_STORIES[2]
  const entry = bibleStoryTimeEntries()[2]
  const chapter1 = FIDEL_FAMILIES.slice(0, 8).map((f) => f.id)
  const chapter2 = FIDEL_FAMILIES.slice(0, 16).map((f) => f.id)
  const blob = [book.titleTi, book.refrain.geez, book.question.geez, ...book.pages.map((p) => p.geez)].join('\n')

  it('paraphrases Exodus 2 as one connected story', () => {
    expect(book.id).toBe('bible-moses')
    expect(book.titleTi).toBe('ሳጹን ሙሴ')
    expect(book.titleEn).toBe('Baby Moses')
    expect(book.free).toBe(false)
    expect(book.band).toBe(2)
    expect(book.refrain.geez).toBe('እግዚኣብሄር ነቲ ህፃን ሓለዎ።')
    expect(book.refrain.meaningEn).toBe('God watched over the baby.')
    expect(book.pages.map((p) => p.geez)).toEqual([
      'ፈርኦን ንህዝቡ ነቶም ንእሽቶ ኣወዳት ክጎድእዎም ኣዘዘ።',
      'እታ ኣደ ግና ንህፃና ሰለስተ ወርሒ ኣብ ቤት ዓቒባቶ።',
      'ምሕብኡ ምስ ሰኣነት፡ ብሻምብቆ ሳጹን ሰርሐት።',
      'ነቲ ህፃን ኣብቲ ሳጹን ኣእትያ፡ ኣብ ሰልሰላ ሩባ ኣንበረቶ።',
      'ሓፍቱ ርሕቕ ኢላ ደው በለት። ነቲ ሳጹን ውን ትርኢ ነበረት።',
      'ጓል ፈርኦን ናብ ሩባ ወረደት። ነቲ ሳጹን ኣብ ሰልሰላ ረኣየቶ።',
      'እቲ ህፃን ምስ በኸየ፡ ጓል ፈርኦን ራህርሀትሉ።',
      'ሓፍቱ ሞግዚት ክረኽበልኪ በለታ።',
      'እታ ሞግዚት ናይቲ ህፃን ኣደ እያ። ሓፍቱ ናብ ጓል ፈርኦን ወሰደታ።',
      'እታ ኣደ ነቲ ህፃን ኣጥበወቶ። እቲ ህፃን ድማ ዓብየ።',
      'ጓል ፈርኦን ካብ ማይ ስለዝተረኽበ ሙሴ ኢላ ሴመቶ።',
      'እግዚኣብሄር ነቲ ህፃን ሙሴ ሓለዎ። ሰላም ረኸበ።',
    ])
    expect(book.pages.map((p) => p.meaningEn)).toEqual([
      'Pharaoh commanded his people to harm the little boys.',
      'But the mother kept her baby safe at home for three months.',
      'When she could no longer hide him, she made a papyrus basket.',
      'She put the baby in the basket and set it among the reeds of the river.',
      'His sister stood far away. She was watching the basket too.',
      "Pharaoh's daughter went down to the river. She saw the basket in the reeds.",
      "When the baby cried, Pharaoh's daughter felt pity for him.",
      'His sister told her, "I will find a nurse for you."',
      "The nurse was the baby's mother. His sister took her to Pharaoh's daughter.",
      'The mother nursed the baby. And the baby grew.',
      'Because he was found in the water, Pharaoh\'s daughter named him Moses.',
      'God watched over baby Moses. He was safe.',
    ])
    expect(blob.includes('አ')).toBe(false)
    expect(blob.includes('ሔ')).toBe(false)
    expect(blob.includes('እግዚኣብሄር')).toBe(true)
    expect(blob.includes('ሙሴ')).toBe(true)
    expect(blob.includes('ፈርኦን')).toBe(true)
    expect(blob.includes('\u12D6')).toBe(false)
    expect(blob.includes('ሳጹን')).toBe(true)
    expect(blob.includes('\u1341')).toBe(false)
    expect(blob.includes('ሞግዚት')).toBe(true)
    expect(blob.includes('\u1315')).toBe(false)
    expect(blob.includes('ሩባ')).toBe(true)
    expect(blob.includes('ሰልሰላ')).toBe(true)
    expect(blob.includes('ሓፍቱ')).toBe(true)
    expect(blob.includes('ጓል')).toBe(true)
    expect(blob.includes('ኣዘዘ')).toBe(true)
    expect(blob.includes('ኣዘዞ')).toBe(false)
    expect(blob.includes('በሎ')).toBe(false)
    expect(book.pages.length).toBe(12)
    for (const page of book.pages) {
      expect(storyWords(page.geez).length, page.geez).toBeGreaterThan(0)
      expect(storyWords(page.geez).length, page.geez).toBeLessThanOrEqual(16)
      expect(page.latin && page.meaningEn && page.pictureHint).toBeTruthy()
      expect(page.familyIds).toEqual(familiesOfGeez(page.geez))
    }
    expect(book.question.geez).toBe('እታ ኣደ ነቲ ህፃን ኣበይ ኣንበረቶ?')
    expect(book.question.meaningEn).toBe('Where did the mother set the baby?')
    expect(book.question.answers.filter((a) => a.ok)).toHaveLength(1)
    expect(book.question.answers.find((a) => a.ok).pic).toBe('🧺')
    expect(book.question.answers).toHaveLength(3)
  })

  it('sits behind the band-2 progress gate and leaves Noah and Amharic Moses as they are', () => {
    expect(entry.free).toBe(false)
    expect(entry.shelf).toBe('bible')
    expect(entry.pack).toBe('ti')
    expect(entry.band).toBe(2)
    expect(entry.schoolPath).toBeUndefined()
    expect(storyUnlocked(entry, [])).toBe(false)
    expect(storyUnlocked(entry, chapter1)).toBe(false)
    expect(storyUnlocked(entry, chapter2.slice(0, -1))).toBe(false)
    expect(storyUnlocked(entry, chapter2)).toBe(true)
    expect(storyMissingFamilies(entry, chapter1).length).toBeGreaterThan(0)
    expect(storyMissingFamilies(entry, chapter2)).toEqual([])
    expect(storyUnlocked(bibleStoryTimeEntries()[0], [])).toBe(true)
    expect(bibleStoryTimeEntries()[1].band).toBe(1)
    expect(storyUnlocked(bibleStoryTimeEntries()[1], chapter1)).toBe(true)
    expectPublicArt(entry.cover, '/art/stories/bible-moses-cover.webp')
    entry.pages.forEach((page, i) => {
      expectPublicArt(page.scene.src, `/art/stories/bible-moses-${i + 1}.webp`)
      expect(page.g && page.lt && page.en && page.pic).toBeTruthy()
      expect(BGS.has(page.scene.bg)).toBe(true)
    })
    const amMoses = STORIES.find((s) => s.id === 'baby-moses')
    expect(amMoses.title.g).toBe('ሕፃኑ ሙሴ')
    expect(amMoses.band).toBe(2)
    expect(amMoses.pack).toBe('am')
    expect(storyUnlocked(amMoses, [])).toBe(false)
  })
})

describe('jonah bible book', () => {
  const book = BIBLE_STORIES[3]
  const entry = bibleStoryTimeEntries()[3]
  const chapter1 = FIDEL_FAMILIES.slice(0, 8).map((f) => f.id)
  const chapter2 = FIDEL_FAMILIES.slice(0, 16).map((f) => f.id)
  const chapter3 = FIDEL_FAMILIES.slice(0, 24).map((f) => f.id)
  const blob = [book.titleTi, book.refrain.geez, book.question.geez, ...book.pages.map((p) => p.geez)].join('\n')

  it('paraphrases Jonah 1-3 as one connected story', () => {
    expect(book.id).toBe('bible-jonah')
    expect(book.titleTi).toBe('ዮናስን ዓሳን')
    expect(book.titleEn).toBe('Jonah and the Fish')
    expect(book.free).toBe(false)
    expect(book.band).toBe(3)
    expect(book.refrain.geez).toBe('ንእግዚኣብሄር ቅድም ሰምዕ።')
    expect(book.refrain.meaningEn).toBe('Listen to God the first time.')
    expect(book.pages.map((p) => p.geez)).toEqual([
      'እግዚኣብሄር ንዮናስ ናብ ነነዌ ክኸይድ ኣዘዞ።',
      'ዮናስ ግና ሃደመ። ናብ ተርሴስ መርከብ ኣተወ።',
      'እታ መርከብ ኣብ ባሕሪ ከላ፡ ዓቢይ ማዕበል መጸ።',
      'እቶም መርከበኛታት ነቲ ማዕበል ርእዮም ፈርሑ።',
      'ዮናስ ንመርከበኛታት፡ እዚ ማዕበል ብሰንከይ ኢዩ፡ ናብዚ ባሕሪ ደርቡይኒ በሎም።',
      'እቶም መርከበኛታት ንዮናስ ናብ ባሕሪ ደርበይዎ። ማዕበል ደው በለ።',
      'ሽዑ ዓባይ ዓሳ ንዮናስ ውሕጦ።',
      'ዮናስ ኣብ ከብዲ እቲ ዓሳ ሰለስተ መዓልቲ ጸለየ።',
      'እቲ ዓሳ ንዮናስ ኣብ ንቑጽ ምድሪ ኣንበሮ።',
      'እግዚኣብሄር ዳግማይ ኣዘዞ። ዮናስ ሰሚዑ ናብ ነነዌ ከደ።',
      'ሰብ ነነዌ ንእግዚኣብሄር ሰምዑ። ካብ ክፉእ መንገዶም ተመለሱ።',
      'እግዚኣብሄር ብምሕረት ንሰብ ነነዌ ይቕረ በሎም።',
    ])
    expect(book.pages.map((p) => p.meaningEn)).toEqual([
      'God commanded Jonah to go to Nineveh.',
      'But Jonah ran away. He boarded a ship to Tarshish.',
      'While the ship was on the sea, a big storm came.',
      'The sailors saw the storm and were afraid.',
      'This storm is because of me. Throw me in.',
      'The sailors threw Jonah into the sea. The storm stopped.',
      'Then a big fish swallowed Jonah.',
      'Jonah prayed in the belly of the fish for three days.',
      'The fish set Jonah on dry land.',
      'God commanded him again. Jonah listened and went to Nineveh.',
      'The people of Nineveh listened to God. They turned from their bad way.',
      'God mercifully forgave the people of Nineveh.',
    ])
    expect(blob.includes('አ')).toBe(false)
    expect(blob.includes('ሔ')).toBe(false)
    expect(blob.includes('እግዚኣብሄር')).toBe(true)
    expect(blob.includes('ዮናስ')).toBe(true)
    expect(blob.includes('ነነዌ')).toBe(true)
    expect(blob.includes('ተርሴስ')).toBe(true)
    expect(blob.includes('ዓሳ')).toBe(true)
    expect(blob.includes('ዓሣ')).toBe(false)
    expect(blob.includes('ንቑጽ')).toBe(true)
    expect(blob.includes('ንቑፅ')).toBe(false)
    expect(blob.includes('ኣዘዞ')).toBe(true)
    expect(blob.includes('ማዕበል ደው በለ')).toBe(true)
    expect(blob.includes('ውሕጦ')).toBe(true)
    expect(blob.includes('ምሕረት')).toBe(true)
    expect(blob.includes('ይቕረ')).toBe(true)
    expect(blob.includes('ቅድም ሰምዕ')).toBe(true)
    expect(book.pages[2].geez.includes('ዓቢይ ማዕበል')).toBe(true)
    expect(book.pages[2].geez.includes('ዓባይ')).toBe(false)
    expect(book.pages[6].geez.includes('ዓባይ ዓሳ')).toBe(true)
    expect(book.pages[11].geez.includes('ቅድም ሰምዕ')).toBe(false)
    expect(book.pages.length).toBe(12)
    for (const page of book.pages) {
      expect(storyWords(page.geez).length, page.geez).toBeGreaterThan(0)
      expect(storyWords(page.geez).length, page.geez).toBeLessThanOrEqual(16)
      expect(page.latin && page.meaningEn && page.pictureHint).toBeTruthy()
      expect(page.familyIds).toEqual(familiesOfGeez(page.geez))
    }
    expect(book.question.geez).toBe('እንታይ ንዮናስ ውሕጦ?')
    expect(book.question.meaningEn).toBe('What swallowed Jonah?')
    expect(book.question.answers.filter((a) => a.ok)).toHaveLength(1)
    expect(book.question.answers.find((a) => a.ok).pic).toBe('🐟')
    expect(book.question.answers).toHaveLength(3)
  })

  it('sits behind the band-3 progress gate and leaves Moses and Amharic Jonah as they are', () => {
    expect(entry.free).toBe(false)
    expect(entry.shelf).toBe('bible')
    expect(entry.pack).toBe('ti')
    expect(entry.band).toBe(3)
    expect(entry.schoolPath).toBeUndefined()
    expect(storyUnlocked(entry, [])).toBe(false)
    expect(storyUnlocked(entry, chapter1)).toBe(false)
    expect(storyUnlocked(entry, chapter2)).toBe(false)
    expect(storyUnlocked(entry, chapter3.slice(0, -1))).toBe(false)
    expect(storyUnlocked(entry, chapter3)).toBe(true)
    expect(storyMissingFamilies(entry, chapter2).length).toBeGreaterThan(0)
    expect(storyMissingFamilies(entry, chapter3)).toEqual([])
    expect(storyUnlocked(bibleStoryTimeEntries()[0], [])).toBe(true)
    expect(bibleStoryTimeEntries()[1].band).toBe(1)
    expect(bibleStoryTimeEntries()[2].band).toBe(2)
    expect(storyUnlocked(bibleStoryTimeEntries()[2], chapter2)).toBe(true)
    expectPublicArt(entry.cover, '/art/stories/bible-jonah-cover.webp')
    entry.pages.forEach((page, i) => {
      expectPublicArt(page.scene.src, `/art/stories/bible-jonah-${i + 1}.webp`)
      expect(page.g && page.lt && page.en && page.pic).toBeTruthy()
      expect(BGS.has(page.scene.bg)).toBe(true)
    })
    const amJonah = STORIES.find((s) => s.id === 'jonah')
    expect(amJonah.title.g).toBe('ዮናስና ዓሣ')
    expect(amJonah.band).toBe(3)
    expect(amJonah.pack).toBe('am')
    expect(storyUnlocked(amJonah, [])).toBe(false)
    expect(amJonah.pages.map((p) => p.g)).toEqual([
      'ዮናስ ከእግዚአብሔር ሸሸ።',
      'ትልቅ ማዕበል መጣ።',
      'ትልቅ ዓሣ ዋጠው።',
      'ዮናስ ጸለየ።',
      'ዓሣው መልሶ አወጣው።',
    ])
  })
})
