import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Runner2D, Skylands2D, bossQuestions } from './ArcadeFallback'
import { runnerInitial, selectRunnerQuestion, INDEXES, RUNNER_QPL } from '../FidelQuestApp'
import { SESSIONS, buildQuiz } from '../FidelSkylands'

const soundOf = (k) => INDEXES.byAudioKey.get(k).sound

const charOf = (key) => INDEXES.byAudioKey.get(key).char

beforeEach(() => {
  vi.stubGlobal('Audio', class { addEventListener() {} play() { return Promise.resolve() } })
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Runner2D (P4 fallback)', () => {
  it('renders the letter gates and power meter over the runner machine', () => {
    render(<Runner2D seed={7} soundOn={false} onExit={() => {}} />)
    const q = selectRunnerQuestion(runnerInitial(7))
    // Three gates, and the meter shows RUNNER_QPL pips.
    for (const opt of q.options) expect(screen.getByText(charOf(opt))).toBeInTheDocument()
    expect(screen.getByLabelText(/^Power/)).toBeInTheDocument()
  })

  it('feeding the correct gate advances to the next question', () => {
    render(<Runner2D seed={7} soundOn={false} onExit={() => {}} />)
    const run = runnerInitial(7)
    const q0 = selectRunnerQuestion(run)
    act(() => { fireEvent.click(screen.getByText(charOf(q0.target))) })
    // FEEDING -> FEED_DONE fires after 800ms, exposing question 2.
    act(() => { vi.advanceTimersByTime(900) })
    const q1 = run.queue[1]
    for (const opt of q1.options) expect(screen.getByText(charOf(opt))).toBeInTheDocument()
  })
})

describe('Skylands2D (P4 fallback)', () => {
  it('renders the island cumulative quiz with the place name', () => {
    render(<Skylands2D island={1} seed={3} soundOn={false} onExit={() => {}} />)
    expect(screen.getByText(SESSIONS[0].place)).toBeInTheDocument()
    const first = buildQuiz(1, 3)[0]
    for (const opt of first.options) expect(screen.getByText(charOf(opt))).toBeInTheDocument()
  })

  it('boss questions are unique, sound-safe, and drawn from the cumulative pool', () => {
    for (let island = 1; island <= SESSIONS.length; island++) {
      const cumulative = new Set(SESSIONS.slice(0, island).flatMap((s) => s.pool))
      for (let seed = 1; seed <= 20; seed++) {
        const qs = bossQuestions(island, seed)
        expect(qs.length).toBe(3)
        for (const q of qs) {
          expect(q.options).toContain(q.target)
          expect(new Set(q.options).size).toBe(q.options.length) // no duplicate tiles
          for (const opt of q.options) {
            expect(cumulative.has(opt)).toBe(true) // never an odd-group-out
            if (opt !== q.target) expect(soundOf(opt)).not.toBe(soundOf(q.target)) // findable by ear
          }
        }
      }
    }
    // deterministic
    expect(JSON.stringify(bossQuestions(4, 9))).toBe(JSON.stringify(bossQuestions(4, 9)))
  })

  it('picking the correct fruit advances the quiz', () => {
    render(<Skylands2D island={1} seed={3} soundOn={false} onExit={() => {}} />)
    const quiz = buildQuiz(1, 3)
    act(() => { fireEvent.click(screen.getByText(charOf(quiz[0].target))) })
    act(() => { vi.advanceTimersByTime(700) })
    // Second question's options are now shown.
    for (const opt of quiz[1].options) expect(screen.getAllByText(charOf(opt)).length).toBeGreaterThan(0)
  })
})
