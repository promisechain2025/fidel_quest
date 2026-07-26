import { describe, it, expect, beforeEach } from 'vitest'
import { fullSnapshot, restoreFull } from './backup'

/* The web "Move to another phone" export/import must carry the WHOLE household -
   the active child's canonical progress plus the profile registry, every parked
   slot, and the raw-string child keys (nickname / scope / runner speed) - so a
   paid multi-child family does not lose children on migration. */
describe('household backup (move to another phone)', () => {
  beforeEach(() => localStorage.clear())

  const seedHousehold = () => {
    // active child's canonical progress (JSON)
    localStorage.setItem('fq.journey.v1', JSON.stringify({ done: { ha: { stars: 3 } } }))
    // raw-string child keys
    localStorage.setItem('fq.nickname', 'Selam')
    localStorage.setItem('fq.scope.v1', 'all')
    localStorage.setItem('fq.runnerSpeed', 'fast')
    // profile registry + a parked sibling slot (JSON)
    localStorage.setItem('fq.profiles.v1', JSON.stringify({ v: 1, active: 'p1', list: [{ id: 'p1', name: 'Selam' }, { id: 'p2', name: 'Abel' }] }))
    localStorage.setItem('fq.profile.p2', JSON.stringify({ data: { 'fq.journey.v1': JSON.stringify({ done: { le: { stars: 2 } } }), 'fq.nickname': 'Abel' } }))
  }

  it('round-trips the full household through fullSnapshot -> restoreFull', () => {
    seedHousehold()
    const snap = JSON.parse(JSON.stringify(fullSnapshot())) // serialize like a real file
    localStorage.clear()
    const n = restoreFull(snap)
    expect(n).toBeGreaterThan(0)
    expect(JSON.parse(localStorage.getItem('fq.journey.v1'))).toEqual({ done: { ha: { stars: 3 } } })
    expect(localStorage.getItem('fq.nickname')).toBe('Selam')
    expect(localStorage.getItem('fq.scope.v1')).toBe('all')
    expect(localStorage.getItem('fq.runnerSpeed')).toBe('fast')
    // the SECOND child survives the migration
    const reg = JSON.parse(localStorage.getItem('fq.profiles.v1'))
    expect(reg.list.map((p) => p.id).sort()).toEqual(['p1', 'p2'])
    expect(JSON.parse(localStorage.getItem('fq.profile.p2')).data['fq.nickname']).toBe('Abel')
  })

  it('refuses to write keys outside the known household set', () => {
    const snap = { kind: 'fidel-quest-progress', version: 1, day: '2026-08-01', data: {}, extra: { 'evil.key': 'x', 'fq.profile.p9': JSON.stringify({ data: {} }) } }
    restoreFull(snap)
    expect(localStorage.getItem('evil.key')).toBeNull()
    // a well-formed slot key IS allowed
    expect(localStorage.getItem('fq.profile.p9')).not.toBeNull()
  })
})
