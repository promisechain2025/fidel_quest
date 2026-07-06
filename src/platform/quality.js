/* ============================================================================
   DEVICE QUALITY TIER — platform layer
   ----------------------------------------------------------------------------
   The most common real device for this audience is a low-cost Android
   phone. Rather than let the 3D modes chug there, both renderers consult
   this heuristic at startup: few cores or little memory means a lower
   pixel-ratio cap, no shadow maps, no antialiasing, and thinner particle
   dressing. The heuristic is deliberately conservative and overridable for
   testing via localStorage fq.quality = 'low' | 'high'.
   ========================================================================== */

import { useEffect, useState } from 'react'

export function isLowEnd() {
  try {
    const forced = localStorage.getItem('fq.quality')
    if (forced === 'low') return true
    if (forced === 'high') return false
  } catch {
    /* fall through to the heuristic */
  }
  if (typeof navigator === 'undefined') return false
  const cores = navigator.hardwareConcurrency || 8
  const memory = navigator.deviceMemory || 8
  return cores <= 4 || memory <= 2
}

export const LOW_END = isLowEnd()

/* ============================================================================
   RUNTIME FPS DEGRADATION (Pillar 4)
   ----------------------------------------------------------------------------
   The static heuristic above tunes 3D quality, but the real signal is
   measured frames. usePerfDegrade samples requestAnimationFrame for a few
   seconds inside the first 3D node a device sees; if the median frame rate
   is below the floor it persists fq.perf.v1 = 'low' ONCE, and from then on
   the ArcadeGateway router substitutes the 2D fallback games and never
   mounts WebGL again. The verdict is sticky so a child is not re-probed
   mid-journey. A Grown-Ups toggle (or fq.perf.v1) can force it for testing.
   The math is split out as pure functions for direct unit testing.
   ========================================================================== */

const PERF_KEY = 'fq.perf.v1'

export function loadPerf() {
  try {
    const forced = localStorage.getItem('fq.quality')
    if (forced === 'low') return 'low'
    if (forced === 'high') return 'ok'
    return localStorage.getItem(PERF_KEY)
  } catch {
    return null
  }
}
export function savePerf(v) {
  try {
    localStorage.setItem(PERF_KEY, v)
  } catch {
    /* session-only */
  }
}
export const isDegraded = () => loadPerf() === 'low'

/** Median of per-frame FPS samples. Pure. Empty -> a safe high default. */
export function medianFps(samples) {
  if (!samples || samples.length === 0) return 60
  const sorted = samples.slice().sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
/** 'low' when the device cannot sustain the floor; 'ok' otherwise. Pure. */
export function perfVerdict(median, minFps = 30) {
  return median < minFps ? 'low' : 'ok'
}

/* React hook: measure once, persist the verdict, return whether to degrade.
   Kept here beside its pure helpers; imported by the 3D screens. */
export function usePerfDegrade({ windowMs = 5000, minFps = 30 } = {}) {
  const [degraded, setDegraded] = useState(() => loadPerf() === 'low')

  useEffect(() => {
    if (loadPerf()) return undefined // already decided (or forced); do not re-probe
    if (typeof requestAnimationFrame !== 'function' || typeof performance === 'undefined') return undefined
    let raf = 0
    let prev = performance.now()
    const start = prev
    const samples = []
    const tick = (now) => {
      const dt = now - prev
      prev = now
      if (dt > 0) samples.push(1000 / dt)
      if (now - start >= windowMs) {
        const verdict = perfVerdict(medianFps(samples), minFps)
        savePerf(verdict)
        if (verdict === 'low') setDegraded(true)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [windowMs, minFps])

  return degraded
}
