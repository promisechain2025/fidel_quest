/* ============================================================================
   BIBLE STORIES — a separate Tigrinya book, not the Story Path
   ----------------------------------------------------------------------------
   The School Path pack (schoolPathGr1Stories) is the everyday diaspora
   shelf. This module is the Bible shelf. The first book is a kid-level
   paraphrase of the beginning (Genesis 1-2): eight short original lines.
   Each line names the weekday. Sunday starts the work, Friday is the
   people, Saturday is the rest. Land and plants share Tuesday, the
   third day. Amharic Story Time is untouched.

   ORTHOGRAPHY: ትመ15 spells God እግዚኣብሄር with ሄ, not ሔ. Genesis 1
   calls the trees ኣእዋም. The grass line keeps the pack word ሳዕሪ.
   "Good" stays ጽቡቕ, the spelling the rest of eGeez Tigrinya uses.

   UNLOCK: `free: true`. The book opens with no families learned, so a
   family can read it on the first day and a reviewer can open it without
   finishing School Path units. Later books can name a gate. This book
   does not change School Path unlocks and is not a Journey story node.
   ========================================================================== */

import raw from './bibleStories.json'
import { ETHIOPIC_SCRIPT } from '../script/ethiopic'

const MAN = { k: 'person', skin: '#6b3a22', hair: '#1a100c', cloth: '#efe4cf', hairStyle: 'short' }
const WOMAN = { k: 'person', skin: '#7a4030', hair: '#1a100c', cloth: '#8e3d45', blush: true }

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
