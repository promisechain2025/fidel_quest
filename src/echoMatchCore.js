/* ============================================================================
   ECHO MATCH — pure core (replaces the old same-glyph Memory Match)
   ----------------------------------------------------------------------------
   Concentration where half the cards only TALK. Every pair is one VOICE card
   (flipping it plays a letter clip; it shows a speaker, never the glyph) and
   one LETTER card (the glyph, silent). A voice + the letter it says lock
   face-up; anything else turns back. The old Match paired two identical
   glyphs, so a child who knew no sounds could win on shape alone; here every
   pair is a sound -> symbol recall.

   LEVELS (unlocked on ACCURACY, not completion - see UNLOCK_ACCURACY):
     L1  4 pairs, first-order letters. Voice cards carry a faint ghost of
         their letter (the visual hint) and backs show which kind they are.
     L2  6 pairs, first-order letters. Voice-only: no ghost.
     L3  6 pairs, any vowel order, unmarked backs, and a DECOY FAMILY: up to
         three orders of one family on the board (ለ / ሉ / ሊ), so the child has
         to hear the vowel, not just the consonant.
     L4  8 pairs, two decoy families, EXPERT: a time limit (TIMEUP ends the
         round) and the streak matters for the stars.

   INFORMED vs BLIND attempts. In a memory game the first flips are
   exploration: pairing a voice with a letter whose partner the child has
   never SEEN is a blind guess, not a reading mistake. A wrong attempt counts
   as a MISS only when the right letter card (for the flipped voice) had
   already been revealed - the child had the information and chose another
   letter. Only informed attempts feed accuracy, the adaptive re-deal and the
   learning ledger, so the numbers Grown-ups see measure sound knowledge.

   ADAPTIVE RE-DEAL. A letter missed this round becomes DUE for the next
   REDEAL_ROUNDS rounds: dealt first (sound safety still applies), its due
   count dropping by one each round it is dealt and matched cleanly. See
   nextDue / loadEcho / saveEchoRound.

   SAME-SOUND SAFETY: a board never holds two letters the child cannot tell
   apart by ear in the active pack (declared twins, audio aliases such as
   Amharic ኸ <- ከ, order remaps such as Amharic ሀ voiced as ሃ) - see
   platform/sameSound.js. The match rule also compares by sound.

   PURE + SEEDED: the board is a pure function of (level, seed, keys, due,
   pack); flips arrive as FLIP events; the mismatch turn-back is a RESOLVE and
   the expert clock a TIMEUP, both dispatched by the renderer. No clock here.
   Every accepted FLIP leaves a `last` outcome the renderer turns into sound,
   animation and ledger writes. Tests headless.
   ========================================================================== */
import { rngShuffle } from './platform/rng'
import { ACTIVE_PACK } from './platform/ethiopic'
import { sameSound, soundKeyOf } from './platform/sameSound'
import { UNLOCK_ACCURACY, REDEAL_ROUNDS, starsFor, nextDue, dueList, applyRound as applyRoundShared } from './platform/roundProgress'
import { ECHO_KEY, echoStore } from './platform/gameStores'
export { exampleWord } from './platform/exampleWord'
export { UNLOCK_ACCURACY, REDEAL_ROUNDS, nextDue, dueList }

export const Phase = Object.freeze({ PLAY: 'PLAY', WIN: 'WIN', TIMEUP: 'TIMEUP' })
export const MatchEvent = Object.freeze({ FLIP: 'FLIP', RESOLVE: 'RESOLVE', TIMEUP: 'TIMEUP', RESET: 'RESET' })
export const Face = Object.freeze({ VOICE: 'voice', LETTER: 'letter' })
export const Outcome = Object.freeze({ MATCH: 'match', MISS: 'miss', BLIND: 'blind', SAME_KIND: 'same-kind' })

export const ECHO_LEVELS = Object.freeze({
  1: { pairs: 4, allOrders: false, decoyFamilies: 0, hint: true, markedBacks: true, seconds: 0 },
  2: { pairs: 6, allOrders: false, decoyFamilies: 0, hint: false, markedBacks: true, seconds: 0 },
  3: { pairs: 6, allOrders: true, decoyFamilies: 1, hint: false, markedBacks: false, seconds: 0 },
  4: { pairs: 8, allOrders: true, decoyFamilies: 2, hint: false, markedBacks: false, seconds: 120 },
})
export const MAX_LEVEL = 4
/** Forms per decoy family (ለ ሉ ሊ). */
const DECOY_SIZE = 3

const orderOf = (key) => Number(/-(\d+)$/.exec(key)?.[1] || 0)
const familyOf = (key) => /^([a-z]+)-/.exec(key)?.[1] || key

/** Choose the board's letters: due letters first, then decoy families, then
    fill - never two that sound alike. `pool` is already shuffled. Pure. */
export function pickKeys(pool, n, { decoyFamilies = 0, due = [], pack = ACTIVE_PACK } = {}) {
  const chosen = []
  const fresh = (k) => !chosen.some((c) => sameSound(c, k, pack))
  const take = (k) => { if (chosen.length < n && pool.includes(k) && !chosen.includes(k) && fresh(k)) chosen.push(k) }

  // 1. Spaced re-exposure: letters missed in recent rounds come back first
  //    (at most half the board, so a round is never all trouble letters).
  const dueCap = Math.max(1, Math.floor(n / 2))
  for (const k of due) if (chosen.length < dueCap) take(k)

  // 2. Decoy families: several orders of one family, so the vowel decides.
  if (decoyFamilies > 0) {
    const byFam = new Map()
    for (const k of pool) {
      const f = familyOf(k)
      if (!byFam.has(f)) byFam.set(f, [])
      byFam.get(f).push(k)
    }
    // Prefer the families of due letters, then pool order.
    const fams = [...new Set([...chosen.map(familyOf), ...byFam.keys()])].filter((f) => byFam.has(f))
    let made = 0
    for (const f of fams) {
      if (made >= decoyFamilies || chosen.length + 2 > n) break
      for (const k of byFam.get(f)) {
        if (chosen.filter((c) => familyOf(c) === f).length >= DECOY_SIZE) break
        take(k)
      }
      if (chosen.filter((k) => familyOf(k) === f).length >= 2) made++
    }
  }

  // 3. Fill.
  for (const k of pool) take(k)
  return chosen
}

/**
 * Build a board.
 *  keys - letter audioKeys the child may meet (the renderer passes only ones
 *         with a real clip)
 *  due  - keys to re-deal first (adaptive), most urgent first
 */
export function initEcho(level, seed, keys, due = [], pack = ACTIVE_PACK) {
  const lv = ECHO_LEVELS[level] ? level : 1
  const cfg = ECHO_LEVELS[lv]
  const all = [...new Set(keys)]
  const base = all.filter((k) => cfg.allOrders || orderOf(k) === 1)
  const [pool, s1] = rngShuffle(base.length ? base : all, (seed >>> 0) | 1)
  const dueHere = due.filter((k) => pool.includes(k))
  const chosen = pickKeys(pool, cfg.pairs, { decoyFamilies: cfg.decoyFamilies, due: dueHere, pack })
  const deck = chosen.flatMap((key, pair) => [
    { id: pair * 2, pair, key, face: Face.VOICE, faceUp: false, matched: false, seen: false },
    { id: pair * 2 + 1, pair, key, face: Face.LETTER, faceUp: false, matched: false, seen: false },
  ])
  const [cards, rngState] = rngShuffle(deck, s1)
  return {
    level: lv, seed, keys: all, due, pack, cards, rngState,
    flipped: [], pairs: chosen.length, matches: 0, moves: 0,
    missed: [], // keys with an informed miss this round
    logged: [], // keys whose first informed attempt was already scored
    streak: 0, bestStreak: 0,
    last: null,
    phase: Phase.PLAY,
  }
}

/** Do two face-up cards form a pair? One letter card + a voice that SOUNDS
    like it (sound, not key, so no fair answer can be marked wrong). */
export function isPair(a, b, pack = ACTIVE_PACK) {
  if (!a || !b || a.id === b.id) return false
  if ((a.face === Face.LETTER) === (b.face === Face.LETTER)) return false
  const letter = a.face === Face.LETTER ? a : b
  const voice = letter === a ? b : a
  return sameSound(voice.key, letter.key, pack)
}

const rej = (ctx) => ({ next: ctx, accepted: false })
const ok = (next) => ({ next, accepted: true })
const cardById = (ctx, id) => ctx.cards.find((c) => c.id === id)

/** Pure transition. */
export function echoTransition(ctx, event) {
  const { type, payload = {} } = event

  if (type === MatchEvent.RESET) {
    return ok(initEcho(payload.level || ctx.level, payload.seed ?? ((ctx.seed * 1664525 + 1013904223) >>> 0), ctx.keys, payload.due || ctx.due, ctx.pack))
  }
  if (ctx.phase !== Phase.PLAY) return rej(ctx)

  if (type === MatchEvent.TIMEUP) {
    if (!ECHO_LEVELS[ctx.level].seconds) return rej(ctx)
    const cards = ctx.cards.map((c) => (c.matched ? c : { ...c, faceUp: false }))
    return ok({ ...ctx, cards, flipped: [], phase: Phase.TIMEUP, last: null })
  }

  if (type === MatchEvent.RESOLVE) {
    if (ctx.flipped.length !== 2) return rej(ctx)
    const showing = new Set(ctx.flipped)
    const cards = ctx.cards.map((c) => (showing.has(c.id) ? { ...c, faceUp: false } : c))
    return ok({ ...ctx, cards, flipped: [], last: null })
  }

  if (type !== MatchEvent.FLIP) return rej(ctx)
  if (ctx.flipped.length >= 2) return rej(ctx)
  const card = cardById(ctx, payload.id)
  if (!card || card.matched || card.faceUp) return rej(ctx)

  const cards = ctx.cards.map((c) => (c.id === card.id ? { ...c, faceUp: true, seen: true } : c))
  const flipped = [...ctx.flipped, card.id]
  if (flipped.length < 2) return ok({ ...ctx, cards, flipped, last: null })

  const moves = ctx.moves + 1
  const first = cardById(ctx, flipped[0])
  const sameKind = (first.face === Face.LETTER) === (card.face === Face.LETTER)
  const voice = sameKind ? null : first.face === Face.VOICE ? first : card
  const letter = sameKind ? null : first.face === Face.LETTER ? first : card

  if (!sameKind && isPair(voice, letter, ctx.pack)) {
    const set = new Set(flipped)
    const locked = cards.map((c) => (set.has(c.id) ? { ...c, matched: true } : c))
    const matches = ctx.matches + 1
    const firstTry = !ctx.missed.includes(voice.key)
    // Ledger: score the letter once, on its first informed attempt. A clean
    // match is always informed (it is the answer).
    const log = ctx.logged.includes(voice.key) ? null : { heard: voice.key, picked: letter.key }
    const streak = firstTry ? ctx.streak + 1 : 0
    return ok({
      ...ctx, cards: locked, flipped: [], matches, moves,
      logged: log ? [...ctx.logged, voice.key] : ctx.logged,
      streak, bestStreak: Math.max(ctx.bestStreak, streak),
      last: { outcome: Outcome.MATCH, voiceKey: voice.key, letterKey: letter.key, firstTry, log },
      phase: matches >= ctx.pairs ? Phase.WIN : Phase.PLAY,
    })
  }

  if (sameKind) {
    return ok({ ...ctx, cards, flipped, moves, last: { outcome: Outcome.SAME_KIND, keys: [first.key, card.key] } })
  }

  // Voice + wrong letter. Informed only if the voice's real letter card had
  // been revealed before this attempt.
  const partner = ctx.cards.find((c) => c.face === Face.LETTER && c.pair === voice.pair)
  const informed = !!partner?.seen
  if (!informed) {
    return ok({ ...ctx, cards, flipped, moves, last: { outcome: Outcome.BLIND, voiceKey: voice.key, letterKey: letter.key } })
  }
  const log = ctx.logged.includes(voice.key) ? null : { heard: voice.key, picked: letter.key }
  return ok({
    ...ctx, cards, flipped, moves,
    missed: ctx.missed.includes(voice.key) ? ctx.missed : [...ctx.missed, voice.key],
    logged: log ? [...ctx.logged, voice.key] : ctx.logged,
    streak: 0,
    last: { outcome: Outcome.MISS, voiceKey: voice.key, letterKey: letter.key, log },
  })
}

/** Round summary: first-try accuracy over the pairs dealt (unmatched pairs
    at TIMEUP count as not mastered), mastered / to-practice letters, and the
    star rating (accuracy, plus the streak on the expert level). Pure. */
export function roundSummary(ctx) {
  const dealt = [...new Set(ctx.cards.map((c) => c.key))]
  const matched = new Set(ctx.cards.filter((c) => c.matched).map((c) => c.key))
  const mastered = dealt.filter((k) => matched.has(k) && !ctx.missed.includes(k))
  const practice = dealt.filter((k) => !mastered.includes(k))
  const accuracy = dealt.length ? mastered.length / dealt.length : 0
  const expert = !!ECHO_LEVELS[ctx.level]?.seconds
  let stars = starsFor(accuracy)
  if (expert && (ctx.phase !== Phase.WIN || ctx.bestStreak < Math.ceil(ctx.pairs / 2))) stars = Math.min(stars, 2)
  const passed = ctx.phase === Phase.WIN && accuracy >= UNLOCK_ACCURACY
  const missed = dealt.filter((k) => ctx.missed.includes(k))
  return { dealt, mastered, practice, missed, accuracy, stars, passed, bestStreak: ctx.bestStreak }
}

/** Highest level the pool can honestly fill (L1/L2 count first-order
    sounds; L3/L4 any order). Never below 1. */
export function maxPlayableLevel(keys, pack = ACTIVE_PACK) {
  const sounds = (ks) => new Set(ks.map((k) => soundKeyOf(k, pack))).size
  const first = sounds(keys.filter((k) => orderOf(k) === 1))
  const all = sounds(keys)
  let best = 1
  for (let lv = 2; lv <= MAX_LEVEL; lv++) {
    const cfg = ECHO_LEVELS[lv]
    if ((cfg.allOrders ? all : first) >= cfg.pairs) best = lv
  }
  return best
}

/* ── per-child progress: local only, never sent (platform/roundProgress) ── */
export { ECHO_KEY }
const store = echoStore
export const loadEcho = () => store.load()
export const saveEcho = (state) => store.save(state)
/** Fold a finished round in: the next level opens only when it PASSED. */
export const applyRound = (state, level, summary) => applyRoundShared(state, level, summary, MAX_LEVEL)
