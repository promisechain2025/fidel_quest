/* ============================================================================
   SHADOW TUTORIAL STATE — platform layer
   ----------------------------------------------------------------------------
   First-open bookkeeping for the non-verbal Ghost Hand demos. The demos
   themselves live in each mode's shell: they drive the REAL machine with a
   fixed demo seed (the machine cannot tell a ghost from a child), so the
   tutorial can never drift from actual gameplay. Reduced-motion users skip
   the animation and go straight to play.
   ========================================================================== */

const KEY = 'fq.onboarded.v1'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

export function hasOnboarded(mode) {
  return !!load()[mode]
}

export function markOnboarded(mode) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...load(), [mode]: true }))
  } catch {
    /* session-only */
  }
}

export function prefersReducedMotion() {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Center of the first element matching a data-tut id, in viewport coords. */
export function tutTargetCenter(id) {
  if (typeof document === 'undefined') return null
  const el = document.querySelector(`[data-tut="${id}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}
