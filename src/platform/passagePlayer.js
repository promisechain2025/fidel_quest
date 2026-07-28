/* ============================================================================
   PASSAGE PLAYER - the karaoke clock for the Read-Along Reader
   ----------------------------------------------------------------------------
   The app's AudioEngine (platform/audioEngine.js) is built for short, one-at-a-
   time letter/word CLIPS and exposes no play position - so it cannot drive a
   karaoke highlight over a continuous recording. This is a deliberately tiny,
   separate player: one HTMLAudioElement whose native `.currentTime` is the
   single input the pure `activeTokenAt(map, t)` selector needs.

   Design notes:
   - `onTick` fires on a requestAnimationFrame loop (not the coarse ~4/s
     `timeupdate` event) so word/letter highlights land tight; it stops when
     paused so an idle Reader costs nothing on a low-end device.
   - `.play()` is called from a user gesture (the Reader's Play button), so iOS
     autoplay is satisfied without the engine's unlock dance.
   - Passage mp3s live under /audio/fidel/... so the PWA runtime CacheFirst rule
     caches them on first play; offline replay is free. Missing audio must fail
     soft (the Reader falls back to highlight-only / word clips) - `load` never
     throws, and callers should not depend on playback succeeding.
   - No Web Audio, no decode cache, no cross-fade: a single flowing recitation
     needs none of it, and keeping this OUT of the shared engine leaves the
     "one voice, cut on nav" invariants there untouched.
   ========================================================================== */

export class PassagePlayer {
  constructor() {
    this.el = null
    this._raf = 0
    this._onTick = null
    this._onEnded = null
    this._tick = this._tick.bind(this)
    try {
      // jsdom/SSR may lack Audio; stay null and no-op rather than throw.
      if (typeof Audio !== 'undefined') this.el = new Audio()
      else if (typeof document !== 'undefined') this.el = document.createElement('audio')
    } catch { this.el = null }
    if (this.el) {
      this.el.preload = 'auto'
      this.el.addEventListener('ended', () => { this._stopLoop(); this._onEnded && this._onEnded() })
    }
  }

  /** Point at a passage recording (a URL under /audio/fidel/...). Idempotent. */
  load(src) {
    if (!this.el || !src) return
    if (this.el.src !== src && !this.el.src.endsWith(src)) {
      try { this.el.src = src } catch { /* ignore */ }
    }
  }

  /** Register the per-frame position callback: cb(currentTimeSeconds). */
  onTick(cb) { this._onTick = cb }
  /** Register the end-of-recording callback. */
  onEnded(cb) { this._onEnded = cb }

  get currentTime() { return this.el ? this.el.currentTime || 0 : 0 }
  get duration() { return this.el && Number.isFinite(this.el.duration) ? this.el.duration : 0 }
  get playing() { return !!this.el && !this.el.paused && !this.el.ended }

  /** Play from the current position. Returns the play() promise (may reject on
      a blocked autoplay); callers should catch and degrade to highlight-only. */
  async play() {
    if (!this.el) return
    this._startLoop()
    try { await this.el.play() } catch { this._stopLoop() /* autoplay blocked - fail soft */ }
  }

  pause() {
    if (!this.el) return
    try { this.el.pause() } catch { /* ignore */ }
    this._stopLoop()
  }

  /** Seek to `t` seconds (clamped >= 0); emits one tick so the highlight jumps. */
  seek(t) {
    if (!this.el) return
    try { this.el.currentTime = Math.max(0, t || 0) } catch { /* ignore */ }
    this._onTick && this._onTick(this.currentTime)
  }

  /** Playback rate (a "slow chant" toggle is then free). */
  setRate(rate) { if (this.el) { try { this.el.playbackRate = rate } catch { /* ignore */ } } }

  /** Stop, detach and release. Call on unmount. */
  destroy() {
    this._stopLoop()
    this._onTick = null
    this._onEnded = null
    if (this.el) {
      try { this.el.pause(); this.el.removeAttribute('src'); this.el.load() } catch { /* ignore */ }
    }
  }

  _startLoop() {
    if (this._raf || typeof requestAnimationFrame === 'undefined') return
    this._raf = requestAnimationFrame(this._tick)
  }
  _stopLoop() {
    if (this._raf && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this._raf)
    this._raf = 0
  }
  _tick() {
    this._raf = 0
    if (this._onTick) this._onTick(this.currentTime)
    if (this.playing) this._startLoop()
  }
}
