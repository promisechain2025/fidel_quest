/* ============================================================================
   LINE UP — pure core
   ----------------------------------------------------------------------------
   The card-drag cousin of the Vowel-Order Ladder: a family's seven forms are
   dealt as scattered cards, and the child DRAGS each one into its numbered
   home slot (order 1..7). A card only sticks in its own slot; dropped anywhere
   else it springs back to where it lay (the renderer handles the spring; the
   core simply REJECTS the placement). Fill all seven slots to win.

   Slot-based, not strictly sequential: unlike the Ladder (tap the next form),
   here any card can be placed as soon as the child finds its home, so they can
   work the row in any order. PURE + SEEDED - which scatter the deck gets is a
   pure function of (familyId, seed); drops arrive as PLACE events. No clock.
   ========================================================================== */
import { rngShuffle } from './platform/rng'
import { familyOrder } from './ladderCore'

export const Phase = Object.freeze({ PLAY: 'PLAY', WIN: 'WIN' })
export const LineupEvent = Object.freeze({ PLACE: 'PLACE', RESET: 'RESET' })

export { familyOrder }

export function initLineup(familyId, seed) {
  const order = familyOrder(familyId)
  const [tray, rngState] = rngShuffle(order, (seed >>> 0) | 1)
  return { familyId, seed, order, tray, slots: order.map(() => null), phase: Phase.PLAY, rngState }
}

const rej = (ctx) => ({ next: ctx, accepted: false })
const ok = (next) => ({ next, accepted: true })

/** Pure transition. PLACE {key, slot} sticks only in the card's own home
    slot; anything else is rejected and leaves ctx untouched. */
export function lineupTransition(ctx, event) {
  const { type, payload = {} } = event
  if (type === LineupEvent.RESET) {
    return ok(initLineup(ctx.familyId, (ctx.seed * 1664525 + 1013904223) >>> 0))
  }
  if (ctx.phase !== Phase.PLAY) return rej(ctx)
  if (type !== LineupEvent.PLACE) return rej(ctx)

  const { key, slot } = payload
  if (!Number.isInteger(slot) || slot < 0 || slot >= ctx.slots.length) return rej(ctx)
  if (ctx.slots[slot] != null) return rej(ctx) // slot taken
  if (!ctx.tray.includes(key)) return rej(ctx) // not a card in hand
  if (ctx.order[slot] !== key) return rej(ctx) // wrong home -> spring back

  const slots = ctx.slots.slice()
  slots[slot] = key
  const tray = ctx.tray.filter((k) => k !== key)
  return ok({ ...ctx, slots, tray, phase: slots.every(Boolean) ? Phase.WIN : Phase.PLAY })
}
