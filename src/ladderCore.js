/* ============================================================================
   VOWEL-ORDER LADDER — pure core
   ----------------------------------------------------------------------------
   Teaches the abugida SYSTEM: a family's seven vocalised forms are shuffled and
   the child taps them in vowel order (ha hu hi ha he he ho -> orders 1..7).
   A correct tap climbs the next rung; a wrong tap is REJECTED (the renderer
   re-chants, never blocks). Fill all seven rungs to win.

   PURE + SEEDED: which shuffle the tray gets is a pure function of
   (familyId, seed); the child's taps arrive as TAP events. No canvas, no
   clock - it tests headless. Turn-based, so there is no TICK/dt.
   ========================================================================== */
import { rngShuffle } from './platform/rng'
import { ALL_FORMS } from './platform/ethiopic'

export const Phase = Object.freeze({ PLAY: 'PLAY', WIN: 'WIN' })
export const LadderEvent = Object.freeze({ TAP: 'TAP', RESET: 'RESET' })

/** The seven audioKeys of a family in vowel order (['ha-1'..'ha-7']). */
export function familyOrder(familyId) {
  return ALL_FORMS.filter((f) => f.familyId === familyId)
    .sort((a, b) => a.order - b.order)
    .map((f) => f.audioKey)
}

export function initLadder(familyId, seed) {
  const order = familyOrder(familyId)
  const s0 = (seed >>> 0) | 1
  const [tray, rngState] = rngShuffle(order, s0)
  return { familyId, seed, order, tray, placed: 0, phase: Phase.PLAY, flash: null, rngState }
}

const rej = (ctx) => ({ next: ctx, accepted: false })
const ok = (next) => ({ next, accepted: true })

/** Pure transition. TAP is correct only when it is the next expected form. */
export function ladderTransition(ctx, event) {
  const { type, payload = {} } = event
  if (type === LadderEvent.RESET) {
    return ok(initLadder(ctx.familyId, (ctx.seed * 1664525 + 1013904223) >>> 0))
  }
  if (ctx.phase !== Phase.PLAY) return rej(ctx)
  if (type !== LadderEvent.TAP) return rej(ctx)

  if (payload.key !== ctx.order[ctx.placed]) return rej(ctx) // wrong / out of order
  const placed = ctx.placed + 1
  return ok({ ...ctx, placed, flash: { type: 'good', key: payload.key }, phase: placed >= ctx.order.length ? Phase.WIN : Phase.PLAY })
}
