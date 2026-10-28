import { describe, it, expect } from 'vitest'
import { planSetup, parkSetup, finishSetup, setupDone, reminderTexts } from './firstRun'

describe('first-launch setup plan', () => {
  it('fresh native install: language (if needed), reminder, sound', () => {
    expect(planSetup({ native: true, fresh: true, langNeeded: true }).steps).toEqual(['lang', 'reminder', 'sound'])
    expect(planSetup({ native: true, fresh: true, langNeeded: false }).steps).toEqual(['reminder', 'sound'])
  })

  it('web has no reminder step, and never shows sound on its own', () => {
    expect(planSetup({ native: false, fresh: true, langNeeded: true }).steps).toEqual(['lang', 'sound'])
    expect(planSetup({ native: false, fresh: true, langNeeded: false }).steps).toEqual([])
  })

  it('an existing install is not sent through language again; native sees just the reminder once', () => {
    expect(planSetup({ native: true, fresh: false, langNeeded: false }).steps).toEqual(['reminder'])
    expect(planSetup({ native: false, fresh: false, langNeeded: false }).steps).toEqual([])
    finishSetup()
    expect(setupDone()).toBe(true)
    expect(planSetup({ native: true, fresh: false }).steps).toEqual([])
  })

  it('skips the reminder step when the reminder is already on', () => {
    expect(planSetup({ native: true, fresh: false, reminderAlreadyOn: true }).steps).toEqual([])
    expect(planSetup({ native: true, fresh: true, langNeeded: true, reminderAlreadyOn: true }).steps).toEqual(['lang', 'sound'])
  })

  it('resumes after the language reload with the step counter intact', () => {
    parkSetup(['reminder', 'sound'], 1)
    expect(planSetup({ native: true, fresh: true, langNeeded: false })).toEqual({ steps: ['reminder', 'sound'], before: 1 })
    // On the web the parked reminder step drops out.
    expect(planSetup({ native: false, fresh: true })).toEqual({ steps: ['sound'], before: 1 })
    finishSetup()
    expect(planSetup({ native: true, fresh: true, langNeeded: true }).steps).toEqual([])
  })

  it('an emptied resume closes the setup for good', () => {
    parkSetup(['reminder'], 1)
    expect(planSetup({ native: false, fresh: true, langNeeded: true }).steps).toEqual([])
    expect(setupDone()).toBe(true)
  })

  it('reminder copy is a friendly nudge with no link or purchase', () => {
    const { title, body } = reminderTexts()
    expect(title).toBe('Anbessa misses you!')
    expect(`${title} ${body}`).not.toMatch(/https?:|buy|price|purchase|\$/i)
  })
})
