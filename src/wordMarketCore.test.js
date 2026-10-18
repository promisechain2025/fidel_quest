import { describe, it, expect, vi, beforeEach } from 'vitest'

/* Load the core + word list under a given pack (module state is per pack). */
async function under(packId) {
  vi.resetModules()
  localStorage.setItem('fq.pack', packId)
  const core = await import('./wordMarketCore')
  const eth = await import('./platform/ethiopic')
  const ss = await import('./platform/sameSound')
  const words = eth.FIDEL_FAMILIES.flatMap((f, familyIndex) => (f.words || (f.word ? [f.word] : [])).map((w) => ({ ...w, familyIndex })))
  const stock = core.marketStock(words)
  return { core, eth, ss, words, stock }
}

beforeEach(() => localStorage.clear())

describe('Word Market core', () => {
  for (const packId of ['am', 'ti']) {
    describe(`${packId} pack`, () => {
      it('stock: real forms only, 2-4 fidel, concrete pictures unique in the whole list', async () => {
        const { core, stock, words } = await under(packId)
        expect(stock.length).toBeGreaterThan(30)
        const pics = new Map()
        for (const w of words) pics.set(w.picture, (pics.get(w.picture) || 0) + 1)
        for (const w of stock) {
          expect(pics.get(w.picture)).toBe(1)
          expect(core.UNPICTURABLE.has(w.picture)).toBe(false)
          expect(w.keys.length).toBe(Array.from(w.geez).length)
          expect(w.keys.length).toBeGreaterThanOrEqual(2)
          expect(w.keys.length).toBeLessThanOrEqual(4)
        }
      })

      it('every level deals only readable targets, unique pictures, no sound-alike words, full stall', async () => {
        const { core, stock } = await under(packId)
        const readable = stock.map((w) => w.id)
        for (let lv = 1; lv <= 4; lv++) {
          const cfg = core.MARKET_LEVELS[lv]
          for (let seed = 1; seed < 40; seed++) {
            const ctx = core.initMarket(lv, seed, { stock, readable })
            expect(ctx.list).toHaveLength(cfg.list)
            expect(ctx.stall).toHaveLength(cfg.stall)
            expect(new Set(ctx.stall).size).toBe(cfg.stall)
            for (const l of ctx.list) expect(ctx.stall).toContain(l.id)
            const byId = new Map(stock.map((w) => [w.id, w]))
            const sigs = ctx.stall.map((id) => core.soundSig(byId.get(id)))
            expect(new Set(sigs).size).toBe(sigs.length)
            const pics = ctx.stall.map((id) => byId.get(id).picture)
            expect(new Set(pics).size).toBe(pics.length)
            for (const l of ctx.list) {
              expect(l.qty).toBeGreaterThanOrEqual(1)
              expect(l.qty).toBeLessThanOrEqual(cfg.qty ? core.MAX_QTY : 1)
            }
            expect(ctx.peek).toBe(cfg.peek ? 'show' : null)
          }
        }
      })

      it('L2/L3 decoys defeat first-letter guessing when the list allows it', async () => {
        const { core, stock } = await under(packId)
        const byId = new Map(stock.map((w) => [w.id, w]))
        const fam = (k) => k.split('-')[0]
        let structured = 0
        let total = 0
        for (let seed = 1; seed < 60; seed++) {
          const ctx = core.initMarket(3, seed, { stock, readable: stock.map((w) => w.id) })
          for (const l of ctx.list) {
            const t = byId.get(l.id)
            total++
            if (ctx.stall.some((id) => id !== l.id && fam(byId.get(id).keys[0]) === fam(t.keys[0]))) structured++
          }
        }
        expect(structured / total).toBeGreaterThan(0.5)
      })
    })
  }

  it('targets come only from readable words; due words come first', async () => {
    const { core, stock } = await under('am')
    const readable = stock.slice(0, 5).map((w) => w.id)
    for (let seed = 1; seed < 30; seed++) {
      const ctx = core.initMarket(2, seed, { stock, readable, due: [readable[4]] })
      for (const l of ctx.list) expect(readable).toContain(l.id)
      expect(ctx.list[0].id).toBe(readable[4])
    }
    expect(core.readableIds(stock, stock[0].keys)).toContain(stock[0].id)
  })

  it('right tap buys, wrong tap logs the first attempt once, hint after 2, other open line is accepted', async () => {
    const { core, stock } = await under('am')
    const readable = stock.map((w) => w.id)
    const ctx0 = core.initMarket(2, 7, { stock, readable })
    const [a, b] = ctx0.list.map((l) => l.id)
    const decoy = ctx0.stall.find((id) => id !== a && id !== b)
    let r = core.marketTransition(ctx0, { type: core.MarketEvent.TAP, payload: { id: decoy } })
    expect(r.next.last).toMatchObject({ outcome: core.Outcome.WRONG, want: a, log: { heard: a, picked: decoy } })
    r = core.marketTransition(r.next, { type: core.MarketEvent.TAP, payload: { id: decoy } })
    expect(r.next.last.log).toBeNull()
    expect(r.next.hint).toBe(a)
    // reading line 2 instead is fine
    r = core.marketTransition(r.next, { type: core.MarketEvent.TAP, payload: { id: b } })
    expect(r.next.last).toMatchObject({ outcome: core.Outcome.DONE, id: b, log: { heard: b, picked: b } })
    expect(r.next.current).toBe(0)
    r = core.marketTransition(r.next, { type: core.MarketEvent.TAP, payload: { id: b } })
    expect(r.next.last.outcome).toBe(core.Outcome.ENOUGH)
    r = core.marketTransition(r.next, { type: core.MarketEvent.TAP, payload: { id: a } })
    expect(r.next.phase).toBe(core.Phase.WIN)
    const sum = core.marketSummary(r.next)
    expect(sum.mastered).toEqual([b])
    expect(sum.practice).toEqual([a])
    expect(sum.passed).toBe(false)
  })

  it('quantities: buy exactly N; the line completes on the Nth tap and extra taps bounce', async () => {
    const { core, stock } = await under('am')
    const readable = stock.map((w) => w.id)
    let seed = 1
    let ctx
    do ctx = core.initMarket(3, seed++, { stock, readable }); while (ctx.list[0].qty < 2)
    const { id, qty } = ctx.list[0]
    let r
    for (let i = 1; i <= qty; i++) {
      r = core.marketTransition(ctx, { type: core.MarketEvent.TAP, payload: { id } })
      ctx = r.next
      expect(ctx.last.outcome).toBe(i < qty ? core.Outcome.RIGHT : core.Outcome.DONE)
      expect(ctx.last.log ? i : 1).toBe(1) // logged on the first tap only
    }
    expect(core.marketTransition(ctx, { type: core.MarketEvent.TAP, payload: { id } }).next.last.outcome).toBe(core.Outcome.ENOUGH)
  })

  it('L4: taps wait for the peek to hide; peeking again marks open lines helped', async () => {
    const { core, stock } = await under('am')
    const ctx = core.initMarket(4, 3, { stock, readable: stock.map((w) => w.id) })
    expect(core.marketTransition(ctx, { type: core.MarketEvent.TAP, payload: { id: ctx.list[0].id } }).accepted).toBe(false)
    let r = core.marketTransition(ctx, { type: core.MarketEvent.HIDE })
    r = core.marketTransition(r.next, { type: core.MarketEvent.PEEK })
    expect(r.next.peeks).toBe(1)
    expect(r.next.list.every((l) => l.helped)).toBe(true)
  })

  it('letterMiss points at the first differing letter of a same-family decoy only', async () => {
    const { core } = await under('am')
    const T = { keys: ['me-2', 'ze-6'] }
    expect(core.letterMiss(T, { keys: ['me-4', 're-6'] })).toEqual({ heard: 'me-2', picked: 'me-4' })
    expect(core.letterMiss(T, { keys: ['me-2', 're-6'] })).toEqual({ heard: 'ze-6', picked: 're-6' })
    expect(core.letterMiss(T, { keys: ['be-1', 're-6'] })).toBeNull()
  })

  it('maxPlayableLevel grows with the readable pool; unlock needs 75%', async () => {
    const { core, stock } = await under('am')
    expect(core.maxPlayableLevel(stock, [])).toBe(0)
    expect(core.maxPlayableLevel(stock, stock.slice(0, 2).map((w) => w.id))).toBe(1)
    expect(core.maxPlayableLevel(stock, stock.slice(0, 3).map((w) => w.id))).toBe(2)
    expect(core.maxPlayableLevel(stock, stock.map((w) => w.id))).toBe(4)
    const st = core.applyRound({ unlocked: 1, due: {}, best: {} }, 1, { passed: true, stars: 3, missed: [], mastered: ['x'] })
    expect(st.state.unlocked).toBe(2)
  })

  it('store keeps word ids and drops junk', async () => {
    const { core } = await under('am')
    localStorage.setItem(core.MARKET_KEY, JSON.stringify({ unlocked: 3, due: { lam: 2, '<x>': 1 }, best: { 1: 3 } }))
    expect(core.loadMarket()).toEqual({ unlocked: 3, due: { lam: 2 }, best: { 1: 3 } })
  })
})
