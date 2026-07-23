import { describe, it, expect } from 'vitest'
import {
  initCatch, catchTransition as T, CATCH_CONFIGS, levelForIsland, poolKeys,
  Phase, CatchEvent, CATCH_Y,
} from './letterCatchCore'
import { INDEXES } from './platform/ethiopic'

const soundOf = (k) => INDEXES.byAudioKey.get(k)?.sound
const tick = (ctx, dt = 0.02) => T(ctx, { type: CatchEvent.TICK, payload: { dt } }).next
const move = (ctx, x) => T(ctx, { type: CatchEvent.MOVE, payload: { x } }).next

/** A "good player" controller: catch the called letter when it is safe, and
    otherwise park where nothing is about to land - so a win proves the game is
    winnable, and never accidentally eating a distractor proves the model. */
function playWell(level, seed, maxTicks = 8000) {
  let ctx = initCatch(level, seed)
  const { catchHalf } = ctx.cfg
  const safeSpot = (c) => {
    const near = c.items.filter((it) => it.y >= CATCH_Y - 0.12)
    let best = 0.5, bestGap = -1
    for (let x = 0.12; x <= 0.88; x += 0.04) {
      const gap = near.length ? Math.min(...near.map((it) => Math.abs(it.x - x))) : 1
      if (gap > bestGap) { bestGap = gap; best = x }
    }
    return best
  }
  for (let n = 0; n < maxTicks && ctx.phase === Phase.PLAY; n++) {
    const near = ctx.items.filter((it) => it.y >= CATCH_Y - 0.08)
    const tgt = near.filter((it) => it.key === ctx.target).sort((a, b) => b.y - a.y)[0]
    const danger = tgt && near.some((it) => it.key !== ctx.target && Math.abs(it.x - tgt.x) <= catchHalf)
    ctx = move(ctx, tgt && !danger ? tgt.x : safeSpot(ctx))
    ctx = tick(ctx, 0.02)
  }
  return ctx
}

describe('letterCatchCore', () => {
  it('is deterministic: same seed + same dt sequence => identical run', () => {
    const run = (seed) => { let c = initCatch('hard', seed); for (let i = 0; i < 400; i++) c = tick(c, 0.02); return c }
    expect(run(4242)).toEqual(run(4242))
  })

  it('spawns letters over time within the item cap', () => {
    let c = initCatch('easy', 7)
    for (let i = 0; i < 300; i++) c = tick(c, 0.02)
    expect(c.items.length).toBeGreaterThan(0)
    expect(c.items.length).toBeLessThanOrEqual(CATCH_CONFIGS.easy.maxItems)
    for (const it of c.items) expect(INDEXES.byAudioKey.has(it.key)).toBe(true)
  })

  it('MOVE clamps the basket to [0,1]', () => {
    let c = initCatch('easy', 1)
    expect(move(c, -3).basketX).toBe(0)
    expect(move(c, 9).basketX).toBe(1)
    expect(move(c, 0.42).basketX).toBeCloseTo(0.42)
  })

  it('catching the called letter scores; catching a wrong letter costs a heart', () => {
    const base = initCatch('easy', 3)
    const other = base.pool.find((k) => k !== base.target && soundOf(k) !== soundOf(base.target))
    // a correct letter arriving at the basket
    let good = { ...base, basketX: 0.5, items: [{ id: 1, x: 0.5, y: CATCH_Y, key: base.target }] }
    good = tick(good, 0.02)
    expect(good.caught).toBe(1)
    expect(good.lives).toBe(base.lives)
    // a wrong letter arriving at the basket
    let bad = { ...base, basketX: 0.5, items: [{ id: 2, x: 0.5, y: CATCH_Y, key: other }] }
    bad = tick(bad, 0.02)
    expect(bad.lives).toBe(base.lives - 1)
    expect(bad.caught).toBe(0)
  })

  it('a letter dodged (basket elsewhere) is neither caught nor penalised', () => {
    const base = initCatch('easy', 3)
    let c = { ...base, basketX: 0.1, items: [{ id: 1, x: 0.9, y: CATCH_Y, key: base.target }] }
    c = tick(c, 0.02)
    expect(c.caught).toBe(0)
    expect(c.lives).toBe(base.lives)
  })

  it('losing all hearts ends the run as LOSE', () => {
    const base = initCatch('easy', 5)
    const other = base.pool.find((k) => k !== base.target && soundOf(k) !== soundOf(base.target))
    let c = { ...base, lives: 1, basketX: 0.5, items: [{ id: 1, x: 0.5, y: CATCH_Y, key: other }] }
    c = tick(c, 0.02)
    expect(c.phase).toBe(Phase.LOSE)
  })

  it('is winnable by a good player on both nodes (reaches WIN, keeps hearts)', () => {
    for (const level of ['easy', 'hard']) {
      const end = playWell(level, 99)
      expect(end.phase).toBe(Phase.WIN)
      expect(end.caught).toBe(CATCH_CONFIGS[level].need)
      expect(end.lives).toBeGreaterThan(0)
    }
  })

  it('rejects events once the run is over', () => {
    const won = { ...initCatch('easy', 1), phase: Phase.WIN }
    expect(T(won, { type: CatchEvent.TICK, payload: { dt: 0.02 } }).accepted).toBe(false)
    expect(T(won, { type: CatchEvent.MOVE, payload: { x: 0.3 } }).accepted).toBe(false)
  })

  it('levelForIsland maps the two gateways', () => {
    expect(levelForIsland(1)).toBe('easy')
    expect(levelForIsland(4)).toBe('hard')
    expect(poolKeys(CATCH_CONFIGS.easy).length).toBeGreaterThan(0)
  })
})
