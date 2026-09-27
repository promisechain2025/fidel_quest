/* ============================================================================
   SCHOOL PATH — Grade 1 Alphabet (Tigrinya)
   ----------------------------------------------------------------------------
   MoE Eritrea Mother Tongue GR1 teaching ORDER, encoded as original eGeez
   units. This is not textbook text or art: picture words and blends are
   eGeez content sequenced the way the Grade 1 alphabet introduces families.
   See docs/school-path.md.

   The unit list is the source of truth (src/data/schoolPathGr1.json). When
   the Tigrinya pack is active, journey.js builds the spine from these units.
   Amharic keeps the chapter-of-8 path.
   ========================================================================== */

import raw from './schoolPathGr1.json'
import { ETHIOPIC_SCRIPT } from '../script/ethiopic'
import { TI_PACK } from '../packs/ti'
import { getActivePackId, packFamilies } from '../platform/ethiopic'

export const SCHOOL_PATH_PACK_ID = 'ti'

const units = (raw.units || []).map((unit, i) => Object.freeze({
  id: unit.id,
  index: i + 1,
  titleEn: unit.titleEn,
  familyIds: Object.freeze([...(unit.familyIds || [])]),
  pictureWords: Object.freeze([...(unit.pictureWords || [])]),
  blendWords: Object.freeze([...(unit.blendWords || [])]),
  note: unit.note || null,
}))

export const SCHOOL_PATH_GR1 = Object.freeze({
  id: raw.id,
  label: raw.label,
  packId: raw.packId,
  source: raw.source,
  units,
})

export const SCHOOL_PATH_UNITS = SCHOOL_PATH_GR1.units

/** School Path is the Tigrinya spine. Default on whenever that pack is active. */
export function schoolPathActive(packId = getActivePackId()) {
  return packId === SCHOOL_PATH_PACK_ID && SCHOOL_PATH_GR1.packId === SCHOOL_PATH_PACK_ID
}

/** Family ids the Tigrinya pack actually teaches (includes qhe, excludes nothing else). */
export function tiPackFamilyIds() {
  return packFamilies(ETHIOPIC_SCRIPT, TI_PACK).map((f) => f.id)
}

/**
 * Coverage of the unit list against a pack's families.
 * ok when every pack family appears once and the units add no strangers.
 */
export function schoolPathFamilyCoverage(packFamilyIds = tiPackFamilyIds(), pathUnits = SCHOOL_PATH_UNITS) {
  const listed = pathUnits.flatMap((u) => u.familyIds)
  const seen = new Set()
  const dupes = []
  for (const id of listed) {
    if (seen.has(id)) dupes.push(id)
    seen.add(id)
  }
  const pack = new Set(packFamilyIds)
  const missing = packFamilyIds.filter((id) => !seen.has(id))
  const extra = listed.filter((id) => !pack.has(id))
  return {
    ok: dupes.length === 0 && missing.length === 0 && extra.length === 0,
    dupes,
    missing,
    extra,
    listed,
  }
}

/** Split units into N bands (the four arcade chapters). Units are never split. */
export function schoolPathBands(pathUnits = SCHOOL_PATH_UNITS, bandCount = 4) {
  const size = Math.max(1, Math.ceil(pathUnits.length / bandCount))
  const bands = []
  for (let i = 0; i < bandCount; i++) {
    const band = pathUnits.slice(i * size, (i + 1) * size)
    if (band.length) bands.push(band)
  }
  return bands
}

export function unitForFamily(familyId, pathUnits = SCHOOL_PATH_UNITS) {
  return pathUnits.find((u) => u.familyIds.includes(familyId)) || null
}

export function pictureWordForFamily(familyId, pathUnits = SCHOOL_PATH_UNITS) {
  for (const unit of pathUnits) {
    const hit = (unit.pictureWords || []).find((w) => w.familyId === familyId)
    if (hit) return { ...hit, unitId: unit.id, unitIndex: unit.index }
  }
  return null
}

function packWordList(packFamily) {
  if (!packFamily) return []
  if (Array.isArray(packFamily.words) && packFamily.words.length) return packFamily.words.filter(Boolean)
  if (packFamily.word) return [packFamily.word]
  return []
}

/**
 * Letter Steps Meet picture for a family.
 * School Path on: the unit pictureWord wins when the unit names one, and a
 * matching pack word supplies the picture/latin already drawn in the app.
 * Otherwise the pack's own word (the fallback).
 */
export function meetPictureForFamily(familyId, { active = schoolPathActive(), packFamily = null, pathUnits = SCHOOL_PATH_UNITS } = {}) {
  const packList = packWordList(packFamily)
  const unitWord = active ? pictureWordForFamily(familyId, pathUnits) : null
  if (unitWord) {
    const match = packList.find((w) => w.geez === unitWord.geez)
    if (match) {
      return {
        ...match,
        familyId,
        meaning: match.meaning || unitWord.meaningEn,
        fromSchoolPath: true,
        unitId: unitWord.unitId,
      }
    }
    return {
      familyId,
      geez: unitWord.geez,
      meaning: unitWord.meaningEn,
      pictureHint: unitWord.pictureHint,
      fromSchoolPath: true,
      unitId: unitWord.unitId,
    }
  }
  const fallback = packList[0]
  if (!fallback) return null
  return { ...fallback, familyId, fromSchoolPath: false }
}

/** Blend words whose letters are all in the learned set. P1 Word Build reads this. */
export function blendWordsForLearned(learnedIds, pathUnits = SCHOOL_PATH_UNITS) {
  const learned = learnedIds instanceof Set ? learnedIds : new Set(learnedIds || [])
  const out = []
  for (const unit of pathUnits) {
    for (const word of unit.blendWords || []) {
      const needs = word.familyIds || []
      if (needs.every((id) => learned.has(id))) out.push({ ...word, unitId: unit.id })
    }
  }
  return out
}

function distinctSounds(familyIds) {
  const sounds = new Set()
  for (const id of familyIds) sounds.add(TI_PACK.families[id]?.consonant ?? id)
  return sounds.size
}

/**
 * A quiz-level spec scoped to exactly these families. questionCount stays 8
 * (the existing boss length); optionCount shrinks only when the unit does
 * not have four distinct sounds, so a two-family unit is still answerable.
 */
export function quizSpecForFamilies(familyIds, {
  vowel = false,
  levelId,
  title = 'Quiz',
  unitId = null,
  unitIndex = null,
} = {}) {
  const families = familyIds.slice()
  const sounds = distinctSounds(families)
  const optionCount = Math.max(2, Math.min(4, sounds || 2))
  const questionCount = 8
  const pool = []
  if (families.length) {
    while (pool.length < questionCount) {
      for (const id of families) {
        pool.push(`${id}-1`)
        if (pool.length >= questionCount) break
      }
    }
  }
  return {
    id: levelId,
    n: unitIndex,
    kind: vowel ? 'orders' : 'base',
    title,
    blurb: unitIndex ? schoolPathLabel(unitIndex) : 'School Path',
    families,
    pool,
    questionCount,
    optionCount,
    orderMix: vowel ? 0 : 2,
    unitId,
    schoolPath: true,
  }
}

/** Parent-facing English chrome. Learning content stays Tigrinya; this label does not. */
export function schoolPathLabel(unitIndex) {
  return unitIndex ? `School Path · Unit ${unitIndex}` : 'School Path'
}
