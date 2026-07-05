import { describe, it, expect } from 'vitest'
import { SESSIONS, buildQuiz, pickStolen, canLearn, canPlay } from './FidelSkylands'


describe('sessions', () => {
  it('cover all 33 base letters exactly once', () => {
    const all = SESSIONS.flatMap((s) => s.pool)
    expect(all).toHaveLength(33)
    expect(new Set(all).size).toBe(33)
  })
})

describe('cumulative quiz factory', () => {
  it('level n draws only from sessions 1..n, and half from the fresh session', () => {
    for (let n = 1; n <= 4; n++) {
      const allowed = new Set(SESSIONS.slice(0, n).flatMap((s) => s.pool))
      const fresh = new Set(SESSIONS[n - 1].pool)
      for (let seed = 1; seed <= 8; seed++) {
        const quiz = buildQuiz(n, seed)
        expect(quiz).toHaveLength(5 + n)
        const freshCount = quiz.filter((q) => fresh.has(q.target)).length
        expect(freshCount).toBeGreaterThanOrEqual(Math.ceil(quiz.length / 2))
        for (const q of quiz) {
          expect(allowed.has(q.target)).toBe(true)
          expect(q.options).toContain(q.target)
          for (const o of q.options) expect(allowed.has(o)).toBe(true)
        }
      }
    }
  })

  it('is deterministic per seed', () => {
    expect(JSON.stringify(buildQuiz(3, 42))).toBe(JSON.stringify(buildQuiz(3, 42)))
    expect(JSON.stringify(buildQuiz(3, 42))).not.toBe(JSON.stringify(buildQuiz(3, 43)))
  })
})

describe("Jibby's Snack Attack", () => {
  it('steals three letters from earlier sessions with distinct keys', () => {
    for (let n = 2; n <= 4; n++) {
      const earlier = new Set(SESSIONS.slice(0, n - 1).flatMap((s) => s.pool))
      for (let seed = 1; seed <= 8; seed++) {
        const stolen = pickStolen(n, seed)
        expect(stolen).toHaveLength(3)
        expect(new Set(stolen).size).toBe(3)
        for (const k of stolen) expect(earlier.has(k)).toBe(true)
      }
    }
  })

  it('level 1 steals from its own pool', () => {
    const own = new Set(SESSIONS[0].pool)
    for (const k of pickStolen(1, 7)) expect(own.has(k)).toBe(true)
  })
})

describe('strict progression guards', () => {
  it('gates learning and play cumulatively', () => {
    const fresh = { sessionsCompleted: 0, learnedSessions: 0 }
    expect(canLearn(fresh, 1)).toBe(true)
    expect(canLearn(fresh, 2)).toBe(false)
    expect(canPlay(fresh, 1)).toBe(false) // must learn before playing

    const learned = { sessionsCompleted: 0, learnedSessions: 1 }
    expect(canPlay(learned, 1)).toBe(true)
    expect(canPlay(learned, 2)).toBe(false)

    const beaten = { sessionsCompleted: 1, learnedSessions: 1 }
    expect(canLearn(beaten, 2)).toBe(true)
    expect(canPlay(beaten, 2)).toBe(false) // session 2 not learned yet
  })
})
