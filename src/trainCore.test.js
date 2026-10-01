import { describe, it, expect } from 'vitest'
import {
  initTrain, trainTransition, trainSummary, maxPlayableLevel, pickAnchor, heardAsOwnOrder, applyRound, loadTrain, saveTrain,
  TRAIN_LEVELS, MAX_LEVEL, HINT_AFTER, Phase, TrainEvent, Outcome,
} from './trainCore'
import { ALL_FORMS, FIDEL_FAMILIES } from './platform/ethiopic'
import { soundKeyOf, sameSound } from './platform/sameSound'
import { AM_PACK } from './packs/am'
import { TI_PACK } from './packs/ti'

const fams = (n) => FIDEL_FAMILIES.slice(0, n).map((f) => f.id)
const keysOf = (ids) => ALL_FORMS.filter((f) => ids.includes(f.familyId)).map((f) => f.audioKey)
const KEYS_8 = keysOf(fams(8))
const orderOf = (k) => Number(k.split('-')[1])
const famOf = (k) => k.split('-')[0]
const pick = (ctx, id) => trainTransition(ctx, { type: TrainEvent.PICK, payload: { id } }).next
const load = (ctx, order) => trainTransition(ctx, { type: TrainEvent.LOAD, payload: { order } })

function solve(ctx) {
  let cur = ctx
  for (const c of ctx.cargo) cur = load(pick(cur, c.id), orderOf(c.key)).next
  return cur
}

describe('Vowel Train deal', () => {
  it('anchors on ለ when learned and voices all seven orders distinctly', () => {
    expect(pickAnchor(KEYS_8)).toBe('le')
    const sounds = [1, 2, 3, 4, 5, 6, 7].map((o) => soundKeyOf(`le-${o}`))
    expect(new Set(sounds).size).toBe(7)
  })

  it('L1: 3 cars (orders 1-3), 6 cargo, none from the anchor family, every car gets cargo', () => {
    for (let seed = 1; seed < 50; seed++) {
      const ctx = initTrain(1, seed, KEYS_8)
      expect(ctx.orders).toEqual([1, 2, 3])
      expect(ctx.cargo).toHaveLength(6)
      for (const c of ctx.cargo) {
        expect(famOf(c.key)).not.toBe(ctx.anchor)
        expect([1, 2, 3]).toContain(orderOf(c.key))
      }
      expect(new Set(ctx.cargo.map((c) => orderOf(c.key))).size).toBe(3)
    }
  })

  it('L2/L3 use all 7 cars; L4 is ears-only', () => {
    const l2 = initTrain(2, 3, KEYS_8)
    expect(l2.orders).toHaveLength(7)
    expect(l2.cargo).toHaveLength(TRAIN_LEVELS[2].cargo)
    expect(initTrain(4, 3, KEYS_8).earsOnly).toBe(true)
    expect(l2.earsOnly).toBe(false)
  })

  it('L3 brings in a family the child has not learned (transfer)', () => {
    const extra = keysOf(FIDEL_FAMILIES.slice(8).map((f) => f.id))
    for (let seed = 1; seed < 30; seed++) {
      const ctx = initTrain(3, seed, KEYS_8, { extraKeys: extra })
      expect(ctx.cargo.some((c) => extra.includes(c.key))).toBe(true)
      expect(initTrain(2, seed, KEYS_8, { extraKeys: extra }).cargo.some((c) => extra.includes(c.key))).toBe(false)
    }
  })

  for (const [name, pack] of [['Amharic', AM_PACK], ['Tigrinya', TI_PACK]]) {
    it(`${name}: every cargo letter is HEARD as its own order, and no two cargo sound alike`, () => {
      const ids = Object.keys(pack.families)
      const keys = ids.flatMap((id) => [1, 2, 3, 4, 5, 6, 7].map((o) => `${id}-${o}`))
      for (let lv = 1; lv <= MAX_LEVEL; lv++) {
        for (let seed = 1; seed < 60; seed++) {
          const ctx = initTrain(lv, seed, keys, { pack, extraKeys: [] })
          for (const c of ctx.cargo) expect(heardAsOwnOrder(c.key, pack)).toBe(true)
          const ks = ctx.cargo.map((c) => c.key)
          for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) expect(sameSound(ks[i], ks[j], pack)).toBe(false)
        }
      }
    })
  }

  it('never ships Amharic ሀ (voiced like ሃ) as cargo', () => {
    expect(heardAsOwnOrder('ha-1', AM_PACK)).toBe(false)
    expect(heardAsOwnOrder('ha-1', TI_PACK)).toBe(true)
    for (let seed = 1; seed < 80; seed++) {
      expect(initTrain(1, seed, KEYS_8, { pack: AM_PACK }).cargo.map((c) => c.key)).not.toContain('ha-1')
    }
  })

  it('maxPlayableLevel: none for a tiny Amharic pool, L4 for a big one', () => {
    expect(maxPlayableLevel(keysOf(fams(3)), AM_PACK)).toBe(0)
    expect(maxPlayableLevel(keysOf(fams(4)), AM_PACK)).toBeGreaterThanOrEqual(1)
    expect(maxPlayableLevel(KEYS_8, AM_PACK)).toBe(4)
  })
})

describe('Vowel Train play', () => {
  it('right car loads the cargo, logs a first-try answer, grows the streak', () => {
    let ctx = initTrain(2, 9, KEYS_8)
    const c = ctx.cargo[0]
    ctx = pick(ctx, c.id)
    expect(ctx.held).toBe(c.id)
    const r = load(ctx, orderOf(c.key))
    expect(r.next.last).toMatchObject({ outcome: Outcome.LOADED, firstTry: true, log: { heard: c.key, picked: c.key } })
    expect(r.next.streak).toBe(1)
    expect(r.next.held).toBe(null)
  })

  it('wrong car: rejected, logged once as "same consonant, chosen order", hint after two misses', () => {
    let ctx = initTrain(2, 9, KEYS_8)
    const c = ctx.cargo[0]
    const want = orderOf(c.key)
    const wrong1 = want === 1 ? 2 : 1
    const wrong2 = want === 7 ? 6 : 7
    ctx = pick(ctx, c.id)
    let r = load(ctx, wrong1)
    expect(r.next.last).toMatchObject({ outcome: Outcome.WRONG_CAR, want, log: { heard: c.key, picked: `${famOf(c.key)}-${wrong1}` } })
    expect(r.next.missed).toEqual([c.key])
    expect(r.next.hint).toBe(null)
    r = load(r.next, wrong2)
    expect(r.next.last.log).toBe(null) // only the first attempt is scored
    expect(r.next.hint).toBe(want)
    expect(HINT_AFTER).toBe(2)
    r = load(r.next, want)
    expect(r.next.last).toMatchObject({ outcome: Outcome.LOADED, firstTry: false })
  })

  it('LOAD without a picked cargo, or to a car not on this train, is rejected', () => {
    const ctx = initTrain(1, 2, KEYS_8)
    expect(load(ctx, 1).accepted).toBe(false)
    expect(load(pick(ctx, ctx.cargo[0].id), 7).accepted).toBe(false) // L1 has cars 1-3
  })

  it('a perfect round passes and unlocks; a sloppy one does not', () => {
    const done = solve(initTrain(1, 4, KEYS_8))
    expect(done.phase).toBe(Phase.WIN)
    const s = trainSummary(done)
    expect(s).toMatchObject({ accuracy: 1, stars: 3, passed: true })
    expect(applyRound(loadTrain(), 1, s).state.unlocked).toBe(2)

    let ctx = initTrain(1, 4, KEYS_8)
    for (const c of ctx.cargo.slice(0, 2)) {
      ctx = pick(ctx, c.id)
      ctx = load(ctx, orderOf(c.key) === 1 ? 2 : 1).next
    }
    ctx = solve(ctx)
    const s2 = trainSummary(ctx)
    expect(s2.accuracy).toBeCloseTo(4 / 6)
    expect(s2.passed).toBe(false)
    expect(s2.practice).toHaveLength(2)
    const { state } = applyRound(loadTrain(), 1, s2)
    expect(state.unlocked).toBe(1)
    expect(Object.keys(state.due).sort()).toEqual(s2.missed.slice().sort())
  })

  it('missed letters are re-dealt first next round', () => {
    const base = initTrain(1, 4, KEYS_8)
    const due = [base.cargo[0].key, base.cargo[1].key]
    for (let seed = 10; seed < 30; seed++) {
      const ks = initTrain(1, seed, KEYS_8, { due }).cargo.map((c) => c.key)
      for (const k of due) expect(ks).toContain(k)
    }
  })

  it('progress persists', () => {
    saveTrain({ unlocked: 2, due: { 'me-2': 1 }, best: { 1: 3 } })
    expect(loadTrain()).toEqual({ unlocked: 2, due: { 'me-2': 1 }, best: { 1: 3 } })
  })
})
