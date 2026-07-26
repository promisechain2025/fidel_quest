import { describe, it, expect } from 'vitest'
import { initMatch, matchTransition, levelForCount, MATCH_CONFIGS, Phase, MatchEvent } from './memoryCore'
import { INDEXES, FIDEL_FAMILIES } from './platform/ethiopic'

// A generous pool of real base-form keys, drawn straight from the letter table.
const POOL = FIDEL_FAMILIES.slice(0, 10).map((f) => `${f.id}-1`)

const flip = (ctx, id) => matchTransition(ctx, { type: MatchEvent.FLIP, payload: { id } })
const resolve = (ctx) => matchTransition(ctx, { type: MatchEvent.RESOLVE })

/** Solve the whole board by flipping each key's two ids together. */
function solve(ctx) {
  let cur = ctx
  const byKey = new Map()
  for (const c of cur.cards) {
    if (!byKey.has(c.key)) byKey.set(c.key, [])
    byKey.get(c.key).push(c.id)
  }
  for (const [, ids] of byKey) {
    cur = flip(cur, ids[0]).next
    cur = flip(cur, ids[1]).next
  }
  return cur
}

describe('fidel memory match core', () => {
  it('is deterministic and builds pairs*2 cards from valid keys', () => {
    const a = initMatch('med', 42, POOL)
    const b = initMatch('med', 42, POOL)
    expect(a).toEqual(b)
    expect(a.cards).toHaveLength(a.pairs * 2)
    expect(a.pairs).toBe(MATCH_CONFIGS.med.pairs)
    for (const c of a.cards) expect(INDEXES.byAudioKey.has(c.key)).toBe(true)
    // exactly two of each chosen key
    const counts = {}
    for (const c of a.cards) counts[c.key] = (counts[c.key] || 0) + 1
    expect(Object.values(counts).every((n) => n === 2)).toBe(true)
  })

  it('caps pairs to the pool size when the pool is small', () => {
    const ctx = initMatch('hard', 5, POOL.slice(0, 2)) // hard wants 8 pairs, pool has 2
    expect(ctx.pairs).toBe(2)
    expect(ctx.cards).toHaveLength(4)
  })

  it('a matching pair locks immediately without needing RESOLVE', () => {
    let ctx = initMatch('easy', 7, POOL)
    const first = ctx.cards[0]
    const twin = ctx.cards.find((c) => c.key === first.key && c.id !== first.id)
    ctx = flip(ctx, first.id).next
    const r = flip(ctx, twin.id)
    expect(r.accepted).toBe(true)
    expect(r.next.matches).toBe(1)
    expect(r.next.flipped).toHaveLength(0)
    expect(r.next.cards.filter((c) => c.matched)).toHaveLength(2)
  })

  it('a mismatch stays up until RESOLVE flips both back', () => {
    let ctx = initMatch('med', 11, POOL)
    // find two cards of different keys
    const a = ctx.cards[0]
    const b = ctx.cards.find((c) => c.key !== a.key)
    ctx = flip(ctx, a.id).next
    ctx = flip(ctx, b.id).next
    expect(ctx.flipped).toHaveLength(2)
    expect(ctx.cards.filter((c) => c.faceUp)).toHaveLength(2)
    // a FLIP while awaiting resolve is rejected
    const blocked = flip(ctx, ctx.cards.find((c) => !c.faceUp).id)
    expect(blocked.accepted).toBe(false)
    const done = resolve(ctx)
    expect(done.accepted).toBe(true)
    expect(done.next.flipped).toHaveLength(0)
    expect(done.next.cards.filter((c) => c.faceUp)).toHaveLength(0)
  })

  it('rejects re-flipping a matched or already-face-up card', () => {
    let ctx = initMatch('easy', 3, POOL)
    const first = ctx.cards[0]
    ctx = flip(ctx, first.id).next
    expect(flip(ctx, first.id).accepted).toBe(false) // already up
    const twin = ctx.cards.find((c) => c.key === first.key && c.id !== first.id)
    ctx = flip(ctx, twin.id).next // locks the pair
    expect(flip(ctx, first.id).accepted).toBe(false) // matched
  })

  it('solving the board wins; taps after win are rejected; RESET restarts', () => {
    const ctx = initMatch('easy', 9, POOL)
    const won = solve(ctx)
    expect(won.phase).toBe(Phase.WIN)
    expect(won.matches).toBe(won.pairs)
    expect(flip(won, won.cards[0].id).accepted).toBe(false)
    const reset = matchTransition(won, { type: MatchEvent.RESET })
    expect(reset.accepted).toBe(true)
    expect(reset.next.phase).toBe(Phase.PLAY)
    expect(reset.next.matches).toBe(0)
  })

  it('levelForCount scales the board with letters known', () => {
    expect(levelForCount(0)).toBe('easy')
    expect(levelForCount(4)).toBe('easy')
    expect(levelForCount(6)).toBe('med')
    expect(levelForCount(8)).toBe('hard')
    expect(levelForCount(33)).toBe('hard')
  })
})
