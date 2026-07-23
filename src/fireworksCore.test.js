import { describe, it, expect } from 'vitest'
import {
  initFireworks, fireworksTransition as T, nthWish, ladderOrders, poolFamilies,
  FW_CONFIGS, levelForIsland, Phase, FwEvent, JIBBY_THRESHOLD, isMastered,
} from './fireworksCore'
import { INDEXES } from './platform/ethiopic'

const formOf = (k) => INDEXES.byAudioKey.get(k)
const baseSound = (fid) => formOf(`${fid}-1`)?.sound

/** Drive a full run choosing the CORRECT family and TAPPING the correct rung
    (the no-timing, sound-off win path). Returns the terminal ctx. */
function playPerfect(level, seed) {
  let ctx = initFireworks(level, seed)
  const orders = ladderOrders(ctx.cfg)
  let guard = 0
  while (ctx.phase !== Phase.DONE && guard++ < 1000) {
    if (ctx.phase === Phase.WISH) ctx = T(ctx, { type: FwEvent.WISH_SHOWN }).next
    else if (ctx.phase === Phase.SELECT_SHELL) ctx = T(ctx, { type: FwEvent.SELECT_SHELL, payload: { familyId: ctx.wish.familyId } }).next
    else if (ctx.phase === Phase.CHARGING) ctx = T(ctx, { type: FwEvent.RELEASE, payload: { rung: orders.indexOf(ctx.wish.order) } }).next
    else if (ctx.phase === Phase.RESOLVING) ctx = T(ctx, { type: FwEvent.BLOOM_DONE }).next
    else if (ctx.phase === Phase.FINALE) ctx = T(ctx, { type: FwEvent.FINALE_DONE }).next
  }
  return ctx
}

describe('fireworksCore', () => {
  it('nthWish is a pure function of (seed, i)', () => {
    const cfg = FW_CONFIGS.finale
    const fams = poolFamilies(cfg)
    for (const i of [0, 1, 7, 42]) {
      expect(nthWish(cfg, fams, 12345, i)).toEqual(nthWish(cfg, fams, 12345, i))
    }
    // different index (almost always) yields a different wish
    expect(nthWish(cfg, fams, 12345, 0)).not.toEqual(nthWish(cfg, fams, 12345, 5))
  })

  it('is winnable with the tap path (no timing, no audio) and reaches the target', () => {
    for (const level of ['island1', 'finale']) {
      const end = playPerfect(level, 777)
      expect(end.phase).toBe(Phase.DONE)
      expect(end.skyMeter).toBe(FW_CONFIGS[level].targetCount)
      expect(end.results.every((r) => r.perfect)).toBe(true)
      expect(end.bestCombo).toBe(FW_CONFIGS[level].targetCount)
    }
  })

  it('is fully deterministic: same seed => byte-identical terminal state', () => {
    expect(playPerfect('finale', 999)).toEqual(playPerfect('finale', 999))
    expect(playPerfect('island1', 4)).toEqual(playPerfect('island1', 4))
  })

  it('twin-safety: a rack never holds two same-sound families', () => {
    for (const level of ['island1', 'finale']) {
      const cfg = FW_CONFIGS[level]
      const fams = poolFamilies(cfg)
      for (let i = 0; i < 200; i++) {
        const sounds = nthWish(cfg, fams, i * 31 + 3, i).rack.map(baseSound)
        expect(new Set(sounds).size).toBe(sounds.length)
      }
    }
  })

  it('fairness: the target family is always present in its rack', () => {
    const cfg = FW_CONFIGS.finale
    const fams = poolFamilies(cfg)
    for (let i = 0; i < 200; i++) {
      const w = nthWish(cfg, fams, i * 7 + 1, i)
      expect(w.rack).toContain(w.familyId)
      expect(w.rack.length).toBe(cfg.rackSize)
    }
  })

  it('data integrity: every wish resolves to a real glyph', () => {
    const cfg = FW_CONFIGS.finale
    const fams = poolFamilies(cfg)
    for (let i = 0; i < 200; i++) {
      const w = nthWish(cfg, fams, i, i)
      expect(formOf(`${w.familyId}-${w.order}`)?.char).toBeTruthy()
    }
  })

  it('quitting/failing is not winning: all-wrong launches never fill the meter', () => {
    let ctx = initFireworks('finale', 5)
    const orders = ladderOrders(ctx.cfg)
    for (let n = 0; n < 60; n++) {
      ctx = T(ctx, { type: FwEvent.WISH_SHOWN }).next
      // pick a WRONG family if one exists, else a wrong order
      const wrongFam = ctx.rack.find((f) => f !== ctx.wish.familyId) ?? ctx.wish.familyId
      ctx = T(ctx, { type: FwEvent.SELECT_SHELL, payload: { familyId: wrongFam } }).next
      const wrongRung = (orders.indexOf(ctx.wish.order) + 1) % orders.length
      ctx = T(ctx, { type: FwEvent.RELEASE, payload: { rung: wrongRung } }).next
      ctx = T(ctx, { type: FwEvent.BLOOM_DONE }).next
    }
    expect(ctx.skyMeter).toBe(0)
    expect(ctx.phase).not.toBe(Phase.DONE)
  })

  it('rejects ill-timed events (accepted:false, ctx unchanged)', () => {
    const ctx = initFireworks('island1', 1) // phase WISH
    for (const type of [FwEvent.RELEASE, FwEvent.SELECT_SHELL, FwEvent.BLOOM_DONE, FwEvent.FINALE_DONE]) {
      const r = T(ctx, { type, payload: { familyId: ctx.rack[0], rung: 0 } })
      expect(r.accepted).toBe(false)
      expect(r.next).toBe(ctx)
    }
  })

  it('Jibby dud beat resets the combo but never the Sky Meter', () => {
    // get one perfect launch banked, mid-run
    let ctx = initFireworks('finale', 3)
    const orders = ladderOrders(ctx.cfg)
    ctx = T(ctx, { type: FwEvent.WISH_SHOWN }).next
    ctx = T(ctx, { type: FwEvent.SELECT_SHELL, payload: { familyId: ctx.wish.familyId } }).next
    ctx = T(ctx, { type: FwEvent.RELEASE, payload: { rung: orders.indexOf(ctx.wish.order) } }).next
    ctx = T(ctx, { type: FwEvent.BLOOM_DONE }).next
    expect(ctx.skyMeter).toBe(1)
    expect(ctx.combo).toBe(1)
    const before = ctx.skyMeter
    ctx = T(ctx, { type: FwEvent.TICK, payload: { ms: JIBBY_THRESHOLD + 10 } }).next
    expect(ctx.combo).toBe(0)
    expect(ctx.skyMeter).toBe(before)
  })

  it('mastery fade triggers after two correct launches of a family', () => {
    const ctx = { mastered: { me: 2, le: 1 } }
    expect(isMastered(ctx, 'me')).toBe(true)
    expect(isMastered(ctx, 'le')).toBe(false)
  })

  it('levelForIsland maps the two gateways', () => {
    expect(levelForIsland(1)).toBe('island1')
    expect(levelForIsland(4)).toBe('finale')
  })
})
