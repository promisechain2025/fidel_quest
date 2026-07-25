import { describe, it, expect } from 'vitest'
import { initMarket, marketTransition, MAX_PRICE, Phase, MarketEvent } from './marketCore'

const ITEMS = ['🍋', '🥭', '☕', '🥛', '🍯', '🐄']
const pay = (ctx, count) => marketTransition(ctx, { type: MarketEvent.PAY, payload: { count } })

describe('merkato market core', () => {
  it('is deterministic and builds a basket of priced items', () => {
    const a = initMarket(42, ITEMS)
    const b = initMarket(42, ITEMS)
    expect(a).toEqual(b)
    expect(a.items).toHaveLength(4)
    for (const it of a.items) {
      expect(it.price).toBeGreaterThanOrEqual(1)
      expect(it.price).toBeLessThanOrEqual(MAX_PRICE)
      expect(it.options).toContain(it.price) // the right answer is always offered
      expect(it.options).toHaveLength(3)
      expect(ITEMS).toContain(it.picture)
    }
  })

  it('paying the correct count clears each item and wins the basket', () => {
    let ctx = initMarket(7, ITEMS)
    for (let i = 0; i < ctx.items.length; i++) {
      const r = pay(ctx, ctx.items[i].price)
      expect(r.accepted, `item ${i}`).toBe(true)
      ctx = r.next
    }
    expect(ctx.phase).toBe(Phase.WIN)
    expect(ctx.bought).toBe(4)
  })

  it('a wrong coin bag is rejected and nothing changes', () => {
    const ctx = initMarket(3, ITEMS)
    const wrong = ctx.items[0].options.find((c) => c !== ctx.items[0].price)
    const r = pay(ctx, wrong)
    expect(r.accepted).toBe(false)
    expect(r.next).toBe(ctx)
    expect(r.next.idx).toBe(0)
  })

  it('pays after the basket is done are rejected; RESET restarts a basket', () => {
    let ctx = initMarket(9, ITEMS)
    ctx.items.forEach(() => { ctx = pay(ctx, ctx.items[ctx.idx].price).next })
    expect(ctx.phase).toBe(Phase.WIN)
    expect(pay(ctx, ctx.items[0].price).accepted).toBe(false)
    const reset = marketTransition(ctx, { type: MarketEvent.RESET })
    expect(reset.accepted).toBe(true)
    expect(reset.next.phase).toBe(Phase.PLAY)
    expect(reset.next.idx).toBe(0)
    expect(reset.next.items).toHaveLength(4)
  })
})
