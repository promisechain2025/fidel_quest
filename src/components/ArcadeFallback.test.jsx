import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Runner2D } from './ArcadeFallback'
import { runnerInitial, selectRunnerQuestion, INDEXES } from '../FidelQuestApp'

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
