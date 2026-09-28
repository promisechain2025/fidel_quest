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

/* Picture-book panels for StoryScene. Hints in the JSON stay the art brief;
   these stamps are the code-drawn stand-in already used by Story Time. */
const ART = {
  'where-is-sam': {
    pics: ['🧒', '☕', '💧', '🛏️', '🐶'],
    scenes: [
      { bg: 'indoor', items: [{ ...KID, x: 0.42, foot: 0.78, s: 0.34 }] },
      { bg: 'kitchen', items: [{ k: 'pot', x: 0.55, y: 0.48, s: 0.28 }] },
      { bg: 'indoor', items: [{ k: 'water', x: 0.55, y: 0.5, s: 0.28 }] },
      { bg: 'indoor', items: [{ k: 'zzz', x: 0.62, y: 0.36, s: 0.16 }] },
      { bg: 'indoor', items: [{ ...KID, x: 0.36, foot: 0.78, s: 0.32 }, { k: 'dog', x: 0.68, y: 0.58, s: 0.28 }] },
    ],
    question: {
      en: 'Who is with Sam at the end?',
      a: [{ pic: '🐶', ok: true }, { pic: '☕', ok: false }, { pic: '💧', ok: false }],
    },
  },
  'walk-to-school': {
    pics: ['🚶', '🐶', '🐦', '🐫', '🐔', '🐐', '🍈', '🏫'],
    scenes: [
      { bg: 'field', items: [{ ...KID, x: 0.4, foot: 0.76, s: 0.32 }] },
      { bg: 'field', items: [{ k: 'dog', x: 0.55, y: 0.58, s: 0.3 }] },
      { bg: 'field', items: [{ k: 'bird', x: 0.62, y: 0.32, s: 0.2 }] },
      { bg: 'field', items: [{ k: '🐫', x: 0.55, y: 0.52, s: 0.34 }] },
      { bg: 'field', items: [{ k: '🐔', x: 0.55, y: 0.58, s: 0.28 }] },
      { bg: 'field', items: [{ k: '🐐', x: 0.55, y: 0.56, s: 0.3 }] },
      { bg: 'field', items: [{ ...KID, x: 0.34, foot: 0.76, s: 0.3 }, { k: '🍈', x: 0.66, y: 0.55, s: 0.22 }] },
      { bg: 'day', items: [{ k: 'house', x: 0.58, y: 0.48, s: 0.36 }, { ...KID, x: 0.28, foot: 0.78, s: 0.28 }] },
    ],
    question: {
      en: 'Where did the child arrive?',
      a: [{ pic: '🏫', ok: true }, { pic: '🌙', ok: false }, { pic: '🐍', ok: false }],
    },
  },
  'coffee-with-grandma': {
    pics: ['☕', '🍵', '🥛', '👵', '🧒'],
    scenes: [
      { bg: 'kitchen', items: [{ k: 'pot', x: 0.52, y: 0.48, s: 0.3 }] },
      { bg: 'kitchen', items: [{ k: '☕', x: 0.52, y: 0.46, s: 0.26 }] },
      { bg: 'kitchen', items: [{ k: 'milk', x: 0.52, y: 0.48, s: 0.26 }] },
      { bg: 'kitchen', items: [{ ...GRANDMA, x: 0.46, foot: 0.8, s: 0.36 }, { k: '☕', x: 0.72, y: 0.5, s: 0.18 }] },
      { bg: 'kitchen', items: [{ ...KID, x: 0.38, foot: 0.8, s: 0.3 }, { k: 'milk', x: 0.66, y: 0.52, s: 0.2 }] },
    ],
    question: {
      en: 'What did grandma drink from?',
      a: [{ pic: '☕', ok: true }, { pic: '🐎', ok: false }, { pic: '☀️', ok: false }],
    },
  },
  'baby-wont-sleep': {
    pics: ['👶', '🎵', '🤗', '🥛', '😴'],
    scenes: [
      { bg: 'night', items: [{ ...KID, x: 0.5, foot: 0.78, s: 0.3 }] },
      { bg: 'indoor', items: [{ ...MOM, x: 0.42, foot: 0.78, s: 0.36 }, { k: 'note', x: 0.7, y: 0.32, s: 0.14 }] },
      { bg: 'indoor', items: [{ ...MOM, x: 0.42, foot: 0.78, s: 0.36 }, { k: 'heart', x: 0.68, y: 0.36, s: 0.12 }] },
      { bg: 'indoor', items: [{ ...KID, x: 0.36, foot: 0.8, s: 0.28 }, { k: 'milk', x: 0.66, y: 0.52, s: 0.22 }] },
      { bg: 'indoor', items: [{ ...KID, x: 0.46, foot: 0.8, s: 0.28 }, { k: 'zzz', x: 0.68, y: 0.32, s: 0.16 }] },
    ],
    question: {
      en: 'What did the baby drink?',
      a: [{ pic: '🥛', ok: true }, { pic: '🚂', ok: false }, { pic: '🐍', ok: false }],
    },
  },
  'sun-all-week': {
    pics: ['☀️', '☀️', '☀️', '☀️', '☀️', '🧺', '☀️', '☀️'],
    scenes: [
      { bg: 'day', items: [] },
      { bg: 'day', items: [{ k: 'bird', x: 0.3, y: 0.34, s: 0.14 }] },
      { bg: 'field', items: [] },
      { bg: 'day', items: [{ k: 'house', x: 0.72, y: 0.5, s: 0.28 }] },
      { bg: 'field', items: [{ k: '🐑', x: 0.7, y: 0.62, s: 0.22 }] },
      { bg: 'field', items: [{ k: 'basket', x: 0.62, y: 0.58, s: 0.24 }, { ...KID, x: 0.32, foot: 0.78, s: 0.28 }] },
      { bg: 'day', items: [{ ...KID, x: 0.4, foot: 0.78, s: 0.28 }, { ...MOM, x: 0.66, foot: 0.76, s: 0.32 }] },
      { bg: 'day', items: [{ k: 'rays', x: 0.5, y: 0.28, s: 0.22 }] },
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
