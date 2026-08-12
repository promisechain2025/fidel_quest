/* The thresholds in gameReadiness.js are claims about the DATA ("4 families
   is where the first buildable word appears"), so they are asserted against
   the data rather than trusted. If a word list or a board size changes, this
   fails instead of the child meeting an empty game. */
import { describe, it, expect, beforeEach } from 'vitest'
import { GAME_MIN_FAMILIES, gameReady, gamesPending } from './gameReadiness'
import { SCOPES } from './letterScope'
import { MATCH_CONFIGS } from '../memoryCore'
import { FIDEL_FAMILIES, INDEXES } from './ethiopic'
import { wordToKeys } from '../workshopCore'
import { ALL_WORDS } from '../FidelQuestApp'
import { DRAWN_PICTURES } from '../components/Pictures'

/* The same filter WordWorkshop applies to pick a round. */
const buildable = ALL_WORDS.filter((w) => {
  const chars = Array.from(w.geez)
  return DRAWN_PICTURES.includes(w.picture) && chars.length >= 2 && chars.length <= 4 && wordToKeys(w.geez).length === chars.length
})
const wordFamilies = (w) => Array.from(w.geez).map((ch) => INDEXES.byChar.get(ch)?.familyId)
const buildableWithin = (n) => {
  const set = new Set(FIDEL_FAMILIES.slice(0, n).map((f) => f.id))
  return buildable.filter((w) => wordFamilies(w).every((f) => set.has(f)))
}

describe('game readiness', () => {
  beforeEach(() => localStorage.clear())

  it('gates until the pool can fill the board', () => {
    expect(gameReady('match', { learned: 3 })).toBe(false)
    expect(gameReady('match', { learned: 4 })).toBe(true)
    expect(gameReady('bingo', { learned: 8 })).toBe(false)
    expect(gameReady('bingo', { learned: 9 })).toBe(true)
  })

  it('offers the one-family games from the first family, and market always', () => {
    expect(gameReady('ladder', { learned: 1 })).toBe(true)
    expect(gameReady('lineup', { learned: 1 })).toBe(true)
    expect(gameReady('market', { learned: 0 })).toBe(true)
  })

  it('treats an unknown game as ready (opt-in thresholds)', () => {
    expect(gameReady('somethingNew', { learned: 0 })).toBe(true)
  })

  it('lets the ALL letter-scope override every threshold', () => {
    expect(gameReady('bingo', { scope: SCOPES.ALL, learned: 0 })).toBe(true)
    expect(gamesPending({ scope: SCOPES.ALL, learned: 0 })).toBe(false)
  })

  it('reports pending games only while something is still gated', () => {
    expect(gamesPending({ scope: SCOPES.LEARNED, learned: 1 })).toBe(true)
    expect(gamesPending({ scope: SCOPES.LEARNED, learned: 9 })).toBe(false)
  })

  it("match's threshold is the gentlest board's pair count", () => {
    expect(GAME_MIN_FAMILIES.match).toBe(MATCH_CONFIGS.easy.pairs)
  })

  it('bingo needs a full 3x3 of distinct letters', () => {
    expect(GAME_MIN_FAMILIES.bingo).toBe(9)
  })

  it("workshop's threshold is where the first buildable word appears", () => {
    const min = GAME_MIN_FAMILIES.workshop
    expect(buildableWithin(min).length).toBeGreaterThan(0)
    expect(buildableWithin(min - 1)).toHaveLength(0)
  })
})
