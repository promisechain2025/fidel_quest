/* ============================================================================
   ማማ progress — this child's speed and the city they have built.
   fq.mama.v1 is in the progress registry, so it swaps, backs up and wipes
   with the rest of the child's work. The app-level visit and round counters
   live in app progress under the area id `mama`.
   ========================================================================== */
export const MAMA_KEY = 'fq.mama.v1'
const SPEEDS = new Set(['slow', 'mid', 'fast'])
const LATIN = /^[a-z0-9-]{1,32}$/

export function emptyMama() {
  return { v: 1, speed: null, city: [] }
}

export function normalizeMama(raw) {
  const out = emptyMama()
  if (!raw || typeof raw !== 'object') return out
  if (SPEEDS.has(raw.speed)) out.speed = raw.speed
  if (Array.isArray(raw.city)) {
    const seen = new Set()
    for (const id of raw.city) {
      if (typeof id !== 'string' || !LATIN.test(id) || seen.has(id)) continue
      seen.add(id)
      out.city.push(id)
    }
  }
  return out
}

export function loadMama() {
  try {
    return normalizeMama(JSON.parse(localStorage.getItem(MAMA_KEY) || 'null'))
  } catch {
    return emptyMama()
  }
}

export function saveMama(state) {
  const next = normalizeMama(state)
  try {
    localStorage.setItem(MAMA_KEY, JSON.stringify(next))
  } catch { /* session only */ }
  return next
}

/** Remember the speed the child picked for this game. */
export function rememberSpeed(speed) {
  return saveMama({ ...loadMama(), speed })
}

/** A finished word becomes a building. The same word is not added twice. */
export function addBuilding(latin) {
  const cur = loadMama()
  if (!LATIN.test(latin) || cur.city.includes(latin)) return cur
  return saveMama({ ...cur, city: [...cur.city, latin] })
}
