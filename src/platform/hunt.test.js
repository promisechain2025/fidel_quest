import { describe, it, expect } from 'vitest'
import { buildHunt, huntTransition, huntTarget, daySeed, HUNT_SIZE, HUNT_SPOTS, markHuntDone, huntDoneToday, loadHunt } from './hunt'

const form = (id, sound) => ({ audioKey: `${id}-1`, char: id, sound })
const POOL = [
  form('ha', 'ha'), form('le', 'le'), form('me', 'me'), form('se', 'se'),
  form('re', 're'), form('be', 'be'), form('te', 'te'),
]

describe('daySeed', () => {
  it('is deterministic and odd', () => {
    expect(daySeed('2026-07-09')).toBe(daySeed('2026-07-09'))
    expect(daySeed('2026-07-09') % 2).toBe(1)
    expect(daySeed('2026-07-09')).not.toBe(daySeed('2026-07-10'))
  })
})

describe('buildHunt', () => {
  it('is a pure function of (seed, forms)', () => {
    const a = buildHunt(123, POOL)
    const b = buildHunt(123, POOL)
    expect(a).toEqual(b)
    expect(buildHunt(124, POOL).order.join()).not.toBe(a.order.join())
  })
  it('hides HUNT_SIZE letters on distinct spots with distinct sounds', () => {
    const h = buildHunt(7, POOL)
    expect(h.hidden.length).toBe(HUNT_SIZE)
    expect(new Set(h.hidden.map((f) => f.spot)).size).toBe(HUNT_SIZE)
    expect(h.hidden.every((f) => f.spot >= 0 && f.spot < HUNT_SPOTS)).toBe(true)
    expect(new Set(h.hidden.map((f) => f.sound)).size).toBe(HUNT_SIZE)
    expect(h.order.length).toBe(HUNT_SIZE)
    expect(h.status).toBe('seek')
  })
  it('never hides two letters that share a sound (twins stay findable)', () => {
    const twins = [form('ha', 'ha'), form('hha', 'ha'), form('kha', 'ha'), form('le', 'le'), form('me', 'me')]
    const h = buildHunt(5, twins)
    expect(new Set(h.hidden.map((f) => f.sound)).size).toBe(h.hidden.length)
  })
  it('copes with a tiny pool (new player scope)', () => {
    const h = buildHunt(9, [form('ha', 'ha')])
    expect(h.hidden.length).toBe(1)
    expect(h.status).toBe('seek')
    const done = huntTransition(h, { type: 'TAP', key: 'ha-1' })
    expect(done.next.status).toBe('done')
  })
})

describe('huntTransition', () => {
  it('correct taps advance in call order until done', () => {
    let ctx = buildHunt(42, POOL)
    for (const key of ctx.order) {
      const r = huntTransition(ctx, { type: 'TAP', key })
      expect(r.accepted).toBe(true)
      ctx = r.next
    }
    expect(ctx.status).toBe('done')
    expect(ctx.found).toEqual(ctx.order)
    expect(ctx.wrong).toBe(0)
  })
  it('a wrong tap counts, ducks the letter, and does not advance', () => {
    const ctx = buildHunt(42, POOL)
    const wrongKey = ctx.hidden.map((f) => f.audioKey).find((k) => k !== huntTarget(ctx))
    const r = huntTransition(ctx, { type: 'TAP', key: wrongKey })
    expect(r.accepted).toBe(true)
    expect(r.next.wrong).toBe(1)
    expect(r.next.lastWrong).toBe(wrongKey)
    expect(r.next.cursor).toBe(0)
    expect(huntTarget(r.next)).toBe(huntTarget(ctx))
  })
  it('rejects ill-timed events: unknown keys, re-taps, and taps after done', () => {
    let ctx = buildHunt(42, POOL)
    expect(huntTransition(ctx, { type: 'TAP', key: 'zz-1' }).accepted).toBe(false)
    const first = huntTarget(ctx)
    ctx = huntTransition(ctx, { type: 'TAP', key: first }).next
    expect(huntTransition(ctx, { type: 'TAP', key: first }).accepted).toBe(false) // already found
    for (const key of ctx.order.slice(1)) ctx = huntTransition(ctx, { type: 'TAP', key }).next
    expect(ctx.status).toBe('done')
    expect(huntTransition(ctx, { type: 'TAP', key: ctx.order[0] }).accepted).toBe(false)
    expect(huntTransition(ctx, { type: 'NOPE' }).accepted).toBe(false)
  })
})

describe('daily record', () => {
  it('marks a day done once and counts distinct days', () => {
    expect(huntDoneToday('2026-07-09')).toBe(false)
    markHuntDone('2026-07-09')
    expect(huntDoneToday('2026-07-09')).toBe(true)
    markHuntDone('2026-07-09') // same day: no double count
    expect(loadHunt().days).toBe(1)
    markHuntDone('2026-07-10')
    expect(loadHunt().days).toBe(2)
    expect(huntDoneToday('2026-07-09')).toBe(false)
  })
})
