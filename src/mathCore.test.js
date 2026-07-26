import { describe, it, expect } from 'vitest'
import {
  MATH_LEVELS, CHOICES_PER_PROBLEM, makeProblem, buildRound, checkAnswer, scoreRound, fromGeez,
} from './mathCore'

describe('mathCore: every generated problem is valid', () => {
  it('holds every invariant across all levels and many seeds', () => {
    for (const level of MATH_LEVELS) {
      for (let seed = 1; seed <= 300; seed++) {
        const p = makeProblem(level, seed)
        // operation is actually correct
        const expected = level.op === '-' ? p.a - p.b : p.a + p.b
        expect(p.answer).toBe(expected)
        expect(p.op).toBe(level.op)
        // operands and answer are positive and in the displayable range
        expect(p.a).toBeGreaterThanOrEqual(1)
        expect(p.b).toBeGreaterThanOrEqual(1)
        expect(p.answer).toBeGreaterThanOrEqual(1)
        expect(p.answer).toBeLessThanOrEqual(100)
        // level caps respected
        if (level.op === '+') expect(p.a + p.b).toBeLessThanOrEqual(level.max)
        else { expect(p.a).toBeLessThanOrEqual(level.max); expect(p.b).toBeLessThan(p.a) }
        // choices: right count, distinct, contain the answer, all in range
        expect(p.choices).toHaveLength(CHOICES_PER_PROBLEM)
        expect(new Set(p.choices).size).toBe(CHOICES_PER_PROBLEM)
        expect(p.choices).toContain(p.answer)
        expect(p.choices.every((c) => c >= 1 && c <= 100)).toBe(true)
        // Ge'ez mirror matches the numbers exactly
        expect(fromGeez(p.geez.a)).toBe(p.a)
        expect(fromGeez(p.geez.b)).toBe(p.b)
        expect(fromGeez(p.geez.answer)).toBe(p.answer)
      }
    }
  })
})

describe('mathCore: determinism and rounds', () => {
  it('is a pure function of (level, seed)', () => {
    for (const level of MATH_LEVELS) {
      expect(makeProblem(level, 12345)).toEqual(makeProblem(level, 12345))
    }
  })
  it('buildRound is reproducible and the right length', () => {
    const a = buildRound('add10', 999, 6)
    const b = buildRound('add10', 999, 6)
    expect(a).toEqual(b)
    expect(a).toHaveLength(6)
    expect(buildRound('add10', 999, 10)).toHaveLength(10)
  })
  it('a round varies its problems (not all identical)', () => {
    const round = buildRound('add20', 7, 8)
    const shapes = new Set(round.map((p) => `${p.a}${p.op}${p.b}`))
    expect(shapes.size).toBeGreaterThan(1)
  })
  it('an unknown level falls back to the first level', () => {
    expect(makeProblem(MATH_LEVELS[0], 5)).toEqual(buildRound('does-not-exist', 5, 1)[0])
  })
})

describe('mathCore: grading', () => {
  it('checkAnswer and scoreRound count only correct picks', () => {
    const round = buildRound('sub10', 42, 4)
    const perfect = round.map((p) => p.answer)
    expect(scoreRound(round, perfect)).toBe(4)
    expect(checkAnswer(round[0], round[0].answer)).toBe(true)
    // a wrong pick (a choice that is not the answer) does not count
    const wrong = round.map((p) => p.choices.find((c) => c !== p.answer))
    expect(scoreRound(round, wrong)).toBe(0)
    expect(scoreRound(round, [])).toBe(0) // missing picks are wrong, not a crash
  })
})
