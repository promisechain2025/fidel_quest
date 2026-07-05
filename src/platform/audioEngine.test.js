import { describe, it, expect, vi } from 'vitest'
import { resolveSource, AudioEngine } from './audioEngine'

const state = (over = {}) => ({
  memory: null,
  manifest: null,
  missing: new Set(),
  audioBase: '/audio/fidel/',
  ...over,
})

describe('resolveSource cascade', () => {
  it('prefers the memory pack when it covers the key', () => {
    const s = state({ memory: { 'letters/ha-1': 'data:audio/mpeg;base64,x' } })
    expect(resolveSource('letters/ha-1', s)).toEqual({ type: 'memory', src: 'data:audio/mpeg;base64,x' })
  })

  it('falls to file when memory misses the key', () => {
    const s = state({ memory: { 'letters/other': 'data:x' } })
    expect(resolveSource('letters/ha-1', s)).toEqual({ type: 'file', src: '/audio/fidel/letters/ha-1.mp3' })
  })

  it('is optimistic about files when no manifest is available', () => {
    expect(resolveSource('letters/ha-1', state()).type).toBe('file')
  })

  it('skips straight to chime for keys outside the manifest', () => {
    const s = state({ manifest: new Set(['letters/le-1']) })
    expect(resolveSource('letters/ha-1', s)).toEqual({ type: 'chime' })
    expect(resolveSource('letters/le-1', s).type).toBe('file')
  })

  it('never retries memoized misses', () => {
    const s = state({ missing: new Set(['letters/ha-1']) })
    expect(resolveSource('letters/ha-1', s)).toEqual({ type: 'chime' })
  })

  it('memory pack beats both manifest gating and memoized misses', () => {
    const s = state({
      memory: { 'letters/ha-1': 'data:x' },
      manifest: new Set(),
      missing: new Set(['letters/ha-1']),
    })
    expect(resolveSource('letters/ha-1', s).type).toBe('memory')
  })
})

describe('AudioEngine', () => {
  it('loads the manifest once and treats absence as a supported state', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'))
    const engine = new AudioEngine({ fetchImpl, getMemory: () => null })
    await engine.ensureManifest()
    await engine.ensureManifest()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(engine.manifest).toBeNull()
    expect(engine.resolve('letters/ha-1').type).toBe('file')
  })

  it('parses manifest coverage and gates resolution with it', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ coverage: ['letters/ha-1'] }),
    })
    const engine = new AudioEngine({ fetchImpl, getMemory: () => null })
    await engine.ensureManifest()
    expect(engine.resolve('letters/ha-1').type).toBe('file')
    expect(engine.resolve('letters/zz-9').type).toBe('chime')
  })

  it('memoizes a failed key and emits the missing event', async () => {
    const fetchImpl = vi.fn().mockImplementation((url) =>
      url.endsWith('manifest.json')
        ? Promise.resolve({ ok: true, json: async () => ({ coverage: ['letters/ha-1'] }) })
        : Promise.resolve({ ok: false, status: 404 }),
    )
    const engine = new AudioEngine({ fetchImpl, getMemory: () => null })
    // jsdom has no AudioContext: getCtx() is null, so buffer path throws,
    // HTMLAudio path is stubbed out by tests' Audio absence -> chime path.
    vi.stubGlobal('Audio', undefined)
    const missing = []
    engine.on('missing', (m) => missing.push(m.key))
    await engine.play('letters/ha-1', { enabled: true })
    expect(missing).toEqual(['letters/ha-1'])
    expect(engine.resolve('letters/ha-1').type).toBe('chime')
  })

  it('does nothing when disabled', async () => {
    const fetchImpl = vi.fn()
    const engine = new AudioEngine({ fetchImpl, getMemory: () => null })
    await engine.play('letters/ha-1', { enabled: false })
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
