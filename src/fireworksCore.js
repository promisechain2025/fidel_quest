/* ============================================================================
   FIDEL FIREWORKS — pure core (seeded machine: wishes, rack, charge->order)
   ----------------------------------------------------------------------------
   The replacement arcade game for the old "island" node. At the Demera night
   festival the child LAUNCHES letters as fireworks: pick the consonant FAMILY
   (a firework shell) and CHARGE the mortar to the right vowel-ORDER rung. So a
   Fidel letter is felt as consonant + vowel modification - the core abugida
   idea - and every correct launch is an instant firework payoff.

   This file is PURE: a seeded, table-driven reducer (mulberry32 via
   platform/rng) + lazy wish factory, drawn on NOTHING here. No three.js, no
   canvas, no wall clock - charge time arrives on the RELEASE event. It is a
   pure function of (level, seed), so the whole game is testable headless.
   ========================================================================== */

import { rngNext, rngShuffle } from './platform/rng'
import { cumulativePool } from './skylandsCore'
import { INDEXES, ORDERS } from './platform/ethiopic'

const formOf = (key) => INDEXES.byAudioKey.get(key)
const baseSound = (familyId) => formOf(`${familyId}-1`)?.sound

/* Order indices actually used in audio keys (1..7), from the active pack. */
const ORDER_IDX = ORDERS.map((o) => o.index)

/** How long the charge gauge takes to climb ONE rung (ms). Time-based, never
    frame-based, so the launch height reads identically on a slow phone. */
export const MS_PER_RUNG = 430
/** Ignoring Jibby this long (accumulated mud) costs a "dud beat" - the current
    combo resets, but the Sky Meter never regresses. */
export const JIBBY_THRESHOLD = 3200

export const Phase = Object.freeze({
  WISH: 'WISH', SELECT_SHELL: 'SELECT_SHELL', CHARGING: 'CHARGING',
  RESOLVING: 'RESOLVING', FINALE: 'FINALE', DONE: 'DONE',
})
export const FwEvent = Object.freeze({
  WISH_SHOWN: 'WISH_SHOWN', SELECT_SHELL: 'SELECT_SHELL', RELEASE: 'RELEASE',
  BLOOM_DONE: 'BLOOM_DONE', SHOO_JIBBY: 'SHOO_JIBBY', TICK: 'TICK', FINALE_DONE: 'FINALE_DONE',
})

/* Two nodes on the Journey, sized off the cumulative learned pool. island1 is
   the early gateway (first ~8 families, short 3-rung ladder, no mystery, sleepy
   Jibby); finale is the later gateway (all families, full 7 rungs, audio-only
   "mystery" wishes, twins, brisk Jibby). */
export const FW_CONFIGS = Object.freeze({
  island1: { islandForPool: 1, rackSize: 2, ladderCount: 3, mysteryRate: 0, targetCount: 6, jibbyRate: 0.5 },
  finale: { islandForPool: 4, rackSize: 4, ladderCount: ORDER_IDX.length, mysteryRate: 0.34, targetCount: 10, jibbyRate: 1 },
})
/** Map a Journey gateway's island number to a Fireworks config key. */
export const levelForIsland = (island) => (island >= 4 ? 'finale' : 'island1')

/** The consonant families available at a node (one id per family), in order. */
export function poolFamilies(cfg) {
  return cumulativePool(cfg.islandForPool).map((k) => k.split('-')[0])
}

/** The vowel-order indices this node's ladder offers (bottom-to-top). */
export const ladderOrders = (cfg) => ORDER_IDX.slice(0, cfg.ladderCount)

/**
 * The i-th wish of a run: a pure function of (seed, i). Never a fixed queue -
 * the child keeps launching until the Sky Meter is full, so there is always a
 * next letter and a miss is never a dead end.
 * Returns { familyId, order, flavor, rack:[familyId...] }.
 * Twin-safety: the rack never holds two same-sound families, so a shell is
 * never ambiguous; the target family is always present (fairness).
 */
export function nthWish(cfg, fams, seed, i) {
  const orders = ladderOrders(cfg)
  let s = ((seed ^ (0x9e3779b1 * (i + 1))) >>> 0) | 1
  let r
  ;[r, s] = rngNext(s); const familyId = fams[Math.floor(r * fams.length) % fams.length]
  ;[r, s] = rngNext(s); const order = orders[Math.floor(r * orders.length) % orders.length]
  ;[r, s] = rngNext(s); const flavor = r < cfg.mysteryRate ? 'mystery' : 'standard'
  // Every shell in the rack must have a DISTINCT base sound, so no shell is
  // ever ambiguous (twins never co-occur, and two distractors never collide).
  const usedSounds = new Set([baseSound(familyId)])
  let shuffled
  ;[shuffled, s] = rngShuffle(fams.filter((f) => f !== familyId), s)
  const distract = []
  for (const f of shuffled) {
    if (distract.length >= cfg.rackSize - 1) break
    const snd = baseSound(f)
    if (usedSounds.has(snd)) continue
    usedSounds.add(snd)
    distract.push(f)
  }
  let rack
  ;[rack, s] = rngShuffle([familyId, ...distract], s)
  return { familyId, order, flavor, rack }
}

export function initFireworks(level, seed) {
  const cfg = FW_CONFIGS[level] || FW_CONFIGS.island1
  const fams = poolFamilies(cfg)
  const first = nthWish(cfg, fams, seed, 0)
  return {
    seed, level, cfg, fams,
    cursor: 0,
    wish: first,
    rack: first.rack,
    phase: Phase.WISH,
    mortarShell: null,
    skyMeter: 0,
    combo: 0,
    bestCombo: 0,
    mastered: {},
    jibbyMud: 0,
    lastResult: null, // { targetKey, madeKey, perfect }
    results: [],
  }
}

const rej = (ctx) => ({ next: ctx, accepted: false })
const ok = (next) => ({ next, accepted: true })

/** Pure transition. Ill-timed events are rejected (accepted:false, ctx
    unchanged), never silently absorbed - the repo machine contract. */
export function fireworksTransition(ctx, event) {
  const { type, payload = {} } = event
  const cfg = ctx.cfg
  const orders = ladderOrders(cfg)

  // Jibby lives outside the launch flow - shoo/tick work in any live phase.
  if (type === FwEvent.SHOO_JIBBY) {
    if (ctx.phase === Phase.DONE) return rej(ctx)
    return ok({ ...ctx, jibbyMud: 0 })
  }
  if (type === FwEvent.TICK) {
    if (ctx.phase === Phase.DONE || ctx.phase === Phase.FINALE) return rej(ctx)
    const mud = ctx.jibbyMud + cfg.jibbyRate * (payload.ms || 0)
    if (mud >= JIBBY_THRESHOLD) return ok({ ...ctx, jibbyMud: 0, combo: 0 }) // dud beat: meter untouched
    return ok({ ...ctx, jibbyMud: mud })
  }

  switch (ctx.phase) {
    case Phase.WISH: {
      if (type !== FwEvent.WISH_SHOWN) return rej(ctx)
      // island1 with a single-shell rack hands the shell straight to the mortar.
      if (ctx.rack.length === 1) return ok({ ...ctx, phase: Phase.CHARGING, mortarShell: ctx.rack[0] })
      return ok({ ...ctx, phase: Phase.SELECT_SHELL })
    }
    case Phase.SELECT_SHELL: {
      if (type !== FwEvent.SELECT_SHELL) return rej(ctx)
      if (!ctx.rack.includes(payload.familyId)) return rej(ctx)
      return ok({ ...ctx, phase: Phase.CHARGING, mortarShell: payload.familyId })
    }
    case Phase.CHARGING: {
      if (type !== FwEvent.RELEASE) return rej(ctx)
      // Two ways to set the order: tap a rung (no timing) or hold-and-release
      // (charge). Late/early holds auto-snap to the nearest rung.
      const rung = payload.rung != null
        ? Math.max(0, Math.min(orders.length - 1, payload.rung))
        : Math.max(0, Math.min(orders.length - 1, Math.floor((payload.elapsedMs || 0) / MS_PER_RUNG)))
      const madeOrder = orders[rung]
      const family = ctx.mortarShell
      const perfect = family === ctx.wish.familyId && madeOrder === ctx.wish.order
      const targetKey = `${ctx.wish.familyId}-${ctx.wish.order}`
      const madeKey = `${family}-${madeOrder}`
      const skyMeter = perfect ? ctx.skyMeter + 1 : ctx.skyMeter
      const combo = perfect ? ctx.combo + 1 : 0
      const mastered = perfect
        ? { ...ctx.mastered, [family]: (ctx.mastered[family] || 0) + 1 }
        : ctx.mastered
      return ok({
        ...ctx,
        phase: Phase.RESOLVING,
        skyMeter,
        combo,
        bestCombo: Math.max(ctx.bestCombo, combo),
        mastered,
        lastResult: { targetKey, madeKey, perfect },
        results: [...ctx.results, { targetKey, madeKey, perfect }],
      })
    }
    case Phase.RESOLVING: {
      if (type !== FwEvent.BLOOM_DONE) return rej(ctx)
      if (ctx.skyMeter >= cfg.targetCount) return ok({ ...ctx, phase: Phase.FINALE })
      const cursor = ctx.cursor + 1
      const wish = nthWish(cfg, ctx.fams, ctx.seed, cursor)
      return ok({ ...ctx, phase: Phase.WISH, cursor, wish, rack: wish.rack, mortarShell: null, lastResult: null })
    }
    case Phase.FINALE: {
      if (type !== FwEvent.FINALE_DONE) return rej(ctx)
      return ok({ ...ctx, phase: Phase.DONE })
    }
    default:
      return rej(ctx)
  }
}

/** Is a family "mastered" enough to fade its ladder labels (recall, not
    lookup)? Used by the renderer; pure so tests can assert the fade rule. */
export const isMastered = (ctx, familyId) => (ctx.mastered[familyId] || 0) >= 2
