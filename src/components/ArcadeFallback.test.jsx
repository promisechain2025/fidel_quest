import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Runner2D } from './ArcadeFallback'
import { runnerInitial, runnerTransition, selectRunnerQuestion, INDEXES, RunnerEvent, RunnerState, RUNNER_LEVELS } from '../FidelQuestApp'

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
    // Three gates, and the meter shows the power pips.
    for (const opt of q.options) expect(screen.getByText(charOf(opt))).toBeInTheDocument()
    expect(screen.getByLabelText(/^Power/)).toBeInTheDocument()
    expect(screen.getByAltText('Anbessa').getAttribute('src')).toContain('anbessa-front')
    expect(screen.getByAltText('Jibby').getAttribute('src')).toContain('jibby-front')
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

  it('a perfect run ends after the fixed number of levels with a summary, and Home reports the win', () => {
    const onExit = vi.fn()
    render(<Runner2D seed={7} soundOn={false} onExit={onExit} />)
    let run = runnerInitial(7)
    let guard = 0
    while (run.status !== RunnerState.FINISHED && guard++ < 100) {
      const q = selectRunnerQuestion(run)
      act(() => { fireEvent.click(screen.getByLabelText(`Gate ${INDEXES.byAudioKey.get(q.target).sound}`)) })
      run = runnerTransition(run, { type: RunnerEvent.FEED, payload: { audioKey: q.target } }).next
      act(() => { vi.advanceTimersByTime(900) })
      run = runnerTransition(run, { type: RunnerEvent.FEED_DONE }).next
      if (run.status === RunnerState.BOSS) {
        act(() => { vi.advanceTimersByTime(1900) })
        run = runnerTransition(run, { type: RunnerEvent.BOSS_DONE }).next
      }
    }
    expect(run.status).toBe(RunnerState.FINISHED)
    expect(screen.getByTestId('runner-summary')).toBeInTheDocument()
    expect(screen.getByText('Run complete!')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText(`${RUNNER_LEVELS}/${RUNNER_LEVELS}`)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Home'))
    expect(onExit).toHaveBeenCalledWith(expect.objectContaining({ level: RUNNER_LEVELS, survivedBoss: true, finished: true }))
  })
})
