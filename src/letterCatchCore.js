/* ============================================================================
   LETTER SHOOT — Fidel Sky Shooter (pure core)
   ----------------------------------------------------------------------------
   The arcade-gateway game. Letters rain from the sky; Kokeb CALLS a letter
   (sound only) and the child SHOOTS the matching one as it falls - it bursts
   into a firework. Shoot enough correct letters to win; a wrong shot costs a
   heart; a letter you let fall past costs nothing.

   PURE + SEEDED: a stepped reducer over the shared mulberry32 RNG. WHICH
   letters fall and WHERE is a pure function of (level, seed) and the TICK
   dt's; the child's taps arrive as SHOOT events. No canvas, no wall clock
   (frame dt supplied on TICK), so it tests headless. y is normalised 0..1.
   ========================================================================== */

import { rngNext } from './platform/rng'
import { cumulativePool } from './skylandsCore'
import { INDEXES } from './platform/ethiopic'

const formOf = (k) => INDEXES.byAudioKey.get(k)
const soundOf = (k) => formOf(k)?.sound

/** Biggest frame the machine will integrate (a stall can't skip spawns). */
export const MAX_DT = 0.05

export const Phase = Object.freeze({ PLAY: 'PLAY', WIN: 'WIN', LOSE: 'LOSE' })
export const CatchEvent = Object.freeze({ TICK: 'TICK', SHOOT: 'SHOOT', RESET: 'RESET' })

/* Two nodes. Pool = the letters the CHILD HAS LEARNED (all vowel orders),
   passed in by the renderer; the islandForPool floor only matters if none is
   given. Tuned for TEACHING, not twitch: few letters on screen, the called
   letter appears often, a gentle fall. */
export const CATCH_CONFIGS = Object.freeze({
  easy: { islandForPool: 1, need: 8, lives: 3, fallSpeed: 0.16, spawnEvery: 1.15, pTarget: 0.55, rotateEvery: 3, maxItems: 3 },
  hard: { islandForPool: 4, need: 10, lives: 3, fallSpeed: 0.22, spawnEvery: 0.95, pTarget: 0.5, rotateEvery: 3, maxItems: 4 },
})
export const levelForIsland = (island) => (island >= 4 ? 'hard' : 'easy')
export const poolKeys = (cfg) => cumulativePool(cfg.islandForPool)

const pickFrom = (state, arr) => {
  const [r, s] = rngNext(state)
  return [arr[Math.floor(r * arr.length) % arr.length], s]
}

export function initCatch(level, seed, poolOverride) {
  const cfg = CATCH_CONFIGS[level] || CATCH_CONFIGS.easy
  const pool = Array.isArray(poolOverride) && poolOverride.length >= 2 ? poolOverride : poolKeys(cfg)
  let s = (seed >>> 0) | 1
  let target
  ;[target, s] = pickFrom(s, pool)
  return {
    seed, level, cfg, pool, rngState: s,
    target, targetsShot: 0,
    need: cfg.need, caught: 0, lives: cfg.lives,
    combo: 0, bestCombo: 0,
    items: [], nextId: 1, spawnAcc: 0, elapsed: 0,
    flash: null, // { type:'good'|'bad', key, x, y } - transient, for the renderer
    phase: Phase.PLAY,
  }
}

const rej = (ctx) => ({ next: ctx, accepted: false })
const ok = (next) => ({ next, accepted: true })
const endState = (ctx) => (ctx.caught >= ctx.need ? Phase.WIN : ctx.lives <= 0 ? Phase.LOSE : Phase.PLAY)

/** Pure stepped transition. */
export function catchTransition(ctx, event) {
  const { type, payload = {} } = event
  if (type === CatchEvent.RESET) return ok(initCatch(ctx.level, (ctx.seed * 1664525 + 1013904223) >>> 0, ctx.pool))
  if (ctx.phase !== Phase.PLAY) return rej(ctx)

  if (type === CatchEvent.SHOOT) {
    const hit = ctx.items.find((it) => it.id === payload.id)
    if (!hit) return rej(ctx)
    let s = ctx.rngState
    let { caught, lives, combo, bestCombo, target, targetsShot } = ctx
    let flash
    if (hit.key === target) {
      caught += 1; targetsShot += 1; combo += 1; bestCombo = Math.max(bestCombo, combo)
      flash = { type: 'good', key: hit.key, x: hit.x, y: hit.y }
      if (targetsShot >= ctx.cfg.rotateEvery) {
        const others = ctx.pool.filter((k) => k !== target)
        ;[target, s] = pickFrom(s, others.length ? others : ctx.pool)
        targetsShot = 0
      }
    } else {
      lives -= 1; combo = 0
      flash = { type: 'bad', key: hit.key, x: hit.x, y: hit.y }
    }
    const items = ctx.items.filter((it) => it.id !== payload.id)
    const next = { ...ctx, items, caught, lives, combo, bestCombo, target, targetsShot, rngState: s, flash }
    return ok({ ...next, phase: endState(next) })
  }

  if (type !== CatchEvent.TICK) return rej(ctx)

  const cfg = ctx.cfg
  const dt = Math.min(MAX_DT, Math.max(0, payload.dt || 0))
  let s = ctx.rngState

  // advance + drop offscreen letters (a missed letter costs nothing)
  const items = []
  for (const it of ctx.items) {
    const y = it.y + cfg.fallSpeed * dt
    if (y <= 1.12) items.push({ ...it, y })
  }

  // spawn on schedule (seeded key + x), capped, with stable incremental ids
  let nextId = ctx.nextId
  let spawnAcc = ctx.spawnAcc + dt
  while (spawnAcc >= cfg.spawnEvery && items.length < cfg.maxItems) {
    spawnAcc -= cfg.spawnEvery
    let r
    ;[r, s] = rngNext(s)
    let key
    if (r < cfg.pTarget) {
      key = ctx.target
    } else {
      const distract = ctx.pool.filter((k) => k !== ctx.target && soundOf(k) !== soundOf(ctx.target))
      ;[key, s] = pickFrom(s, distract.length ? distract : ctx.pool)
    }
    let rx
    ;[rx, s] = rngNext(s)
    items.push({ id: nextId++, x: 0.14 + rx * 0.72, y: -0.06, key })
  }

  return ok({ ...ctx, items, nextId, spawnAcc, rngState: s, elapsed: ctx.elapsed + dt, flash: null })
}
