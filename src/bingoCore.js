/* ============================================================================
   KOKEB'S BINGO — pure core
   ----------------------------------------------------------------------------
   Kokeb calls a letter; the child finds it on their bingo card and daubs it.
   First full line (row / column / diagonal) wins. Audio-first: recognition by
   sound is the whole game, so the caller only ever calls letters that ARE on
   the card - every call is findable, never a dead "not on my card" moment for
   a little one. Tapping a cell that is not the called letter (or is already
   daubed) is REJECTED; the renderer re-cues, never blocks.

   PURE + SEEDED: the card and the entire call order are a pure function of
   (seed, pool). Daubs arrive as DAUB events; no clock. Data-agnostic - it
   holds only opaque cell keys, so any letter set (or script) can drive it.
   ========================================================================== */
import { rngShuffle } from './platform/rng'

export const Phase = Object.freeze({ PLAY: 'PLAY', WIN: 'WIN' })
export const BingoEvent = Object.freeze({ DAUB: 'DAUB', RESET: 'RESET' })

/** All winning lines (row/col/both diagonals) for an n x n board. */
export function linesFor(n) {
  const lines = []
  for (let r = 0; r < n; r++) lines.push(Array.from({ length: n }, (_, c) => r * n + c))
  for (let c = 0; c < n; c++) lines.push(Array.from({ length: n }, (_, r) => r * n + c))
  lines.push(Array.from({ length: n }, (_, i) => i * n + i))
  lines.push(Array.from({ length: n }, (_, i) => i * n + (n - 1 - i)))
  return lines
}

export function initBingo(seed, pool, size = 3) {
  const need = size * size
  let s = (seed >>> 0) | 1
  // distinct cells; if the pool is short, allow repeats so the card still fills
  const uniq = [...new Set(pool)]
  let source = uniq.length >= need ? uniq : pool.length ? Array.from({ length: need }, (_, i) => pool[i % pool.length]) : Array.from({ length: need }, (_, i) => `x${i}`)
  let picked
  ;[picked, s] = rngShuffle(source, s)
  const card = picked.slice(0, need)
  let callOrder
  ;[callOrder, s] = rngShuffle(card.map((_, i) => i), s) // call by cell index (handles repeats)
  return { card, size, marked: card.map(() => false), callOrder, callIdx: 0, phase: Phase.PLAY, winLine: null, seed }
}

const rej = (ctx) => ({ next: ctx, accepted: false })

/** Pure transition. DAUB {index} only lands on the currently called cell. */
export function bingoTransition(ctx, event) {
  const { type, payload = {} } = event
  if (type === BingoEvent.RESET) {
    return { next: initBingo((ctx.seed * 1664525 + 1013904223) >>> 0, ctx.card, ctx.size), accepted: true }
  }
  if (ctx.phase !== Phase.PLAY) return rej(ctx)
  if (type !== BingoEvent.DAUB) return rej(ctx)

  const target = ctx.callOrder[ctx.callIdx]
  const i = payload.index
  if (i !== target || ctx.marked[i]) return rej(ctx) // must daub the called cell

  const marked = ctx.marked.slice()
  marked[i] = true
  const winLine = linesFor(ctx.size).find((ln) => ln.every((c) => marked[c])) || null
  return {
    next: { ...ctx, marked, callIdx: ctx.callIdx + 1, phase: winLine ? Phase.WIN : Phase.PLAY, winLine },
    accepted: true,
    won: !!winLine,
  }
}

/** The letter Kokeb is calling right now (a cell index into card), or null. */
export const currentCall = (ctx) => (ctx.phase === Phase.PLAY ? ctx.callOrder[ctx.callIdx] : null)

/* ----------------------------------------------------------------------------
   CLASS BINGO — teacher-called, many-player variant (no backend).
   The whole class shares one letter POOL (fixed by the game code). The teacher
   is the caller; each kid's device deals its own distinct card as a subset of
   that pool, so no two cards match yet every call can land. Kids self-mark what
   they hear (nothing is shown for a call on the kid's screen) and shout BINGO
   when a line completes; the teacher verifies it against the called list.
   ---------------------------------------------------------------------------- */

/* Winning PATTERNS the teacher can choose. Each resolves to the marked cells
   that satisfy it (for highlight), or null if not yet won. */
export const PATTERNS = Object.freeze(['line', 'diagonal', 'x', 'corners', 'blackout'])

export function patternWin(marked, size, pattern = 'line') {
  const n = size
  const all = (cells) => cells.length > 0 && cells.every((i) => marked[i])
  const rows = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r * n + c))
  const cols = Array.from({ length: n }, (_, c) => Array.from({ length: n }, (_, r) => r * n + c))
  const diag1 = Array.from({ length: n }, (_, i) => i * n + i)
  const diag2 = Array.from({ length: n }, (_, i) => i * n + (n - 1 - i))
  switch (pattern) {
    case 'diagonal': return [diag1, diag2].find(all) || null
    case 'x': return all(diag1) && all(diag2) ? [...new Set([...diag1, ...diag2])] : null
    case 'corners': { const c = [0, n - 1, n * (n - 1), n * n - 1]; return all(c) ? c : null }
    case 'blackout': { const c = marked.map((_, i) => i); return all(c) ? c : null }
    case 'line': default: return [...rows, ...cols, diag1, diag2].find(all) || null
  }
}

/** Deal one kid's card: `need` distinct cells drawn from the shared pool. When
    the pool is smaller than the card it repeats to fill (keeps it playable).
    Carries the winning `pattern` so self-marking knows the rule. */
export function dealCard(pool, seed, size = 3, pattern = 'line') {
  const need = size * size
  const uniq = [...new Set(pool)]
  const source = uniq.length >= need ? uniq : uniq.length ? Array.from({ length: need }, (_, i) => uniq[i % uniq.length]) : Array.from({ length: need }, (_, i) => `x${i}`)
  let picked
  ;[picked] = rngShuffle(source, (seed >>> 0) | 1)
  const card = picked.slice(0, need)
  return { card, size, pattern, marked: card.map(() => false), phase: Phase.PLAY, winLine: null }
}

/** Kid self-marks (toggles) a cell they heard called; completing the chosen
    pattern wins. Free marking is intentional - it mirrors paper bingo, and the
    teacher's called list is the source of truth when a kid shouts BINGO. */
export function toggleMark(state, index) {
  if (index < 0 || index >= state.card.length) return state
  const marked = state.marked.slice()
  marked[index] = !marked[index]
  const winLine = patternWin(marked, state.size, state.pattern || 'line')
  return { ...state, marked, winLine, phase: winLine ? Phase.WIN : Phase.PLAY }
}

/* --- join config: teacher's letter selection + pattern, carried in the code -
   No backend, so the whole game config rides inside the join link/QR. Encoded
   URL-safe so a scan reconstructs the exact same pool + rule on every device. */
export function encodeBingoConfig(cfg) {
  const json = JSON.stringify({ f: (cfg.families || []).slice().sort((a, b) => a - b), p: cfg.pattern || 'line' })
  const b64 = typeof btoa === 'function' ? btoa(json) : Buffer.from(json, 'utf8').toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeBingoConfig(code) {
  if (!code) return null
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/')
    const json = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf8')
    const o = JSON.parse(json)
    if (!Array.isArray(o.f)) return null
    return { families: o.f, pattern: PATTERNS.includes(o.p) ? o.p : 'line' }
  } catch { return null }
}

/** The teacher's caller: a shuffled run through the whole shared pool. */
export function initCaller(pool, seed) {
  const uniq = [...new Set(pool)]
  let order
  ;[order] = rngShuffle(uniq, (seed >>> 0) | 1)
  return { order, idx: 0, called: [] }
}

/** Reveal the next letter to call. Idempotent at the end of the pool. */
export function callNext(caller) {
  if (caller.idx >= caller.order.length) return caller
  const key = caller.order[caller.idx]
  return { ...caller, idx: caller.idx + 1, called: [...caller.called, key] }
}

export const lastCalled = (caller) => (caller.called.length ? caller.called[caller.called.length - 1] : null)
