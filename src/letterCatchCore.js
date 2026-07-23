/* ============================================================================
   LETTER CATCH — Anbessa's Harvest (pure core)
   ----------------------------------------------------------------------------
   The arcade-gateway game. Letters rain from the sky; the child slides
   Anbessa's basket left/right to CATCH the letter Kokeb calls and DODGE the
   others. Catch enough correct letters to win; wrong catches cost a heart.

   PURE + SEEDED: a stepped reducer over the shared mulberry32 RNG. WHICH
   letters fall and WHERE is a pure function of (level, seed) and the sequence
   of TICK dt's; player movement arrives as MOVE events. No three.js, no
   canvas, no wall clock (frame dt is supplied on TICK), so it tests headless.
   Coordinates are normalised 0..1 (x across, y down).
   ========================================================================== */

import { rngNext } from './platform/rng'
import { cumulativePool } from './skylandsCore'
import { INDEXES } from './platform/ethiopic'

const formOf = (k) => INDEXES.byAudioKey.get(k)
const soundOf = (k) => formOf(k)?.sound

/** The y at which a falling letter reaches the basket line. */
export const CATCH_Y = 0.8
/** Biggest frame the machine will integrate, so a stall can't teleport letters
    through the basket. */
export const MAX_DT = 0.05

export const Phase = Object.freeze({ PLAY: 'PLAY', WIN: 'WIN', LOSE: 'LOSE' })
export const CatchEvent = Object.freeze({ TICK: 'TICK', MOVE: 'MOVE', RESET: 'RESET' })

/* Two nodes, sized off the cumulative learned pool. easy = early gateway (first
   ~8 families, slow rain, few letters); hard = later gateway (all families,
   faster, busier). */
export const CATCH_CONFIGS = Object.freeze({
  easy: { islandForPool: 1, need: 8, lives: 3, fallSpeed: 0.26, spawnEvery: 0.9, catchHalf: 0.14, pTarget: 0.5, rotateEvery: 3, maxItems: 4 },
  hard: { islandForPool: 4, need: 12, lives: 3, fallSpeed: 0.4, spawnEvery: 0.72, catchHalf: 0.12, pTarget: 0.42, rotateEvery: 3, maxItems: 6 },
})
export const levelForIsland = (island) => (island >= 4 ? 'hard' : 'easy')
export const poolKeys = (cfg) => cumulativePool(cfg.islandForPool)

const pickFrom = (state, arr) => {
  const [r, s] = rngNext(state)
  return [arr[Math.floor(r * arr.length) % arr.length], s]
}

export function initCatch(level, seed) {
  const cfg = CATCH_CONFIGS[level] || CATCH_CONFIGS.easy
  const pool = poolKeys(cfg)
  let s = (seed >>> 0) | 1
  let target
  ;[target, s] = pickFrom(s, pool)
  return {
    seed, level, cfg, pool, rngState: s,
    target, targetsCaught: 0,
    need: cfg.need, caught: 0, lives: cfg.lives,
    combo: 0, bestCombo: 0,
    basketX: 0.5,
    items: [], nextId: 1, spawnAcc: 0, elapsed: 0,
    flash: null, // { type:'good'|'bad', key } - transient, for the renderer
    phase: Phase.PLAY,
  }
}

const rej = (ctx) => ({ next: ctx, accepted: false })
const ok = (next) => ({ next, accepted: true })

/** Pure stepped transition. */
export function catchTransition(ctx, event) {
  const { type, payload = {} } = event
  if (type === CatchEvent.RESET) return ok(initCatch(ctx.level, (ctx.seed * 1664525 + 1013904223) >>> 0))
  if (ctx.phase !== Phase.PLAY) return rej(ctx)

  if (type === CatchEvent.MOVE) {
    return ok({ ...ctx, basketX: Math.max(0, Math.min(1, payload.x ?? ctx.basketX)) })
  }
  if (type !== CatchEvent.TICK) return rej(ctx)

  const cfg = ctx.cfg
  const dt = Math.min(MAX_DT, Math.max(0, payload.dt || 0))
  let s = ctx.rngState
  let { caught, lives, combo, bestCombo, target, targetsCaught, nextId } = ctx
  let flash = null

  // advance + resolve catches / misses
  const kept = []
  for (const it of ctx.items) {
    const y = it.y + cfg.fallSpeed * dt
    if (y >= CATCH_Y && Math.abs(it.x - ctx.basketX) <= cfg.catchHalf) {
      if (it.key === target) { caught += 1; targetsCaught += 1; combo += 1; bestCombo = Math.max(bestCombo, combo); flash = { type: 'good', key: it.key } }
      else { lives -= 1; combo = 0; flash = { type: 'bad', key: it.key } }
      continue // consumed by the basket
    }
    if (y > 1.08) continue // fell past - just missed, no penalty
    kept.push({ ...it, y })
  }

  // rotate the called letter after a few good catches
  if (targetsCaught >= cfg.rotateEvery) {
    const others = ctx.pool.filter((k) => k !== target)
    ;[target, s] = pickFrom(s, others.length ? others : ctx.pool)
    targetsCaught = 0
  }

  // spawn on schedule (seeded key + x), capped
  let spawnAcc = ctx.spawnAcc + dt
  let items = kept
  while (spawnAcc >= cfg.spawnEvery && items.length < cfg.maxItems) {
    spawnAcc -= cfg.spawnEvery
    let r
    ;[r, s] = rngNext(s)
    let key
    if (r < cfg.pTarget) {
      key = target
    } else {
      const distract = ctx.pool.filter((k) => k !== target && soundOf(k) !== soundOf(target))
      ;[key, s] = pickFrom(s, distract.length ? distract : ctx.pool)
    }
    let rx
    ;[rx, s] = rngNext(s)
    items = [...items, { id: nextId++, x: 0.12 + rx * 0.76, y: -0.06, key }]
  }

  let phase = ctx.phase
  if (caught >= ctx.need) phase = Phase.WIN
  else if (lives <= 0) phase = Phase.LOSE

  return ok({ ...ctx, items, caught, lives, combo, bestCombo, target, targetsCaught, nextId, spawnAcc, rngState: s, elapsed: ctx.elapsed + dt, flash, phase })
}
