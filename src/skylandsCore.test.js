/* The one game core that shipped without a test. Same contract the other
   eight are held to: pure, seeded, twin-safe, and never able to hand a child
   an unanswerable question. */
import { describe, it, expect } from 'vitest'
import {
  BASE_FORMS,
  FORM_BY_KEY,
  SESSIONS,
  cumulativePool,
  sessionOfKey,
  ALL_BASE,
  buildQuiz,
  pickStolen,
} from './skylandsCore'
import { FIDEL_FAMILIES } from './platform/ethiopic'

const soundOf = (k) => FORM_BY_KEY.get(k).sound

describe('skylands data', () => {
  it('carries one base form per family, keyed by audioKey', () => {
    expect(BASE_FORMS).toHaveLength(FIDEL_FAMILIES.length)
    expect(FORM_BY_KEY.size).toBe(BASE_FORMS.length)
    for (const f of BASE_FORMS) expect(f.audioKey).toBe(`${FIDEL_FAMILIES[f.familyIndex].id}-1`)
  })

  it('splits every family across the four islands with no gaps or repeats', () => {
    expect(SESSIONS).toHaveLength(4)
    const all = SESSIONS.flatMap((s) => s.pool)
    expect(new Set(all).size).toBe(all.length) // no letter on two islands
    expect(new Set(all)).toEqual(new Set(ALL_BASE)) // none left behind
  })

  it('grows the cumulative pool island by island', () => {
    for (let n = 2; n <= 4; n++) {
      expect(cumulativePool(n).length).toBeGreaterThan(cumulativePool(n - 1).length)
    }
    expect(cumulativePool(4)).toHaveLength(ALL_BASE.length)
    expect(sessionOfKey(SESSIONS[2].pool[0]).n).toBe(3)
  })
})

describe('skylands quiz factory', () => {
  it('is deterministic per seed, and different across seeds', () => {
    expect(JSON.stringify(buildQuiz(3, 42))).toBe(JSON.stringify(buildQuiz(3, 42)))
    expect(JSON.stringify(buildQuiz(3, 42))).not.toBe(JSON.stringify(buildQuiz(3, 43)))
  })

  it('asks 5+n questions and ramps the option count with the level', () => {
    for (let n = 1; n <= 4; n++) {
      const q = buildQuiz(n, 7)
      expect(q).toHaveLength(5 + n)
      expect(q[0].options.length).toBe(Math.min(4 + Math.ceil(n / 2), 6))
    }
  })

  // The bug this class of game ships most often: a distractor that SOUNDS like
  // the target, so a child who answers correctly by ear is marked wrong.
  it('never lets a distractor share the target sound', () => {
    for (let n = 1; n <= 4; n++) {
      for (let seed = 1; seed <= 20; seed++) {
        for (const q of buildQuiz(n, seed)) {
          expect(q.options).toContain(q.target)
          expect(new Set(q.options).size).toBe(q.options.length)
          const target = soundOf(q.target)
          for (const o of q.options) {
            if (o !== q.target) expect(soundOf(o)).not.toBe(target)
          }
        }
      }
    }
  })

  it('stays inside the letters the child has actually reached', () => {
    for (let n = 1; n <= 4; n++) {
      const allowed = new Set(cumulativePool(n))
      for (const q of buildQuiz(n, 5)) {
        expect(allowed.has(q.target)).toBe(true)
        for (const o of q.options) expect(allowed.has(o)).toBe(true)
      }
    }
  })

  it('gives the newest island at least half the questions', () => {
    for (let n = 2; n <= 4; n++) {
      const fresh = new Set(SESSIONS[n - 1].pool)
      const q = buildQuiz(n, 11)
      const freshAsked = q.filter((x) => fresh.has(x.target)).length
      expect(freshAsked).toBeGreaterThanOrEqual(Math.floor(q.length / 2))
    }
  })

  it('opens the whole alphabet when allForms is set', () => {
    const q = buildQuiz(1, 3, true)
    const reachable = new Set(q.flatMap((x) => x.options))
    // Level 1 cumulative is one island; with allForms it must draw wider.
    expect(reachable.size).toBeGreaterThan(SESSIONS[0].pool.length)
  })
})

describe('Jibby steals letters for the boss review', () => {
  it('takes exactly three, all distinguishable by ear', () => {
    for (let n = 1; n <= 4; n++) {
      for (let seed = 1; seed <= 20; seed++) {
        const stolen = pickStolen(n, seed)
        expect(stolen).toHaveLength(3)
        expect(new Set(stolen.map(soundOf)).size).toBe(3)
      }
    }
  })

  it('reviews EARLIER islands, not the one just played', () => {
    for (let n = 2; n <= 4; n++) {
      const earlier = new Set(cumulativePool(n - 1))
      for (const k of pickStolen(n, 9)) expect(earlier.has(k)).toBe(true)
    }
  })

  it('falls back to its own pool at level 1, where there is no earlier island', () => {
    const own = new Set(SESSIONS[0].pool)
    for (const k of pickStolen(1, 4)) expect(own.has(k)).toBe(true)
  })

  it('is deterministic per seed', () => {
    expect(pickStolen(3, 21)).toEqual(pickStolen(3, 21))
  })
})
