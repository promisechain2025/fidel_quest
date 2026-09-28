import { describe, it, expect } from 'vitest'
import { TI_PACK } from '../packs/ti'
import { ETHIOPIC_SCRIPT } from '../script/ethiopic'
import { FREE_FAMILIES, NodeKind, JOURNEY, buildJourney, learnedFamilyIds } from '../journey'
import { learnInitial } from '../LearnLetters'
import { buildQuestionQueue } from '../FidelQuestApp'
import rawPath from './schoolPathGr1.json'
import {
  SCHOOL_PATH_UNITS,
  blendWordsForLearned,
  meetPictureForFamily,
  pictureWordForFamily,
  schoolPathFamilyCoverage,
  schoolPathLabel,
  tiPackFamilyIds,
} from './schoolPathGr1'

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

function wordsOf(geez) {
  return String(geez || '').split(/[፡-፨!?,.\s"'«»“”‘’]+/).filter(Boolean)
}

describe('school path coverage', () => {
  it('lists every Tigrinya family once and adds none', () => {
    const cov = schoolPathFamilyCoverage()
    expect(cov.ok).toBe(true)
    expect(cov.dupes).toEqual([])
    expect(cov.missing).toEqual([])
    expect(cov.extra).toEqual([])
    expect(cov.listed).toHaveLength(tiPackFamilyIds().length)
    expect(new Set(cov.listed)).toEqual(new Set(tiPackFamilyIds()))
  })

  it('keeps the free taste on ha and le, which are unit 1', () => {
    expect([...FREE_FAMILIES]).toEqual(['ha', 'le'])
    expect(SCHOOL_PATH_UNITS[0].familyIds).toEqual(['ha', 'le'])
  })
})

describe('meet picture preference', () => {
  it('uses the unit picture word ahead of a different pack word', () => {
    const word = meetPictureForFamily('ha', {
      active: true,
      packFamily: {
        words: [
          { geez: 'ሌላ', meaning: 'other', picture: 'other' },
          { geez: 'ሀሎ', latin: 'halo-ti', meaning: 'hello', picture: 'wave' },
        ],
      },
    })
    expect(word.geez).toBe('ሀሎ')
    expect(word.fromSchoolPath).toBe(true)
    expect(word.picture).toBe('wave')
    expect(word.meaning).toBe('hello')
  })

  it('keeps a unit word even when the pack has no matching spelling', () => {
    const word = meetPictureForFamily('le', {
      active: true,
      packFamily: { words: [{ geez: 'ላም', meaning: 'cow', picture: 'cow' }] },
    })
    expect(word.geez).toBe('ልቢ')
    expect(word.meaning).toBe('heart')
    expect(word.fromSchoolPath).toBe(true)
    expect(word.picture).toBeUndefined()
  })

  it('falls back to the pack word when the unit names none, or the path is off', () => {
    const off = meetPictureForFamily('ha', { active: false, packFamily: TI_PACK.families.ha })
    expect(off.geez).toBe('ሀሎ')
    expect(off.fromSchoolPath).toBe(false)
    const missing = meetPictureForFamily('sse', {
      active: true,
      packFamily: { word: { geez: 'ሠዓት', meaning: 'hour' } },
      pathUnits: [{ id: 'bare', index: 1, familyIds: ['sse'], pictureWords: [] }],
    })
    expect(missing.fromSchoolPath).toBe(false)
    expect(missing.geez).toBe('ሠዓት')
    // Letter Steps Meet reads this helper. With the Amharic pack pinned in
    // tests, School Path is off, so the first pack word is the fallback.
    expect(learnInitial('ha', 1).meetWord.geez).toBe('ሀገር')
    expect(learnInitial('ha', 1).meetWord.fromSchoolPath).toBe(false)
  })
})

describe('school path journey spine', () => {
  const ti = buildJourney('ti')
  const learns = ti.filter((n) => n.kind === NodeKind.LEARN)

  it('orders LEARN nodes by the unit family sequence, each family once', () => {
    expect(learns.map((n) => n.familyId)).toEqual(SCHOOL_PATH_UNITS.flatMap((u) => u.familyIds))
    expect(new Set(learns.map((n) => n.id)).size).toBe(learns.length)
  })

  it('scopes each unit quiz to that unit and keeps four arcade gateways', () => {
    const quizzes = ti.filter((n) => n.kind === NodeKind.QUIZ && !n.vowel)
    expect(quizzes).toHaveLength(SCHOOL_PATH_UNITS.length)
    quizzes.forEach((q, i) => {
      expect(q.families).toEqual([...SCHOOL_PATH_UNITS[i].familyIds])
      expect(q.quiz.families).toEqual([...SCHOOL_PATH_UNITS[i].familyIds])
      expect(q.quiz.schoolPath).toBe(true)
      expect(q.unitIndex).toBe(i + 1)
    })
    expect(ti.filter((n) => n.kind === NodeKind.ARCADE)).toHaveLength(4)
    expect(ti.filter((n) => n.kind === NodeKind.QUIZ && n.vowel)).toHaveLength(4)
    const vowel1 = ti.find((n) => n.id === 'vowel:1')
    expect(vowel1.families).toEqual(SCHOOL_PATH_UNITS.slice(0, 3).flatMap((u) => u.familyIds))
  })

  it('leaves the Amharic spine on chapters of eight', () => {
    const am = buildJourney('am')
    const amLearns = am.filter((n) => n.kind === NodeKind.LEARN)
    expect(amLearns.map((n) => n.familyId)).toEqual(
      JOURNEY.filter((n) => n.kind === NodeKind.LEARN).map((n) => n.familyId),
    )
    expect(amLearns).toHaveLength(33)
    expect(am.some((n) => n.unitId)).toBe(false)
    expect(am.some((n) => n.id === 'quiz:1')).toBe(true)
  })

  it('feeds Runner and Catch only families whose LEARN node is done', () => {
    const p = { version: 1, done: {}, collection: { owned: [], worn: {} } }
    for (const n of ti) {
      if (n.kind === NodeKind.LEARN && n.unitId === 'u01') p.done[n.id] = { stars: 3 }
    }
    expect(learnedFamilyIds(p, ti)).toEqual(['ha', 'le'])
    expect(learnedFamilyIds(p, ti)).not.toContain('hha')
  })

  it('builds a unit quiz whose questions stay inside the unit', () => {
    const quiz = ti.find((n) => n.id === 'quiz:u01').quiz
    expect(quiz.optionCount).toBe(2)
    expect(quiz.questionCount).toBe(8)
    const [queue] = buildQuestionQueue(quiz, 7)
    expect(queue).toHaveLength(8)
    for (const q of queue) {
      expect(q.options.length).toBeGreaterThanOrEqual(2)
      for (const key of [q.target, ...q.options]) {
        expect(key.startsWith('ha-') || key.startsWith('le-')).toBe(true)
      }
    }
  })
})

describe('picture words match their family', () => {
  it('maps each Meet word’s first fidel to the declared family', () => {
    for (const unit of SCHOOL_PATH_UNITS) {
      for (const word of unit.pictureWords) {
        expect(familyOfChar([...word.geez][0]), word.geez).toBe(word.familyId)
      }
    }
  })

  it('lists every family a blend actually spells', () => {
    for (const unit of SCHOOL_PATH_UNITS) {
      for (const word of unit.blendWords) {
        expect(word.familyIds, word.geez).toEqual(familiesOfGeez(word.geez))
      }
    }
  })

  it('keeps the pe Meet on mail, with the train as a be blend', () => {
    expect(pictureWordForFamily('pe').geez).toBe('ፖስታ')
    expect(pictureWordForFamily('che').geez).toBe('ቸኮላታ')
    expect(pictureWordForFamily('qhe').geez).toBe('ቕጫ')
    expect(pictureWordForFamily('a').geez).toBe('ኣንበሳ')
    expect(pictureWordForFamily('chhe').geez).toBe('ጨሩሩ')
    const train = SCHOOL_PATH_UNITS.flatMap((u) => u.blendWords).find((w) => w.geez === 'ባቡር')
    expect(train.familyIds).toEqual(['be', 're'])
    expect(pictureWordForFamily('sse').geez).toBe('ሠዓሊ')
    expect(pictureWordForFamily('kha').geez).toBe('ኃይሊ')
    expect(pictureWordForFamily('nye').geez).toBe('ኘው')
    expect(pictureWordForFamily('zhe').geez).toBe('ዥዋዥዌ')
    expect(pictureWordForFamily('ppe').geez).toBe('ጳጉሜ')
    expect(pictureWordForFamily('ttse').geez).toBe('ፅዋ')
  })

  it('gives every family in the unit its own Meet word', () => {
    for (const unit of SCHOOL_PATH_UNITS) {
      for (const id of unit.familyIds) {
        const hits = unit.pictureWords.filter((w) => w.familyId === id)
        expect(hits, `${unit.id} ${id}`).toHaveLength(1)
        expect(hits[0].meaningEn, hits[0].geez).toBeTruthy()
        expect(hits[0].pictureHint, hits[0].geez).toBeTruthy()
      }
    }
  })
})

const MOE_PHRASES = ['ቀለተ ነበበ', 'ከሰተ ዘለለ', 'ሓወይ ኣበይ ኣሎ', 'ሓጋይ']

describe('action blends, echo lines, and mid-letter targets', () => {
  it('does not claim MoE page order', () => {
    expect(rawPath.source.copyrightNote).toMatch(/not claim MoE page order/i)
    expect(rawPath.source.diasporaNote).toMatch(/does not follow that page order/i)
  })

  it('adds one or two original action blends in every unit', () => {
    for (const unit of SCHOOL_PATH_UNITS) {
      const actions = unit.blendWords.filter((w) => w.kind === 'action')
      expect(actions.length, unit.id).toBeGreaterThanOrEqual(1)
      expect(actions.length, unit.id).toBeLessThanOrEqual(2)
      for (const word of actions) {
        expect(word.meaningEn, word.geez).toBeTruthy()
        expect(word.familyIds, word.geez).toEqual(familiesOfGeez(word.geez))
        expect(MOE_PHRASES.some((p) => word.geez.includes(p)), word.geez).toBe(false)
      }
    }
  })

  it('keeps one or two short echo lines, with the families they spell', () => {
    for (const unit of SCHOOL_PATH_UNITS) {
      expect(unit.echoLines.length, unit.id).toBeGreaterThanOrEqual(1)
      expect(unit.echoLines.length, unit.id).toBeLessThanOrEqual(2)
      for (const line of unit.echoLines) {
        const words = wordsOf(line.geez)
        expect(words.length, line.geez).toBeGreaterThanOrEqual(2)
        expect(words.length, line.geez).toBeLessThanOrEqual(4)
        expect(line.meaningEn, line.geez).toBeTruthy()
        expect(line.familyIds, line.geez).toEqual(familiesOfGeez(line.geez))
        expect(MOE_PHRASES.some((p) => line.geez.includes(p)), line.geez).toBe(false)
      }
    }
  })

  it('points each mid-letter target at a fidel that is not the first letter', () => {
    const targets = SCHOOL_PATH_UNITS.flatMap((u) => u.midLetterTargets || [])
    expect(targets.length).toBeGreaterThanOrEqual(8)
    for (const unit of SCHOOL_PATH_UNITS) {
      for (const target of unit.midLetterTargets || []) {
        const chars = [...target.geez]
        const idx = chars.indexOf(target.target)
        expect(idx, target.geez).toBeGreaterThan(0)
        expect(familyOfChar(target.target), target.geez).toBe(target.familyId)
        expect(unit.familyIds, target.geez).toContain(target.familyId)
        const position = idx === chars.length - 1 ? 'final' : 'mid'
        expect(target.position, target.geez).toBe(position)
        expect(target.meaningEn, target.geez).toBeTruthy()
        expect(MOE_PHRASES.some((p) => target.geez.includes(p)), target.geez).toBe(false)
      }
    }
  })
})

describe('blend words stay behind their letters', () => {
  it('hides a blend until every family it needs is learned', () => {
    const early = blendWordsForLearned(['ha', 'le']).map((w) => w.geez)
    expect(early).toContain('ሀሎ')
    expect(early).not.toContain('ልቢ')
    expect(early).not.toContain('ሰላም')
    const withHeart = blendWordsForLearned(['ha', 'le', 'be']).map((w) => w.geez)
    expect(withHeart).toContain('ልቢ')
    const later = blendWordsForLearned(['ha', 'le', 'me', 'se']).map((w) => w.geez)
    expect(later).toContain('ሰላም')
    expect(later).not.toContain('ልቢ')
  })
})

describe('parent label', () => {
  it('is English chrome', () => {
    expect(schoolPathLabel(3)).toBe('School Path · Unit 3')
    expect(schoolPathLabel()).toBe('School Path')
  })
})
