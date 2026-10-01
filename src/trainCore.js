/* ============================================================================
   VOWEL TRAIN — pure core (replaces Line Up)
   ----------------------------------------------------------------------------
   A train with one car per vowel ORDER. Each car carries a familiar ANCHOR
   letter from one family (e.g. ለ ሉ ሊ ላ ሌ ል ሎ) and says it when tapped.
   Letters from OTHER families arrive as cargo; the child picks one (it
   speaks) and loads it into the car whose vowel it shares. Line Up re-sorted
   one family the child had just chanted; the train asks for TRANSFER - "the
   ring on ሉ is the same ring on ሙ" - the abugida insight fluent readers use
   to decode letters they have never been taught.

   LEVELS (unlock on >= 75% first-try accuracy, platform/roundProgress):
     L1  3 cars (orders 1-3), 6 cargo from 2 families
     L2  all 7 cars, 8 cargo from 3 families
     L3  7 cars, 8 cargo, one family the child has NOT learned yet (pure
         transfer: the vowel marks work on new consonants too)
     L4  7 cars, 8 cargo from 4 families, EARS ONLY: cargo shows a speaker,
         not the letter - hear the vowel, find its car
   Scaffold: after two wrong cars for the same cargo, the right car glows.

   SOUND SAFETY: the anchor family must voice all seven orders distinctly,
   and a cargo letter is only dealt when it is HEARD as its own order (the
   Amharic pack voices ሀ like ሃ - order-remapped - so ሀ can't be cargo: by ear
   it belongs in car 4). Same-sound duplicates (ሰ/ሠ) never both ride one
   round. The renderer passes only keys with a real clip.

   PURE + SEEDED: deal = f(level, seed, keys, extraKeys, due, pack); PICK and
   LOAD events. Every accepted LOAD leaves `last` for the renderer.
   ========================================================================== */
import { rngShuffle } from './platform/rng'
import { ACTIVE_PACK } from './platform/ethiopic'
import { soundKeyOf, uniqueBySound, heardAsOwnOrder } from './platform/sameSound'
import { UNLOCK_ACCURACY, starsFor, applyRound as applyRoundShared } from './platform/roundProgress'
import { TRAIN_KEY, trainStore } from './platform/gameStores'

export const Phase = Object.freeze({ PLAY: 'PLAY', WIN: 'WIN' })
export const TrainEvent = Object.freeze({ PICK: 'PICK', LOAD: 'LOAD' })
export const Outcome = Object.freeze({ LOADED: 'loaded', WRONG_CAR: 'wrong-car' })

export const TRAIN_LEVELS = Object.freeze({
  1: { orders: [1, 2, 3], cargo: 6, families: 2, unknown: 0, earsOnly: false },
  2: { orders: [1, 2, 3, 4, 5, 6, 7], cargo: 8, families: 3, unknown: 0, earsOnly: false },
  3: { orders: [1, 2, 3, 4, 5, 6, 7], cargo: 8, families: 3, unknown: 1, earsOnly: false },
  4: { orders: [1, 2, 3, 4, 5, 6, 7], cargo: 8, families: 4, unknown: 0, earsOnly: true },
})
export const MAX_LEVEL = 4
/** Wrong cars for one cargo before the right car glows. */
export const HINT_AFTER = 2

const orderOf = (key) => Number(/-(\d+)$/.exec(key)?.[1] || 0)
const familyOf = (key) => /^([a-z]+)-/.exec(key)?.[1] || key

export { heardAsOwnOrder }

/** The anchor family: all seven orders present, each heard as itself and
    distinct. Prefers ለ (regular, early in both packs), else the first
    qualifying family in `keys` order. */
export function pickAnchor(keys, pack = ACTIVE_PACK) {
  const fams = [...new Set(keys.map(familyOf))]
  const ok = (f) => {
    const forms = [1, 2, 3, 4, 5, 6, 7].map((o) => `${f}-${o}`)
    return forms.every((k) => keys.includes(k) && heardAsOwnOrder(k, pack)) && new Set(forms.map((k) => soundKeyOf(k, pack))).size === 7
  }
  if (fams.includes('le') && ok('le')) return 'le'
  return fams.find(ok) || null
}

/** Families (other than the anchor) that can supply cargo for a level. */
function cargoFamilies(keys, anchor, cfg, pack) {
  const fams = new Map()
  for (const k of keys) {
    const f = familyOf(k)
    if (f === anchor || !cfg.orders.includes(orderOf(k)) || !heardAsOwnOrder(k, pack)) continue
    if (!fams.has(f)) fams.set(f, [])
    fams.get(f).push(k)
  }
  return fams
}

/**
 * Deal a round.
 *  keys      - learned letter keys with a real clip (all orders)
 *  extraKeys - keys of NOT-yet-learned families with a clip (for L3)
 *  due       - letter keys to re-deal first
 */
export function initTrain(level, seed, keys, { extraKeys = [], due = [], pack = ACTIVE_PACK } = {}) {
  const lv = TRAIN_LEVELS[level] ? level : 1
  const cfg = TRAIN_LEVELS[lv]
  const anchor = pickAnchor(keys, pack)
  let s = (seed >>> 0) | 1
  const fams = cargoFamilies(keys, anchor, cfg, pack)
  let famIds
  ;[famIds, s] = rngShuffle([...fams.keys()], s)

  const chosen = []
  const add = (k) => {
    if (chosen.length >= cfg.cargo || chosen.includes(k)) return false
    if (uniqueBySound([...chosen, k], pack).length !== chosen.length + 1) return false
    chosen.push(k)
    return true
  }
  // 1. Re-deal missed cargo first (at most half the round).
  const dueCap = Math.max(1, Math.floor(cfg.cargo / 2))
  for (const k of due) {
    if (chosen.length >= dueCap) break
    if (fams.get(familyOf(k))?.includes(k)) add(k)
  }
  // 2. L3: one family the child has not learned yet (2 cargo).
  if (cfg.unknown > 0 && extraKeys.length) {
    const extra = cargoFamilies(extraKeys.filter((k) => familyOf(k) !== anchor), anchor, cfg, pack)
    let ids
    ;[ids, s] = rngShuffle([...extra.keys()], s)
    const f = ids[0]
    if (f) {
      let forms
      ;[forms, s] = rngShuffle(extra.get(f), s)
      let n = 0
      for (const k of forms) if (n < 2 && add(k)) n++
    }
  }
  // 3. Fill round-robin over the cars, so every car gets cargo.
  const use = famIds.slice(0, Math.max(cfg.families, 1))
  let pool = use.flatMap((f) => fams.get(f))
  ;[pool, s] = rngShuffle(pool, s)
  for (let pass = 0; pass < 4 && chosen.length < cfg.cargo; pass++) {
    let orders
    ;[orders, s] = rngShuffle(cfg.orders, s)
    for (const o of orders) {
      const k = pool.find((x) => orderOf(x) === o && !chosen.includes(x) && uniqueBySound([...chosen, x], pack).length === chosen.length + 1)
      if (k) add(k)
    }
  }
  // 4. Still short (tiny pool): any remaining cargo from any family.
  for (const k of [...fams.values()].flat()) add(k)

  let cargo
  ;[cargo, s] = rngShuffle(chosen.map((key, id) => ({ id, key, done: false, tries: 0 })), s)
  return {
    level: lv, seed, anchor, orders: cfg.orders, earsOnly: cfg.earsOnly,
    cargo, held: null, hint: null,
    streak: 0, bestStreak: 0, missed: [], logged: [],
    last: null, phase: Phase.PLAY, rngState: s,
  }
}

const rej = (ctx) => ({ next: ctx, accepted: false })
const ok = (next) => ({ next, accepted: true })

export function trainTransition(ctx, event) {
  const { type, payload = {} } = event
  if (ctx.phase !== Phase.PLAY) return rej(ctx)

  if (type === TrainEvent.PICK) {
    const c = ctx.cargo.find((x) => x.id === payload.id)
    if (!c || c.done) return rej(ctx)
    return ok({ ...ctx, held: c.id, hint: c.tries >= HINT_AFTER ? orderOf(c.key) : null, last: null })
  }

  if (type === TrainEvent.LOAD) {
    if (ctx.held == null || !ctx.orders.includes(payload.order)) return rej(ctx)
    const c = ctx.cargo.find((x) => x.id === ctx.held)
    const want = orderOf(c.key)
    const firstAttempt = c.tries === 0
    const log = firstAttempt ? { heard: c.key, picked: `${familyOf(c.key)}-${payload.order}` } : null
    const logged = log ? [...ctx.logged, c.key] : ctx.logged
    if (payload.order === want) {
      const cargo = ctx.cargo.map((x) => (x.id === c.id ? { ...x, done: true } : x))
      const streak = firstAttempt ? ctx.streak + 1 : 0
      const won = cargo.every((x) => x.done)
      return ok({
        ...ctx, cargo, held: null, hint: null, logged, streak, bestStreak: Math.max(ctx.bestStreak, streak),
        last: { outcome: Outcome.LOADED, key: c.key, order: want, firstTry: firstAttempt, log },
        phase: won ? Phase.WIN : Phase.PLAY,
      })
    }
    const tries = c.tries + 1
    const cargo = ctx.cargo.map((x) => (x.id === c.id ? { ...x, tries } : x))
    return ok({
      ...ctx, cargo, logged, streak: 0,
      missed: ctx.missed.includes(c.key) ? ctx.missed : [...ctx.missed, c.key],
      hint: tries >= HINT_AFTER ? want : null,
      last: { outcome: Outcome.WRONG_CAR, key: c.key, order: payload.order, want, log },
    })
  }
  return rej(ctx)
}

/** Round summary (letters known first try / to practise). Pure. */
export function trainSummary(ctx) {
  const dealt = ctx.cargo.map((c) => c.key)
  const mastered = ctx.cargo.filter((c) => c.done && c.tries === 0).map((c) => c.key)
  const practice = dealt.filter((k) => !mastered.includes(k))
  const accuracy = dealt.length ? mastered.length / dealt.length : 0
  return {
    dealt, mastered, practice, missed: dealt.filter((k) => ctx.missed.includes(k)),
    accuracy, stars: starsFor(accuracy), passed: ctx.phase === Phase.WIN && accuracy >= UNLOCK_ACCURACY, bestStreak: ctx.bestStreak,
  }
}

/** Highest level this pool can fill (0 = none): needs an anchor, 2+ cargo
    families and two thirds of a round of distinct-sounding cargo; L2+ need
    every order available; L4 needs 4 families. */
export function maxPlayableLevel(keys, pack = ACTIVE_PACK) {
  const anchor = pickAnchor(keys, pack)
  if (!anchor) return 0
  let best = 0
  for (let lv = 1; lv <= MAX_LEVEL; lv++) {
    const cfg = TRAIN_LEVELS[lv]
    const fams = cargoFamilies(keys, anchor, cfg, pack)
    const all = [...fams.values()].flat()
    const orders = new Set(all.map(orderOf))
    const enoughCargo = uniqueBySound(all, pack).length >= Math.ceil((cfg.cargo * 2) / 3)
    if (fams.size >= Math.min(cfg.families, lv === 4 ? 4 : 2) && enoughCargo && cfg.orders.every((o) => orders.has(o))) best = lv
  }
  return best
}

export { TRAIN_KEY }
const store = trainStore
export const loadTrain = () => store.load()
export const saveTrain = (state) => store.save(state)
export const applyRound = (state, level, summary) => applyRoundShared(state, level, summary, MAX_LEVEL)
