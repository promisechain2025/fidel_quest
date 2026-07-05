import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import FidelQuestApp, {
  INVARIANTS,
  FIDEL_FAMILIES,
  LEVELS,
  GameState,
  GameEvent,
  initialContext,
  transition,
  buildQuestionQueue,
  starsForAccuracy,
  RunnerState,
  RunnerEvent,
  runnerInitial,
  runnerTransition,
  selectRunnerQuestion,
  INDEXES,
} from './FidelQuestApp'

beforeEach(() => {
  vi.stubGlobal(
    'Audio',
    class {
      addEventListener() {}
      play() {
        return Promise.resolve()
      }
    },
  )
})

describe('self-test invariant suite', () => {
  it.each(INVARIANTS.map((c) => [c.name, c]))('%s', (_, check) => {
    expect(check.pass).toBe(true)
  })
})

describe('lesson machine', () => {
  it('walks a full level to LEVEL_COMPLETE', () => {
    let ctx = transition(initialContext(3), {
      type: GameEvent.START_LEVEL,
      payload: { levelId: 'level-1', seed: 3 },
    }).next
    let guard = 0
    while (ctx.status !== GameState.LEVEL_COMPLETE && guard++ < 100) {
      if (ctx.status === GameState.PRESENTATION) {
        ctx = transition(ctx, { type: GameEvent.PRESENTATION_DONE }).next
      } else if (ctx.status === GameState.AWAITING_INPUT) {
        ctx = transition(ctx, {
          type: GameEvent.SELECT_OPTION,
          payload: { audioKey: ctx.queue[ctx.cursor].target },
        }).next
      } else {
        ctx = transition(ctx, { type: GameEvent.FEEDBACK_DONE }).next
      }
    }
    expect(ctx.status).toBe(GameState.LEVEL_COMPLETE)
    expect(ctx.history).toHaveLength(LEVELS[0].questionCount)
  })

  it('rejects picking an already-wrong option again', () => {
    let ctx = transition(initialContext(5), {
      type: GameEvent.START_LEVEL,
      payload: { levelId: 'level-1', seed: 5 },
    }).next
    ctx = transition(ctx, { type: GameEvent.PRESENTATION_DONE }).next
    const q = ctx.queue[0]
    const wrong = q.options.find((o) => o !== q.target)
    ctx = transition(ctx, { type: GameEvent.SELECT_OPTION, payload: { audioKey: wrong } }).next
    ctx = transition(ctx, { type: GameEvent.FEEDBACK_DONE }).next
    const retry = transition(ctx, { type: GameEvent.SELECT_OPTION, payload: { audioKey: wrong } })
    expect(retry.accepted).toBe(false)
  })

  it('twin letters never share a question by ear', () => {
    for (const level of LEVELS) {
      for (let seed = 1; seed <= 10; seed++) {
        const [queue] = buildQuestionQueue(level, seed)
        for (const q of queue) {
          const targetSound = INDEXES.byAudioKey.get(q.target).sound
          const clash = q.options.some(
            (o) => o !== q.target && INDEXES.byAudioKey.get(o).sound === targetSound,
          )
          expect(clash).toBe(false)
        }
      }
    }
  })
})

describe('runner machine', () => {
  it('survives a perfect level and gets destroyed on a failed one', () => {
    let run = runnerInitial(9)
    for (let i = 0; i < 5; i++) {
      run = runnerTransition(run, {
        type: RunnerEvent.FEED,
        payload: { audioKey: selectRunnerQuestion(run).target },
      }).next
      run = runnerTransition(run, { type: RunnerEvent.FEED_DONE }).next
    }
    expect(run.status).toBe(RunnerState.BOSS)
    run = runnerTransition(run, { type: RunnerEvent.BOSS_DONE }).next
    expect(run.level).toBe(2)

    let doomed = runnerInitial(10)
    for (let i = 0; i < 5; i++) {
      const q = selectRunnerQuestion(doomed)
      doomed = runnerTransition(doomed, {
        type: RunnerEvent.FEED,
        payload: { audioKey: q.options.find((o) => o !== q.target) },
      }).next
      doomed = runnerTransition(doomed, { type: RunnerEvent.FEED_DONE }).next
    }
    doomed = runnerTransition(doomed, { type: RunnerEvent.BOSS_DONE }).next
    expect(doomed.status).toBe(RunnerState.DESTROYED)
  })
})

describe('scoring', () => {
  it('maps accuracy to stars', () => {
    expect(starsForAccuracy(100)).toBe(3)
    expect(starsForAccuracy(90)).toBe(3)
    expect(starsForAccuracy(70)).toBe(2)
    expect(starsForAccuracy(40)).toBe(1)
  })
})

describe('app shell', () => {
  it('renders the home screen with every mode', () => {
    render(<FidelQuestApp />)
    expect(screen.getByText('Fidel Quest')).toBeInTheDocument()
    expect(screen.getByText('Letter Runner')).toBeInTheDocument()
    expect(screen.getByText('Fidel Skylands')).toBeInTheDocument()
    expect(screen.getByText('Classic Game')).toBeInTheDocument()
    expect(screen.getByText('Letter Explorer')).toBeInTheDocument()
    expect(FIDEL_FAMILIES).toHaveLength(33)
  })
})
