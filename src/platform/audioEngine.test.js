import { describe, it, expect, vi } from 'vitest'
import { resolveSource, effectiveKey, AudioEngine } from './audioEngine'

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

describe('effectiveKey (pack audio override)', () => {
  const ti = { sub: 'ti/', ids: ['hha', 'kha', 'khe', 'ae'] }

  it('is the identity when there is no override', () => {
    expect(effectiveKey('letters/hha-1', null)).toBe('letters/hha-1')
    expect(effectiveKey('letters/hha-1', { sub: 'ti/', ids: [] })).toBe('letters/hha-1')
  })

  it('redirects only the overridden family ids into the sub-path', () => {
    expect(effectiveKey('letters/hha-1', ti)).toBe('letters/ti/hha-1')
    expect(effectiveKey('letters/ae-7', ti)).toBe('letters/ti/ae-7')
  })

  it('leaves shared families and non-letter keys untouched', () => {
    expect(effectiveKey('letters/ha-1', ti)).toBe('letters/ha-1') // ha != hha
    expect(effectiveKey('letters/a-1', ti)).toBe('letters/a-1') // a != ae
    expect(effectiveKey('words/feres', ti)).toBe('words/feres')
  })

  it('Tigrinya keeps the plain 1st order (no order remap)', () => {
    // ha/a use the base 1st-order clip; hha still redirects to its ti/ clip.
    expect(effectiveKey('letters/ha-1', ti)).toBe('letters/ha-1')
    expect(effectiveKey('letters/a-1', ti)).toBe('letters/a-1')
    expect(effectiveKey('letters/hha-1', ti)).toBe('letters/ti/hha-1')
  })
})

describe('effectiveKey (Amharic guttural 1st -> 4th order remap)', () => {
  const am = { orderRemap: { ids: ['ha', 'hha', 'kha', 'a', 'ae'], from: 1, to: 4 } }

  it('voices the 1st order of the gutturals like the 4th (the -a vowel)', () => {
    expect(effectiveKey('letters/ha-1', am)).toBe('letters/ha-4')
    expect(effectiveKey('letters/hha-1', am)).toBe('letters/hha-4')
    expect(effectiveKey('letters/kha-1', am)).toBe('letters/kha-4')
    expect(effectiveKey('letters/a-1', am)).toBe('letters/a-4')
    expect(effectiveKey('letters/ae-1', am)).toBe('letters/ae-4')
  })

  it('only remaps the 1st order, and only the gutturals', () => {
    expect(effectiveKey('letters/ha-2', am)).toBe('letters/ha-2') // other orders untouched
    expect(effectiveKey('letters/ha-4', am)).toBe('letters/ha-4')
    expect(effectiveKey('letters/le-1', am)).toBe('letters/le-1') // non-guttural untouched
    expect(effectiveKey('letters/be-1', am)).toBe('letters/be-1')
  })
})

describe('resolveSource with a Tigrinya override', () => {
  const ti = { sub: 'ti/', ids: ['hha', 'kha', 'khe', 'ae'] }

  it('gates and fetches the overridden clip by its effective key', () => {
    const s = state({ manifest: new Set(['letters/ti/hha-1', 'letters/ha-1']), override: ti })
    expect(resolveSource('letters/hha-1', s)).toEqual({ type: 'file', src: '/audio/fidel/letters/ti/hha-1.mp3' })
    // shared family still resolves against the base path
    expect(resolveSource('letters/ha-1', s)).toEqual({ type: 'file', src: '/audio/fidel/letters/ha-1.mp3' })
  })

  it('falls back to the base clip when the override clip is not in the manifest', () => {
    // ti/hha does not exist, but the base hha does: voice it, do not go silent.
    const s = state({ manifest: new Set(['letters/hha-1']), override: ti })
    expect(resolveSource('letters/hha-1', s)).toEqual({ type: 'file', src: '/audio/fidel/letters/hha-1.mp3' })
  })

  it('chimes only when neither the override nor the base clip exists', () => {
    const s = state({ manifest: new Set(['letters/le-1']), override: ti })
    expect(resolveSource('letters/hha-1', s)).toEqual({ type: 'chime' })
  })

  it('falls back to the base memory clip in an artifact (no manifest)', () => {
    const s = state({ memory: { 'letters/hha-1': 'data:base' }, manifest: null, override: ti })
    expect(resolveSource('letters/hha-1', s)).toEqual({ type: 'memory', src: 'data:base' })
  })

  it('prefers the memory pack keyed by the effective key', () => {
    const s = state({ memory: { 'letters/ti/ae-2': 'data:x' }, override: ti })
    expect(resolveSource('letters/ae-2', s)).toEqual({ type: 'memory', src: 'data:x' })
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
