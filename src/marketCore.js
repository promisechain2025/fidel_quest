/* ============================================================================
   MERKATO MARKET — pure core
   ----------------------------------------------------------------------------
   Shopping at Anbessa's stall. Each item shows a price written as a Ge'ez
   numeral (፩..፱); the child pays by picking the coin bag that holds that many
   coins - reading the Ethiopian number and matching it to a quantity. Buy the
   whole basket to win. A wrong bag is REJECTED (the renderer re-cues, never
   blocks); it never over-charges the child.

   PURE + SEEDED: the basket (items, prices, coin-bag options) is a pure
   function of (seed, item pool); pays arrive as PAY events. No clock. Tests
   headless. Numbers only - it carries no letter data, so it is script-agnostic.
   ========================================================================== */
import { rngNext, rngShuffle } from './platform/rng'

export const Phase = Object.freeze({ PLAY: 'PLAY', WIN: 'WIN' })
export const MarketEvent = Object.freeze({ PAY: 'PAY', RESET: 'RESET' })

export const MAX_PRICE = 9

export function initMarket(seed, itemKeys, rounds = 4) {
  let s = (seed >>> 0) | 1
  const pool = itemKeys && itemKeys.length ? itemKeys : ['coin']
  const items = []
  for (let i = 0; i < rounds; i++) {
    let r
    ;[r, s] = rngNext(s)
    const picture = pool[Math.floor(r * pool.length) % pool.length]
    let r2
    ;[r2, s] = rngNext(s)
    const price = 1 + Math.floor(r2 * MAX_PRICE)
    const opts = new Set([price])
    let guard = 0
    while (opts.size < 3 && guard++ < 50) {
      let rr
      ;[rr, s] = rngNext(s)
      opts.add(1 + Math.floor(rr * MAX_PRICE))
    }
    let shuffled
    ;[shuffled, s] = rngShuffle([...opts], s)
    items.push({ picture, price, options: shuffled })
  }
  return { items, idx: 0, bought: 0, phase: Phase.PLAY, seed }
}

const rej = (ctx) => ({ next: ctx, accepted: false })
const ok = (next) => ({ next, accepted: true })

/** Pure transition. PAY {count} clears the current item only when count equals
    its price. */
export function marketTransition(ctx, event) {
  const { type, payload = {} } = event
  if (type === MarketEvent.RESET) {
    return ok(initMarket((ctx.seed * 1664525 + 1013904223) >>> 0, ctx.items.map((it) => it.picture), ctx.items.length))
  }
  if (ctx.phase !== Phase.PLAY) return rej(ctx)
  if (type !== MarketEvent.PAY) return rej(ctx)

  const item = ctx.items[ctx.idx]
  if (!item || payload.count !== item.price) return rej(ctx) // wrong bag

  const idx = ctx.idx + 1
  return ok({ ...ctx, idx, bought: ctx.bought + 1, phase: idx >= ctx.items.length ? Phase.WIN : Phase.PLAY })
}
