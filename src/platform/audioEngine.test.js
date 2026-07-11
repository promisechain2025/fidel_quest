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

  // A minimal AudioContext: enough for ensureBuffer to reach the fetch and
  // for the chime fallback to run without throwing.
  class FakeCtx {
    constructor() { this.state = 'running'; this.resumes = 0; this.currentTime = 0; this.destination = {} }
    resume() { this.resumes += 1; this.state = 'running'; return Promise.resolve() }
    decodeAudioData() { return Promise.reject(new Error('undecodable')) }
    createGain() { const n = { gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }, connect: () => n }; return n }
    createOscillator() { const n = { type: '', frequency: { value: 0 }, connect: () => n, start() {}, stop() {} }; return n }
  }
  const manifested = (clipResponse) =>
    vi.fn().mockImplementation((url) =>
      url.endsWith('manifest.json')
        ? Promise.resolve({ ok: true, json: async () => ({ coverage: ['letters/ha-1'] }) })
        : clipResponse(),
    )

  it('memoizes a PERMANENT miss (404) and emits the missing event', async () => {
    vi.stubGlobal('AudioContext', FakeCtx)
    vi.stubGlobal('Audio', undefined)
    const engine = new AudioEngine({ fetchImpl: manifested(() => Promise.resolve({ ok: false, status: 404 })), getMemory: () => null })
    const missing = []
    engine.on('missing', (m) => missing.push(m.key))
    await engine.play('letters/ha-1', { enabled: true })
    expect(missing).toEqual(['letters/ha-1'])
    expect(engine.resolve('letters/ha-1').type).toBe('chime')
    vi.unstubAllGlobals()
  })

  it('does NOT memoize transient failures (network blip, 5xx, no context)', async () => {
    // Network rejection with a working context.
    vi.stubGlobal('AudioContext', FakeCtx)
    vi.stubGlobal('Audio', undefined)
    let engine = new AudioEngine({ fetchImpl: manifested(() => Promise.reject(new TypeError('offline'))), getMemory: () => null })
    await engine.play('letters/ha-1', { enabled: true })
    expect(engine.missing.size).toBe(0)
    expect(engine.resolve('letters/ha-1').type).toBe('file') // retried next play

    // Server hiccup (500).
    engine = new AudioEngine({ fetchImpl: manifested(() => Promise.resolve({ ok: false, status: 500 })), getMemory: () => null })
    await engine.play('letters/ha-1', { enabled: true })
    expect(engine.missing.size).toBe(0)
    vi.unstubAllGlobals()

    // No AudioContext at all (the state a suspended/broken context leaves
    // behind): the letter must not be poisoned for the session.
    vi.stubGlobal('Audio', undefined)
    engine = new AudioEngine({ fetchImpl: manifested(() => Promise.resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) })), getMemory: () => null })
    await engine.play('letters/ha-1', { enabled: true })
    expect(engine.missing.size).toBe(0)
    expect(engine.resolve('letters/ha-1').type).toBe('file')
    vi.unstubAllGlobals()
  })

  it('a successful HTMLAudio fallback keeps the key voiced (not memoized)', async () => {
    vi.stubGlobal('AudioContext', FakeCtx)
    vi.stubGlobal('Audio', class { constructor() { this.play = () => Promise.resolve() } addEventListener() {} })
    const engine = new AudioEngine({ fetchImpl: manifested(() => Promise.resolve({ ok: false, status: 404 })), getMemory: () => null })
    const missing = []
    engine.on('missing', (m) => missing.push(m.key))
    await engine.play('letters/ha-1', { enabled: true })
    expect(missing).toEqual([])
    expect(engine.resolve('letters/ha-1').type).toBe('file')
    vi.unstubAllGlobals()
  })

  it('voices never overlap: a play during a clip waits, the newest waiter wins', async () => {
    const sources = []
    class VoiceCtx extends FakeCtx {
      decodeAudioData() { return Promise.resolve({ duration: 1 }) }
      createBufferSource() {
        const n = { connect: (x) => x, start() {}, buffer: null }
        sources.push(n)
        return n
      }
    }
    vi.stubGlobal('AudioContext', VoiceCtx)
    vi.stubGlobal('Audio', undefined)
    const fetchImpl = vi.fn().mockImplementation((url) =>
      url.endsWith('manifest.json')
        ? Promise.resolve({ ok: true, json: async () => ({ coverage: ['letters/ha-1', 'letters/le-1', 'letters/me-1'] }) })
        : Promise.resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }),
    )
    const engine = new AudioEngine({ fetchImpl, getMemory: () => null })
    const spoken = []
    engine.on('play', (e) => spoken.push(e.key))
    await engine.play('letters/ha-1')
    // Two more requests while ha is still sounding: le waits, me replaces it.
    await engine.play('letters/le-1')
    await engine.play('letters/me-1')
    expect(sources.length).toBe(1) // nothing overlapped ha
    sources[0].onended() // ha finishes; the queue drains
    await new Promise((r) => setTimeout(r, 20))
    expect(sources.length).toBe(2) // exactly one follow-up clip
    expect(spoken).toEqual(['letters/ha-1', 'letters/me-1']) // le was superseded
    sources[1].onended()
    expect(engine._voiceBusy).toBe(false) // free again - no deadlock
    vi.unstubAllGlobals()
  })

  it('getCtx wakes an interrupted context (iOS backgrounding)', () => {
    vi.stubGlobal('AudioContext', FakeCtx)
    const engine = new AudioEngine({ fetchImpl: vi.fn(), getMemory: () => null })
    const ctx = engine.getCtx()
    ctx.state = 'interrupted'
    engine.getCtx()
    expect(ctx.resumes).toBeGreaterThanOrEqual(1)
    vi.unstubAllGlobals()
  })

  it('installUnlock resumes a suspended context on the next gesture and on foreground', () => {
    const engine = new AudioEngine({ fetchImpl: vi.fn(), getMemory: () => null })
    engine.ctx = { state: 'suspended', resumes: 0, resume() { this.resumes += 1; return Promise.resolve() } }
    engine.installUnlock(window)
    engine.installUnlock(window) // idempotent
    window.dispatchEvent(new Event('pointerdown'))
    expect(engine.ctx.resumes).toBe(1)
    engine.ctx.state = 'interrupted'
    document.dispatchEvent(new Event('visibilitychange'))
    expect(engine.ctx.resumes).toBe(2)
    engine.ctx.state = 'running'
    window.dispatchEvent(new Event('pointerdown'))
    expect(engine.ctx.resumes).toBe(2) // already running: no churn
  })

  it('does nothing when disabled', async () => {
    const fetchImpl = vi.fn()
    const engine = new AudioEngine({ fetchImpl, getMemory: () => null })
    await engine.play('letters/ha-1', { enabled: false })
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
