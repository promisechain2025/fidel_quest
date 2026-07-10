import { describe, it, expect, beforeEach } from 'vitest'
import { unlockEverything, resetEverything } from './devUnlock'
import { loadJourney, JOURNEY, nextNode } from '../journey'

describe('devUnlock', () => {
  beforeEach(() => localStorage.clear())

  it('unlock opens every journey node', () => {
    unlockEverything()
    const p = loadJourney()
    expect(JOURNEY.every((n) => p.done[n.id])).toBe(true)
  })

  it('unlock makes Skylands islands reachable WITHOUT marking them cleared', () => {
    unlockEverything()
    const sky = JSON.parse(localStorage.getItem('fq3.skylands'))
    // island 4 is playable (learned, and 4 <= sessionsCompleted + 1)...
    expect(sky.learnedSessions).toBe(4)
    expect(sky.sessionsCompleted + 1).toBeGreaterThanOrEqual(4)
    // ...but the map must not start as a finished 4/4 champion
    expect(sky.sessionsCompleted).toBeLessThan(4)
  })

  it('unlock writes the onboarded flags in the current object format', () => {
    unlockEverything()
    const ob = JSON.parse(localStorage.getItem('fq.onboarded.v1'))
    expect(ob).toMatchObject({ lesson: true, runner: true, skylands: true })
  })

  it('reset wipes every progress key back to a brand-new player', () => {
    unlockEverything()
    localStorage.setItem('fq.coach.v1', JSON.stringify({ days: 9 }))
    localStorage.setItem('fq.hunt.v1', JSON.stringify({ day: 'x' }))
    localStorage.setItem('fq.plan.v1', JSON.stringify({ a: 1 }))
    localStorage.setItem('fq.telemetry.v1', JSON.stringify([]))
    resetEverything()
    for (const k of [
      'fq.journey.v1', 'fidel-quest-progress-v1', 'fq3.skylands', 'fq2.runner',
      'fq.onboarded.v1', 'fq.learn.v1', 'fq2.progress',
      'fq.coach.v1', 'fq.hunt.v1', 'fq.plan.v1', 'fq.telemetry.v1',
    ]) expect(localStorage.getItem(k)).toBeNull()
    // and the journey is back at the very first step
    expect(nextNode(loadJourney()).id).toBe(JOURNEY[0].id)
  })

  it('reset leaves settings and classroom data alone', () => {
    localStorage.setItem('fq.lang', 'am')
    localStorage.setItem('fq.class.v1', JSON.stringify({ code: 'LION' }))
    localStorage.setItem('fq.teacher.v1', JSON.stringify({ classes: {} }))
    resetEverything()
    expect(localStorage.getItem('fq.lang')).toBe('am')
    expect(localStorage.getItem('fq.class.v1')).not.toBeNull()
    expect(localStorage.getItem('fq.teacher.v1')).not.toBeNull()
  })
})
