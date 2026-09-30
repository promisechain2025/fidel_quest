/* ============================================================================
   SCHOOL PATH DRILLS — Word Build + Find-the-fidel (pure, seeded)
   ----------------------------------------------------------------------------
   Two Grade 1 steps that sit on the Tigrinya School Path after a unit's
   letter families and before its quiz. Word lists come from the unit data
   (blendWords / midLetterTargets). This file only shuffles and scores.

   Echo lines are not a game here. No microphone, no say-it phase.

   Ill-timed events are rejected, never absorbed. No Math.random — the
   tile order is a pure function of (words, seed) via the shared PRNG.
   ========================================================================== */

import { rngShuffle } from './platform/rng'

export const WordBuildPhase = Object.freeze({
  PICK: 'PICK',
  BUILT: 'BUILT',
  DONE: 'DONE',
})

export const FindPhase = Object.freeze({
  HUNT: 'HUNT',
  FOUND: 'FOUND',
  DONE: 'DONE',
})

function tilesFor(geez, rngState) {
  const chars = [...geez].map((ch, i) => ({ ch, id: i, used: false }))
  const [tray, next] = rngShuffle(chars, rngState)
  // A shuffle that lands in reading order teaches nothing. Swap once.
  if (tray.length > 1 && tray.every((t, i) => t.id === i)) {
    ;[tray[0], tray[1]] = [tray[1], tray[0]]
  }
  return [tray, next]
}

/** words: [{ geez, meaningEn, familyIds, unitId, kind }]. Empty → already done. */
export function wordBuildInitial(words, seed = 1) {
  const list = Array.isArray(words) ? words : []
  const rngState = (seed | 0) || 1
  if (!list.length || ![...list[0].geez || ''].length) {
    return {
      words: list,
      wi: 0,
      phase: WordBuildPhase.DONE,
      slot: 0,
      tray: [],
      lastWrong: null,
      wrongTick: 0,
      rngState,
    }
  }
  const [tray, next] = tilesFor(list[0].geez, rngState)
  return {
    words: list,
    wi: 0,
    phase: WordBuildPhase.PICK,
    slot: 0,
    tray,
    lastWrong: null,
    wrongTick: 0,
    rngState: next,
  }
}

/** Events: {type:'TILE', index} while PICK, {type:'NEXT'} while BUILT. */
export function wordBuildTransition(ctx, ev) {
  const reject = { next: ctx, advanced: false, correct: false }
  if (!ctx || ctx.phase === WordBuildPhase.DONE) return reject
  const word = ctx.words[ctx.wi]
  if (!word) return reject
  const chars = [...word.geez]

  if (ctx.phase === WordBuildPhase.PICK && ev?.type === 'TILE') {
    const tile = ctx.tray[ev.index]
    if (!tile || tile.used) return reject
    if (tile.ch !== chars[ctx.slot]) {
      return {
        next: { ...ctx, lastWrong: ev.index, wrongTick: (ctx.wrongTick || 0) + 1 },
        advanced: false,
        correct: false,
      }
    }
    const tray = ctx.tray.map((t, i) => (i === ev.index ? { ...t, used: true } : t))
    const slot = ctx.slot + 1
    if (slot < chars.length) {
      return { next: { ...ctx, tray, slot, lastWrong: null }, advanced: true, correct: true }
    }
    return {
      next: { ...ctx, tray, slot, lastWrong: null, phase: WordBuildPhase.BUILT },
      advanced: true,
      correct: true,
    }
  }

  if (ctx.phase === WordBuildPhase.BUILT && ev?.type === 'NEXT') {
    if (ctx.wi + 1 >= ctx.words.length) {
      return { next: { ...ctx, phase: WordBuildPhase.DONE, lastWrong: null }, advanced: true, correct: true }
    }
    const [tray, rngState] = tilesFor(ctx.words[ctx.wi + 1].geez, ctx.rngState)
    return {
      next: {
        ...ctx,
        wi: ctx.wi + 1,
        phase: WordBuildPhase.PICK,
        slot: 0,
        tray,
        rngState,
        lastWrong: null,
      },
      advanced: true,
      correct: true,
    }
  }

  return reject
}

/** targets: [{ geez, target, index, position, meaningEn, familyId }]. */
export function findFidelInitial(targets) {
  const list = Array.isArray(targets) ? targets : []
  if (!list.length || list[0].index == null) {
    return { targets: list, ti: 0, phase: FindPhase.DONE, lastWrong: null, wrongTick: 0 }
  }
  return { targets: list, ti: 0, phase: FindPhase.HUNT, lastWrong: null, wrongTick: 0 }
}

/** Events: {type:'TAP', index} while HUNT, {type:'NEXT'} while FOUND. */
export function findFidelTransition(ctx, ev) {
  const reject = { next: ctx, advanced: false, correct: false }
  if (!ctx || ctx.phase === FindPhase.DONE) return reject
  const target = ctx.targets[ctx.ti]
  if (!target) return reject
  const chars = [...target.geez]
  const index = Number.isInteger(target.index) ? target.index : chars.indexOf(target.target)

  if (ctx.phase === FindPhase.HUNT && ev?.type === 'TAP') {
    if (!Number.isInteger(ev.index) || ev.index < 0 || ev.index >= chars.length) return reject
    if (ev.index === index) {
      return { next: { ...ctx, phase: FindPhase.FOUND, lastWrong: null }, advanced: true, correct: true }
    }
    return {
      next: { ...ctx, lastWrong: ev.index, wrongTick: (ctx.wrongTick || 0) + 1 },
      advanced: false,
      correct: false,
    }
  }

  if (ctx.phase === FindPhase.FOUND && ev?.type === 'NEXT') {
    if (ctx.ti + 1 >= ctx.targets.length) {
      return { next: { ...ctx, phase: FindPhase.DONE, lastWrong: null }, advanced: true, correct: true }
    }
    return {
      next: { ...ctx, ti: ctx.ti + 1, phase: FindPhase.HUNT, lastWrong: null },
      advanced: true,
      correct: true,
    }
  }

  return reject
}
