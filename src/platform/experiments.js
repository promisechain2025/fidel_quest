/* ============================================================================
   A/B EXPERIMENTS (privacy-safe, deterministic)
   ----------------------------------------------------------------------------
   Lets us test one change at a time and read the winner off the funnel
   dashboard. A random, LOCAL-ONLY device id buckets the child into a variant;
   that id NEVER leaves the device - only the derived variant label ('A'/'B')
   is attached to anonymous funnel events. Assignment is a pure hash of
   (uid, experiment), so a device always sees the same variant.

   To run an experiment: add it to EXPERIMENTS, set ACTIVE to its key, and use
   its variant in the relevant UI. Set ACTIVE to null to stop tagging.
   ========================================================================== */

const UID_KEY = 'fq.uid.v1'

// key -> ordered variant labels. Order is stable so buckets never shift.
export const EXPERIMENTS = Object.freeze({
  share_cta: ['A', 'B'], // share button copy: 'Share Anbessa' vs 'Show everyone!'
})

// The single experiment currently being measured (or null to tag nothing).
export const ACTIVE = 'share_cta'

/** A random, local-only id used only for bucketing. Not PII, never sent. */
export function getUid() {
  try {
    let id = localStorage.getItem(UID_KEY)
    if (!id) {
      id =
        (typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID()) ||
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(UID_KEY, id)
    }
    return id
  } catch {
    return 'anon'
  }
}

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h
}

/** Deterministic variant for an experiment on this device, or null. */
export function variantOf(key) {
  const variants = EXPERIMENTS[key]
  if (!variants || !variants.length) return null
  return variants[hash(`${getUid()}:${key}`) % variants.length]
}

/** The active experiment assignment to tag events with, or null. */
export function activeVariant() {
  if (!ACTIVE) return null
  const variant = variantOf(ACTIVE)
  return variant ? { key: ACTIVE, variant } : null
}

/** Copy for the share CTA - the thing experiment 'share_cta' is testing. */
export function shareCtaLabel(t) {
  return variantOf('share_cta') === 'B' ? t('shareShowOff', 'Show everyone!') : t('shareAnbessa', 'Share Anbessa')
}
