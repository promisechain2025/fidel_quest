import { describe, it, expect, beforeEach } from 'vitest'
import { soundEnabled, setSoundEnabled } from './sound'

beforeEach(() => localStorage.clear())

describe('unified sound setting', () => {
  it('defaults on, toggles, persists', () => {
    expect(soundEnabled()).toBe(true)
    setSoundEnabled(false)
    expect(soundEnabled()).toBe(false)
    setSoundEnabled(true)
    expect(soundEnabled()).toBe(true)
  })

  it('migrates a mute from ANY legacy key and clears them all', () => {
    localStorage.setItem('fq2.sound', '1')
    localStorage.setItem('fidel-quest-sound', 'off') // muted only in Classic
    expect(soundEnabled()).toBe(false)
    expect(localStorage.getItem('fq2.sound')).toBeNull()
    expect(localStorage.getItem('fq3.sound')).toBeNull()
    expect(localStorage.getItem('fidel-quest-sound')).toBeNull()
    expect(localStorage.getItem('fq.sound.v1')).toBe('0')
  })

  it('migrates all-on legacy state to on, and only once', () => {
    localStorage.setItem('fq3.sound', '1')
    expect(soundEnabled()).toBe(true)
    setSoundEnabled(false)
    localStorage.setItem('fq2.sound', '1') // a stray legacy write must not resurrect
    expect(soundEnabled()).toBe(false)
  })
})
