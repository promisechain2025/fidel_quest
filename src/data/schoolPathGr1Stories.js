/* ============================================================================
   STORY PATH — Grade 1 reading (Tigrinya)
   ----------------------------------------------------------------------------
   Five original diaspora stories. Pedagogy shapes come from the GR1
   Reading Book (refrain, rooms, animal walk, care, sun-through-the-week).
   Titles, lines, and picture hints are eGeez's own. Biblical Story Time
   stays on the Amharic pack; these entries join the library only for `ti`.
   See docs/school-path.md.
   ========================================================================== */

import raw from './schoolPathGr1Stories.json'
import { SCHOOL_PATH_UNITS } from './schoolPathGr1'

const KID = { k: 'person', skin: '#c98a5a', hair: '#241812', cloth: '#3f8f7a', blush: true, hairStyle: 'short' }
const MOM = { k: 'person', robe: true, head: 'scarf', headColor: '#c45a6a', skin: '#c98a5a', cloth: '#d9642e' }
const GRANDMA = { k: 'person', robe: true, head: 'scarf', headColor: '#6d84c9', skin: '#c98a5a', cloth: '#8a6a9a' }

/* Picture-book panels. scene.src is the Meet-style painting. The stamp
   scene stays as the fallback if that file does not load. */
function painted(id, n, scene) {
  return { ...scene, src: `/art/stories/${id}-${n}.webp` }
}

const ART = {
  'where-is-sam': {
    pics: ['🧒', '☕', '🏠', '🛏️', '🐶'],
    scenes: [
      painted('where-is-sam', 1, { bg: 'indoor', items: [{ ...KID, x: 0.42, foot: 0.78, s: 0.34 }] }),
      painted('where-is-sam', 2, { bg: 'kitchen', items: [{ k: 'pot', x: 0.55, y: 0.48, s: 0.28 }] }),
      painted('where-is-sam', 3, { bg: 'day', items: [{ k: 'house', x: 0.55, y: 0.48, s: 0.36 }] }),
      painted('where-is-sam', 4, { bg: 'indoor', items: [{ k: 'zzz', x: 0.62, y: 0.36, s: 0.16 }] }),
      painted('where-is-sam', 5, { bg: 'indoor', items: [{ ...KID, x: 0.36, foot: 0.78, s: 0.32 }, { k: 'dog', x: 0.68, y: 0.58, s: 0.28 }] }),
    ],
    question: {
      en: 'Who is with Sam at the end?',
      a: [{ pic: '🐶', ok: true }, { pic: '☕', ok: false }, { pic: '🏠', ok: false }],
    },
  },
  'walk-to-school': {
    pics: ['🚶', '🐶', '🐦', '🐫', '🐔', '🐐', '🍈', '🏫'],
    scenes: [
      painted('walk-to-school', 1, { bg: 'field', items: [{ ...KID, x: 0.4, foot: 0.76, s: 0.32 }] }),
      painted('walk-to-school', 2, { bg: 'field', items: [{ k: 'dog', x: 0.55, y: 0.58, s: 0.3 }] }),
      painted('walk-to-school', 3, { bg: 'field', items: [{ k: 'bird', x: 0.62, y: 0.32, s: 0.2 }] }),
      painted('walk-to-school', 4, { bg: 'field', items: [{ k: '🐫', x: 0.55, y: 0.52, s: 0.34 }] }),
      painted('walk-to-school', 5, { bg: 'field', items: [{ k: '🐔', x: 0.55, y: 0.58, s: 0.28 }] }),
      painted('walk-to-school', 6, { bg: 'field', items: [{ k: '🐐', x: 0.55, y: 0.56, s: 0.3 }] }),
      painted('walk-to-school', 7, { bg: 'field', items: [{ ...KID, x: 0.34, foot: 0.76, s: 0.3 }, { k: '🍈', x: 0.66, y: 0.55, s: 0.22 }] }),
      painted('walk-to-school', 8, { bg: 'day', items: [{ k: 'house', x: 0.58, y: 0.48, s: 0.36 }, { ...KID, x: 0.28, foot: 0.78, s: 0.28 }] }),
    ],
    question: {
      en: 'Where did the child arrive?',
      a: [{ pic: '🏫', ok: true }, { pic: '🌙', ok: false }, { pic: '🐍', ok: false }],
    },
  },
  'coffee-with-grandma': {
    pics: ['☕', '🍵', '🥛', '👵', '🧒'],
    scenes: [
      painted('coffee-with-grandma', 1, { bg: 'kitchen', items: [{ k: 'pot', x: 0.52, y: 0.48, s: 0.3 }] }),
      painted('coffee-with-grandma', 2, { bg: 'kitchen', items: [{ k: '☕', x: 0.52, y: 0.46, s: 0.26 }] }),
      painted('coffee-with-grandma', 3, { bg: 'kitchen', items: [{ k: 'milk', x: 0.52, y: 0.48, s: 0.26 }] }),
      painted('coffee-with-grandma', 4, { bg: 'kitchen', items: [{ ...GRANDMA, x: 0.46, foot: 0.8, s: 0.36 }, { k: '☕', x: 0.72, y: 0.5, s: 0.18 }] }),
      painted('coffee-with-grandma', 5, { bg: 'kitchen', items: [{ ...KID, x: 0.38, foot: 0.8, s: 0.3 }, { k: 'milk', x: 0.66, y: 0.52, s: 0.2 }] }),
    ],
    question: {
      en: 'What did grandma drink from?',
      a: [{ pic: '☕', ok: true }, { pic: '🐎', ok: false }, { pic: '☀️', ok: false }],
    },
  },
  'baby-wont-sleep': {
    pics: ['👶', '🎵', '🤗', '🥛', '😴'],
    scenes: [
      painted('baby-wont-sleep', 1, { bg: 'night', items: [{ ...KID, x: 0.5, foot: 0.78, s: 0.3 }] }),
      painted('baby-wont-sleep', 2, { bg: 'indoor', items: [{ ...MOM, x: 0.42, foot: 0.78, s: 0.36 }, { k: 'note', x: 0.7, y: 0.32, s: 0.14 }] }),
      painted('baby-wont-sleep', 3, { bg: 'indoor', items: [{ ...MOM, x: 0.42, foot: 0.78, s: 0.36 }, { k: 'heart', x: 0.68, y: 0.36, s: 0.12 }] }),
      painted('baby-wont-sleep', 4, { bg: 'indoor', items: [{ ...KID, x: 0.36, foot: 0.8, s: 0.28 }, { k: 'milk', x: 0.66, y: 0.52, s: 0.22 }] }),
      painted('baby-wont-sleep', 5, { bg: 'indoor', items: [{ ...KID, x: 0.46, foot: 0.8, s: 0.28 }, { k: 'zzz', x: 0.68, y: 0.32, s: 0.16 }] }),
    ],
    question: {
      en: 'What did the baby drink?',
      a: [{ pic: '🥛', ok: true }, { pic: '🚂', ok: false }, { pic: '🐍', ok: false }],
    },
  },
  'sun-all-week': {
    pics: ['☀️', '☀️', '☀️', '☀️', '☀️', '🧺', '☀️', '☀️'],
    scenes: [
      painted('sun-all-week', 1, { bg: 'day', items: [] }),
      painted('sun-all-week', 2, { bg: 'day', items: [{ k: 'bird', x: 0.3, y: 0.34, s: 0.14 }] }),
      painted('sun-all-week', 3, { bg: 'field', items: [] }),
      painted('sun-all-week', 4, { bg: 'day', items: [{ k: 'house', x: 0.72, y: 0.5, s: 0.28 }] }),
      painted('sun-all-week', 5, { bg: 'field', items: [{ k: '🐑', x: 0.7, y: 0.62, s: 0.22 }] }),
      painted('sun-all-week', 6, { bg: 'field', items: [{ k: 'basket', x: 0.62, y: 0.58, s: 0.24 }, { ...KID, x: 0.32, foot: 0.78, s: 0.28 }] }),
      painted('sun-all-week', 7, { bg: 'day', items: [{ ...KID, x: 0.4, foot: 0.78, s: 0.28 }, { ...MOM, x: 0.66, foot: 0.76, s: 0.32 }] }),
      painted('sun-all-week', 8, { bg: 'day', items: [{ k: 'rays', x: 0.5, y: 0.28, s: 0.22 }] }),
    ],
    question: {
      en: 'What shone all week?',
      a: [{ pic: '☀️', ok: true }, { pic: '🐶', ok: false }, { pic: '🩴', ok: false }],
    },
  },
}

function freezePage(page) {
  return Object.freeze({
    geez: page.geez,
    latin: page.latin,
    meaningEn: page.meaningEn,
    pictureHint: page.pictureHint,
    familyIds: Object.freeze([...(page.familyIds || [])]),
  })
}

const stories = (raw.stories || []).map((story) => Object.freeze({
  id: story.id,
  titleEn: story.titleEn,
  titleTi: story.titleTi,
  latinTitle: story.latinTitle || '',
  unlockAfterUnitId: story.unlockAfterUnitId,
  refrain: story.refrain ? Object.freeze({ ...story.refrain, familyIds: Object.freeze([...(story.refrain.familyIds || [])]) }) : null,
  pages: Object.freeze((story.pages || []).map(freezePage)),
}))

export const SCHOOL_PATH_GR1_STORIES = Object.freeze({
  id: raw.id,
  label: raw.label,
  packId: raw.packId,
  source: raw.source,
  stories,
})

export const SCHOOL_PATH_STORIES = SCHOOL_PATH_GR1_STORIES.stories
export const SCHOOL_PATH_STORY_COUNT = SCHOOL_PATH_STORIES.length

/** Family ids introduced from unit 1 through this unit, in School Path order. */
export function familiesThroughUnit(unitId, pathUnits = SCHOOL_PATH_UNITS) {
  const idx = pathUnits.findIndex((u) => u.id === unitId)
  if (idx < 0) return []
  const ids = []
  for (const unit of pathUnits.slice(0, idx + 1)) {
    for (const id of unit.familyIds) if (!ids.includes(id)) ids.push(id)
  }
  return ids
}

function bandForUnit(unitId, pathUnits = SCHOOL_PATH_UNITS) {
  const idx = pathUnits.findIndex((u) => u.id === unitId)
  if (idx < 0) return 4
  const size = Math.max(1, Math.ceil(pathUnits.length / 4))
  return Math.min(4, Math.floor(idx / size) + 1)
}

/**
 * Story Time shape for the Tigrinya pack. Biblical stories stay in
 * platform/stories.js and are not rewritten here.
 */
export function schoolPathStoryTimeEntries(pathUnits = SCHOOL_PATH_UNITS) {
  return SCHOOL_PATH_STORIES.map((story) => {
    const art = ART[story.id] || { pics: [], scenes: [], question: null }
    const gateFamilyIds = familiesThroughUnit(story.unlockAfterUnitId, pathUnits)
    return {
      id: story.id,
      pack: 'ti',
      schoolPath: true,
      band: bandForUnit(story.unlockAfterUnitId, pathUnits),
      unlockAfterUnitId: story.unlockAfterUnitId,
      gateFamilyIds,
      title: { g: story.titleTi, lt: story.latinTitle, en: story.titleEn },
      refrain: story.refrain,
      pages: story.pages.map((page, i) => ({
        g: page.geez,
        lt: page.latin,
        en: page.meaningEn,
        pic: art.pics[i] || '📖',
        pictureHint: page.pictureHint,
        familyIds: page.familyIds,
        scene: art.scenes[i] || { bg: 'day', items: [] },
      })),
      q: art.question,
    }
  })
}
