/* ============================================================================
   FIDEL MEMORY MATCH — pure core
   ----------------------------------------------------------------------------
   Classic concentration: a shuffled grid of face-down cards, two of each
   letter. The child flips two; each flip speaks its letter; a matching pair
   locks face-up, a mismatch flips back. Clear the board to win.

   Pairs are always the SAME letter (same glyph), so there is no twin
   ambiguity: ha never pairs with hha. A wrong flip is never punished - the
   pair simply turns back and can be tried again.

   PURE + SEEDED: the board is a pure function of (level, seed, pool); the
   child's flips arrive as FLIP events. The mismatch turn-back is a plain
   RESOLVE event, so there is no clock in the core - the renderer schedules
   the reveal delay and then dispatches RESOLVE. Tests headless.
   ========================================================================== */
import { rngShuffle } from './platform/rng'

export const Phase = Object.freeze({ PLAY: 'PLAY', WIN: 'WIN' })
export const MatchEvent = Object.freeze({ FLIP: 'FLIP', RESOLVE: 'RESOLVE', RESET: 'RESET' })

/** Board sizes. Fewer known letters -> a gentler board (see levelForCount). */
export const MATCH_CONFIGS = Object.freeze({
  easy: { pairs: 4 },
  med: { pairs: 6 },
  hard: { pairs: 8 },
})

/** How many letters the child knows -> which board they get. */
export function levelForCount(n) {
  if (n >= 8) return 'hard'
  if (n >= 6) return 'med'
  return 'easy'
}

/** Build a shuffled board of `pairs*2` cards from distinct pool keys (x2). */
export function initMatch(level, seed, pool) {
  const cfg = MATCH_CONFIGS[level] || MATCH_CONFIGS.easy
  const s0 = (seed >>> 0) | 1
  // Pick the pair keys deterministically: shuffle the pool, take the first
  // `pairs` distinct keys (capped by how many the pool can supply).
  const [shuffledPool, s1] = rngShuffle([...new Set(pool)], s0)
  const pairs = Math.max(1, Math.min(cfg.pairs, shuffledPool.length))
  const chosen = shuffledPool.slice(0, pairs)
  const deck = chosen.flatMap((key, i) => [
    { id: i * 2, key, faceUp: false, matched: false },
    { id: i * 2 + 1, key, faceUp: false, matched: false },
  ])
  const [cards, rngState] = rngShuffle(deck, s1)
  return { level, seed, pool, cards, flipped: [], matches: 0, pairs, moves: 0, phase: Phase.PLAY, rngState }
}

const rej = (ctx) => ({ next: ctx, accepted: false })
const ok = (next) => ({ next, accepted: true })

const cardById = (ctx, id) => ctx.cards.find((c) => c.id === id)

/** Pure transition. FLIP turns a card up; a matched pair locks, a mismatch
    waits for the renderer's RESOLVE to turn both back. */
export function matchTransition(ctx, event) {
  const { type, payload = {} } = event

  if (type === MatchEvent.RESET) {
    return ok(initMatch(ctx.level, (ctx.seed * 1664525 + 1013904223) >>> 0, ctx.pool))
  }
  if (ctx.phase !== Phase.PLAY) return rej(ctx)

  if (type === MatchEvent.RESOLVE) {
    // Only valid with two mismatched cards showing (matched pairs cleared
    // `flipped` at match time, so they never reach here).
    if (ctx.flipped.length !== 2) return rej(ctx)
    const showing = new Set(ctx.flipped)
    const cards = ctx.cards.map((c) => (showing.has(c.id) ? { ...c, faceUp: false } : c))
    return ok({ ...ctx, cards, flipped: [] })
  }

  if (type !== MatchEvent.FLIP) return rej(ctx)
  if (ctx.flipped.length >= 2) return rej(ctx) // awaiting a resolve
  const card = cardById(ctx, payload.id)
  if (!card || card.matched || card.faceUp) return rej(ctx)

  const cards = ctx.cards.map((c) => (c.id === card.id ? { ...c, faceUp: true } : c))
  const flipped = [...ctx.flipped, card.id]

  if (flipped.length < 2) return ok({ ...ctx, cards, flipped })

  // Second of a pair turned up: resolve the match/mismatch now.
  const moves = ctx.moves + 1
  const first = cardById(ctx, flipped[0])
  if (first && first.key === card.key) {
    const set = new Set(flipped)
    const locked = cards.map((c) => (set.has(c.id) ? { ...c, matched: true } : c))
    const matches = ctx.matches + 1
    return ok({ ...ctx, cards: locked, flipped: [], matches, moves, phase: matches >= ctx.pairs ? Phase.WIN : Phase.PLAY })
  }
  // Mismatch: leave both up; renderer dispatches RESOLVE after a reveal.
  return ok({ ...ctx, cards, flipped, moves })
}
