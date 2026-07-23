import { describe, it, expect } from 'vitest'
import {
  initCatch, catchTransition as T, CATCH_CONFIGS, levelForIsland, poolKeys,
  Phase, CatchEvent,
} from './letterCatchCore'
import { INDEXES } from './platform/ethiopic'

const soundOf = (k) => INDEXES.byAudioKey.get(k)?.sound
const tick = (ctx, dt = 0.03) => T(ctx, { type: CatchEvent.TICK, payload: { dt } }).next
const shoot = (ctx, id) => T(ctx, { type: CatchEvent.SHOOT, payload: { id } }).next

/** A "good player": shoot the called letter whenever one is on screen, never
    shoot a wrong one - so a win proves the game is winnable and keeps hearts. */
function playWell(level, seed, maxTicks = 20000) {
  let ctx = initCatch(level, seed)
  for (let n = 0; n < maxTicks && ctx.phase === Phase.PLAY; n++) {
    const tgt = ctx.items.find((it) => it.key === ctx.target)
    if (tgt) { ctx = shoot(ctx, tgt.id); continue }
    ctx = tick(ctx, 0.03)
  }
  return ctx
}

describe('letterCatchCore (shoot)', () => {
  it('is deterministic: same seed + same dt sequence => identical run', () => {
    const run = (seed) => { let c = initCatch('hard', seed); for (let i = 0; i < 400; i++) c = tick(c, 0.02); return c }
    expect(run(4242)).toEqual(run(4242))
  })

  it('spawns letters over time within the item cap, each with a real glyph and unique id', () => {
    let c = initCatch('easy', 7)
    for (let i = 0; i < 400; i++) c = tick(c, 0.02)
    expect(c.items.length).toBeGreaterThan(0)
    expect(c.items.length).toBeLessThanOrEqual(CATCH_CONFIGS.easy.maxItems)
    expect(new Set(c.items.map((it) => it.id)).size).toBe(c.items.length)
    for (const it of c.items) expect(INDEXES.byAudioKey.has(it.key)).toBe(true)
  })

  it('shooting the called letter scores; shooting a wrong letter costs a heart', () => {
    let c = initCatch('easy', 3)
    for (let i = 0; i < 60 && !c.items.some((it) => it.key === c.target); i++) c = tick(c)
    const good = c.items.find((it) => it.key === c.target)
    const after = shoot(c, good.id)
    expect(after.caught).toBe(1)
    expect(after.lives).toBe(c.lives)
    // a wrong letter (spawn/scan for a non-target)
    let d = initCatch('easy', 11)
    for (let i = 0; i < 120 && !d.items.some((it) => it.key !== d.target); i++) d = tick(d)
    const wrong = d.items.find((it) => it.key !== d.target)
    if (wrong) {
      const bad = shoot(d, wrong.id)
      expect(bad.lives).toBe(d.lives - 1)
      expect(bad.caught).toBe(0)
    }
  })

  it('a letter left to fall past is neither scored nor penalised', () => {
    const base = initCatch('easy', 3)
    let c = { ...base, items: [{ id: 99, x: 0.5, y: 1.15, key: base.target }] }
    c = tick(c, 0.05)
    expect(c.items.find((it) => it.id === 99)).toBeUndefined()
    expect(c.caught).toBe(0)
    expect(c.lives).toBe(base.lives)
  })

  it('shooting empty space (no such id) is rejected', () => {
    const c = initCatch('easy', 1)
    expect(T(c, { type: CatchEvent.SHOOT, payload: { id: 12345 } }).accepted).toBe(false)
  })

  it('losing all hearts ends the run as LOSE', () => {
    const base = initCatch('easy', 5)
    const other = base.pool.find((k) => k !== base.target && soundOf(k) !== soundOf(base.target))
    let c = { ...base, lives: 1, items: [{ id: 1, x: 0.5, y: 0.4, key: other }] }
    c = shoot(c, 1)
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
    expect(T(won, { type: CatchEvent.SHOOT, payload: { id: 1 } }).accepted).toBe(false)
  })

  it('levelForIsland maps the two gateways', () => {
    expect(levelForIsland(1)).toBe('easy')
    expect(levelForIsland(4)).toBe('hard')
    expect(poolKeys(CATCH_CONFIGS.easy).length).toBeGreaterThan(0)
  })
})
