import { describe, it, expect } from 'vitest'
import { initLadder, ladderTransition, familyOrder, Phase, LadderEvent } from './ladderCore'
import { FIDEL_FAMILIES, INDEXES } from './platform/ethiopic'

const tap = (ctx, key) => ladderTransition(ctx, { type: LadderEvent.TAP, payload: { key } })

describe('vowel-order ladder core', () => {
  it('is deterministic: same family + seed gives the same tray', () => {
    const a = initLadder('ha', 42)
    const b = initLadder('ha', 42)
    expect(a).toEqual(b)
    expect(a.tray).toHaveLength(7)
    expect([...a.tray].sort()).toEqual([...a.order].sort()) // a permutation of the 7
  })

  it('every family is winnable by tapping in order, and every key is a real form', () => {
    for (const fam of FIDEL_FAMILIES) {
      const order = familyOrder(fam.id)
      expect(order).toHaveLength(7)
      for (const k of order) expect(INDEXES.byAudioKey.has(k)).toBe(true)
      let ctx = initLadder(fam.id, 7)
      for (let i = 0; i < order.length; i++) {
        const r = tap(ctx, order[i])
        expect(r.accepted, `${fam.id} step ${i}`).toBe(true)
        ctx = r.next
      }
      expect(ctx.phase).toBe(Phase.WIN)
      expect(ctx.placed).toBe(7)
    }
  })

  it('an out-of-order tap is rejected and changes nothing', () => {
    const ctx = initLadder('le', 3)
    const wrong = ctx.order[1] // not the first expected
    const r = tap(ctx, wrong)
    expect(r.accepted).toBe(false)
    expect(r.next).toBe(ctx)
    expect(r.next.placed).toBe(0)
  })

  it('taps after a win are rejected; RESET restarts the same family', () => {
    let ctx = initLadder('me', 9)
    for (const k of ctx.order) ctx = tap(ctx, k).next
    expect(ctx.phase).toBe(Phase.WIN)
    expect(tap(ctx, ctx.order[0]).accepted).toBe(false)
    const reset = ladderTransition(ctx, { type: LadderEvent.RESET })
    expect(reset.accepted).toBe(true)
    expect(reset.next.familyId).toBe('me')
    expect(reset.next.phase).toBe(Phase.PLAY)
    expect(reset.next.placed).toBe(0)
  })
})
