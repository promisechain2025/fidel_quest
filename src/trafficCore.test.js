import { describe, it, expect } from 'vitest'
import {
  Phase, TrafficEvent, TIERS, DIRS, AMBULANCE,
  readingIndex, priorityOf, correctLane, frontCars,
  poolCaps, tierSupported, planShift, buildIntersection, scoreFor, TIER_ORDER,
  initTraffic, trafficTransition,
  initMatchDay, recordShift, standings,
} from './trafficCore'
import { INDEXES, FIDEL_FAMILIES, ALL_FORMS } from './platform/ethiopic'

const keysOfFamily = (id) => ALL_FORMS.filter((f) => f.familyId === id).map((f) => f.audioKey)
const basesOf = (n) => FIDEL_FAMILIES.slice(0, n).map((f) => `${f.id}-1`)
// A generous pool: the first six families, all seven orders each.
const RICH = FIDEL_FAMILIES.slice(0, 6).flatMap((f) => keysOfFamily(f.id))

const play = (ctx, lane) => trafficTransition(ctx, { type: TrafficEvent.RELEASE, payload: { lane } })
/** Drive a whole shift correctly; returns the final ctx. */
function clearAll(ctx, guard = 400) {
  let n = 0
  while (ctx.phase === Phase.PLAY && n++ < guard) {
    const want = correctLane(ctx)
    const r = play(ctx, want)
    expect(r.correct).toBe(true)
    ctx = r.next
  }
  return ctx
}

describe('the priority rule', () => {
  it('is dictionary order: familyIndex * 7 + (order - 1)', () => {
    const ha = FIDEL_FAMILIES[0].id
    expect(readingIndex(`${ha}-1`)).toBe(0)
    expect(readingIndex(`${ha}-7`)).toBe(6)
    expect(readingIndex(`${FIDEL_FAMILIES[1].id}-1`)).toBe(7)
  })
  it('puts ha before ho (the same family, earlier vowel order goes first)', () => {
    const ha = FIDEL_FAMILIES[0].id
    expect(readingIndex(`${ha}-1`)).toBeLessThan(readingIndex(`${ha}-7`))
  })
  it('puts every order of the first family before the next family', () => {
    const a = FIDEL_FAMILIES[0].id
    const b = FIDEL_FAMILIES[1].id
    expect(readingIndex(`${a}-7`)).toBeLessThan(readingIndex(`${b}-1`))
  })
  it('orders the whole alphabet strictly, with no ties anywhere', () => {
    const idx = ALL_FORMS.map((f) => readingIndex(f.audioKey))
    expect(new Set(idx).size).toBe(ALL_FORMS.length)
    expect([...idx].sort((x, y) => x - y)).toEqual(idx) // ALL_FORMS is already in reading order
  })
  it('sorts unknown keys last instead of crashing', () => {
    expect(readingIndex('not-a-key')).toBe(Number.MAX_SAFE_INTEGER)
    expect(readingIndex(null)).toBe(Number.MAX_SAFE_INTEGER)
  })
  it('lets an ambulance outrank every letter', () => {
    const first = { key: `${FIDEL_FAMILIES[0].id}-1`, vip: false }
    expect(priorityOf({ key: 'zz-9', vip: true })).toBeLessThan(priorityOf(first))
  })
})

describe('correctLane', () => {
  const mk = (keys) => ({ lanes: keys.map((k, i) => ({ dir: DIRS[i], cars: k ? [{ id: i, key: k, vip: false }] : [] })) })
  it('picks the lowest reading index at the line', () => {
    const a = FIDEL_FAMILIES[0].id
    const ctx = mk([`${a}-7`, `${a}-1`, `${a}-4`])
    expect(correctLane(ctx)).toBe(1)
  })
  it('ignores empty lanes and reports -1 on a clear road', () => {
    const a = FIDEL_FAMILIES[0].id
    expect(correctLane(mk([null, `${a}-3`, null]))).toBe(1)
    expect(correctLane(mk([null, null]))).toBe(-1)
    expect(frontCars(mk([null, `${a}-3`]))).toHaveLength(1)
  })
  it('gives an ambulance the road even from a later lane', () => {
    const a = FIDEL_FAMILIES[0].id
    const ctx = { lanes: [{ cars: [{ id: 0, key: `${a}-1`, vip: false }] }, { cars: [{ id: 1, key: `${a}-7`, vip: true }] }] }
    expect(correctLane(ctx)).toBe(1)
  })
})

describe('pool capability + shift planning', () => {
  it('measures what the pool can stage', () => {
    const caps = poolCaps(RICH)
    expect(caps.families).toBe(6)
    expect(caps.richestFamily).toBe(7)
    expect(caps.bases).toBe(6)
  })
  it('only offers a tier the pool can actually fill', () => {
    const thin = poolCaps(basesOf(2)) // 2 letters, no vowel orders
    expect(tierSupported('street', thin)).toBe(false)
    expect(tierSupported('downtown', thin)).toBe(false)
    const rich = poolCaps(RICH)
    expect(tierSupported('street', rich)).toBe(true)
    expect(tierSupported('downtown', rich)).toBe(true)
    expect(tierSupported('meskel', rich)).toBe(true)
  })
  it('escalates across a shift when the pool is rich', () => {
    const plan = planShift(poolCaps(RICH))
    expect(plan).toHaveLength(5)
    expect(plan[0]).toBe('street')
    expect(plan[plan.length - 1]).toBe('meskel')
  })
  it('degrades to a supported tier instead of asking for the impossible', () => {
    const plan = planShift(poolCaps(basesOf(4)))
    expect(plan).toHaveLength(5)
    for (const t of plan) expect(tierSupported(t, poolCaps(basesOf(4))) || t === 'street').toBe(true)
    expect(plan).not.toContain('meskel')
  })
})

/** Every form of the first n families - the shape a real learned pool takes. */
const formsOf = (n) => FIDEL_FAMILIES.slice(0, n).flatMap((f) => keysOfFamily(f.id))

describe('difficulty never overshoots the child (regression)', () => {
  it('never plans a tier HARDER than the one it wanted, for any pool size', () => {
    const wanted = ['street', 'street', 'downtown', 'downtown', 'meskel']
    for (let n = 1; n <= FIDEL_FAMILIES.length; n++) {
      const plan = planShift(poolCaps(formsOf(n)))
      plan.forEach((got, i) => {
        expect(
          TIER_ORDER.indexOf(got),
          `${n} families, intersection ${i}: got ${got}, wanted at most ${wanted[i]}`,
        ).toBeLessThanOrEqual(TIER_ORDER.indexOf(wanted[i]))
      })
    }
  })
  it('does not hand a 2-family child a harder shift than a 6-family child', () => {
    const hardest = (plan) => Math.max(...plan.map((t) => TIER_ORDER.indexOf(t)))
    expect(hardest(planShift(poolCaps(formsOf(2))))).toBeLessThanOrEqual(hardest(planShift(poolCaps(formsOf(6)))))
  })
})

describe('every realistic pool is playable end to end (regression)', () => {
  it('reaches WIN with a releasable car at every step, from 1 family to all', () => {
    for (let n = 1; n <= FIDEL_FAMILIES.length; n += 4) {
      for (const seed of [1, 77, 2026]) {
        let ctx = initTraffic(seed, formsOf(n))
        let guard = 0
        while (ctx.phase === Phase.PLAY && guard++ < 400) {
          const want = correctLane(ctx)
          expect(want, `${n} families, seed ${seed}: dead road`).toBeGreaterThanOrEqual(0)
          ctx = play(ctx, want).next
        }
        expect(ctx.phase, `${n} families, seed ${seed}`).toBe(Phase.WIN)
      }
    }
  })
})

describe('buildIntersection', () => {
  it('never puts the same plate twice on one road (so "first" is unique)', () => {
    for (let seed = 1; seed < 40; seed++) {
      for (const tier of ['street', 'downtown', 'meskel']) {
        const [lanes] = buildIntersection(seed, RICH, tier)
        const keys = lanes.flatMap((l) => l.cars.map((c) => c.key))
        expect(new Set(keys).size).toBe(keys.length)
        expect(correctLane({ lanes })).toBeGreaterThanOrEqual(0)
      }
    }
  })
  it('keeps a street intersection inside one family (vowel orders only)', () => {
    const [lanes] = buildIntersection(7, RICH, 'street')
    const fams = lanes.flatMap((l) => l.cars.map((c) => INDEXES.byAudioKey.get(c.key).familyId))
    expect(new Set(fams).size).toBe(1)
  })
  it('uses base forms from different families downtown', () => {
    const [lanes] = buildIntersection(11, RICH, 'downtown')
    const forms = lanes.flatMap((l) => l.cars.map((c) => INDEXES.byAudioKey.get(c.key)))
    expect(forms.every((f) => f.order === 1)).toBe(true)
    expect(new Set(forms.map((f) => f.familyId)).size).toBe(forms.length)
  })
  it('stages two-deep queues at Meskel Square', () => {
    const [lanes] = buildIntersection(3, RICH, 'meskel')
    expect(Math.max(...lanes.map((l) => l.cars.length))).toBe(TIERS.meskel.depth)
  })
  it('shrinks the road rather than repeat a plate on a thin pool', () => {
    const [lanes] = buildIntersection(5, basesOf(2), 'meskel')
    const keys = lanes.flatMap((l) => l.cars.map((c) => c.key))
    expect(new Set(keys).size).toBe(keys.length)
    expect(lanes.length).toBeGreaterThanOrEqual(2)
  })
  it('never puts an ambulance in a back slot, and at most one per road', () => {
    for (let seed = 1; seed < 120; seed++) {
      const [lanes] = buildIntersection(seed, RICH, 'meskel')
      const vips = lanes.flatMap((l) => l.cars.filter((c) => c.vip))
      expect(vips.length).toBeLessThanOrEqual(1)
      for (const l of lanes) l.cars.forEach((c, i) => { if (c.vip) expect(i).toBe(0) })
      if (vips.length) expect(vips[0].kind).toBe(AMBULANCE)
    }
  })
  it('is a pure function of its seed', () => {
    const a = buildIntersection(99, RICH, 'meskel')[0]
    const b = buildIntersection(99, RICH, 'meskel')[0]
    expect(a).toEqual(b)
  })
})

describe('the shift (trafficTransition)', () => {
  it('accepts the right car, banks points and grows the streak', () => {
    const ctx = initTraffic(42, RICH)
    const want = correctLane(ctx)
    const r = play(ctx, want)
    expect(r.accepted).toBe(true)
    expect(r.correct).toBe(true)
    expect(r.next.score).toBe(scoreFor(0))
    expect(r.next.combo).toBe(1)
    expect(r.next.lastReleased.key).toBeTruthy()
  })
  it('never blocks on a wrong car: it costs the streak and names the right lane', () => {
    const ctx = initTraffic(42, RICH)
    const want = correctLane(ctx)
    const wrong = ctx.lanes.findIndex((l, i) => i !== want && l.cars.length)
    const primed = { ...ctx, combo: 4 }
    const r = play(primed, wrong)
    expect(r.accepted).toBe(true)
    expect(r.correct).toBe(false)
    expect(r.want).toBe(want)
    expect(r.next.combo).toBe(0)
    expect(r.next.misses).toBe(1)
    expect(r.next.perfect).toBe(false)
    expect(r.next.score).toBe(primed.score) // never a points penalty
    expect(r.next.lanes).toEqual(primed.lanes) // the car stays put
    expect(r.next.phase).toBe(Phase.PLAY) // no fail state, ever
  })
  it('ignores a tap on an empty lane without changing anything', () => {
    let ctx = initTraffic(42, RICH)
    ctx = { ...ctx, lanes: [{ dir: 'N', cars: [] }, ...ctx.lanes.slice(1)] }
    const r = play(ctx, 0)
    expect(r.accepted).toBe(false)
    expect(r.next).toBe(ctx)
  })
  it('advances the queue behind a released car', () => {
    let ctx = initTraffic(8, RICH)
    // find a two-deep lane (meskel tiers only; skip if this seed has none)
    const li = ctx.lanes.findIndex((l) => l.cars.length > 1)
    if (li >= 0) {
      const second = ctx.lanes[li].cars[1]
      // release everything ahead of it correctly
      let guard = 0
      while (ctx.lanes[li].cars[0] !== second && guard++ < 20) ctx = play(ctx, correctLane(ctx)).next
      expect(ctx.lanes[li].cars[0]).toEqual(second)
    }
  })
  it('stages the next intersection when the road clears, and wins at the end', () => {
    const ctx = initTraffic(2026, RICH)
    const end = clearAll(ctx)
    expect(end.phase).toBe(Phase.WIN)
    expect(end.cleared).toBe(end.target)
    expect(end.score).toBeGreaterThan(0)
    expect(end.perfect).toBe(true)
    expect(end.bestCombo).toBe(end.releases)
  })
  it('rejects further releases once the shift is won', () => {
    const end = clearAll(initTraffic(7, RICH))
    const r = play(end, 0)
    expect(r.accepted).toBe(false)
    expect(r.next).toBe(end)
  })
  it('replays identically from the same seed (pure + seeded end to end)', () => {
    const a = clearAll(initTraffic(1234, RICH))
    const b = clearAll(initTraffic(1234, RICH))
    expect(a.score).toBe(b.score)
    expect(a.lanes).toEqual(b.lanes)
  })
  it('RESET starts a fresh shift', () => {
    const end = clearAll(initTraffic(5, RICH))
    const r = trafficTransition(end, { type: TrafficEvent.RESET })
    expect(r.next.phase).toBe(Phase.PLAY)
    expect(r.next.score).toBe(0)
    expect(r.next.cleared).toBe(0)
  })
  it('is completable on a minimal pool without ever repeating a plate', () => {
    const end = clearAll(initTraffic(3, basesOf(3)))
    expect(end.phase).toBe(Phase.WIN)
  })
  it('grows the streak bonus but caps it', () => {
    expect(scoreFor(0)).toBe(10)
    expect(scoreFor(3)).toBe(16)
    expect(scoreFor(5)).toBe(20)
    expect(scoreFor(50)).toBe(20)
  })
})

describe('group play: officers share one phone', () => {
  it('clamps the roster to 1..4', () => {
    expect(initMatchDay(0).players).toHaveLength(1)
    expect(initMatchDay(9).players).toHaveLength(4)
    expect(initMatchDay(3).players).toHaveLength(3)
  })
  it('files a shift against the current officer and passes the phone on', () => {
    let day = initMatchDay(2)
    day = recordShift(day, { score: 50, cleared: 5, bestCombo: 4, misses: 1, perfect: false })
    expect(day.players[0].score).toBe(50)
    expect(day.players[1].score).toBe(0)
    expect(day.turn).toBe(1)
    expect(day.done).toBe(false)
    day = recordShift(day, { score: 70, cleared: 5, bestCombo: 6, misses: 0, perfect: true })
    expect(day.players[1].score).toBe(70)
    expect(day.players[1].perfect).toBe(1)
    expect(day.done).toBe(true)
  })
  it('ranks by score, then fewest misses, then longest streak', () => {
    let day = initMatchDay(3)
    day = recordShift(day, { score: 80, misses: 5, bestCombo: 3 })
    day = recordShift(day, { score: 80, misses: 1, bestCombo: 2 }) // fewer misses wins
    day = recordShift(day, { score: 90, misses: 9, bestCombo: 1 })
    const table = standings(day)
    expect(table.map((p) => p.id)).toEqual([2, 1, 0])
  })
  it('does not mutate the day it is given', () => {
    const day = initMatchDay(2)
    const next = recordShift(day, { score: 10 })
    expect(day.players[0].score).toBe(0)
    expect(next).not.toBe(day)
  })
})
