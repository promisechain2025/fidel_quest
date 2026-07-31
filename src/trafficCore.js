/* ============================================================================
   FIDEL TRAFFIC (Meskel Square) — pure core
   ----------------------------------------------------------------------------
   Cars queue at an all-way stop, each with a fidel on its plate. The child is
   the traffic officer: wave through the car whose letter comes FIRST in the
   fidel order. Clear the intersection, keep the city moving.

   THE RULE (one line, no ambiguity):
     priority = familyIndex * 7 + (order - 1)   -> lowest goes first
   That is exactly dictionary order, so it teaches BOTH axes of the abugida:
     - same family, different orders : ሀ before ሆ   (0 < 6)
     - different families            : ሀ before ለ   (6 < 7)
   An ambulance is the one authored exception: it always goes first (-1). Only
   ever one per intersection, and every plate in an intersection is a DISTINCT
   letter, so a tie can never occur and "first" is always a single right answer.

   PURE + SEEDED: an intersection is a pure function of (rngState, pool, tier);
   the child's taps arrive as RELEASE events and the next intersection is built
   from the threaded rngState, so a whole shift replays identically. No clock,
   no Math.random - tests run headless.

   A wrong tap never blocks and never ends anything: it costs the streak, logs
   a miss, and the renderer re-cues the right car. There is no fail state.
   ========================================================================== */
import { rngNext, rngShuffle } from './platform/rng'
import { INDEXES } from './platform/ethiopic'

export const Phase = Object.freeze({ PLAY: 'PLAY', WIN: 'WIN' })
export const TrafficEvent = Object.freeze({ RELEASE: 'RELEASE', RESET: 'RESET' })

/** The four approaches of an all-way stop, in a stable clockwise order. */
export const DIRS = Object.freeze(['N', 'E', 'S', 'W'])

/** Cosmetic vehicle kinds. `bus` is the Anbessa bus (Addis's real city bus);
    `bajaj` the three-wheeler; `taxi` the blue-and-white minibus. */
export const KINDS = Object.freeze(['taxi', 'bajaj', 'bus', 'lorry'])
export const AMBULANCE = 'ambulance'

/**
 * The three tiers, escalating across a shift. Each says how many approaches
 * are busy and how deep each queue is, plus which letters may appear.
 *   street   - one family, mixed vowel orders  (ሀ ሂ ሆ) -> learn the 7 orders
 *   downtown - many families, base order only  (ሀ ለ መ) -> learn family order
 *   meskel   - anything, two-deep queues              -> full dictionary order
 */
export const TIERS = Object.freeze({
  street: { id: 'street', lanes: 3, depth: 1, pick: 'family' },
  downtown: { id: 'downtown', lanes: 4, depth: 1, pick: 'base' },
  meskel: { id: 'meskel', lanes: 4, depth: 2, pick: 'mixed' },
})

export const INTERSECTIONS_PER_SHIFT = 5
const VIP_CHANCE = 0.22 // ambulances only ever appear in the meskel tier

/* ── the rule ─────────────────────────────────────────────────────────── */

/** Dictionary position of a fidel form. Unknown keys sort last (never crash). */
export function readingIndex(key) {
  const f = INDEXES.byAudioKey.get(key)
  if (!f) return Number.MAX_SAFE_INTEGER
  return f.familyIndex * 7 + (f.order - 1)
}

/** Priority of a car: an ambulance outranks every letter. Lower goes first. */
export function priorityOf(car) {
  return car && car.vip ? -1 : readingIndex(car ? car.key : null)
}

/** The cars currently at the line - the front car of each non-empty lane. */
export function frontCars(ctx) {
  return ctx.lanes.map((l) => l.cars[0]).filter(Boolean)
}

/** Which lane index must be released now, or -1 when the road is clear. */
export function correctLane(ctx) {
  let best = -1
  let bestP = Infinity
  ctx.lanes.forEach((lane, i) => {
    const car = lane.cars[0]
    if (!car) return
    const p = priorityOf(car)
    if (p < bestP) { bestP = p; best = i }
  })
  return best
}

/* ── building an intersection ─────────────────────────────────────────── */

/** What the child's learned pool can support - drives tier planning. */
export function poolCaps(keys) {
  const forms = [...new Set(keys)].map((k) => INDEXES.byAudioKey.get(k)).filter(Boolean)
  const byFamily = new Map()
  for (const f of forms) byFamily.set(f.familyId, (byFamily.get(f.familyId) || 0) + 1)
  let richestFamily = 0
  for (const n of byFamily.values()) richestFamily = Math.max(richestFamily, n)
  return {
    forms: forms.length,
    families: byFamily.size,
    richestFamily,
    bases: forms.filter((f) => f.order === 1).length,
  }
}

/** Can this pool actually stage that tier? (Never guess - degrade instead.) */
export function tierSupported(tier, caps) {
  const cfg = TIERS[tier]
  if (!cfg) return false
  const need = cfg.lanes * cfg.depth
  if (tier === 'street') return caps.richestFamily >= need
  if (tier === 'downtown') return caps.bases >= need
  return caps.forms >= need && caps.families >= 2
}

/**
 * The shift plan: which tier each intersection uses, escalating but never
 * asking for more than the pool can stage. Always returns `count` tiers.
 */
export const TIER_ORDER = Object.freeze(['street', 'downtown', 'meskel'])

export function planShift(caps, count = INTERSECTIONS_PER_SHIFT) {
  const wanted = ['street', 'street', 'downtown', 'downtown', 'meskel']
  const usable = TIER_ORDER.filter((t) => tierSupported(t, caps))
  const out = []
  for (let i = 0; i < count; i++) {
    const w = wanted[Math.min(i, wanted.length - 1)]
    if (tierSupported(w, caps)) { out.push(w); continue }
    // Degrade DOWNWARD: the hardest tier at or below what we wanted. Picking
    // the hardest *supported* tier instead would hand a child who knows two
    // families a harder road than one who knows six.
    const easier = usable.filter((t) => TIER_ORDER.indexOf(t) <= TIER_ORDER.indexOf(w))
    out.push(easier[easier.length - 1] || usable[0] || 'street')
  }
  return out
}

/** Pick `n` distinct keys appropriate to the tier. Degrades, never throws. */
function pickKeys(pool, tier, n, state) {
  const keys = [...new Set(pool)]
  const forms = keys.map((k) => INDEXES.byAudioKey.get(k)).filter(Boolean)
  let candidates = forms

  if (tier === 'street') {
    // One family's vowel orders. Choose a family rich enough to fill the road.
    const byFamily = new Map()
    for (const f of forms) {
      if (!byFamily.has(f.familyId)) byFamily.set(f.familyId, [])
      byFamily.get(f.familyId).push(f)
    }
    const rich = [...byFamily.values()].filter((g) => g.length >= n)
    if (rich.length) {
      let v
      ;[v, state] = rngNext(state)
      candidates = rich[Math.floor(v * rich.length) % rich.length]
    }
  } else if (tier === 'downtown') {
    const bases = forms.filter((f) => f.order === 1)
    if (bases.length >= n) candidates = bases
  }

  let shuffled
  ;[shuffled, state] = rngShuffle(candidates.length >= n ? candidates : forms, state)
  const chosen = shuffled.slice(0, Math.max(1, Math.min(n, shuffled.length)))
  return [chosen.map((f) => f.audioKey), state]
}

/**
 * Build one intersection: lanes of queued cars, all plates distinct.
 * Returns [lanes, nextState, tierUsed].
 */
export function buildIntersection(state, pool, tier, nextCarId = 0) {
  const cfg = TIERS[tier] || TIERS.street
  const want = cfg.lanes * cfg.depth
  let keys
  ;[keys, state] = pickKeys(pool, cfg.pick === 'family' ? 'street' : cfg.pick === 'base' ? 'downtown' : 'meskel', want, state)

  // If the pool could not supply enough distinct letters, shrink the road
  // rather than repeat a plate (a repeated plate would break "one right car").
  const total = keys.length
  const lanes = Math.max(2, Math.min(cfg.lanes, total))
  const depth = Math.max(1, Math.min(cfg.depth, Math.floor(total / lanes)))

  // One ambulance, meskel only, sometimes - and never in a back slot, so the
  // exception is always visible at the line the moment it applies.
  let vipRoll
  ;[vipRoll, state] = rngNext(state)
  const vipLane = tier === 'meskel' && vipRoll < VIP_CHANCE ? Math.floor(vipRoll * 1000) % lanes : -1

  const out = []
  let k = 0
  let id = nextCarId
  for (let lane = 0; lane < lanes; lane++) {
    const cars = []
    for (let d = 0; d < depth; d++) {
      const key = keys[k++]
      if (!key) break
      let kindRoll
      ;[kindRoll, state] = rngNext(state)
      const vip = lane === vipLane && d === 0
      cars.push({
        id: id++,
        key,
        dir: DIRS[lane],
        kind: vip ? AMBULANCE : KINDS[Math.floor(kindRoll * KINDS.length) % KINDS.length],
        vip,
      })
    }
    out.push({ dir: DIRS[lane], cars })
  }
  return [out.filter((l) => l.cars.length), state, tier]
}

/* ── the shift ────────────────────────────────────────────────────────── */

/** Points for a release: a base fare plus a growing streak bonus (capped). */
export function scoreFor(combo) {
  return 10 + Math.min(combo, 5) * 2
}

/**
 * Start a shift: `count` intersections drawn from the child's learned pool.
 * `pool` is a list of audioKeys.
 */
export function initTraffic(seed, pool, count = INTERSECTIONS_PER_SHIFT) {
  const keys = [...new Set(pool)].filter((k) => INDEXES.byAudioKey.has(k))
  const caps = poolCaps(keys)
  const plan = planShift(caps, count)
  const state0 = (seed >>> 0) | 1
  const [lanes, state, tier] = buildIntersection(state0, keys, plan[0], 0)
  return {
    seed, pool: keys, caps, plan,
    index: 0, // which intersection of the shift
    target: plan.length,
    tier,
    lanes,
    nextCarId: 1000,
    score: 0, combo: 0, bestCombo: 0,
    releases: 0, misses: 0, perfect: true,
    cleared: 0,
    lastReleased: null, // { key, vip } - what just drove off (renderer voices it)
    phase: Phase.PLAY,
    rngState: state,
  }
}

const res = (next, accepted, correct, want) => ({ next, accepted, correct, want })

/**
 * Pure transition.
 *   RELEASE { lane } - wave that lane's front car through.
 *     accepted:false + no state change  -> the tap was not a playable lane
 *     accepted:true, correct:false      -> wrong car (streak lost, miss logged,
 *                                          `want` = the lane that should go)
 *     accepted:true, correct:true       -> it drives off; the queue advances,
 *                                          and a cleared road stages the next
 *                                          intersection (or wins the shift).
 */
export function trafficTransition(ctx, event) {
  const { type, payload = {} } = event

  if (type === TrafficEvent.RESET) {
    return res(initTraffic((ctx.seed * 1664525 + 1013904223) >>> 0, ctx.pool, ctx.target), true, true, -1)
  }
  if (ctx.phase !== Phase.PLAY) return res(ctx, false, false, -1)
  if (type !== TrafficEvent.RELEASE) return res(ctx, false, false, -1)

  const li = payload.lane
  const lane = ctx.lanes[li]
  if (!lane || !lane.cars.length) return res(ctx, false, false, -1) // not a car at the line

  const want = correctLane(ctx)
  if (li !== want) {
    // Wrong car: costs the streak, never a turn. The renderer re-cues `want`.
    return res({ ...ctx, combo: 0, misses: ctx.misses + 1, perfect: false, lastReleased: null }, true, false, want)
  }

  const car = lane.cars[0]
  const lanes = ctx.lanes.map((l, i) => (i === li ? { ...l, cars: l.cars.slice(1) } : l))
  const combo = ctx.combo + 1
  const base = {
    ...ctx,
    lanes,
    score: ctx.score + scoreFor(ctx.combo),
    combo,
    bestCombo: Math.max(ctx.bestCombo, combo),
    releases: ctx.releases + 1,
    lastReleased: { key: car.key, vip: !!car.vip },
  }

  const roadClear = lanes.every((l) => !l.cars.length)
  if (!roadClear) return res(base, true, true, li)

  // Intersection cleared.
  const cleared = ctx.cleared + 1
  const index = ctx.index + 1
  if (index >= ctx.target) {
    return res({ ...base, cleared, index, phase: Phase.WIN }, true, true, li)
  }
  const [nextLanes, rngState, tier] = buildIntersection(base.rngState, ctx.pool, ctx.plan[index], base.nextCarId)
  return res({
    ...base, cleared, index, tier, lanes: nextLanes,
    nextCarId: base.nextCarId + 1000, rngState,
  }, true, true, li)
}

/* ── group play: officers take shifts on one phone ────────────────────── */

/**
 * A "match day" is 1-4 officers sharing one device: each takes a shift, then
 * passes the phone on. Everything here is pure so standings are testable.
 */
export function initMatchDay(count = 1) {
  const n = Math.max(1, Math.min(4, Math.round(count) || 1))
  return {
    players: Array.from({ length: n }, (_, i) => ({
      id: i, score: 0, cleared: 0, bestCombo: 0, misses: 0, shifts: 0, perfect: 0,
    })),
    turn: 0,
    done: false,
  }
}

/** File a finished shift against the current officer and pass the phone on. */
export function recordShift(day, result) {
  const players = day.players.map((p, i) => (i !== day.turn ? p : {
    ...p,
    score: p.score + (result.score || 0),
    cleared: p.cleared + (result.cleared || 0),
    bestCombo: Math.max(p.bestCombo, result.bestCombo || 0),
    misses: p.misses + (result.misses || 0),
    shifts: p.shifts + 1,
    perfect: p.perfect + (result.perfect ? 1 : 0),
  }))
  const turn = day.turn + 1
  return { ...day, players, turn: turn % players.length, done: turn >= players.length }
}

/** Officers ranked: score, then fewest misses, then longest streak. */
export function standings(day) {
  return [...day.players].sort((a, b) => (
    b.score - a.score || a.misses - b.misses || b.bestCombo - a.bestCombo || a.id - b.id
  ))
}
