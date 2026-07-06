import { describe, it, expect } from 'vitest'
import {
  LearnPhase,
  learnInitial,
  learnTransition,
  mixInitial,
  ECHO_ROUNDS,
  SHUFFLE_ROUNDS,
  MIX_ROUNDS,
  STONES,
  stoneUnlocked,
  groupMastered,
} from './LearnLetters'
import { INDEXES, FIDEL_FAMILIES } from './FidelQuestApp'

const soundOf = (k) => INDEXES.byAudioKey.get(k).sound

describe('pacing caps (P2)', () => {
  it('holds Echo=3, Shuffle=3, Mix=4 so early sessions do not grind', () => {
    expect(ECHO_ROUNDS).toBe(3)
    expect(SHUFFLE_ROUNDS).toBe(3)
    expect(MIX_ROUNDS).toBe(4)
  })
})

describe('the step machine', () => {
  it('walks MEET -> FORWARD -> BACKWARD -> ECHO -> SHUFFLE -> DONE', () => {
    let ctx = learnInitial('ha', 7)
    expect(ctx.phase).toBe(LearnPhase.MEET)
    // MEET: touch each form in order
    for (let i = 0; i < 7; i++) ctx = learnTransition(ctx, ctx.forms[ctx.idx]).next
    expect(ctx.phase).toBe(LearnPhase.FORWARD)
    for (let i = 0; i < 7; i++) ctx = learnTransition(ctx, ctx.forms[ctx.idx]).next
    expect(ctx.phase).toBe(LearnPhase.BACKWARD)
    for (let i = 0; i < 7; i++) ctx = learnTransition(ctx, ctx.forms[ctx.idx]).next
    expect(ctx.phase).toBe(LearnPhase.ECHO)
    for (let i = 0; i < ECHO_ROUNDS; i++) {
      expect(ctx.target).toBeTruthy()
      ctx = learnTransition(ctx, ctx.target).next
    }
    expect(ctx.phase).toBe(LearnPhase.SHUFFLE)
    expect(ctx.order).not.toEqual(ctx.forms) // scrambled (33! chance aside)
    for (let i = 0; i < SHUFFLE_ROUNDS; i++) ctx = learnTransition(ctx, ctx.target).next
    expect(ctx.phase).toBe(LearnPhase.TRACE)
    expect(learnTransition(ctx, 'ha-3').advanced).toBe(false) // only tracing finishes
    ctx = learnTransition(ctx, '__traced__').next
    expect(ctx.phase).toBe(LearnPhase.DONE)
  })

  it('wrong touches speak but never advance', () => {
    let ctx = learnInitial('le', 3)
    const wrong = ctx.forms[3]
    const r = learnTransition(ctx, wrong)
    expect(r.advanced).toBe(false)
    expect(r.next.phase).toBe(LearnPhase.MEET)
    expect(r.next.idx).toBe(0)
  })

  it('removes eaten letters and never re-asks one within a phase', () => {
    let ctx = learnInitial('be', 5)
    for (let i = 0; i < 21; i++) ctx = learnTransition(ctx, ctx.forms[ctx.idx]).next
    expect(ctx.phase).toBe(LearnPhase.ECHO)
    expect(ctx.eaten).toEqual([])
    // ECHO: each fed letter is added to eaten and never targeted again.
    const echoTargets = []
    for (let i = 0; i < ECHO_ROUNDS; i++) {
      const target = ctx.target
      expect(ctx.eaten).not.toContain(target) // still on the tray when asked
      echoTargets.push(target)
      ctx = learnTransition(ctx, target).next
    }
    expect(new Set(echoTargets).size).toBe(echoTargets.length) // all distinct
    // Entering SHUFFLE refills the tray (eaten reset).
    expect(ctx.phase).toBe(LearnPhase.SHUFFLE)
    expect(ctx.eaten).toEqual([])
    const shuffleTargets = []
    for (let i = 0; i < SHUFFLE_ROUNDS; i++) {
      expect(ctx.eaten).not.toContain(ctx.target)
      shuffleTargets.push(ctx.target)
      ctx = learnTransition(ctx, ctx.target).next
    }
    expect(new Set(shuffleTargets).size).toBe(shuffleTargets.length)
  })

  it('a wrong feed does not eat any letter', () => {
    let ctx = learnInitial('me', 9)
    for (let i = 0; i < 21; i++) ctx = learnTransition(ctx, ctx.forms[ctx.idx]).next
    expect(ctx.phase).toBe(LearnPhase.ECHO)
    const wrong = ctx.forms.find((k) => k !== ctx.target)
    const r = learnTransition(ctx, wrong)
    expect(r.correct).toBe(false)
    expect(r.next.eaten).toEqual([]) // nothing removed
    expect(r.next.wrongs).toBe(1)
  })

  it('is deterministic per seed', () => {
    const run = (seed) => {
      let ctx = learnInitial('me', seed)
      const targets = []
      for (let i = 0; i < 21; i++) ctx = learnTransition(ctx, ctx.forms[ctx.idx]).next
      while (ctx.phase === LearnPhase.ECHO || ctx.phase === LearnPhase.SHUFFLE) {
        targets.push(ctx.target)
        ctx = learnTransition(ctx, ctx.target).next
      }
      return targets.join(',')
    }
    expect(run(11)).toBe(run(11))
    expect(run(11)).not.toBe(run(12))
  })
})

describe('mix challenges', () => {
  it('samples sound-unique letters from the given families', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const ctx = mixInitial(['ha', 'le', 'hha'], seed) // ha and hha are twins
      const sounds = ctx.order.map(soundOf)
      expect(new Set(sounds).size).toBe(sounds.length)
      expect(ctx.order.length).toBeGreaterThanOrEqual(2)
      expect(ctx.phase).toBe(LearnPhase.SHUFFLE)
      expect(ctx.order).toContain(ctx.target)
    }
  })
})

describe('the path', () => {
  it('interleaves mix stones after every family except the first per group', () => {
    const g1 = STONES.filter((s) => s.group === 1)
    expect(g1.filter((s) => s.type === 'family')).toHaveLength(8)
    expect(g1.filter((s) => s.type === 'mix')).toHaveLength(7)
    expect(g1[0].type).toBe('family')
    expect(g1[1].type).toBe('family')
    expect(g1[2].type).toBe('mix')
    expect(g1[2].families).toEqual([g1[0].id, g1[1].id])
  })

  it('unlocks stones strictly in sequence and gates quiz groups', () => {
    const empty = { mastered: [], mixes: [] }
    expect(stoneUnlocked(empty, 0)).toBe(true)
    expect(stoneUnlocked(empty, 1)).toBe(false)
    expect(groupMastered(empty, 1)).toBe(false)
    const g1families = FIDEL_FAMILIES.slice(0, 8).map((f) => f.id)
    expect(groupMastered({ mastered: g1families, mixes: [] }, 1)).toBe(true)
    expect(groupMastered({ mastered: g1families, mixes: [] }, 2)).toBe(false)
  })
})
