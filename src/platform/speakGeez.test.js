import { describe, it, expect, vi } from 'vitest'

vi.mock('./audioEngine', () => ({
  audio: { play: vi.fn(), stopVoice: vi.fn(), setSource: vi.fn() },
  afterVoice: () => () => {},
}))

import { audio } from './audioEngine'
import { speakLine, speakWord } from './speakGeez'

describe('speak Ge\'ez', () => {
  it('plays a pack word clip when one exists', () => {
    audio.play.mockClear()
    speakWord('ሀገር', true)
    expect(audio.play).toHaveBeenCalledWith('words/hager', expect.objectContaining({ enabled: true }))
  })

  it('spells a word marked noAudio instead of playing a missing clip', () => {
    audio.play.mockClear()
    speakWord('ሀሎ', true)
    const keys = audio.play.mock.calls.map((c) => c[0])
    expect(keys.length).toBeGreaterThan(0)
    expect(keys.every((k) => k.startsWith('letters/'))).toBe(true)
    expect(keys).not.toContain('words/halo')
  })

  it('does not start playback for a line when sound is off', () => {
    audio.play.mockClear()
    const cancel = speakLine('ሀሎ ልቢ።', false)
    expect(audio.play).not.toHaveBeenCalled()
    expect(typeof cancel).toBe('function')
  })
})
