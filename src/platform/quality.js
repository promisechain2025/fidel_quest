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
