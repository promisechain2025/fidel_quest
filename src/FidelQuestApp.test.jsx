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
  buildPracticeQueue,
  isLevelUnlocked,
  buildWordQueue,
  WORDS,
  WORD_BY_LATIN,
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

describe('vowel levels and Star Practice', () => {
  it('vowel questions isolate the vowel within one family, deterministically', () => {
    const level = LEVELS.find((l) => l.id === 'level-5')
    for (let seed = 1; seed <= 10; seed++) {
      const [queue] = buildQuestionQueue(level, seed)
      expect(queue).toHaveLength(level.questionCount)
      for (const q of queue) {
        const fid = q.target.slice(0, q.target.lastIndexOf('-'))
        expect(q.options).toContain(q.target)
        expect(new Set(q.options).size).toBe(q.options.length)
        for (const o of q.options) expect(o.startsWith(fid + '-')).toBe(true)
        const sounds = q.options.map((k) => INDEXES.byAudioKey.get(k).sound)
        expect(new Set(sounds).size).toBe(q.options.length)
      }
    }
    expect(JSON.stringify(buildQuestionQueue(level, 42))).toBe(JSON.stringify(buildQuestionQueue(level, 42)))
  })

  it('level 5 unlocks off level 4 like every other level', () => {
    expect(isLevelUnlocked({ 'level-4': { stars: 1 } }, 4)).toBe(true)
    expect(isLevelUnlocked({}, 4)).toBe(false)
  })

  it('builds practice from trouble letters with confusion partners as options', () => {
    const events = []
    for (let i = 0; i < 6; i++) events.push({ k: 'ha-1', p: i < 4 ? 'se-1' : 'ha-1', m: 'lesson', d: 1 })
    for (let i = 0; i < 4; i++) events.push({ k: 'qe-1', p: i < 2 ? 'be-1' : 'qe-1', m: 'lesson', d: 1 })
    const queue = buildPracticeQueue(events, 42)
    expect(queue).toHaveLength(8)
    const targets = new Set(queue.map((q) => q.target))
    expect(targets).toEqual(new Set(['ha-1', 'qe-1']))
    const haQuestion = queue.find((q) => q.target === 'ha-1')
    expect(haQuestion.options).toContain('se-1') // the actual confusion
    for (const q of queue) {
      expect(q.options).toContain(q.target)
      const sounds = q.options.map((k) => INDEXES.byAudioKey.get(k).sound)
      expect(new Set(sounds).size).toBe(q.options.length)
    }
    expect(buildPracticeQueue([], 42)).toEqual([])
    expect(JSON.stringify(buildPracticeQueue(events, 7))).toBe(JSON.stringify(buildPracticeQueue(events, 7)))
  })

  it('the machine runs a preset practice queue to completion', () => {
    const queue = [
      { target: 'ha-1', options: ['ha-1', 'le-1', 'me-1'] },
      { target: 'le-1', options: ['le-1', 'be-1', 'te-1'] },
    ]
    let ctx = transition(initialContext(3), { type: GameEvent.START_LEVEL, payload: { levelId: 'practice', seed: 3, queue } }).next
    expect(ctx.status).toBe(GameState.PRESENTATION)
    let guard = 0
    while (ctx.status !== GameState.LEVEL_COMPLETE && guard++ < 20) {
      if (ctx.status === GameState.PRESENTATION) ctx = transition(ctx, { type: GameEvent.PRESENTATION_DONE }).next
      else if (ctx.status === GameState.AWAITING_INPUT) ctx = transition(ctx, { type: GameEvent.SELECT_OPTION, payload: { audioKey: ctx.queue[ctx.cursor].target } }).next
      else ctx = transition(ctx, { type: GameEvent.FEEDBACK_DONE }).next
    }
    expect(ctx.status).toBe(GameState.LEVEL_COMPLETE)
    expect(ctx.history).toHaveLength(2)
  })
})

describe('First Words', () => {
  it('builds word questions with distinct pictures and deterministic seeds', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const queue = buildWordQueue(seed)
      expect(queue).toHaveLength(6)
      for (const q of queue) {
        expect(q.options).toContain(q.target)
        expect(new Set(q.options).size).toBe(q.options.length)
        const pictures = q.options.map((l) => WORD_BY_LATIN.get(l).picture)
        expect(new Set(pictures).size).toBe(pictures.length)
      }
    }
    expect(JSON.stringify(buildWordQueue(42))).toBe(JSON.stringify(buildWordQueue(42)))
  })

  it('covers every word with audio in the manifest', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(25)
    for (const w of WORDS) {
      expect(typeof w.picture).toBe('string')
      expect(typeof w.meaning).toBe('string')
      expect(Array.from(w.geez).length).toBeGreaterThan(0)
    }
  })
})
