/* ============================================================================
   SAME-SOUND KEYS — when do two letter keys sound identical to the child?
   ----------------------------------------------------------------------------
   Two forms sound the same in the active pack when, after folding
     1. declared twins onto their canonical family (ሐ/ኀ -> ሀ, ሠ -> ሰ, ዐ -> አ,
        ፀ -> ጸ in Amharic),
     2. pack audio aliases (families whose clips are currently the same
        recording, e.g. Amharic ኸ <- ከ until a distinct ኸ is recorded), and
     3. the pack's audio order-remap (Amharic voices ሀ like ሃ, አ like ኣ),
   they resolve to the same effective clip. Anything that asks the child to
   pick a letter BY EAR must treat such keys as interchangeable: accept any of
   them as correct, and never offer two of them side by side.
   Pure: the pack is a parameter (defaults to the active one).
   ========================================================================== */
import { ACTIVE_PACK } from './ethiopic'
import { effectiveKey } from './audioEngine'

const canonCache = new WeakMap()
function canonicalIds(pack) {
  let m = canonCache.get(pack)
  if (m) return m
  m = {}
  for (const group of pack.twins || []) for (const id of group) m[id] = group[0]
  for (const [id, to] of Object.entries(pack.audioAlias || {})) m[id] = m[to] || to
  canonCache.set(pack, m)
  return m
}

/** The clip a key is actually heard as, after twin/alias/remap folding. */
export function soundKeyOf(key, pack = ACTIVE_PACK) {
  const m = /^([a-z]+)-(\d+)$/.exec(String(key || ''))
  if (!m || !pack) return key
  const id = canonicalIds(pack)[m[1]] || m[1]
  return effectiveKey(`letters/${id}-${m[2]}`, pack.audioOverride || null)
}

/** True when a and b are indistinguishable by ear in this pack. */
export function sameSound(a, b, pack = ACTIVE_PACK) {
  if (a === b) return true
  if (a == null || b == null) return false
  return soundKeyOf(a, pack) === soundKeyOf(b, pack)
}

/** Keep the first key of every sound; order preserved. */
export function uniqueBySound(keys, pack = ACTIVE_PACK) {
  const seen = new Set()
  const out = []
  for (const k of keys) {
    const s = soundKeyOf(k, pack)
    if (seen.has(s)) continue
    seen.add(s)
    out.push(k)
  }
  return out
}

/** Is `key` heard as its OWN vowel order in this pack? (false for order-
    remapped forms such as Amharic ሀ, voiced with the ሃ clip). */
export function heardAsOwnOrder(key, pack = ACTIVE_PACK) {
  const order = (k) => Number(/-(\d+)$/.exec(String(k || ''))?.[1] || 0)
  return order(soundKeyOf(key, pack)) === order(key)
}
