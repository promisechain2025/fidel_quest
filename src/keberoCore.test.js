import { describe, it, expect, vi, beforeEach } from 'vitest'

async function under(packId) {
  vi.resetModules()
  localStorage.setItem('fq.pack', packId)
  const core = await import('./keberoCore')
  const eth = await import('./platform/ethiopic')
  const ss = await import('./platform/sameSound')
  const words = eth.FIDEL_FAMILIES.flatMap((f, familyIndex) => (f.words || (f.word ? [f.word] : [])).map((w) => ({ ...w, familyIndex })))
  const stock = core.beatStock(words)
  const pool = eth.ALL_FORMS.map((f) => f.audioKey)
  const ids = core.playableIds(stock, pool)
  return { core, eth, ss, stock, pool, ids, all: stock.map((w) => w.id) }
}
beforeEach(() => localStorage.clear())

describe('Kebero Beats core', () => {
  for (const packId of ['am', 'ti']) {
    describe(`${packId} pack`, () => {
      it('stock: recorded words only, 2-4 real fidel', async () => {
        const { stock } = await under(packId)
        expect(stock.length).toBeGreaterThan(20)
        for (const w of stock) {
          expect(w.keys.length).toBe(Array.from(w.geez).length)
          expect(w.keys.length).toBeGreaterThanOrEqual(2)
          expect(w.keys.length).toBeLessThanOrEqual(4)
        }
      })

      it('every level deals; options and trays never hold two same-sounding keys', async () => {
        const { core, ss, stock, pool, ids, all } = await under(packId)
        for (let lv = 1; lv <= 4; lv++) {
          for (let seed = 1; seed < 30; seed++) {
            const ctx = core.initBeats(lv, seed, { stock, ids, heardIds: all, pool })
            expect(ctx.items.length).toBeGreaterThan(0)
            for (const it of ctx.items) {
              if (ctx.kind === core.Kind.MISSING) {
                expect(it.options.length).toBeGreaterThanOrEqual(2)
                expect(it.options.filter((k) => ss.sameSound(k, it.keys[it.pos])).length).toBe(1)
                for (let a = 0; a < it.options.length; a++) for (let b = a + 1; b < it.options.length; b++) expect(ss.sameSound(it.options[a], it.options[b])).toBe(false)
                for (const k of it.options) expect(ss.heardAsOwnOrder(k) || k === it.keys[it.pos]).toBe(true)
              }
              if (ctx.kind === core.Kind.SPELL) {
                const extra = it.tray.filter((x) => x.id.startsWith('x')).map((x) => x.key)
                for (const x of extra) for (const k of it.keys) expect(ss.sameSound(x, k)).toBe(false)
              }
            }
          }
        }
      })
    })
  }

  it('L1 accepts the fidel count, or one fewer for a final 6th-order fidel; hint after two misses', async () => {
    const { core } = await under('am')
    expect(core.acceptedBeats({ keys: ['se-1', 'la-4', 'me-6'] })).toEqual([3, 2])
    expect(core.acceptedBeats({ keys: ['mo-1', 'zi-2'] })).toEqual([2])
    const stock = [{ id: 'selam', geez: 'ሰላም', keys: ['se-1', 'le-4', 'me-6'] }, { id: 'a', geez: 'x', keys: ['be-1', 'be-2'] }, { id: 'b', geez: 'y', keys: ['ge-1', 'ge-2'] }]
    let ctx = core.initBeats(1, 3, { stock, ids: [], heardIds: ['selam'], pool: [] })
    expect(ctx.items).toHaveLength(1)
    let r = core.beatsTransition(ctx, { type: core.BeatEvent.COUNT, payload: { n: 5 } })
    expect(r.next.last).toMatchObject({ outcome: core.Outcome.WRONG, log: { heard: 'beats:selam', picked: 'beats:selam#5' } })
    r = core.beatsTransition(r.next, { type: core.BeatEvent.COUNT, payload: { n: 4 } })
    expect(r.next.hint).toBe('slots')
    expect(r.next.last.log).toBeNull()
    r = core.beatsTransition(r.next, { type: core.BeatEvent.COUNT, payload: { n: 2 } })
    expect(r.next.phase).toBe(core.Phase.WIN)
    expect(core.beatsSummary(r.next)).toMatchObject({ practice: ['selam'], passed: false })
    ctx = core.initBeats(1, 3, { stock, ids: [], heardIds: ['selam'], pool: [] })
    r = core.beatsTransition(ctx, { type: core.BeatEvent.COUNT, payload: { n: 3 } })
    expect(core.beatsSummary(r.next)).toMatchObject({ mastered: ['selam'], accuracy: 1, passed: true })
  })

  it('L2 asks only about learned letters and accepts the tile that said it', async () => {
    const { core, stock, all } = await under('am')
    const w = stock.find((x) => x.keys.length >= 3)
    const pool = [w.keys[1]]
    const ctx = core.initBeats(2, 5, { stock: [w, ...stock.filter((x) => x !== w)], ids: [], heardIds: [w.id], pool })
    expect(ctx.items.every((it) => it.ask === w.keys[1])).toBe(true)
    const wrongPos = w.keys.findIndex((k, i) => i !== 1 && k !== w.keys[1])
    let r = core.beatsTransition(ctx, { type: core.BeatEvent.TAP, payload: { pos: wrongPos } })
    expect(r.next.last).toMatchObject({ outcome: core.Outcome.WRONG, log: { heard: w.keys[1], picked: w.keys[wrongPos] } })
    r = core.beatsTransition(r.next, { type: core.BeatEvent.TAP, payload: { pos: wrongPos } })
    expect(r.next.hint).toBe(1)
    r = core.beatsTransition(r.next, { type: core.BeatEvent.TAP, payload: { pos: 1 } })
    expect(r.next.last.outcome).toBe(core.Outcome.RIGHT)
    expect(core.beatsSummary(r.next).practice).toEqual([w.keys[1]])
    expect(all.length).toBeGreaterThan(0)
  })

  it('L3 missing beat: right fills it, wrong logs the sibling', async () => {
    const { core, stock, pool, ids, all } = await under('am')
    const ctx = core.initBeats(3, 9, { stock, ids, heardIds: all, pool })
    const it0 = ctx.items[0]
    const answer = it0.keys[it0.pos]
    const wrong = it0.options.find((k) => k !== answer)
    let r = core.beatsTransition(ctx, { type: core.BeatEvent.TAP, payload: { key: wrong } })
    expect(r.next.last.log).toEqual({ heard: answer, picked: wrong })
    r = core.beatsTransition(r.next, { type: core.BeatEvent.TAP, payload: { key: answer } })
    expect(r.next.last.outcome).toBe(core.Outcome.WORD_DONE)
    expect(r.next.idx).toBe(1)
  })

  it('L4 spell: tiles in order; a wrong tile is a miss for that beat; glow after two', async () => {
    const { core, stock, pool, ids, all } = await under('am')
    let ctx = core.initBeats(4, 4, { stock, ids, heardIds: all, pool })
    const it0 = ctx.items[0]
    const wrongTile = it0.tray.find((x) => x.id.startsWith('x'))
    if (wrongTile) {
      let r = core.beatsTransition(ctx, { type: core.BeatEvent.TAP, payload: { trayId: wrongTile.id } })
      expect(r.next.last.log).toEqual({ heard: it0.keys[0], picked: wrongTile.key })
      r = core.beatsTransition(r.next, { type: core.BeatEvent.TAP, payload: { trayId: wrongTile.id } })
      expect(r.next.hint).toBe(it0.tray.find((x) => x.key === it0.keys[0]).id)
      ctx = r.next
    }
    for (let i = 0; i < it0.keys.length; i++) {
      const tile = ctx.items[0].tray.find((x) => !ctx.items[0].used.includes(x.id) && x.key === it0.keys[i])
      ctx = core.beatsTransition(ctx, { type: core.BeatEvent.TAP, payload: { trayId: tile.id } }).next
    }
    expect(ctx.idx).toBe(1)
  })

  it('missed letters are re-dealt first (words containing them)', async () => {
    const { core, stock, pool, ids, all } = await under('am')
    const target = stock.find((w) => ids.includes(w.id) && w.keys.length === 3)
    const due = [target.keys[2]]
    for (let seed = 1; seed < 15; seed++) {
      const ctx = core.initBeats(4, seed, { stock, ids, heardIds: all, pool, due })
      expect(ctx.items.some((it) => it.keys.includes(due[0]))).toBe(true)
    }
  })

  it('maxPlayableLevel needs 3 usable words per level, in order', async () => {
    const { core, stock, pool, ids, all } = await under('am')
    expect(core.maxPlayableLevel(stock, [], [], [])).toBe(0)
    expect(core.maxPlayableLevel(stock, [], all, [])).toBe(1)
    expect(core.maxPlayableLevel(stock, ids, all, pool)).toBe(4)
  })

  it('store keeps letter keys and word ids', async () => {
    const { core } = await under('am')
    localStorage.setItem(core.BEATS_KEY, JSON.stringify({ unlocked: 2, due: { 'le-2': 2, selam: 1, '<b>': 1 }, best: {} }))
    expect(core.loadBeats().due).toEqual({ 'le-2': 2, selam: 1 })
  })
})
