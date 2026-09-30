/* ============================================================================
   FIDEL TRAFFIC (Meskel Square) — pure core
   ----------------------------------------------------------------------------
   Cars queue at an all-way stop, each with a fidel on its plate. The child is
   the traffic officer: wave through the car whose letter comes FIRST in the
   fidel order. Keep the city moving.

   THE RULE (one line, no ambiguity):
     priority = familyIndex * 7 + (order - 1)   -> lowest goes first
   That is exactly dictionary order, so it teaches BOTH axes of the abugida:
     - same family, different orders : ሀ before ሆ   (0 < 6)
     - different families            : ሀ before ለ   (6 < 7)
   An ambulance is the one authored exception: it always goes first (-1). Only
   ever one per intersection, and every plate on the road is a DISTINCT letter,
   so a tie can never occur and "first" is always a single right answer.

   WHAT MAKES IT A GAME (and not a list you sort once):
     - HIDDEN INFORMATION. Only the car at the line shows its plate; the cars
       queued behind it are covered and reveal as they pull forward. You cannot
       pre-solve the whole road, so every release is a fresh decision.
     - A REAL COST. Three whistles a shift buy a hint. Spend them and you have
       to actually know. Guessing costs the streak; hinting costs a whistle.
     - LIVE PRESSURE. Cars keep arriving. Serve them fast enough and the city
       flows; let every lane back up and arriving cars are turned away and the
       flow meter drops. Flow is the thing worth optimising - it is never a
       fail state, the shift always finishes, nothing ever blocks a child.
     - CLOSE CALLS ON PURPOSE. Plates are drawn NEAR each other in the order
       (and deliberately stage the look-alike twins ሠ/ሰ, ጸ/ፀ, ሀ/ሐ/ኀ), so the
       comparison actually teaches instead of being trivially far apart.
     - PAIRS. Two cars from opposite approaches both going straight - or two
       both turning right - do not cross, so waving the second through quickly
       after the first is a legal double and pays a bonus.

   PURE + SEEDED + CLOCK-FREE: an intersection is a pure function of
   (rngState, pool, tier); the child's taps arrive as RELEASE events, time
   arrives as TICK events carrying dt, and "was that quick?" arrives as a flag
   the renderer sets. No Date, no Math.random - a whole shift replays
   identically and tests run headless.
   ========================================================================== */
import { rngNext, rngShuffle } from './platform/rng'
import { INDEXES, ACTIVE_PACK } from './platform/ethiopic'

export const Phase = Object.freeze({ PLAY: 'PLAY', WIN: 'WIN' })
export const TrafficEvent = Object.freeze({
  RELEASE: 'RELEASE', WHISTLE: 'WHISTLE', TICK: 'TICK', RESET: 'RESET',
})

/** The four approaches of an all-way stop, in a stable clockwise order. */
export const DIRS = Object.freeze(['N', 'E', 'S', 'W'])
const OPPOSITE = Object.freeze({ N: 'S', S: 'N', E: 'W', W: 'E' })

/** Cosmetic vehicle kinds. `bus` is the Anbessa bus (Addis's real city bus);
    `bajaj` the three-wheeler; `taxi` the blue-and-white minibus. */
export const KINDS = Object.freeze(['taxi', 'bajaj', 'bus', 'lorry'])
export const AMBULANCE = 'ambulance'
/** Where a car is headed. Straight, Left, Right - shown as an indicator. */
export const TURNS = Object.freeze(['S', 'L', 'R'])

/**
 * The three tiers, escalating across a shift.
 *   street   - one family, mixed vowel orders (ሀ ሂ ሆ). Calm: nothing arrives.
 *   downtown - many families, base forms (ሀ ለ መ). Traffic starts flowing.
 *   meskel   - anything, queues two deep, busy. The real square.
 * `spread` scales how far apart the chosen plates may sit in the fidel order:
 * 1 means "as close as possible", which is where the learning happens.
 */
export const TIERS = Object.freeze({
  street: { id: 'street', lanes: 3, depth: 1, pick: 'family', spread: 1, spawns: 0, arriveEvery: 0, cap: 2 },
  downtown: { id: 'downtown', lanes: 4, depth: 1, pick: 'base', spread: 2, spawns: 2, arriveEvery: 5, cap: 3 },
  meskel: { id: 'meskel', lanes: 4, depth: 2, pick: 'mixed', spread: 2, spawns: 4, arriveEvery: 3.6, cap: 3 },
})
export const TIER_ORDER = Object.freeze(['street', 'downtown', 'meskel'])

export const INTERSECTIONS_PER_SHIFT = 5
export const WHISTLES_PER_SHIFT = 3
const VIP_CHANCE = 0.22
const TWIN_CHANCE = 0.45 // how often a road deliberately stages a twin pair
const FLOW_START = 100
const FLOW_TURNED_AWAY = 8 // flow lost when a lane is too full to accept a car
const PAIR_BONUS = 8

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

/**
 * Do these two cars' paths cross? Two cars coming from opposite approaches and
 * both going straight pass each other safely; so do two that both turn right
 * (Ethiopia drives on the right, so a right turn hugs the near kerb). Anything
 * else crosses. This is the real rule, simple enough for a child to see.
 */
export function canPair(a, b) {
  if (!a || !b || a.vip || b.vip) return false
  if (a.dir === b.dir) return false
  if (a.turn === 'R' && b.turn === 'R') return true
  return OPPOSITE[a.dir] === b.dir && a.turn === 'S' && b.turn === 'S'
}

/**
 * The lane holding the SECOND car in order, when it may legally go together
 * with the first. -1 when there is no safe double. Keeping the pair strictly
 * "the two lowest" means the ordering lesson is never bent by the bonus.
 */
export function pairLane(ctx) {
  const first = correctLane(ctx)
  if (first < 0) return -1
  let second = -1
  let bestP = Infinity
  ctx.lanes.forEach((lane, i) => {
    if (i === first) return
    const car = lane.cars[0]
    if (!car) return
    const p = priorityOf(car)
    if (p < bestP) { bestP = p; second = i }
  })
  if (second < 0) return -1
  return canPair(ctx.lanes[first].cars[0], ctx.lanes[second].cars[0]) ? second : -1
}

/* ── choosing the letters ─────────────────────────────────────────────── */

/** Twin groups of the active pack: letters that sound identical and can only
    be told apart by where they sit on the chart. The best thing this game can
    possibly ask about, so it asks on purpose. */
function twinGroups() {
  return (ACTIVE_PACK && Array.isArray(ACTIVE_PACK.twins)) ? ACTIVE_PACK.twins : []
}

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

/**
 * Pick `n` distinct keys for a road. Two things matter here and nothing else:
 *   1. CLOSE. Drawn from a window of the sorted order, so the comparison is a
 *      real one. A uniform shuffle over 231 forms mostly produces letters so
 *      far apart that the child never has to think.
 *   2. CONFUSABLE. Sometimes seeded with a twin pair on purpose.
 * Degrades to whatever the pool can give; never throws, never repeats a plate.
 */
function pickKeys(pool, tier, n, state, spread = 2) {
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
  if (candidates.length < n) candidates = forms

  const sorted = [...candidates].sort((a, b) => readingIndex(a.audioKey) - readingIndex(b.audioKey))
  const picked = []

  // Maybe seed the road with a look-alike pair the child must separate by
  // chart position (they are homophones - the ear cannot help here).
  let twinRoll
  ;[twinRoll, state] = rngNext(state)
  if (tier !== 'street' && twinRoll < TWIN_CHANCE) {
    const groups = twinGroups()
      .map((g) => g.map((id) => sorted.filter((f) => f.familyId === id)).filter((a) => a.length))
      .filter((g) => g.length >= 2)
    if (groups.length) {
      let g
      ;[g, state] = rngNext(state)
      const group = groups[Math.floor(g * groups.length) % groups.length]
      for (const famForms of group.slice(0, 2)) {
        let p
        ;[p, state] = rngNext(state)
        picked.push(famForms[Math.floor(p * famForms.length) % famForms.length])
      }
    }
  }

  // Fill the rest from a window around the picks, so everything on the road
  // sits near everything else in the order.
  const need = Math.min(n, sorted.length)
  if (picked.length < need) {
    const width = Math.max(need, Math.min(sorted.length, Math.round(need * Math.max(1, spread))))
    let anchor
    if (picked.length) {
      anchor = Math.max(0, sorted.indexOf(picked[0]) - Math.floor(width / 2))
    } else {
      let v
      ;[v, state] = rngNext(state)
      anchor = Math.floor(v * Math.max(1, sorted.length - width + 1))
    }
    const window = sorted.slice(anchor, anchor + width)
    let shuffled
    ;[shuffled, state] = rngShuffle(window.length >= need ? window : sorted, state)
    for (const f of shuffled) {
      if (picked.length >= need) break
      if (!picked.includes(f)) picked.push(f)
    }
    // Last resort: top up from anywhere so the road is always playable.
    for (const f of sorted) {
      if (picked.length >= need) break
      if (!picked.includes(f)) picked.push(f)
    }
  }

  let out
  ;[out, state] = rngShuffle(picked.slice(0, need), state)
  return [out.map((f) => f.audioKey), state]
}

/** One car, with its cosmetic kind and its turn indicator. */
function makeCar(id, key, dir, state, { vip = false, covered = false } = {}) {
  let kindRoll
  ;[kindRoll, state] = rngNext(state)
  let turnRoll
  ;[turnRoll, state] = rngNext(state)
  const car = {
    id, key, dir, vip, covered,
    kind: vip ? AMBULANCE : KINDS[Math.floor(kindRoll * KINDS.length) % KINDS.length],
    // Straight is the common case; pairs should feel like a spotted chance,
    // not the default.
    turn: turnRoll < 0.62 ? 'S' : turnRoll < 0.81 ? 'L' : 'R',
  }
  return [car, state]
}

/**
 * Build one intersection. Cars behind the line are COVERED - the child cannot
 * pre-solve the road. Returns [lanes, nextState, tierUsed].
 */
export function buildIntersection(state, pool, tier, nextCarId = 0) {
  const cfg = TIERS[tier] || TIERS.street
  const want = cfg.lanes * cfg.depth
  let keys
  ;[keys, state] = pickKeys(pool, cfg.pick === 'family' ? 'street' : cfg.pick === 'base' ? 'downtown' : 'meskel', want, state, cfg.spread)

  // If the pool could not supply enough distinct letters, shrink the road
  // rather than repeat a plate (a repeated plate would break "one right car").
  const total = keys.length
  const lanes = Math.max(1, Math.min(cfg.lanes, total))
  const depth = Math.max(1, Math.min(cfg.depth, Math.floor(total / lanes)))

  // One ambulance, meskel only, sometimes - and never in a back slot, so the
  // exception is always visible at the line the moment it applies.
  let vipRoll
  ;[vipRoll, state] = rngNext(state)
  let laneRoll
  ;[laneRoll, state] = rngNext(state)
  const vipLane = tier === 'meskel' && vipRoll < VIP_CHANCE ? Math.floor(laneRoll * lanes) % lanes : -1

  const out = []
  let k = 0
  let id = nextCarId
  for (let lane = 0; lane < lanes; lane++) {
    const cars = []
    for (let d = 0; d < depth; d++) {
      const key = keys[k++]
      if (!key) break
      let car
      ;[car, state] = makeCar(id++, key, DIRS[lane], state, { vip: lane === vipLane && d === 0, covered: d > 0 })
      cars.push(car)
    }
    out.push({ dir: DIRS[lane], cars })
  }
  return [out.filter((l) => l.cars.length), state, tier]
}

/* ── the shift ────────────────────────────────────────────────────────── */

/** Points for a release: a base fare plus a growing streak bonus. The streak
    keeps paying all shift - a cap would mean mastery stops counting. */
export function scoreFor(combo) {
  return 10 + Math.min(combo, 12) * 2
}

/** Stars for a finished shift, from how well the city flowed. */
export function starsFor(ctx) {
  let s = 1
  if (ctx.flow >= 70) s = 2
  if (ctx.flow >= 95 && ctx.misses === 0) s = 3
  return s
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
  const cfg = TIERS[plan[0]] || TIERS.street
  return {
    seed, pool: keys, caps, plan,
    index: 0,
    target: plan.length,
    tier,
    lanes,
    nextCarId: 1000,
    score: 0, combo: 0, bestCombo: 0,
    releases: 0, misses: 0, perfect: true,
    cleared: 0,
    whistles: WHISTLES_PER_SHIFT, hints: 0,
    flow: FLOW_START, turnedAway: 0,
    pairs: 0,
    spawnsLeft: cfg.spawns, spawnAcc: 0,
    lastReleased: null, // { key, vip, paired } - the renderer voices this
    phase: Phase.PLAY,
    rngState: state,
  }
}

const res = (next, accepted, correct, want) => ({ next, accepted, correct, want })

/** Uncover whatever is now at the line (a covered car reveals as it advances). */
const reveal = (lanes) => lanes.map((l) => (
  l.cars.length && l.cars[0].covered ? { ...l, cars: [{ ...l.cars[0], covered: false }, ...l.cars.slice(1)] } : l
))

/**
 * One car arrives. If every lane is already full it is turned away: the city
 * backs up and flow drops. That is the cost worth caring about - it is never a
 * fail state, and the shift still finishes.
 */
function spawnCar(ctx) {
  const cfg = TIERS[ctx.tier] || TIERS.street
  if (ctx.spawnsLeft <= 0) return { ...ctx, spawnAcc: 0 }
  let target = -1
  let shortest = Infinity
  ctx.lanes.forEach((l, i) => {
    if (l.cars.length < cfg.cap && l.cars.length < shortest) { shortest = l.cars.length; target = i }
  })
  if (target < 0) {
    return {
      ...ctx, spawnAcc: 0, turnedAway: ctx.turnedAway + 1,
      flow: Math.max(0, ctx.flow - FLOW_TURNED_AWAY), combo: 0,
    }
  }
  const onRoad = new Set(ctx.lanes.flatMap((l) => l.cars.map((c) => c.key)))
  const free = ctx.pool.filter((k) => !onRoad.has(k))
  if (!free.length) return { ...ctx, spawnAcc: 0, spawnsLeft: 0 }
  let keys
  let state = ctx.rngState
  ;[keys, state] = pickKeys(free, 'mixed', 1, state, cfg.spread)
  let car
  ;[car, state] = makeCar(ctx.nextCarId, keys[0], ctx.lanes[target].dir, state, { covered: ctx.lanes[target].cars.length > 0 })
  const lanes = ctx.lanes.map((l, i) => (i === target ? { ...l, cars: [...l.cars, car] } : l))
  return { ...ctx, lanes, spawnAcc: 0, spawnsLeft: ctx.spawnsLeft - 1, nextCarId: ctx.nextCarId + 1, rngState: state }
}

/** Stage the next intersection, or win the shift. */
function advance(ctx) {
  const cleared = ctx.cleared + 1
  const index = ctx.index + 1
  if (index >= ctx.target) return { ...ctx, cleared, index, phase: Phase.WIN }
  const tierId = ctx.plan[index]
  const [lanes, rngState, tier] = buildIntersection(ctx.rngState, ctx.pool, tierId, ctx.nextCarId)
  const cfg = TIERS[tierId] || TIERS.street
  return {
    ...ctx, cleared, index, tier, lanes,
    nextCarId: ctx.nextCarId + 1000, rngState,
    spawnsLeft: cfg.spawns, spawnAcc: 0,
  }
}

/**
 * Pure transition.
 *   RELEASE { lane, quick } - wave that lane's front car through. `quick` says
 *     the renderer saw this tap land soon after the previous release; if the
 *     two cars could legally share the junction that pays a pair bonus.
 *   WHISTLE - spend one of the shift's three whistles on a hint.
 *   TICK { dt } - time passes; cars arrive; a full lane turns one away and
 *     costs flow. Never ends the shift, never blocks.
 */
export function trafficTransition(ctx, event) {
  const { type, payload = {} } = event

  if (type === TrafficEvent.RESET) {
    return res(initTraffic((ctx.seed * 1664525 + 1013904223) >>> 0, ctx.pool, ctx.target), true, true, -1)
  }
  if (ctx.phase !== Phase.PLAY) return res(ctx, false, false, -1)

  if (type === TrafficEvent.WHISTLE) {
    if (ctx.whistles <= 0) return res(ctx, false, false, correctLane(ctx))
    // A hint costs a whistle and the streak - never points, never a turn.
    return res({ ...ctx, whistles: ctx.whistles - 1, hints: ctx.hints + 1, combo: 0 }, true, true, correctLane(ctx))
  }

  if (type === TrafficEvent.TICK) {
    const dt = Math.max(0, Number(payload.dt) || 0)
    const cfg = TIERS[ctx.tier] || TIERS.street
    if (!cfg.arriveEvery || ctx.spawnsLeft <= 0) return res(ctx, false, false, -1)
    const acc = ctx.spawnAcc + dt
    if (acc < cfg.arriveEvery) return res({ ...ctx, spawnAcc: acc }, true, true, -1)
    return res(spawnCar(ctx), true, true, -1)
  }

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
  // A quick second release of a car that could legally share the junction with
  // the one just gone: a spotted double.
  const prev = ctx.lastReleased
  const paired = !!(payload.quick && prev && prev.car && canPair(prev.car, car))
  const lanes = reveal(ctx.lanes.map((l, i) => (i === li ? { ...l, cars: l.cars.slice(1) } : l)))
  const combo = ctx.combo + 1
  const base = {
    ...ctx,
    lanes,
    score: ctx.score + scoreFor(ctx.combo) + (paired ? PAIR_BONUS : 0),
    combo,
    bestCombo: Math.max(ctx.bestCombo, combo),
    releases: ctx.releases + 1,
    pairs: ctx.pairs + (paired ? 1 : 0),
    lastReleased: { key: car.key, vip: !!car.vip, paired, car },
  }

  const roadClear = lanes.every((l) => !l.cars.length)
  if (!roadClear) return res(base, true, true, li)
  // The road emptied. If cars are still due, bring the next one in NOW rather
  // than leaving a child looking at an empty junction waiting for a timer.
  if (base.spawnsLeft > 0) {
    const filled = spawnCar(base)
    if (filled.lanes.some((l) => l.cars.length)) return res(filled, true, true, li)
    return res(advance({ ...filled, spawnsLeft: 0 }), true, true, li)
  }
  return res(advance(base), true, true, li)
}

/* ── group play: officers share one city ──────────────────────────────── */

/**
 * A "match day" is 1-4 officers sharing one device. They take turns at the
 * SAME city (one shift, one board), swapping after each intersection, so the
 * wait is seconds rather than minutes and nobody is judged on a luckier draw.
 */
export function initMatchDay(count = 1) {
  const n = Math.max(1, Math.min(4, Math.round(count) || 1))
  return {
    players: Array.from({ length: n }, (_, i) => ({
      id: i, score: 0, cleared: 0, bestCombo: 0, misses: 0, pairs: 0, shifts: 0, perfect: 0,
    })),
    turn: 0,
    done: false,
  }
}

/** File a turn against the current officer and pass the phone on. */
export function recordShift(day, result) {
  const players = day.players.map((p, i) => (i !== day.turn ? p : {
    ...p,
    score: p.score + (result.score || 0),
    cleared: p.cleared + (result.cleared || 0),
    bestCombo: Math.max(p.bestCombo, result.bestCombo || 0),
    misses: p.misses + (result.misses || 0),
    pairs: p.pairs + (result.pairs || 0),
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
