import { describe, it, expect } from 'vitest'
import { initLineup, lineupTransition, familyOrder, Phase, LineupEvent } from './lineupCore'
import { FIDEL_FAMILIES, INDEXES } from './platform/ethiopic'

const place = (ctx, key, slot) => lineupTransition(ctx, { type: LineupEvent.PLACE, payload: { key, slot } })

describe('line up core', () => {
  it('is deterministic and deals a shuffled tray of the seven forms', () => {
    const a = initLineup('ha', 42)
    const b = initLineup('ha', 42)
    expect(a).toEqual(b)
    expect(a.tray).toHaveLength(7)
    expect(a.slots).toEqual([null, null, null, null, null, null, null])
    expect([...a.tray].sort()).toEqual([...a.order].sort())
  })

  it('every family is completable by dropping each card in its home slot', () => {
    for (const fam of FIDEL_FAMILIES) {
      const order = familyOrder(fam.id)
      for (const k of order) expect(INDEXES.byAudioKey.has(k)).toBe(true)
      let ctx = initLineup(fam.id, 5)
      // place in a scrambled slot sequence to prove order-independence
      for (const slot of [3, 0, 6, 1, 4, 2, 5]) {
        const r = place(ctx, order[slot], slot)
        expect(r.accepted, `${fam.id} slot ${slot}`).toBe(true)
        ctx = r.next
      }
      expect(ctx.phase).toBe(Phase.WIN)
      expect(ctx.slots).toEqual(order)
    }
  })

  it('a card dropped in the wrong slot is rejected and nothing moves', () => {
    const ctx = initLineup('le', 3)
    const homeOfFirst = ctx.order.indexOf(ctx.tray[0])
    const wrongSlot = (homeOfFirst + 1) % 7
    const r = place(ctx, ctx.tray[0], wrongSlot)
    expect(r.accepted).toBe(false)
    expect(r.next).toBe(ctx)
    expect(r.next.slots.every((s) => s === null)).toBe(true)
  })

  it('rejects placing into an occupied slot', () => {
    let ctx = initLineup('me', 9)
    ctx = place(ctx, ctx.order[2], 2).next // fill slot 2 correctly
    // the card whose home is slot 2 is gone; but re-attempting slot 2 with any
    // remaining card is rejected because it is occupied
    const other = ctx.tray[0]
    const r = place(ctx, other, 2)
    expect(r.accepted).toBe(false)
  })

  it('rejects an out-of-range slot and a card not in hand', () => {
    const ctx = initLineup('ha', 7)
    expect(place(ctx, ctx.order[0], 9).accepted).toBe(false)
    expect(place(ctx, ctx.order[0], -1).accepted).toBe(false)
    expect(place(ctx, 'not-a-key', 0).accepted).toBe(false)
  })

  it('placements after a win are rejected; RESET restarts the same family', () => {
    let ctx = initLineup('se', 11)
    ctx.order.forEach((k, i) => { ctx = place(ctx, k, i).next })
    expect(ctx.phase).toBe(Phase.WIN)
    expect(place(ctx, ctx.order[0], 0).accepted).toBe(false)
    const reset = lineupTransition(ctx, { type: LineupEvent.RESET })
    expect(reset.accepted).toBe(true)
    expect(reset.next.familyId).toBe('se')
    expect(reset.next.phase).toBe(Phase.PLAY)
    expect(reset.next.slots.every((s) => s === null)).toBe(true)
  })
})
