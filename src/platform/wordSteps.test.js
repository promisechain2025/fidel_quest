import { describe, it, expect } from 'vitest'
import { WordPhase, wordStepsInitial, wordStepsTransition } from './wordSteps'

const WORDS = [
  { geez: 'ላም', latin: 'lam', meaning: 'cow', picture: 'A' },
  { geez: 'ሰላም', latin: 'selam', meaning: 'peace', picture: 'B' },
]
const POOL = [
  ...WORDS,
  { geez: 'ማር', latin: 'mar', meaning: 'honey', picture: 'C' },
  { geez: 'ሳር', latin: 'sar', meaning: 'grass', picture: 'D' },
]

const buildOut = (ctx) => {
  // Tap the tray tiles in reading order until the build completes.
  const word = ctx.phase === WordPhase.PROVE ? ctx.rounds[ctx.qi].word : ctx.words[ctx.wi]
  let cur = ctx
  for (const ch of Array.from(word.geez)) {
    const index = cur.tray.findIndex((t) => !t.used && t.ch === ch)
    const r = wordStepsTransition(cur, { type: 'TILE', index })
    expect(r.advanced).toBe(true)
    cur = r.next
  }
  return cur
}

describe('word steps machine (build - say - prove)', () => {
  it('is a pure function of (words, seed): same seed, same run', () => {
    const a = wordStepsInitial(WORDS, 7, POOL)
    const b = wordStepsInitial(WORDS, 7, POOL)
    expect(a).toEqual(b)
    expect(wordStepsInitial(WORDS, 8, POOL)).not.toEqual(a)
  })

  it('never deals a pre-solved tray', () => {
    for (let seed = 1; seed < 40; seed++) {
      const ctx = wordStepsInitial(WORDS, seed, POOL)
      expect(ctx.tray.some((t, i) => t.id !== i)).toBe(true)
    }
  })

  it('walks BUILD -> SAY per word, then one PROVE round per word, then DONE', () => {
    let ctx = wordStepsInitial(WORDS, 7, POOL)
    expect(ctx.phase).toBe(WordPhase.BUILD)
    ctx = buildOut(ctx)
    expect(ctx.phase).toBe(WordPhase.SAY)
    ctx = wordStepsTransition(ctx, { type: 'SAY_DONE' }).next
    expect(ctx.phase).toBe(WordPhase.BUILD)
    expect(ctx.wi).toBe(1)
    ctx = buildOut(ctx)
    ctx = wordStepsTransition(ctx, { type: 'SAY_DONE' }).next
    expect(ctx.phase).toBe(WordPhase.PROVE)
    expect(ctx.rounds).toHaveLength(2)
    for (let q = 0; q < 2; q++) {
      const round = ctx.rounds[ctx.qi]
      if (round.type === 'read') {
        // options carry three distinct pictures including the target's
        expect(new Set(round.options.map((o) => o.picture)).size).toBe(3)
        ctx = wordStepsTransition(ctx, { type: 'PICK', latin: round.word.latin }).next
      } else {
        ctx = buildOut(ctx)
      }
    }
    expect(ctx.phase).toBe(WordPhase.DONE)
  })

  it('rejects wrong tiles (recording the miss) and ill-timed events', () => {
    let ctx = wordStepsInitial(WORDS, 7, POOL)
    const word = ctx.words[0]
    const wrongIndex = ctx.tray.findIndex((t) => t.ch !== Array.from(word.geez)[0])
    const r = wordStepsTransition(ctx, { type: 'TILE', index: wrongIndex })
    expect(r.advanced).toBe(false)
    expect(r.next.misses[word.latin]).toBe(1)
    expect(r.next.slot).toBe(0) // no progress on a miss
    // SAY_DONE during BUILD is ill-timed: rejected outright.
    expect(wordStepsTransition(ctx, { type: 'SAY_DONE' }).next).toBe(ctx)
    // A used tile cannot be tapped twice.
    const okIndex = ctx.tray.findIndex((t) => t.ch === Array.from(word.geez)[0])
    const after = wordStepsTransition(ctx, { type: 'TILE', index: okIndex }).next
    expect(wordStepsTransition(after, { type: 'TILE', index: okIndex }).advanced).toBe(false)
  })
})
