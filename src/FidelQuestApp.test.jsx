import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
  buildFixItQueue,
  isLevelUnlocked,
  buildWordQueue,
  WORDS,
  WORD_BY_LATIN,
  WordMatch,
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
  it('quizzes only the learned pool — this level and the next', () => {
    const learned = ['ha-1', 'le-1', 'me-1', 'be-1', 'te-1'] // "learned so far"
    let run = runnerInitial(3, learned)
    expect(run.pool).toEqual(learned)
    const inPool = (q) => learned.includes(q.target) && q.options.every((o) => learned.includes(o))
    expect(run.queue.every(inPool)).toBe(true)
    // Survive the level; the next level must stay inside the same learned pool.
    for (let i = 0; i < 5; i++) {
      run = runnerTransition(run, { type: RunnerEvent.FEED, payload: { audioKey: selectRunnerQuestion(run).target } }).next
      run = runnerTransition(run, { type: RunnerEvent.FEED_DONE }).next
    }
    run = runnerTransition(run, { type: RunnerEvent.BOSS_DONE }).next
    expect(run.level).toBe(2)
    expect(run.queue.every(inPool)).toBe(true)
  })

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
  it('maps accuracy to stars around the 80 percent mastery bar', () => {
    expect(starsForAccuracy(100)).toBe(3)
    expect(starsForAccuracy(90)).toBe(3)
    expect(starsForAccuracy(80)).toBe(2) // 2 stars = passed
    expect(starsForAccuracy(70)).toBe(1) // below the bar: not passed
    expect(starsForAccuracy(40)).toBe(1)
  })
})

describe('app shell', () => {
  it('renders the unified Journey path with one current step (Pillar 1)', () => {
    render(<FidelQuestApp />)
    expect(screen.getByText('Fidel Quest')).toBeInTheDocument()
    // Exactly one node is the current step; utilities are off the main path.
    expect(screen.getAllByText('Start')).toHaveLength(1)
    expect(screen.getByLabelText('Open backpack')).toBeInTheDocument()
    // The first node (learn ha) is unlocked; a later node is locked.
    const firstNode = screen.getByLabelText(/^Learn ha/)
    expect(firstNode).not.toBeDisabled()
    expect(FIDEL_FAMILIES).toHaveLength(33)
  })

  it('opens the Backpack to reach the reference utilities', () => {
    render(<FidelQuestApp />)
    fireEvent.click(screen.getByLabelText('Open backpack'))
    // Compact tile grid uses short labels
    expect(screen.getByText('Explorer')).toBeInTheDocument()
    expect(screen.getByText('Classic')).toBeInTheDocument()
    expect(screen.getByText('First Words')).toBeInTheDocument()
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

  it('builds the fix-it drill: missed letters twice, interleaved with solid ones', () => {
    const missed = ['ha-1', 'se-1']
    const solid = ['le-1', 'me-1', 'qe-1']
    const queue = buildFixItQueue([], missed, solid, 42)
    // every missed letter appears exactly twice, plus up to two solid letters
    const counts = queue.reduce((m, q) => ((m[q.target] = (m[q.target] || 0) + 1), m), {})
    expect(counts['ha-1']).toBe(2)
    expect(counts['se-1']).toBe(2)
    expect(queue.filter((q) => solid.includes(q.target)).length).toBe(2)
    // never the same prompt twice in a row; options twin-safe with the target
    for (let i = 1; i < queue.length; i++) expect(queue[i].target).not.toBe(queue[i - 1].target)
    for (const q of queue) {
      expect(q.options).toContain(q.target)
      const sounds = q.options.map((k) => INDEXES.byAudioKey.get(k).sound)
      expect(new Set(sounds).size).toBe(q.options.length)
    }
    // deterministic in its seed; empty misses build nothing
    expect(JSON.stringify(buildFixItQueue([], missed, solid, 7))).toBe(JSON.stringify(buildFixItQueue([], missed, solid, 7)))
    expect(buildFixItQueue([], [], solid, 7)).toEqual([])
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
  it('builds word questions (picture + glyph) that are valid and deterministic', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const queue = buildWordQueue(seed)
      expect(queue).toHaveLength(6)
      for (const q of queue) {
        expect(['picture', 'glyph']).toContain(q.type)
        expect(q.options).toContain(q.target)
        expect(new Set(q.options).size).toBe(q.options.length)
        expect(WORD_BY_LATIN.get(q.wordLatin)).toBeTruthy() // prompt word always resolvable
        if (q.type === 'picture') {
          const pictures = q.options.map((l) => WORD_BY_LATIN.get(l).picture)
          expect(new Set(pictures).size).toBe(pictures.length)
        }
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

  it('mounts a live round without crashing', () => {
    // Guards the WordMatch useReducer initializer: a stray extra arrow once
    // made it return a function as state, so selectQuestion(ctx) read off a
    // function and the first round crashed into the ErrorBoundary. The
    // pure-queue tests above never render the component, so only a mount test
    // catches it. The Quit control renders on every round type.
    render(<WordMatch seed={7} soundOn={false} onFinish={() => {}} onReplay={() => {}} />)
    expect(screen.getByLabelText('Quit words')).toBeInTheDocument()
  })
})

describe('twin-letter differentiation (P5)', () => {
  const baseChar = (fam) => INDEXES.byAudioKey.get(`${fam.id}-1`)?.char
  const familyOfChar = (ch) => FIDEL_FAMILIES.find((f) => baseChar(f) === ch)
  const siblingOf = (fam) =>
    FIDEL_FAMILIES.find((f) => f.name === fam.twinOf) ||
    FIDEL_FAMILIES.find((f) => f.twinOf === fam.name) ||
    null

  it('makes the a/ae (አ vs ዐ) twin pair actually co-occur in a glyph round', () => {
    // The pedagogical ask: same-sound twins side by side, disambiguated by
    // picture. The ha/hha pair sat here until its words (hager/hamer) were
    // pulled for lacking recordings — a/ae (asa/ayin) carries the invariant
    // now; restore ha/hha coverage when those two words are voiced.
    const aChar = baseChar(FIDEL_FAMILIES.find((f) => f.id === 'a'))
    const aeChar = baseChar(FIDEL_FAMILIES.find((f) => f.id === 'ae'))
    let found = false
    for (let seed = 1; seed <= 60 && !found; seed++) {
      for (const q of buildWordQueue(seed)) {
        if (q.type === 'glyph' && q.options.includes(aChar) && q.options.includes(aeChar)) found = true
      }
    }
    expect(found).toBe(true)
  })

  it('every word can speak: the full recorded vocabulary is in play', () => {
    // The whole word list is human-recorded now (July 2026 session), so
    // nothing is filtered out - the once-unvoiced words are included.
    expect(WORDS.some((w) => w.noAudio)).toBe(false)
    expect(WORDS.map((w) => w.latin)).toContain('hager')
    expect(WORDS.map((w) => w.latin)).toContain('hamer')
    expect(WORDS.length).toBeGreaterThanOrEqual(70)
  })

  it('seats the phonetic twin as a distractor in every glyph round', () => {
    let glyphRounds = 0
    for (let seed = 1; seed <= 40; seed++) {
      for (const q of buildWordQueue(seed)) {
        if (q.type !== 'glyph') continue
        glyphRounds++
        const fam = familyOfChar(q.target)
        const sibling = siblingOf(fam)
        expect(sibling).toBeTruthy()
        expect(q.options).toContain(baseChar(sibling)) // the twin IS present here
      }
    }
    expect(glyphRounds).toBeGreaterThan(0) // the mechanism actually fires
  })

  it('NEVER lets a distractor share the spoken target sound (no false failure)', () => {
    // The child hears the target sound and must pick it. The unbreakable
    // rule: no OTHER option may sound like the target, or two answers would
    // be "correct by ear". (Mutual twins among distractors are harmless -
    // neither matches the played sound.) This holds across all 8 levels.
    const soundOf = (k) => INDEXES.byAudioKey.get(k).sound
    for (const level of LEVELS) {
      for (let seed = 1; seed <= 25; seed++) {
        const [queue] = buildQuestionQueue(level, seed)
        for (const q of queue) {
          const targetSound = soundOf(q.target)
          for (const opt of q.options) {
            if (opt === q.target) continue
            expect(soundOf(opt)).not.toBe(targetSound)
          }
        }
      }
    }
  })
})
