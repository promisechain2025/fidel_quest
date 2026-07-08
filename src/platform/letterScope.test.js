import { describe, it, expect } from 'vitest'
import { SCOPES, scopedFamilySet, scopedBaseForms, scopedForms, scopedFamilyIndexSet, learnedCount } from './letterScope'
import { FIDEL_FAMILIES, ALL_FORMS } from './ethiopic'
import { JOURNEY, NodeKind } from '../journey'

const LEARN = JOURNEY.filter((n) => n.kind === NodeKind.LEARN)
// Progress with the first two families learned (journey order: ha, le).
const firstTwoLearned = () => ({ done: { [LEARN[0].id]: true, [LEARN[1].id]: true } })
const nothingLearned = { done: {} }

describe('letterScope', () => {
  it('"all" scope imposes no restriction (full pools)', () => {
    expect(scopedFamilySet(SCOPES.ALL, nothingLearned)).toBeNull()
    expect(scopedFamilyIndexSet(SCOPES.ALL, nothingLearned)).toBeNull()
    expect(scopedBaseForms(SCOPES.ALL, nothingLearned)).toHaveLength(FIDEL_FAMILIES.length)
    expect(scopedForms(SCOPES.ALL, nothingLearned)).toHaveLength(ALL_FORMS.length)
  })

  it('"learned" scope restricts to the learned families and their forms', () => {
    const p = firstTwoLearned()
    expect(scopedFamilySet(SCOPES.LEARNED, p).size).toBe(2)
    expect(scopedBaseForms(SCOPES.LEARNED, p)).toEqual([`${LEARN[0].familyId}-1`, `${LEARN[1].familyId}-1`])
    expect(scopedForms(SCOPES.LEARNED, p)).toHaveLength(2 * 7)
    expect(scopedFamilyIndexSet(SCOPES.LEARNED, p)).toEqual(new Set([0, 1]))
    expect(learnedCount(p)).toBe(2)
  })

  it('"learned" falls back to the first family so a new player still has a game', () => {
    const set = scopedFamilySet(SCOPES.LEARNED, nothingLearned)
    expect(set.size).toBe(1)
    expect(set.has(FIDEL_FAMILIES[0].id)).toBe(true)
    expect(scopedBaseForms(SCOPES.LEARNED, nothingLearned)).toEqual([`${FIDEL_FAMILIES[0].id}-1`])
    expect(learnedCount(nothingLearned)).toBe(0)
  })
})
