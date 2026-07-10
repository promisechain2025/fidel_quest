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
 * Redirect a logical key to the pack's physical clip. Two independent kinds of
 * redirect, both optional on the `override`:
 *
 *  - Sub-path (`{ sub, ids }`): a pack keeps a few sounds distinct in a
 *    sub-folder. Tigrinya reuses the Amharic recordings except the consonants
 *    it never merged (hha/kha/khe/ae), which live under letters/ti/.
 *
 *  - Order remap (`{ orderRemap: { ids, from, to } }`): a pack pronounces one
 *    order like another for some families. Amharic voices the 1st (ge'ez)
 *    order of the gutturals ha/hha/kha/a/ae like the 4th (the "-a" vowel):
 *    ሀ sounds like ሃ. Tigrinya keeps the default 1st order, so it has no remap.
 *
 * Order remap runs first (it rewrites the order digit), then the sub-path
 * redirect. Everything else is unchanged, so a pack lists only what it changes.
 */
export function effectiveKey(key, override) {
  if (!override) return key
  const m = /^letters\/([a-z]+)-(\d+)$/.exec(key)
  if (!m) return key
  const id = m[1]
  let order = m[2]
  const rm = override.orderRemap
  if (rm && rm.ids.includes(id) && Number(order) === rm.from) order = String(rm.to)
  if (override.ids && override.ids.includes(id)) return `letters/${override.sub}${id}-${order}`
  return `letters/${id}-${order}`
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
  // Family Voice sits ABOVE the language override: a loved one recorded their
  // own pronunciation for the letter the child sees, keyed by the LOGICAL key
  // (letters/ha-1), so no order-remap applies. Covered keys win; the rest fall
  // through to the built-in cascade. See docs/family-voice.md.
  if (state.familyPack && state.familyPack[key]) return { type: 'memory', src: state.familyPack[key] }
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
    this.familyPack = null // { 'letters/ha-1': objectURL|dataURI, … } | null
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
      // 'suspended' is the autoplay-policy state; iOS also parks a context in
      // 'interrupted' after backgrounding or a phone call. Try to wake both.
      if (this.ctx.state !== 'running' && this.ctx.state !== 'closed') {
        try { this.ctx.resume()?.catch?.(() => {}) } catch { /* not resumable here */ }
      }
      return this.ctx
    } catch {
      return null
    }
  }

  /**
   * The context can be re-suspended by the OS ANY number of times (leave the
   * app, take a call, lock the screen - "back and forth"), and on iOS
   * resume() only succeeds INSIDE a user gesture. The app plays audio from
   * effects and timers, never from the tap handler itself, so without this
   * hook a suspended context stays silent for the rest of the session.
   * Keep session-long listeners: any tap/keypress and every return to the
   * foreground re-wakes the context. Idempotent.
   */
  installUnlock(target = typeof window !== 'undefined' ? window : null) {
    if (!target || this.unlockInstalled) return
    this.unlockInstalled = true
    const replayBlocked = () => {
      const b = this.lastBlocked
      if (b && Date.now() - b.at < 30000) {
        this.lastBlocked = null
        this.play(b.key, b.opts)
      }
    }
    const kick = () => {
      // Create the context INSIDE the gesture if it does not exist yet -
      // iOS only trusts contexts born or resumed within real interaction.
      const ctx = this.ctx || this.getCtx()
      if (!ctx || ctx.state === 'closed') return
      if (ctx.state !== 'running') {
        // The canonical iOS unlock: start a silent one-sample buffer inside
        // the gesture. resume() alone is not honored on every iOS version.
        try {
          const s = ctx.createBufferSource()
          s.buffer = ctx.createBuffer(1, 1, 22050)
          s.connect(ctx.destination)
          s.start(0)
        } catch { /* best-effort */ }
        try {
          // A clip requested while the context was still locked never
          // sounded (autoplay policy). Replay it on THIS tap so the child
          // hears the letter now instead of silence-then-confusion.
          Promise.resolve(ctx.resume()).then(replayBlocked).catch(() => {})
        } catch { /* keep listening */ }
      } else {
        replayBlocked()
      }
    }
    // pointerdown alone is NOT enough: iOS Safari historically honors the
    // unlock only at the END of a gesture (touchend/click). Listen to all
    // of them - kick is idempotent and cheap.
    for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) {
      target.addEventListener(ev, kick, { capture: true, passive: true })
    }
    target.document?.addEventListener?.('visibilitychange', () => {
      if (target.document.visibilityState === 'visible') kick()
    })
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

  /** Point playback at a family voice pack (map of logical key -> object URL),
     or null to fall back to the built-in voice. Clears decoded buffers so the
     new clips are used immediately. */
  setFamilyPack(map) {
    this.familyPack = map && Object.keys(map).length ? map : null
    this.buffers.clear()
  }

  resolve(key) {
    return resolveSource(key, {
      familyPack: this.familyPack,
      memory: this.getMemory(),
      manifest: this.manifest ?? null,
      missing: this.missing,
      audioBase: this.audioBase,
      override: this.override,
    })
  }

  /**
   * Failures are classified: TRANSIENT (no/suspended context, a network
   * blip, a 5xx) must be retried on the next play - memoizing them would
   * leave a letter voiceless for the whole session after one bad moment.
   * Only PERMANENT misses (a 404: the clip genuinely does not exist, or a
   * corrupt file that cannot decode) go into `missing`.
   */
  async ensureBuffer(src) {
    if (this.buffers.has(src)) return this.buffers.get(src)
    const ctx = this.getCtx()
    if (!ctx) throw Object.assign(new Error('no AudioContext'), { transient: true })
    const promise = (async () => {
      let bytes
      if (src.startsWith('data:')) {
        const b64 = src.slice(src.indexOf(',') + 1)
        bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer
      } else {
        let res
        try {
          res = await this.fetchImpl(src)
        } catch {
          throw Object.assign(new Error('network'), { transient: true })
        }
        if (!res.ok) throw Object.assign(new Error(`${res.status}`), { transient: res.status !== 404 })
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
  /** iOS can leave a context claiming 'running' while its clock is frozen
      (after a call/Siri/route change) - everything schedules, nothing
      sounds. Detect the frozen clock across successive plays and rebuild.
      AudioBuffers are context-independent, so the decoded cache survives. */
  healZombie(ctx) {
    if (!ctx || ctx.state !== 'running') { this._zw = null; return ctx }
    const now = Date.now()
    if (this._zw && this._zw.t === ctx.currentTime && now - this._zw.at > 700) {
      try { ctx.close() } catch { /* already dead */ }
      this.ctx = null
      this._zw = null
      return this.getCtx()
    }
    this._zw = { t: ctx.currentTime, at: now }
    return ctx
  }

  async play(key, { enabled = true, interrupt = true, chime = null } = {}) {
    if (!enabled) return
    // Remember a play that starts against a locked context (autoplay policy:
    // resume only works inside a user gesture). The unlock kick replays it.
    const ctx0 = this.healZombie(this.getCtx())
    if (ctx0 && ctx0.state !== 'running') this.lastBlocked = { key, opts: { enabled, interrupt, chime }, at: Date.now() }
    else this.lastBlocked = null
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
    } catch (err) {
      // Buffer path failed: fall back gracefully — first to a plain
      // HTMLAudio attempt (covers no-decode environments and a broken
      // AudioContext), then chime. A key is memoized as missing ONLY when
      // the miss is permanent and nothing else voiced it; transient
      // failures retry on the next play.
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
      if (!err?.transient) {
        this.missing.add(key)
        this.emit('missing', { key, src: source.src })
      }
      this.playChime(chime)
    }
  }

  /** Warm upcoming clips; queues are deterministic so callers know them. */
  preload(keys) {
    this.ensureManifest().then(() => {
      for (const key of keys) {
        const source = this.resolve(key)
        if (source.type !== 'chime') {
          this.ensureBuffer(source.src).catch((e) => {
            if (!e?.transient) this.missing.add(key)
          })
        }
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

  /** One soft hand-clap: a brief noise burst, band-limited and low-passed so
      it reads as a warm clap rather than a hiss. Kept for rare celebrations
      only (level wins / streaks), never on every tap. */
  clap(at, gain = 0.3) {
    const ctx = this.getCtx()
    if (!ctx) return
    const len = Math.floor(ctx.sampleRate * 0.045)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.4)
    const src = ctx.createBufferSource()
    src.buffer = buf
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1050
    bp.Q.value = 1.1
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 3000
    const g = ctx.createGain()
    g.gain.value = gain
    src.connect(bp).connect(lp).connect(g).connect(ctx.destination)
    src.start(at)
  }

  /** A little round of applause — several soft claps with human-like jitter. */
  applause(enabled = true, { claps = 7, spread = 0.5 } = {}) {
    if (!enabled) return
    const ctx = this.getCtx()
    if (!ctx) return
    const t = ctx.currentTime
    for (let i = 0; i < claps; i++) {
      this.clap(t + Math.random() * spread, 0.18 + Math.random() * 0.22)
    }
  }

  playEffect(kind, enabled = true) {
    if (!enabled) return
    const ctx = this.getCtx()
    if (!ctx) return
    const t = ctx.currentTime
    // 'good' is the frequent per-answer / per-tap cue: keep it the clean,
    // pleasant chime with NO noise burst layered on.
    if (kind === 'good') {
      this.note(523, t, 0.15, 0.14, 'triangle')
      this.note(784, t + 0.1, 0.25, 0.14, 'triangle')
    } else if (kind === 'bad') {
      this.note(220, t, 0.25, 0.12, 'sawtooth')
      this.note(180, t + 0.12, 0.3, 0.1, 'sawtooth')
    } else if (kind === 'win') {
      // A win is a rare moment — a warm fanfare with a soft round of applause.
      ;[523, 659, 784, 1047].forEach((f, i) => this.note(f, t + i * 0.12, 0.3, 0.16, 'triangle'))
      this.applause(true, { claps: 8, spread: 0.7 })
    }
  }
}

/** App-wide singleton. Letter keys live under letters/, words under words/.
   The gesture/foreground unlock is armed for the whole session so a context
   the OS suspends (backgrounding, calls) re-wakes on the next tap. */
export const audio = new AudioEngine()
audio.installUnlock()

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
