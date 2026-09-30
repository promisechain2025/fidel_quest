import { describe, it, expect, vi } from 'vitest'
import { PassagePlayer } from './passagePlayer'

// jsdom provides an <audio> element but no real playback; the player must be
// fully defensive (never throw) in that environment - which is also the "audio
// missing / blocked" degradation path on a real device.
describe('PassagePlayer', () => {
  it('constructs and exposes safe defaults without a real media stack', () => {
    const p = new PassagePlayer()
    expect(p.currentTime).toBe(0)
    expect(p.playing).toBe(false)
    p.destroy()
  })
  it('load, seek, pause, setRate, destroy never throw', async () => {
    const p = new PassagePlayer()
    expect(() => p.load('/audio/fidel/reader/x-word.mp3')).not.toThrow()
    expect(() => p.seek(1.5)).not.toThrow()
    expect(() => p.setRate(0.75)).not.toThrow()
    expect(() => p.pause()).not.toThrow()
    await expect(p.play()).resolves.toBeUndefined() // autoplay-blocked path resolves, not rejects
    expect(() => p.destroy()).not.toThrow()
  })
  it('seek emits one tick so the highlight can jump while paused', () => {
    const p = new PassagePlayer()
    const cb = vi.fn()
    p.onTick(cb)
    p.seek(2)
    expect(cb).toHaveBeenCalled()
    p.destroy()
  })
})
