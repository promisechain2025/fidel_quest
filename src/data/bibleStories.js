/* ============================================================================
   BIBLE STORIES — a separate Tigrinya shelf, not the Story Path
   ----------------------------------------------------------------------------
   The School Path pack (schoolPathGr1Stories) is the everyday diaspora
   shelf. This module is the Bible shelf. Amharic Story Time is untouched.

   Book 1, ኣብ መጀመርታ: a kid paraphrase of the beginning (Genesis 1-2).
   Each line names the weekday. Sunday starts the work, Friday is the
   people, Saturday is the rest. Land and plants share Tuesday.

   Book 2, መርከብ ኖህ: a kid paraphrase of Noah (Genesis 6-9). Eleven
   connected lines. People do ክፋእ. Noah is ፃድቕ and obeys. God is not
   drawn. "They built" is ሰርሑ, so the line does not use ሔ.

   ORTHOGRAPHY: ትመ15 spells God እግዚኣብሄር with ሄ, not ሔ, and spells Noah
   ኖህ (ህ, not ሕ). Righteous is ፃድቕ. The ark is መርከብ. He shut it ዓፀዎ.
   They went out ወፁ. The dove is ርግቢ; he sent her ሰደዳ; she returned
   ተመለሰት holding ቘፅሊ ኣውሊዕ. The dry land is ነቒጣ. The bow is ቀስቲ.
   The promise is ኪዳን (Genesis 9 ኪዳነይ). Rain keeps the pack word ዝናብ;
   ትመ15 writes ዝናም. Creation's "good" stays ጽቡቕ.

   UNLOCK: the Creation book is `free: true`. Noah is not. It uses the
   ordinary band-1 progress gate (the 8th family, the same gate as the
   Amharic band-1 library). It does not change Creation, School Path, or
   Amharic unlocks, and it is not a Journey story node.
   ========================================================================== */

import raw from './bibleStories.json'
import { ETHIOPIC_SCRIPT } from '../script/ethiopic'

const MAN = { k: 'person', skin: '#6b3a22', hair: '#1a100c', cloth: '#efe4cf', hairStyle: 'short' }
const WOMAN = { k: 'person', skin: '#7a4030', hair: '#1a100c', cloth: '#8e3d45', blush: true }
const NOAH = { k: 'person', skin: '#6b3a22', hair: '#1a100c', cloth: '#c4b496', hairStyle: 'short', beard: true, beardColor: '#3a2a22' }
const WIFE = { k: 'person', skin: '#6b3a22', hair: '#1a100c', cloth: '#efe4cf', blush: true }
const CHILD = { k: 'person', skin: '#7a4030', hair: '#1a100c', cloth: '#8a9a78', hairStyle: 'short' }
const KIN = { k: 'person', skin: '#5c3318', hair: '#1a100c', cloth: '#8a9a78', hairStyle: 'short' }

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

/* Stamp scenes are the fallback if a painting file does not load.
   scene.src is the Meet-style painting. */
function painted(id, n, scene) {
  return { ...scene, src: `/art/stories/${id}-${n}.webp` }
}

const ART = {
  'bible-creation': {
    pics: ['✨', '☀️', '🌊', '🌳', '🌙', '🐦', '🧒', '🐑'],
    scenes: [
      painted('bible-creation', 1, { bg: 'night', items: [{ k: 'rays', x: 0.62, y: 0.4, s: 0.34 }] }),
      painted('bible-creation', 2, { bg: 'day', items: [] }),
      painted('bible-creation', 3, { bg: 'sea', items: [] }),
      painted('bible-creation', 4, { bg: 'garden', items: [{ k: 'fruitTree', x: 0.58, foot: 0.74, s: 0.42 }] }),
      painted('bible-creation', 5, { bg: 'day', items: [{ k: 'moon', x: 0.72, y: 0.28, s: 0.18 }] }),
      painted('bible-creation', 6, { bg: 'sea', items: [{ k: 'bird', x: 0.3, y: 0.28, s: 0.16 }, { k: 'bigFish', x: 0.62, y: 0.66, s: 0.32 }] }),
      painted('bible-creation', 7, { bg: 'garden', items: [{ ...MAN, x: 0.38, foot: 0.74, s: 0.34 }, { ...WOMAN, x: 0.64, foot: 0.74, s: 0.32 }] }),
      painted('bible-creation', 8, { bg: 'garden', items: [{ ...MAN, x: 0.36, foot: 0.76, s: 0.3 }, { ...WOMAN, x: 0.58, foot: 0.76, s: 0.28 }] }),
    ],
  },
  'bible-noah': {
    pics: ['🚶', '🙏', '🪵', '👨‍👩‍👧', '🚪', '🦁', '🌧️', '🌊', '🕊️', '👨‍👩‍👧', '🌈'],
    scenes: [
      painted('bible-noah', 1, { bg: 'field', items: [{ ...KIN, x: 0.3, foot: 0.76, s: 0.32 }, { ...KIN, x: 0.55, foot: 0.76, s: 0.3, cloth: '#c4b496' }] }),
      painted('bible-noah', 2, { bg: 'field', items: [{ ...NOAH, x: 0.48, foot: 0.74, s: 0.36 }] }),
      painted('bible-noah', 3, { bg: 'field', items: [{ ...NOAH, x: 0.3, foot: 0.76, s: 0.32 }, { k: 'ark', x: 0.68, y: 0.5, s: 0.4 }] }),
      painted('bible-noah', 4, { bg: 'field', items: [{ ...NOAH, x: 0.22, foot: 0.76, s: 0.3 }, { ...WIFE, x: 0.4, foot: 0.76, s: 0.28 }, { ...CHILD, x: 0.56, foot: 0.78, s: 0.2 }, { k: 'ark', x: 0.78, y: 0.5, s: 0.34 }] }),
      painted('bible-noah', 5, { bg: 'field', items: [{ k: 'ark', x: 0.72, y: 0.5, s: 0.36 }, { ...NOAH, x: 0.28, foot: 0.76, s: 0.28 }, { ...WIFE, x: 0.42, foot: 0.76, s: 0.26 }, { ...CHILD, x: 0.54, foot: 0.78, s: 0.18 }] }),
      painted('bible-noah', 6, { bg: 'field', items: [{ k: 'ark', x: 0.78, y: 0.5, s: 0.32 }, { k: 'lion', x: 0.18, foot: 0.76, s: 0.22 }, { k: 'lion', x: 0.34, foot: 0.76, s: 0.2 }, { k: 'bird', x: 0.5, y: 0.28, s: 0.14 }] }),
      painted('bible-noah', 7, { bg: 'sea', items: [{ k: 'ark', x: 0.5, y: 0.48, s: 0.44 }] }),
      painted('bible-noah', 8, { bg: 'sea', items: [{ k: 'ark', x: 0.55, y: 0.46, s: 0.36 }] }),
      painted('bible-noah', 9, { bg: 'day', items: [{ ...NOAH, x: 0.62, foot: 0.78, s: 0.28 }, { k: 'bird', x: 0.38, y: 0.34, s: 0.18 }] }),
      painted('bible-noah', 10, { bg: 'field', items: [{ k: 'ark', x: 0.78, y: 0.55, s: 0.28 }, { ...NOAH, x: 0.28, foot: 0.8, s: 0.26 }, { ...WIFE, x: 0.44, foot: 0.8, s: 0.24 }, { ...CHILD, x: 0.58, foot: 0.82, s: 0.16 }] }),
      painted('bible-noah', 11, { bg: 'day', items: [{ k: 'rainbow', x: 0.5, y: 0.42, s: 0.72 }, { ...NOAH, x: 0.28, foot: 0.8, s: 0.24 }, { ...WIFE, x: 0.44, foot: 0.8, s: 0.22 }, { k: 'ark', x: 0.78, y: 0.62, s: 0.24 }] }),
    ],
  },
}

function freezePage(page) {
  return Object.freeze({
    geez: page.geez,
    latin: page.latin,
    meaningEn: page.meaningEn,
    pictureHint: page.pictureHint,
    familyIds: Object.freeze(familiesOfGeez(page.geez)),
  })
}

const stories = (raw.stories || []).map((story) => Object.freeze({
  id: story.id,
  titleEn: story.titleEn,
  titleTi: story.titleTi,
  latinTitle: story.latinTitle || '',
  free: !!story.free,
  refrain: story.refrain
    ? Object.freeze({
      ...story.refrain,
      familyIds: Object.freeze(familiesOfGeez(story.refrain.geez)),
    })
    : null,
  question: story.question ? Object.freeze({
    geez: story.question.geez,
    meaningEn: story.question.meaningEn,
    answers: Object.freeze((story.question.answers || []).map((a) => Object.freeze({ ...a }))),
  }) : null,
  pages: Object.freeze((story.pages || []).map(freezePage)),
}))

export const BIBLE_SHELF = Object.freeze({
  id: 'bible',
  titleTi: 'መጽሓፍ ቅዱስ',
  titleEn: 'Bible Stories',
})

export const BIBLE_STORIES_PACK = Object.freeze({
  id: raw.id,
  label: raw.label,
  packId: raw.packId,
  shelf: raw.shelf,
  source: raw.source,
  stories,
})

export const BIBLE_STORIES = BIBLE_STORIES_PACK.stories

/**
 * Story Time shape for the Tigrinya Bible shelf. School Path stories stay
 * in schoolPathGr1Stories.js. Amharic biblical tracks stay in platform/stories.js.
 */
export function bibleStoryTimeEntries() {
  return BIBLE_STORIES.map((story) => {
    const art = ART[story.id] || { pics: [], scenes: [] }
    return {
      id: story.id,
      pack: 'ti',
      shelf: 'bible',
      free: story.free,
      band: 1,
      title: { g: story.titleTi, lt: story.latinTitle, en: story.titleEn },
      refrain: story.refrain,
      cover: `/art/stories/${story.id}-cover.webp`,
      pages: story.pages.map((page, i) => ({
        g: page.geez,
        lt: page.latin,
        en: page.meaningEn,
        pic: art.pics[i] || '📖',
        pictureHint: page.pictureHint,
        familyIds: page.familyIds,
        scene: art.scenes[i] || { bg: 'day', items: [] },
      })),
      q: story.question ? {
        g: story.question.geez,
        en: story.question.meaningEn,
        a: story.question.answers.map((a) => ({ pic: a.pic, ok: !!a.ok, alt: a.alt })),
      } : null,
    }
  })
}
