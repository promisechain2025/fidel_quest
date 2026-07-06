import { describe, it, expect, beforeEach } from 'vitest'
import {
  JOURNEY,
  NodeKind,
  buildJourney,
  nextNode,
  nodeUnlocked,
  journeyComplete,
  completeNode,
  grantReward,
  migrateLegacyProgress,
  loadJourney,
  saveJourney,
  wornLayers,
  ownedInSlot,
  equipItem,
  progressStats,
  chapterComplete,
  REWARD_TABLE,
  NODE_BY_ID,
} from './journey'
import { FIDEL_FAMILIES } from './platform/ethiopic'

const fresh = () => ({ version: 1, done: {}, collection: { owned: [], worn: {} } })

beforeEach(() => localStorage.clear())

describe('journey shape (P1)', () => {
  it('covers all 33 families, 8 quiz bosses, and 4 arcade gateways with no dupes', () => {
    const learn = JOURNEY.filter((n) => n.kind === NodeKind.LEARN)
    const quiz = JOURNEY.filter((n) => n.kind === NodeKind.QUIZ)
    const arcade = JOURNEY.filter((n) => n.kind === NodeKind.ARCADE)
    expect(learn).toHaveLength(33)
    expect(quiz).toHaveLength(8) // levels 1-4 + vowels 5-8
    expect(arcade).toHaveLength(4)
    expect(new Set(learn.map((n) => n.familyId)).size).toBe(33)
    expect(new Set(JOURNEY.map((n) => n.id)).size).toBe(JOURNEY.length) // unique ids
  })

  it('has a learn node for every family id', () => {
    for (const f of FIDEL_FAMILIES) expect(NODE_BY_ID.has(`learn:${f.id}`)).toBe(true)
  })

  it('is a pure function of the data (rebuild is identical)', () => {
    const a = buildJourney().map((n) => ({ ...n, reward: n.reward.id }))
    const b = buildJourney().map((n) => ({ ...n, reward: n.reward.id }))
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('indexes nodes contiguously', () => {
    JOURNEY.forEach((n, i) => expect(n.index).toBe(i))
  })
})

describe('unlock + next step (P1)', () => {
  it('unlocks strictly in sequence', () => {
    const p = fresh()
    expect(nodeUnlocked(p, JOURNEY[0])).toBe(true)
    expect(nodeUnlocked(p, JOURNEY[1])).toBe(false)
    p.done[JOURNEY[0].id] = { stars: 3 }
    expect(nodeUnlocked(p, JOURNEY[1])).toBe(true)
    expect(nodeUnlocked(p, JOURNEY[2])).toBe(false)
  })

  it('nextNode points at the first incomplete node and advances by exactly one', () => {
    let p = fresh()
    expect(nextNode(p).id).toBe(JOURNEY[0].id)
    p = completeNode(p, JOURNEY[0].id)
    expect(nextNode(p).id).toBe(JOURNEY[1].id)
    p = completeNode(p, JOURNEY[1].id)
    expect(nextNode(p).id).toBe(JOURNEY[2].id)
  })

  it('reports completion only when every node is done', () => {
    let p = fresh()
    for (const n of JOURNEY) {
      expect(journeyComplete(p)).toBe(false)
      p = completeNode(p, n.id)
    }
    expect(journeyComplete(p)).toBe(true)
    expect(nextNode(p)).toBe(null)
  })
})

describe('rewards (P3)', () => {
  it('grants a stable reward per node and auto-equips the first item per slot', () => {
    let p = fresh()
    const first = JOURNEY[0]
    p = completeNode(p, first.id)
    expect(p.collection.owned).toContain(first.reward.id)
    expect(p.collection.worn[first.reward.slot]).toBe(first.reward.id)
  })

  it('is idempotent - replaying a node never dupes a sticker', () => {
    let p = fresh()
    const n = JOURNEY[0]
    p = completeNode(p, n.id)
    const ownedAfterFirst = [...p.collection.owned]
    p = completeNode(p, n.id)
    expect(p.collection.owned).toEqual(ownedAfterFirst)
  })

  it('does not steal a slot already worn', () => {
    const p = fresh()
    // two nodes sharing a slot; the first worn stays equipped.
    const sameSlot = JOURNEY.filter((n) => n.reward.slot === REWARD_TABLE[0].slot).slice(0, 2)
    grantReward(p, sameSlot[0].id)
    const equipped = p.collection.worn[REWARD_TABLE[0].slot]
    grantReward(p, sameSlot[1].id)
    expect(p.collection.worn[REWARD_TABLE[0].slot]).toBe(equipped)
    expect(p.collection.owned).toContain(sameSlot[1].reward.id) // still owned, just not auto-worn
  })

  it('wornLayers returns the equipped reward objects', () => {
    let p = fresh()
    p = completeNode(p, JOURNEY[0].id)
    const layers = wornLayers(p.collection)
    expect(layers.some((r) => r.id === JOURNEY[0].reward.id)).toBe(true)
  })
})

describe('closet + share loop', () => {
  it('lists owned items per slot and equips / removes on tap', () => {
    // Grant a couple of hats by owning them directly.
    const hats = REWARD_TABLE.filter((r) => r.slot === 'hat').slice(0, 2)
    let p = { version: 1, done: {}, collection: { owned: hats.map((h) => h.id), worn: {} } }
    expect(ownedInSlot(p.collection, 'hat').map((r) => r.id)).toEqual(hats.map((h) => h.id))
    p = equipItem(p, 'hat', hats[0].id)
    expect(p.collection.worn.hat).toBe(hats[0].id)
    p = equipItem(p, 'hat', hats[1].id) // swap
    expect(p.collection.worn.hat).toBe(hats[1].id)
    p = equipItem(p, 'hat', hats[1].id) // tap the worn one -> take off
    expect(p.collection.worn.hat).toBe(null)
  })

  it('fires chapter-complete only when the last node of a chapter is done', () => {
    const p = fresh()
    const ch1 = JOURNEY.filter((n) => n.chapter === 1)
    const last = ch1[ch1.length - 1]
    // Mark every chapter-1 node done except the last.
    for (const n of ch1.slice(0, -1)) p.done[n.id] = { stars: 3 }
    expect(chapterComplete(p, ch1[0].id)).toBe(null) // partial - no celebration
    p.done[last.id] = { stars: 3 }
    expect(chapterComplete(p, last.id)).toBe(1) // finishing the last -> chapter 1
  })

  it('reports letters-learned from completed LEARN nodes', () => {
    let p = fresh()
    expect(progressStats(p).forms).toBe(0)
    const learns = JOURNEY.filter((n) => n.kind === NodeKind.LEARN).slice(0, 3)
    for (const n of learns) p.done[n.id] = { stars: 3 }
    const s = progressStats(p)
    expect(s.families).toBe(3)
    expect(s.forms).toBe(21) // 3 families x 7 forms
    expect(s.totalForms).toBe(231)
  })
})

describe('legacy migration (P1)', () => {
  it('ports fq.learn.v1 mastery and fq2.progress stars into fq.journey.v1', () => {
    const fam0 = FIDEL_FAMILIES[0].id
    const fam1 = FIDEL_FAMILIES[1].id
    localStorage.setItem('fq.learn.v1', JSON.stringify({ mastered: [fam0, fam1], mixes: [`mix-${fam1}`] }))
    localStorage.setItem('fq2.progress', JSON.stringify({ 'level-1': { stars: 2 }, 'level-5': { stars: 3 } }))
    const p = migrateLegacyProgress()
    expect(p.done[`learn:${fam0}`]).toEqual({ stars: 3 })
    expect(p.done[`learn:${fam1}`]).toEqual({ stars: 3 })
    expect(p.done[`mix:${fam1}`]).toEqual({ stars: 3 })
    expect(p.done['quiz:1']).toEqual({ stars: 2 })
    expect(p.done['vowel:1']).toEqual({ stars: 3 }) // level-5 -> vowel:1
    // Returning children keep the wearables they earned for done content.
    expect(p.collection.owned.length).toBeGreaterThan(0)
  })

  it('loadJourney round-trips a saved record without re-migrating', () => {
    const p = fresh()
    p.done[JOURNEY[0].id] = { stars: 1 }
    saveJourney(p)
    // Legacy keys present, but a v1 record exists -> must NOT be overwritten.
    localStorage.setItem('fq.learn.v1', JSON.stringify({ mastered: ['zzz'], mixes: [] }))
    const loaded = loadJourney()
    expect(loaded.done[JOURNEY[0].id]).toEqual({ stars: 1 })
    expect(loaded.done['learn:zzz']).toBeUndefined()
  })

  it('starts empty when there is no legacy data', () => {
    const p = migrateLegacyProgress()
    expect(Object.keys(p.done)).toHaveLength(0)
    expect(p.collection.owned).toHaveLength(0)
  })
})
