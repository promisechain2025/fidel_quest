/* ============================================================================
   WORD STEPS — the "Build it, Say it, Prove it" machine (pure, seeded)
   ----------------------------------------------------------------------------
   Runs right after a letter family is mastered, over the words that family
   just unlocked (see platform/words.js). Per word:

     BUILD  the word's letters wait shuffled in a tray; the child taps them
            in reading order and the word assembles - real blending
     SAY    the finished word shows big with its picture; an echo window
            invites the child to say it out loud (no microphone)

   then one PROVE round per word, alternating by seed:

     read     the written word -> pick its picture (true reading)
     rebuild  the picture -> build the word again from a fresh shuffle

   Ill-timed or wrong events are rejected, never absorbed; misses are
   reported so the shell can feed the trouble ledger. Everything is a pure
   function of (words, seed) via the shared threaded PRNG.
   ========================================================================== */

import { rngNext, rngShuffle } from './rng'

export const WordPhase = Object.freeze({
  BUILD: 'BUILD',
  SAY: 'SAY',
  PROVE: 'PROVE',
  DONE: 'DONE',
})

const trayFor = (geez, rngState) => {
  const chars = Array.from(geez).map((ch, i) => ({ ch, id: i, used: false }))
  const [tray, next] = rngShuffle(chars, rngState)
  // A fully-sorted shuffle of a 2-3 letter word teaches nothing: nudge a
  // deterministic swap when the shuffle came out in reading order.
  if (tray.length > 1 && tray.every((t, i) => t.id === i)) {
    ;[tray[0], tray[1]] = [tray[1], tray[0]]
  }
  return [tray, next]
}

/** Pick 2 distractor words with pictures distinct from the target's (and
    each other's), seeded. `pool` should be the full word list. */
const pickDistractors = (word, pool, rngState) => {
  let [shuffled, next] = rngShuffle(
    pool.filter((w) => w.latin !== word.latin && w.picture !== word.picture),
    rngState,
  )
  const out = []
  for (const w of shuffled) {
    if (out.length === 2) break
    if (!out.some((o) => o.picture === w.picture)) out.push(w)
  }
  return [out, next]
}

export function wordStepsInitial(words, seed, pool = words) {
  let rngState = (seed | 0) || 1
  let tray
  ;[tray, rngState] = trayFor(words[0].geez, rngState)
  // Prove rounds are precomputed so the whole run is replayable from seed.
  const rounds = words.map((word, i) => {
    if ((seed + i) % 2 === 0) {
      let options
      ;[options, rngState] = pickDistractors(word, pool, rngState)
      let mixed
      ;[mixed, rngState] = rngShuffle([word, ...options], rngState)
      return { type: 'read', word, options: mixed.map((w) => ({ latin: w.latin, picture: w.picture })) }
    }
    let rebuildTray
    ;[rebuildTray, rngState] = trayFor(word.geez, rngState)
    return { type: 'rebuild', word, tray: rebuildTray }
  })
  return {
    words,
    wi: 0,
    phase: WordPhase.BUILD,
    slot: 0,
    tray,
    rounds,
    qi: 0,
    misses: {},
    lastWrong: null,
    rngState,
  }
}

const miss = (ctx, latin) => ({ ...ctx.misses, [latin]: (ctx.misses[latin] || 0) + 1 })

/** Events: {type:'TILE', index} | {type:'SAY_DONE'} | {type:'PICK', latin}.
    Returns { next, advanced, correct, completedWord } - completedWord is the
    word object whose build just finished (the shell voices it). */
export function wordStepsTransition(ctx, ev) {
  const reject = { next: ctx, advanced: false, correct: false, completedWord: null }
  const word = ctx.phase === WordPhase.PROVE ? ctx.rounds[ctx.qi]?.word : ctx.words[ctx.wi]

  if (ctx.phase === WordPhase.BUILD && ev.type === 'TILE') {
    const tile = ctx.tray[ev.index]
    if (!tile || tile.used) return reject
    const expected = Array.from(word.geez)[ctx.slot]
    if (tile.ch !== expected) {
      return { ...reject, next: { ...ctx, misses: miss(ctx, word.latin), lastWrong: ev.index } }
    }
    const tray = ctx.tray.map((t, i) => (i === ev.index ? { ...t, used: true } : t))
    const slot = ctx.slot + 1
    if (slot < Array.from(word.geez).length) {
      return { next: { ...ctx, tray, slot, lastWrong: null }, advanced: true, correct: true, completedWord: null }
    }
    return { next: { ...ctx, tray, slot, lastWrong: null, phase: WordPhase.SAY }, advanced: true, correct: true, completedWord: word }
  }

  if (ctx.phase === WordPhase.SAY && ev.type === 'SAY_DONE') {
    if (ctx.wi + 1 < ctx.words.length) {
      const [tray, rngState] = trayFor(ctx.words[ctx.wi + 1].geez, ctx.rngState)
      return { next: { ...ctx, wi: ctx.wi + 1, phase: WordPhase.BUILD, slot: 0, tray, rngState }, advanced: true, correct: true, completedWord: null }
    }
    const first = ctx.rounds[0]
    return {
      next: { ...ctx, phase: WordPhase.PROVE, qi: 0, slot: 0, tray: first.type === 'rebuild' ? first.tray : [], lastWrong: null },
      advanced: true,
      correct: true,
      completedWord: null,
    }
  }

  if (ctx.phase === WordPhase.PROVE) {
    const round = ctx.rounds[ctx.qi]
    if (!round) return reject
    const advance = (next) => {
      const qi = ctx.qi + 1
      if (qi >= ctx.rounds.length) return { next: { ...next, phase: WordPhase.DONE }, advanced: true, correct: true, completedWord: round.word }
      const upcoming = ctx.rounds[qi]
      return {
        next: { ...next, qi, slot: 0, tray: upcoming.type === 'rebuild' ? upcoming.tray : [], lastWrong: null },
        advanced: true,
        correct: true,
        completedWord: round.word,
      }
    }
    if (round.type === 'read' && ev.type === 'PICK') {
      if (ev.latin !== round.word.latin) {
        return { ...reject, next: { ...ctx, misses: miss(ctx, round.word.latin), lastWrong: ev.latin } }
      }
      return advance({ ...ctx, lastWrong: null })
    }
    if (round.type === 'rebuild' && ev.type === 'TILE') {
      const tile = ctx.tray[ev.index]
      if (!tile || tile.used) return reject
      const expected = Array.from(round.word.geez)[ctx.slot]
      if (tile.ch !== expected) {
        return { ...reject, next: { ...ctx, misses: miss(ctx, round.word.latin), lastWrong: ev.index } }
      }
      const tray = ctx.tray.map((t, i) => (i === ev.index ? { ...t, used: true } : t))
      const slot = ctx.slot + 1
      if (slot < Array.from(round.word.geez).length) {
        return { next: { ...ctx, tray, slot, lastWrong: null }, advanced: true, correct: true, completedWord: null }
      }
      return advance({ ...ctx, tray, slot })
    }
  }
  return reject
}

/* ── practiced-words progress (fq.words.v1, registered in progress.js) ── */

const KEY = 'fq.words.v1'

export function loadWordsPracticed() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY)) || {}
    return raw.practiced && typeof raw.practiced === 'object' ? raw.practiced : {}
  } catch {
    return {}
  }
}

export function markWordsPracticed(latins) {
  try {
    const practiced = loadWordsPracticed()
    for (const l of latins) practiced[l] = true
    localStorage.setItem(KEY, JSON.stringify({ v: 1, practiced }))
  } catch {
    /* session-only */
  }
}
