import { describe, it, expect, beforeEach } from 'vitest'
import { PROGRESS_KEYS, snapshotProgress, restoreProgress, wipeProgress } from './progress'
import { JOURNEY, NodeKind, isNodeFree, FREE_FAMILIES } from '../journey'

describe('progress snapshot (app-level state)', () => {
  beforeEach(() => localStorage.clear())

  it('captures every progress key and nothing else', () => {
    localStorage.setItem('fq.journey.v1', JSON.stringify({ version: 1, done: { 'learn:ha': { stars: 3 } }, collection: { owned: [], worn: {} } }))
    localStorage.setItem('fq.coach.v1', JSON.stringify({ days: 3 }))
    localStorage.setItem('fq.lang', 'am') // a setting, not progress
    localStorage.setItem('fq.teacher.v1', JSON.stringify({ classes: {} }))
    const snap = snapshotProgress('2026-07-10')
    expect(snap.kind).toBe('fidel-quest-progress')
    expect(snap.version).toBe(1)
    expect(Object.keys(snap.data)).toEqual(expect.arrayContaining(['fq.journey.v1', 'fq.coach.v1']))
    expect(snap.data['fq.lang']).toBeUndefined()
    expect(snap.data['fq.teacher.v1']).toBeUndefined()
  })

  it('round-trips: snapshot -> wipe -> restore', () => {
    localStorage.setItem('fq.journey.v1', JSON.stringify({ version: 1, done: { 'learn:ha': { stars: 3 } }, collection: { owned: [], worn: {} } }))
    localStorage.setItem('fq3.skylands', JSON.stringify({ sessionsCompleted: 2, learnedSessions: 2 }))
    const snap = snapshotProgress()
    wipeProgress()
    expect(localStorage.getItem('fq.journey.v1')).toBeNull()
    const n = restoreProgress(snap)
    expect(n).toBe(2)
    expect(JSON.parse(localStorage.getItem('fq3.skylands')).sessionsCompleted).toBe(2)
  })

  it('refuses junk: wrong kind, unknown keys, malformed values', () => {
    expect(restoreProgress(null)).toBe(0)
    expect(restoreProgress({ kind: 'other', data: {} })).toBe(0)
    const n = restoreProgress({
      kind: 'fidel-quest-progress',
      version: 1,
      data: {
        'fq.evil.key': JSON.stringify({ a: 1 }),
        'fq.journey.v1': 'not json {{{',
        'fq.coach.v1': JSON.stringify({ days: 1 }),
      },
    })
    expect(n).toBe(1)
    expect(localStorage.getItem('fq.evil.key')).toBeNull()
    expect(localStorage.getItem('fq.journey.v1')).toBeNull()
  })

  it('every registered key is a string constant (no dynamic surprises)', () => {
    expect(PROGRESS_KEYS.length).toBeGreaterThanOrEqual(10)
    PROGRESS_KEYS.forEach((k) => expect(typeof k).toBe('string'))
  })
})

describe('free taste after the trial (isNodeFree)', () => {
  it('the first two families and their mix are free', () => {
    for (const fid of FREE_FAMILIES) {
      expect(isNodeFree(JOURNEY.find((n) => n.id === `learn:${fid}`))).toBe(true)
    }
    expect(isNodeFree(JOURNEY.find((n) => n.id === 'mix:le'))).toBe(true)
  })

  it('the third family, quizzes and vowel laps are paid', () => {
    expect(isNodeFree(JOURNEY.find((n) => n.id === 'learn:hha'))).toBe(false)
    expect(isNodeFree(JOURNEY.find((n) => n.kind === NodeKind.QUIZ))).toBe(false)
    expect(isNodeFree(JOURNEY.find((n) => n.vowel))).toBe(false)
  })

  it('only the chapter-1 arcade gateway is the free game taste', () => {
    expect(isNodeFree(JOURNEY.find((n) => n.id === 'arcade:1'))).toBe(true)
    expect(isNodeFree(JOURNEY.find((n) => n.id === 'arcade:2'))).toBe(false)
  })
})
