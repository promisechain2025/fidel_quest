/* ============================================================================
   AUDIO ENGINE — platform layer
   ----------------------------------------------------------------------------
   One cascade for every letter/word sound in the app, replacing the ad-hoc
   per-mode implementations. Sources, tried in order per key:

     1. MemoryPack   data URIs on window.FIDEL_AUDIO (artifact builds)
     2. FilePack     static mp3s under `audioBase` (deployed app / PWA)
     3. SynthChime   deterministic two-note Web Audio tone (always works)

   Manifest-driven, not 404-driven: when public/audio/fidel/manifest.json is
   reachable, keys it does not cover skip straight to the chime — no network
   probing. Keys that fail anyway (decode error, offline miss) are memoized
   in `missing` so they never retry. Playback decodes into cached
   AudioBuffers played through gain nodes, which is what enables cross-fades
   and precise timing; environments without AudioContext degrade to
   HTMLAudio, then to silence-with-chime.

   The resolution logic is a pure function (`resolveSource`) so the cascade
   is unit-testable without audio hardware. The machines never call this
   directly — only the shell effects do, so game determinism is untouched.
   ========================================================================== */

/**
 * Redirect a logical key to the pack's physical clip. Used when a pack shares
 * most of its audio with another but keeps a few sounds distinct (Tigrinya
 * reuses the Amharic recordings except for the consonants it never merged —
 * hha/kha/khe/ae — which live under letters/ti/). `override` is
 * { sub, ids }: for a `letters/<id>-<order>` key whose family id is in `ids`,
 * the physical clip is `letters/<sub><id>-<order>`. Everything else is
 * unchanged, so a pack only lists what it overrides.
 */
export function effectiveKey(key, override) {
  if (!override || !override.ids || !override.ids.length) return key
  const m = /^letters\/([a-z]+)-(\d+)$/.exec(key)
  if (m && override.ids.includes(m[1])) return `letters/${override.sub}${m[1]}-${m[2]}`
  return key
}

/**
 * Pure cascade resolution. Memoized misses key off the logical key (so a
 * language switch does not inherit the other pack's failures); memory, manifest
 * gating, and the file path key off the effective (possibly redirected) key.
 *
 * Override fallback: an override is an *enhancement* (a pack's distinct clip),
 * so when the redirected clip does not actually exist (not in the manifest and
 * not embedded in the memory pack) we fall back to the shared base clip rather
 * than to silence. This keeps a pack that lists an override for a sound it has
 * no recording for (e.g. Tigrinya hha, whose distinct clip was removed) voiced
 * with the base recording instead of playing a chime.
 * state: {memory, manifest, missing, audioBase, override}.
 */
export function resolveSource(key, state) {
  const ekey = effectiveKey(key, state.override)
  // Only demote a redirect to the base key when we have coverage info that says
  // the redirected clip is absent; with no info at all we stay optimistic.
  const known = state.memory || state.manifest
  const exists = (k) => (state.memory && !!state.memory[k]) || (state.manifest && state.manifest.has(k))
  const useKey = ekey !== key && known && !exists(ekey) ? key : ekey
  if (state.memory && state.memory[useKey]) return { type: 'memory', src: state.memory[useKey] }
  if (state.missing && state.missing.has(key)) return { type: 'chime' }
  if (state.manifest && !state.manifest.has(useKey)) return { type: 'chime' }
  return { type: 'file', src: `${state.audioBase}${useKey}.mp3` }
}

const FADE_IN_S = 0.015
const CROSSFADE_S = 0.12

export class AudioEngine {
  constructor({
    audioBase = '/audio/fidel/',
    manifestUrl = '/audio/fidel/manifest.json',
    override = null,
    getMemory = () => (typeof window !== 'undefined' ? window.FIDEL_AUDIO : null),
    fetchImpl = (...a) => fetch(...a),
  } = {}) {
    this.audioBase = audioBase
    this.manifestUrl = manifestUrl
    this.override = override
    this.getMemory = getMemory
    this.fetchImpl = fetchImpl
    this.ctx = null
    this.buffers = new Map() // src -> AudioBuffer | Promise<AudioBuffer>
    this.missing = new Set() // keys that failed; never retried
    this.manifest = undefined // undefined = not loaded, null = unavailable
    this.current = null // { source, gain } of the playing clip, for cross-fade
    this.listeners = { missing: new Set(), play: new Set() }
  }

  /**
   * Retarget to a different audio pack (language switch). `override` is passed
   * explicitly (even as null) so switching to a pack without overrides clears
   * the previous pack's redirects rather than inheriting them.
   */
  setSource({ audioBase, manifestUrl, override = null }) {
    if (audioBase) this.audioBase = audioBase
    if (manifestUrl) this.manifestUrl = manifestUrl
    this.override = override
    this.manifest = undefined
    this.missing.clear()
    this.buffers.clear()
  }

  on(event, fn) {
    this.listeners[event]?.add(fn)
    return () => this.listeners[event]?.delete(fn)
  }
  emit(event, payload) {
    for (const fn of this.listeners[event] || []) fn(payload)
  }

  getCtx() {
    if (typeof window === 'undefined') return null
    const Ctor = window.AudioContext || window.webkitAudioContext
    if (!Ctor) return null
    try {
      this.ctx = this.ctx || new Ctor()
      if (this.ctx.state === 'suspended') this.ctx.resume()
      return this.ctx
    } catch {
      return null
    }
  }

  /** Load the coverage manifest once; absence is a supported state. */
  async ensureManifest() {
    if (this.manifest !== undefined) return
    this.manifest = null
    try {
      const res = await this.fetchImpl(this.manifestUrl)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.coverage)) this.manifest = new Set(data.coverage)
      }
    } catch {
      /* no manifest: file source stays optimistic, misses memoize */
    }
  }

  resolve(key) {
    return resolveSource(key, {
      memory: this.getMemory(),
      manifest: this.manifest ?? null,
      missing: this.missing,
      audioBase: this.audioBase,
      override: this.override,
    })
  }

  async ensureBuffer(src) {
    if (this.buffers.has(src)) return this.buffers.get(src)
    const ctx = this.getCtx()
    if (!ctx) throw new Error('no AudioContext')
    const promise = (async () => {
      let bytes
      if (src.startsWith('data:')) {
        const b64 = src.slice(src.indexOf(',') + 1)
        bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer
      } else {
        const res = await this.fetchImpl(src)
        if (!res.ok) throw new Error(`${res.status}`)
        bytes = await res.arrayBuffer()
      }
      const buffer = await ctx.decodeAudioData(bytes)
      this.buffers.set(src, buffer)
      return buffer
    })()
    this.buffers.set(src, promise)
    promise.catch(() => this.buffers.delete(src))
    return promise
  }

  /**
   * Play the clip for a key. `chime` carries {familyIndex, order} so the
   * synth fallback stays per-letter deterministic. Cross-fades over any
   * clip still playing unless {interrupt:false}.
   */
  async play(key, { enabled = true, interrupt = true, chime = null } = {}) {
    if (!enabled) return
    await this.ensureManifest()
    const source = this.resolve(key)
    this.emit('play', { key, source: source.type })
    if (source.type === 'chime') {
      this.playChime(chime)
      return
    }
    try {
      const buffer = await this.ensureBuffer(source.src)
      const ctx = this.getCtx()
      const gain = ctx.createGain()
      const node = ctx.createBufferSource()
      node.buffer = buffer
      node.connect(gain).connect(ctx.destination)
      const now = ctx.currentTime
      if (interrupt && this.current) {
        try {
          this.current.gain.gain.setValueAtTime(this.current.gain.gain.value, now)
          this.current.gain.gain.linearRampToValueAtTime(0.0001, now + CROSSFADE_S)
          this.current.source.stop(now + CROSSFADE_S + 0.02)
        } catch {
          /* already ended */
        }
      }
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.linearRampToValueAtTime(1, now + FADE_IN_S)
      node.start(now)
      this.current = { source: node, gain }
      node.onended = () => {
        if (this.current?.source === node) this.current = null
      }
    } catch {
      // Decode/fetch failed: memoize and fall back gracefully — first to a
      // plain HTMLAudio attempt (covers no-decode environments), then chime.
      this.missing.add(key)
      this.emit('missing', { key, src: source.src })
      if (source.type === 'file' && typeof Audio !== 'undefined') {
        try {
          const a = new Audio(source.src)
          a.addEventListener('error', () => this.playChime(chime), { once: true })
          await a.play()
          return
        } catch {
          /* fall through to chime */
        }
      }
      this.playChime(chime)
    }
  }

  /** Warm upcoming clips; queues are deterministic so callers know them. */
  preload(keys) {
    this.ensureManifest().then(() => {
      for (const key of keys) {
        const source = this.resolve(key)
        if (source.type !== 'chime') this.ensureBuffer(source.src).catch(() => this.missing.add(key))
      }
    })
  }

  /* ── synth floor: deterministic per-letter chime + UI effects ── */

  note(freq, at, dur, peak = 0.16, type = 'sine') {
    const ctx = this.getCtx()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start(at)
    osc.stop(at + dur + 0.05)
  }

  playChime(chime) {
    const ctx = this.getCtx()
    if (!ctx) return
    const familyIndex = chime?.familyIndex ?? 0
    const order = chime?.order ?? 1
    const base = 262 * Math.pow(2, (familyIndex % 13) / 13)
    const second = base * (1 + order * 0.045)
    this.note(base, ctx.currentTime, 0.22)
    this.note(second, ctx.currentTime + 0.16, 0.3)
  }

  playEffect(kind, enabled = true) {
    if (!enabled) return
    const ctx = this.getCtx()
    if (!ctx) return
    const t = ctx.currentTime
    if (kind === 'good') {
      this.note(523, t, 0.15, 0.14, 'triangle')
      this.note(784, t + 0.1, 0.25, 0.14, 'triangle')
    } else if (kind === 'bad') {
      this.note(220, t, 0.25, 0.12, 'sawtooth')
      this.note(180, t + 0.12, 0.3, 0.1, 'sawtooth')
    } else if (kind === 'win') {
      ;[523, 659, 784, 1047].forEach((f, i) => this.note(f, t + i * 0.12, 0.3, 0.16, 'triangle'))
    }
  }
}

/** App-wide singleton. Letter keys live under letters/, words under words/. */
export const audio = new AudioEngine()

/* Compat wrappers matching the historical per-mode call signatures. */
export function playForm(form, enabled = true) {
  if (!form) return
  audio.play(`letters/${form.audioKey}`, {
    enabled,
    chime: { familyIndex: form.familyIndex ?? 0, order: form.order ?? 1 },
  })
}
export function playEffect(kind, enabled = true) {
  audio.playEffect(kind, enabled)
}
export function preloadForms(forms) {
  audio.preload(forms.filter(Boolean).map((f) => `letters/${f.audioKey}`))
}
