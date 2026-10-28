/* ============================================================================
   PLACES — the journey's sections
   ----------------------------------------------------------------------------
   Owner's decision (Oct 2026): no city or place names anywhere. The chapter
   bands, the 3D Runner levels and the Skylands islands are generic numbered
   sections ('Section N', translated through t()). Each pack keeps its own
   palette and procedural scenery (`builder`/`landmark`), which has no text.
   ========================================================================== */
import { getActivePackId } from './ethiopic'
import { t } from './i18n'

export const sectionName = (n) => t('sectionN', `Section ${n}`, { n })

/* Chapter bands on the home path: 4 letter chapters + the vowel lap. */
const CHAPTER_COUNT = 5

/* Letter Runner levels: section number + palette + scenery builder. */
const RUNNER = {
  am: [
    { id: 'section1', sky: 0x9cc9e8, ground: 0x96653f, fog: [45, 170], builder: 'rockchurch' },
    { id: 'section2', sky: 0xaed4ea, ground: 0xb99b62, fog: [45, 170], builder: 'stelae' },
    { id: 'section3', sky: 0x9fc6e0, ground: 0x5e8f4e, fog: [40, 150], builder: 'highlands' },
    { id: 'section4', sky: 0xa9cfe6, ground: 0x7c8a56, fog: [45, 170], builder: 'castle' },
    { id: 'section5', sky: 0xa5d8ee, ground: 0x7fae6a, fog: [50, 180], builder: 'coast' },
    { id: 'section6', sky: 0xb7d8ea, ground: 0x9aa0a8, fog: [45, 170], builder: 'town' },
  ],
  ti: [
    { id: 'section1', sky: 0xaed4ea, ground: 0xb99b62, fog: [45, 170], builder: 'stelae' },
    { id: 'section2', sky: 0xb7d8ea, ground: 0x9aa0a8, fog: [45, 170], builder: 'town' },
    { id: 'section3', sky: 0xa9cfe6, ground: 0x9c8a56, fog: [45, 170], builder: 'castle' },
    { id: 'section4', sky: 0xa5d8ee, ground: 0xe2d3b3, fog: [50, 180], builder: 'coast' },
    { id: 'section5', sky: 0x9fc6e0, ground: 0x5e8f4e, fog: [40, 150], builder: 'highlands' },
    { id: 'section6', sky: 0xa5d8ee, ground: 0xe8ddb9, fog: [50, 180], builder: 'coast' },
  ],
}

/* Skylands islands: 4 sessions, colors + landmark kind. */
const SKYLANDS = {
  am: [
    { rock: '#9a6a45', grass: '#8fbf5a', landmark: 'rockchurch' },
    { rock: '#b3905c', grass: '#a8c060', landmark: 'stelae' },
    { rock: '#7d8a63', grass: '#6fae58', landmark: 'highlands' },
    { rock: '#8a7a55', grass: '#93b768', landmark: 'rockchurch' },
  ],
  ti: [
    { rock: '#b3905c', grass: '#a8c060', landmark: 'stelae' },
    { rock: '#7d8a63', grass: '#6fae58', landmark: 'highlands' },
    { rock: '#9a6a45', grass: '#9fb35f', landmark: 'rockchurch' },
    { rock: '#c9b489', grass: '#9fc987', landmark: 'coast' },
  ],
}

const packOr = (table) => table[getActivePackId()] || table.am

export const chapterPlaces = () => Array.from({ length: CHAPTER_COUNT }, (_, i) => sectionName(i + 1))
export const runnerPlaces = () => packOr(RUNNER).map((r, i) => ({ ...r, name: sectionName(i + 1) }))
export const skylandsPlaces = () => packOr(SKYLANDS).map((r, i) => ({ ...r, place: sectionName(i + 1) }))
