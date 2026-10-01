/* ============================================================================
   KEBERO BEATS — pure core (replaces Classic)
   ----------------------------------------------------------------------------
   Every fidel is one beat. The kebero (drum) turns a spoken word into beats
   and back - phonological awareness that maps straight onto the abugida
   (one symbol = one syllable), then letter-in-word recognition and spelling
   by ear. All answers are taps; every word is a real recording.

   LEVELS (unlock on >= 75% first-try, platform/roundProgress):
     L1  COUNT    hear a word, drum once per beat, tap "done". Accepted: the
                  fidel count, or one fewer when the word ends in a 6th-order
                  (often near-silent) fidel. Then the word is revealed beat by
                  beat, karaoke-style.
     L2  WHICH    the word is shown as beat tiles; "which beat said ሙ?" - tap
                  it (2 asks per word; a same-sounding tile also counts).
     L3  MISSING  one beat is an empty drum; hear the word, pick the missing
                  fidel from it and its same-family siblings (other vowels).
     L4  SPELL    hear the word, drum it out: tap its fidel in order from a
                  tray with sibling distractors.
   Missed letters (L2-L4) / words (L1) are re-dealt first next rounds.

   SAFETY: options/trays never hold two same-sounding keys (sameSound), and
   siblings must be heard as their own order (Amharic ሀ is voiced like ሃ).
   The renderer passes only learned letters with a clip and words with a
   recording. Pure + seeded.
   ========================================================================== */
import { rngNext, rngShuffle } from './platform/rng'
import { ACTIVE_PACK, INDEXES } from './platform/ethiopic'
import { sameSound, uniqueBySound, heardAsOwnOrder, soundKeyOf } from './platform/sameSound'
import { UNLOCK_ACCURACY, starsFor, applyRound as applyRoundShared } from './platform/roundProgress'
import { BEATS_KEY, beatsStore } from './platform/gameStores'

export const Phase = Object.freeze({ PLAY: 'PLAY', WIN: 'WIN' })
export const Kind = Object.freeze({ COUNT: 'count', WHICH: 'which', MISSING: 'missing', SPELL: 'spell' })
export const BeatEvent = Object.freeze({ COUNT: 'COUNT', TAP: 'TAP' })
export const Outcome = Object.freeze({ RIGHT: 'right', WRONG: 'wrong', WORD_DONE: 'word-done' })

export const KEBERO_LEVELS = Object.freeze({
  1: { kind: Kind.COUNT, words: 5 },
  2: { kind: Kind.WHICH, words: 4, asks: 2 },
  3: { kind: Kind.MISSING, words: 4, options: 3 },
  4: { kind: Kind.SPELL, words: 3, distractors: 3 },
})
export const MAX_LEVEL = 4
export const HINT_AFTER = 2

const orderOf = (k) => Number(/-(\d+)$/.exec(k)?.[1] || 0)
const familyOf = (k) => /^([a-z]+)-/.exec(k)?.[1] || k

/** Recorded words of 2-4 real fidel. `words`: { latin, geez, picture, noAudio }. */
export function beatStock(words) {
  const seen = new Set()
  const out = []
  for (const w of words) {
    if (w.noAudio || seen.has(w.latin)) continue
    const chars = Array.from(w.geez)
    const keys = chars.map((c) => INDEXES.byChar.get(c)?.audioKey)
    if (chars.length < 2 || chars.length > 4 || keys.some((k) => !k)) continue
    seen.add(w.latin)
    out.push({ id: w.latin, geez: w.geez, picture: w.picture || null, keys, familyIndex: w.familyIndex || 0 })
  }
  return out
}

/** Words spelled entirely from `poolKeys`. */
export const playableIds = (stock, poolKeys) => {
  const pool = new Set(poolKeys)
  return stock.filter((w) => w.keys.every((k) => pool.has(k))).map((w) => w.id)
}

/** Beat counts accepted for a word. */
export function acceptedBeats(word) {
  const n = word.keys.length
  return orderOf(word.keys[n - 1]) === 6 && n > 1 ? [n, n - 1] : [n]
}

/** Same-family siblings of `key` (other orders) from `pool`, heard as their
    own order and distinct by sound from `avoid` and each other. */
export function siblingsOf(key, pool, avoid = [], pack = ACTIVE_PACK) {
  const fam = familyOf(key)
  const cands = pool.filter((k) => familyOf(k) === fam && k !== key && orderOf(k) <= 7 && heardAsOwnOrder(k, pack))
  const out = []
  for (const k of cands) {
    if ([key, ...avoid, ...out].some((x) => sameSound(x, k, pack))) continue
    out.push(k)
  }
  return out
}

function pickWords(cfg, stock, ids, due, s, pack, eligible = () => true) {
  const byId = new Map(stock.map((w) => [w.id, w]))
  const okIds = ids.filter((id) => byId.has(id) && eligible(byId.get(id)))
  let shuffled
  ;[shuffled, s] = rngShuffle(okIds, s)
  const dueSet = new Set(due)
  const score = (id) => (cfg.kind === Kind.COUNT ? (dueSet.has(id) ? 1 : 0) : byId.get(id).keys.some((k) => dueSet.has(k)) ? 1 : 0)
  const max = Math.ceil(cfg.words / 2)
  const dueFirst = shuffled.filter((id) => score(id)).slice(0, max)
  const order = [...dueFirst, ...shuffled.filter((id) => !dueFirst.includes(id))]
  const out = []
  const sigs = new Set()
  for (const id of order) {
    if (out.length >= cfg.words) break
    const sig = byId.get(id).keys.map((k) => soundKeyOf(k, pack)).join('|')
    if (sigs.has(sig)) continue
    sigs.add(sig)
    out.push(byId.get(id))
  }
  return [out, s]
}

/**
 * Deal a round.
 *  stock    - beatStock(words) (recorded words only)
 *  heardIds - ids whose word clip exists (L1 counts ANY recorded word: it is
 *             a listening task, and the reveal shows its fidel)
 *  ids      - the subset spelled entirely from learned voiced letters (L4)
 *  pool     - learned voiced letter keys. L2/L3 only ASK about pool letters
 *             (other letters of the word are just shown); siblings and
 *             distractors come from here too
 *  due      - ids (words for L1, letter keys for L2-L4) to re-deal first
 */
export function initBeats(level, seed, { stock, ids, heardIds = ids, pool, due = [], pack = ACTIVE_PACK }) {
  const lv = KEBERO_LEVELS[level] ? level : 1
  const cfg = KEBERO_LEVELS[lv]
  let s = (seed >>> 0) | 1
  const inPool = new Set(pool)
  const askable = (k) => inPool.has(k)
  const missable = (k) => inPool.has(k) && siblingsOf(k, pool, [], pack).length > 0
  let words
  if (cfg.kind === Kind.COUNT) [words, s] = pickWords(cfg, stock, heardIds, due, s, pack)
  else if (cfg.kind === Kind.WHICH) [words, s] = pickWords(cfg, stock, heardIds, due, s, pack, (w) => w.keys.some(askable))
  else if (cfg.kind === Kind.MISSING) [words, s] = pickWords(cfg, stock, heardIds, due, s, pack, (w) => w.keys.some(missable))
  else [words, s] = pickWords(cfg, stock, ids, due, s, pack)
  const items = []
  for (const w of words) {
    if (cfg.kind === Kind.COUNT) {
      items.push({ word: w.id, keys: w.keys, accept: acceptedBeats(w), tries: 0 })
    } else if (cfg.kind === Kind.WHICH) {
      let order
      ;[order, s] = rngShuffle(w.keys.map((_, i) => i), s)
      // prefer letters that sound unlike every other letter of the word
      order = order.filter((i) => askable(w.keys[i]))
      const unique = order.filter((i) => w.keys.every((k, j) => j === i || !sameSound(k, w.keys[i], pack)))
      const asks = [...unique, ...order.filter((i) => !unique.includes(i))].slice(0, Math.min(cfg.asks, order.length))
      for (const pos of asks) items.push({ word: w.id, keys: w.keys, ask: w.keys[pos], pos, tries: 0 })
    } else if (cfg.kind === Kind.MISSING) {
      let r
      ;[r, s] = rngNext(s)
      // a position whose letter has at least one usable sibling
      const posOrder = w.keys.map((_, i) => (i + Math.floor(r * w.keys.length)) % w.keys.length)
      const pos = posOrder.find((i) => missable(w.keys[i])) ?? posOrder[0]
      const answer = w.keys[pos]
      let sibs
      ;[sibs, s] = rngShuffle(siblingsOf(answer, pool, [], pack), s)
      let opts = [answer, ...sibs.slice(0, cfg.options - 1)]
      if (opts.length < 2) {
        const other = uniqueBySound(pool.filter((k) => !sameSound(k, answer, pack)), pack)
        let sh
        ;[sh, s] = rngShuffle(other, s)
        opts = [answer, ...sh.slice(0, cfg.options - 1)]
      }
      ;[opts, s] = rngShuffle(opts, s)
      items.push({ word: w.id, keys: w.keys, pos, options: opts, tries: 0 })
    } else {
      const extra = []
      for (const k of w.keys) {
        for (const sib of siblingsOf(k, pool, [...w.keys, ...extra], pack)) {
          if (extra.length >= cfg.distractors) break
          extra.push(sib)
          break
        }
      }
      let tray
      ;[tray, s] = rngShuffle([...w.keys.map((k, i) => ({ id: `w${i}`, key: k })), ...extra.map((k, i) => ({ id: `x${i}`, key: k }))], s)
      items.push({ word: w.id, keys: w.keys, tray, placed: 0, used: [], posTries: w.keys.map(() => 0), tries: 0 })
    }
  }
  return {
    level: lv, kind: cfg.kind, items, idx: 0, phase: items.length ? Phase.PLAY : Phase.WIN,
    streak: 0, bestStreak: 0, hint: null, missed: [], mastered: [], firstTry: 0, scored: 0, last: null,
  }
}

const rej = (ctx) => ({ next: ctx, accepted: false })
const ok = (next) => ({ next, accepted: true })
const addU = (list, x) => (list.includes(x) ? list : [...list, x])

function advance(ctx, items, extra) {
  const idx = ctx.idx + 1
  return { ...ctx, ...extra, items, idx, hint: null, phase: idx >= items.length ? Phase.WIN : Phase.PLAY }
}

/** Pure transition. COUNT {n} for L1; TAP {pos | key | trayId} for L2-L4. */
export function beatsTransition(ctx, event, pack = ACTIVE_PACK) {
  const { type, payload = {} } = event
  if (ctx.phase !== Phase.PLAY) return rej(ctx)
  const item = ctx.items[ctx.idx]
  const items = [...ctx.items]

  // ── L1: count the beats ──
  if (ctx.kind === Kind.COUNT) {
    if (type !== BeatEvent.COUNT || !(payload.n >= 1)) return rej(ctx)
    const right = item.accept.includes(payload.n)
    const first = item.tries === 0
    const log = first ? { heard: `beats:${item.word}`, picked: right ? `beats:${item.word}` : `beats:${item.word}#${payload.n}` } : null
    if (right) {
      const streak = first ? ctx.streak + 1 : 0
      return ok(advance(ctx, items, {
        streak, bestStreak: Math.max(ctx.bestStreak, streak), scored: ctx.scored + 1, firstTry: ctx.firstTry + (first ? 1 : 0),
        mastered: first ? addU(ctx.mastered, item.word) : ctx.mastered,
        last: { outcome: Outcome.WORD_DONE, item, n: payload.n, log, first },
      }))
    }
    const tries = item.tries + 1
    items[ctx.idx] = { ...item, tries }
    // hint: after two misses the beat slots are shown (one per fidel)
    return ok({ ...ctx, items, streak: 0, hint: tries >= HINT_AFTER ? 'slots' : null, missed: addU(ctx.missed, item.word), last: { outcome: Outcome.WRONG, item, n: payload.n, log } })
  }

  if (type !== BeatEvent.TAP) return rej(ctx)

  // ── L2: which beat said it ──
  if (ctx.kind === Kind.WHICH) {
    const key = item.keys[payload.pos]
    if (key == null) return rej(ctx)
    const right = sameSound(key, item.ask, pack)
    const first = item.tries === 0
    const log = first ? { heard: item.ask, picked: key } : null
    if (right) {
      const streak = first ? ctx.streak + 1 : 0
      return ok(advance(ctx, items, {
        streak, bestStreak: Math.max(ctx.bestStreak, streak), scored: ctx.scored + 1, firstTry: ctx.firstTry + (first ? 1 : 0),
        mastered: first && !ctx.missed.includes(item.ask) ? addU(ctx.mastered, item.ask) : ctx.mastered,
        last: { outcome: Outcome.RIGHT, item, pos: payload.pos, log, first, wordDone: ctx.items[ctx.idx + 1]?.word !== item.word },
      }))
    }
    const tries = item.tries + 1
    items[ctx.idx] = { ...item, tries }
    return ok({ ...ctx, items, streak: 0, hint: tries >= HINT_AFTER ? item.pos : null, missed: addU(ctx.missed, item.ask), mastered: ctx.mastered.filter((k) => k !== item.ask), last: { outcome: Outcome.WRONG, item, pos: payload.pos, log } })
  }

  // ── L3: the missing beat ──
  if (ctx.kind === Kind.MISSING) {
    if (!item.options.includes(payload.key)) return rej(ctx)
    const answer = item.keys[item.pos]
    const right = sameSound(payload.key, answer, pack)
    const first = item.tries === 0
    const log = first ? { heard: answer, picked: payload.key } : null
    if (right) {
      const streak = first ? ctx.streak + 1 : 0
      return ok(advance(ctx, items, {
        streak, bestStreak: Math.max(ctx.bestStreak, streak), scored: ctx.scored + 1, firstTry: ctx.firstTry + (first ? 1 : 0),
        mastered: first && !ctx.missed.includes(answer) ? addU(ctx.mastered, answer) : ctx.mastered,
        last: { outcome: Outcome.WORD_DONE, item, key: payload.key, log, first },
      }))
    }
    const tries = item.tries + 1
    items[ctx.idx] = { ...item, tries }
    return ok({ ...ctx, items, streak: 0, hint: tries >= HINT_AFTER ? answer : null, missed: addU(ctx.missed, answer), mastered: ctx.mastered.filter((k) => k !== answer), last: { outcome: Outcome.WRONG, item, key: payload.key, log } })
  }

  // ── L4: spell it on the drum ──
  const tile = item.tray.find((x) => x.id === payload.trayId)
  if (!tile || item.used.includes(tile.id)) return rej(ctx)
  const want = item.keys[item.placed]
  const right = sameSound(tile.key, want, pack)
  const first = item.posTries[item.placed] === 0
  const log = first ? { heard: want, picked: tile.key } : null
  if (right) {
    const placed = item.placed + 1
    const done = placed >= item.keys.length
    const next = { ...item, placed, used: [...item.used, tile.id] }
    items[ctx.idx] = next
    const streak = first ? ctx.streak + 1 : 0
    const base = {
      streak, bestStreak: Math.max(ctx.bestStreak, streak), scored: ctx.scored + 1, firstTry: ctx.firstTry + (first ? 1 : 0),
      mastered: first && !ctx.missed.includes(want) ? addU(ctx.mastered, want) : ctx.mastered,
      last: { outcome: done ? Outcome.WORD_DONE : Outcome.RIGHT, item: next, key: tile.key, log, first },
    }
    return ok(done ? advance(ctx, items, base) : { ...ctx, ...base, items, hint: null })
  }
  const posTries = item.posTries.map((n, i) => (i === item.placed ? n + 1 : n))
  items[ctx.idx] = { ...item, posTries, tries: item.tries + 1 }
  const hintTile = posTries[item.placed] >= HINT_AFTER ? item.tray.find((x) => !item.used.includes(x.id) && sameSound(x.key, want, pack))?.id : null
  return ok({ ...ctx, items, streak: 0, hint: hintTile || null, missed: addU(ctx.missed, want), mastered: ctx.mastered.filter((k) => k !== want), last: { outcome: Outcome.WRONG, item: items[ctx.idx], key: tile.key, log } })
}

/** Round summary. L1 reports words; L2-L4 letters. Pure. */
export function beatsSummary(ctx) {
  const accuracy = ctx.scored ? ctx.firstTry / ctx.scored : 0
  const mastered = ctx.mastered.filter((k) => !ctx.missed.includes(k))
  return {
    kind: ctx.kind, mastered, practice: [...ctx.missed], missed: [...ctx.missed],
    accuracy, stars: starsFor(accuracy), passed: ctx.phase === Phase.WIN && accuracy >= UNLOCK_ACCURACY, bestStreak: ctx.bestStreak,
  }
}

/** Highest level the pool can fill, levels in order (0 = none): each needs
    3+ distinct words it can use. */
export function maxPlayableLevel(stock, ids, heardIds, pool, pack = ACTIVE_PACK) {
  const byId = new Map(stock.map((w) => [w.id, w]))
  const inPool = new Set(pool)
  const distinct = (list) => new Set(list.map((w) => w.keys.map((k) => soundKeyOf(k, pack)).join('|'))).size
  const heard = heardIds.map((id) => byId.get(id)).filter(Boolean)
  const need = [
    heard,
    heard.filter((w) => w.keys.some((k) => inPool.has(k))),
    heard.filter((w) => w.keys.some((k) => inPool.has(k) && siblingsOf(k, pool, [], pack).length > 0)),
    ids.map((id) => byId.get(id)).filter(Boolean),
  ]
  let best = 0
  for (const list of need) {
    if (distinct(list) < 3) break
    best += 1
  }
  return best
}

export { BEATS_KEY }
export const loadBeats = () => beatsStore.load()
export const saveBeats = (state) => beatsStore.save(state)
export const applyRound = (state, level, summary) => applyRoundShared(state, level, summary, MAX_LEVEL)
