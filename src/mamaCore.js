/* ============================================================================
   ማማ (Tower) — pure round
   ----------------------------------------------------------------------------
   One fidel brick falls at a time. The child puts it on the tower (the word
   grows from the bottom, one letter at a time) or in the bin. A lookalike
   vowel-order sibling on the tower bounces off, with no score and no game
   over. The letter the word actually needs, dropped in the bin, is spat back
   and keeps falling. Decoys are never another letter of the answer.

   Seeded. No clock, no Math.random. The fall timer and the idle nap live in
   the screen.
   ========================================================================== */
import coverage from '../public/audio/fidel/manifest.json'
import { packWordList } from './brickWordsCore'
import { brickPicOf } from './brickPictures'
import { ALL_FORMS, INDEXES } from './platform/ethiopic'
import { rngNext, rngShuffle } from './platform/rng'

export const CLIPS = new Set(coverage.coverage)
export const MAMA_PIGMENTS = Object.freeze(['#a8463d', '#c0983f', '#40608c', '#57854e'])

/** The four-letter words that already have a picture and a recording. */
export const L3_GEEZ = Object.freeze(['አንበሳ', 'ሚስማር', 'መስቀል', 'ቸኮሌት', 'ቢራቢሮ', 'ከረሜላ', 'ጽጌረዳ'])

export const LEVELS = Object.freeze({
  1: { id: 1, len: 2, glow: true, speed: 'slow', hearOnly: false },
  2: { id: 2, len: 3, glow: false, speed: 'mid', hearOnly: false },
  3: { id: 3, len: 4, glow: false, speed: 'fast', hearOnly: true },
})

export const SPEEDS = Object.freeze(['slow', 'mid', 'fast'])
/** How long a brick takes to drift down, once the child has chosen a speed. */
export const SPEED_MS = Object.freeze({ slow: 9000, mid: 6000, fast: 3800 })
/** No touch for this long and the fall freezes. */
export const IDLE_MS = 6000

const clipFor = (latin, packId, clips) => {
  const ti = `words/${latin}-ti`
  const base = `words/${latin}`
  if (packId === 'ti' && clips.has(ti)) return ti
  if (clips.has(base)) return base
  if (clips.has(ti)) return ti
  return null
}

function decorate(w, packId, clips) {
  if (!w || w.noAudio || !w.geez || !w.latin) return null
  const chars = Array.from(w.geez)
  if (chars.length < 2 || chars.length > 4) return null
  if (!chars.every((ch) => INDEXES.byChar.has(ch))) return null
  const pic = brickPicOf(w.geez)
  if (!pic) return null
  const clip = clipFor(w.latin, packId, clips)
  if (!clip) return null
  return {
    geez: w.geez,
    latin: w.latin,
    pic,
    len: chars.length,
    clip,
    letters: chars.map((ch) => ({ char: ch, key: INDEXES.byChar.get(ch).audioKey })),
  }
}

function uniq(words) {
  const seen = new Set()
  const out = []
  for (const w of words) {
    if (!w || seen.has(w.geez)) continue
    seen.add(w.geez)
    out.push(w)
  }
  return out
}

/** Words of one pack that have a picture and a recording, grouped by length.
    Level 3 stays the seven shared four-letter words. A length with nothing
    of its own is filled from the shared (Amharic) list. */
export function mamaPools(packId = 'am', clips = CLIPS) {
  const own = uniq(packWordList(packId).map((w) => decorate(w, packId, clips)))
  const shared = uniq(packWordList('am').map((w) => decorate(w, 'am', clips)))
  const byLen = (list, len) => list.filter((w) => w.len === len && (len !== 4 || L3_GEEZ.includes(w.geez)))
  const pools = { 1: [], 2: [], 3: [] }
  for (const [id, level] of Object.entries(LEVELS)) {
    const mine = byLen(own, level.len)
    pools[id] = mine.length ? mine : byLen(shared, level.len)
  }
  return pools
}

export function mamaWordCount(packId = 'am', clips = CLIPS) {
  const pools = mamaPools(packId, clips)
  return pools[1].length + pools[2].length + pools[3].length
}

/** Nearest other orders of the same family, skipping the answer letters. */
export function nearestSiblings(char, avoid = [], n = 6) {
  const form = INDEXES.byChar.get(char)
  if (!form) return []
  const skip = new Set([char, ...avoid])
  return ALL_FORMS
    .filter((f) => f.familyId === form.familyId && !skip.has(f.char))
    .sort((a, b) => Math.abs(a.order - form.order) - Math.abs(b.order - form.order) || a.order - b.order)
    .slice(0, n)
    .map((f) => f.char)
}

function decoyCount(levelId, rng) {
  if (levelId === 1) return [1, rng]
  if (levelId === 3) return [2, rng]
  const [u, next] = rngNext(rng)
  return [u < 0.5 ? 1 : 2, next]
}

function siblingBrick(need, letters, rng) {
  const pool = nearestSiblings(need.char, letters.map((l) => l.char))
  if (!pool.length) return null
  const [u, next] = rngNext(rng)
  const ch = pool[Math.floor(u * pool.length)]
  const form = INDEXES.byChar.get(ch)
  return { brick: { char: ch, key: form.audioKey, role: 'decoy' }, rng: next }
}

function deal(state) {
  if (state.placed >= state.letters.length) {
    return { ...state, brick: null, phase: 'win', outcome: 'win' }
  }
  const need = state.letters[state.placed]
  if (state.decoysLeft > 0) {
    const picked = siblingBrick(need, state.letters, state.rng)
    if (picked) {
      return { ...state, brick: picked.brick, rng: picked.rng, decoysLeft: state.decoysLeft - 1, outcome: state.outcome ?? null }
    }
  }
  return { ...state, brick: { char: need.char, key: need.key, role: 'need' }, decoysLeft: 0, outcome: state.outcome ?? null }
}

export function initRound(levelId, seed, pool) {
  const level = LEVELS[levelId]
  const words = (pool || []).filter((w) => w && w.len === level.len)
  if (!words.length) return null
  const s0 = (seed >>> 0) || 1
  const [order, s1] = rngShuffle(words, s0)
  const word = order[0]
  const [decoysLeft, rng] = decoyCount(levelId, s1)
  return deal({
    level: levelId,
    word,
    letters: word.letters,
    placed: 0,
    brick: null,
    fx: null,
    bite: null,
    decoysLeft,
    phase: 'play',
    outcome: null,
    rng,
    seed: s0,
  })
}

function nextSlot(state, outcome) {
  const placed = state.placed + 1
  if (placed >= state.letters.length) {
    return { ...state, placed, brick: null, fx: null, bite: null, phase: 'win', outcome: 'win' }
  }
  const [decoysLeft, rng] = decoyCount(state.level, state.rng)
  return deal({ ...state, placed, decoysLeft, rng, fx: null, bite: null, outcome })
}

/** Drop the falling brick on the tower or in the bin. `settle` lets the next
    brick fall after a bounce or a chomp has been shown. */
export function mamaTransition(state, type) {
  if (!state || state.phase !== 'play') return { state, accepted: false }
  if (type === 'settle') {
    if (state.outcome !== 'bounce' && state.outcome !== 'chomp') return { state, accepted: false }
    return { state: deal({ ...state, fx: null, bite: null, outcome: null }), accepted: true }
  }
  if (!state.brick) return { state, accepted: false }
  const brick = state.brick
  if (type === 'tower') {
    if (brick.role === 'need') return { state: nextSlot({ ...state, fx: null, bite: null }, 'place'), accepted: true }
    return { state: { ...state, brick: null, fx: brick, bite: null, outcome: 'bounce' }, accepted: true }
  }
  if (type === 'bin') {
    if (brick.role === 'need') return { state: { ...state, outcome: 'spit', fx: brick, bite: null }, accepted: true }
    return { state: { ...state, brick: null, fx: null, bite: brick, outcome: 'chomp' }, accepted: true }
  }
  return { state, accepted: false }
}

function clearDecoy(state) {
  let guard = 0
  while (state && state.phase === 'play' && state.brick?.role === 'decoy' && guard < 6) {
    state = mamaTransition(state, 'bin').state
    state = mamaTransition(state, 'settle').state
    guard += 1
  }
  return state
}

/** A round stopped on a chosen frame, for screenshots and tests. Real states. */
export function previewRound(scene, seed, pools) {
  if (scene === 'pick' || scene === 'city') return null
  const levelId = scene === 'win' ? 3 : 1
  let state = initRound(levelId, seed, pools[levelId])
  if (!state) return null
  const placeNeed = () => {
    state = clearDecoy(state)
    if (state?.brick?.role === 'need') state = mamaTransition(state, 'tower').state
  }
  placeNeed()
  if (scene === 'play') {
    state = clearDecoy(state)
    return { ...state, outcome: null, fx: null, bite: null }
  }
  if (scene === 'miss') {
    const need = state.letters[state.placed]
    const sibs = nearestSiblings(need.char, state.letters.map((l) => l.char), 2)
    const decoy = { char: sibs[0], key: INDEXES.byChar.get(sibs[0]).audioKey, role: 'decoy' }
    const bounced = mamaTransition({ ...state, brick: decoy, decoysLeft: 0 }, 'tower').state
    const biteChar = sibs[1] || sibs[0]
    return { ...bounced, fx: decoy, bite: { char: biteChar, role: 'decoy' }, brick: null, outcome: 'bounce' }
  }
  let guard = 0
  while (state?.phase !== 'win' && guard < 16) {
    placeNeed()
    guard += 1
  }
  return state
}

export function speedFor(saved, levelId) {
  return SPEEDS.includes(saved) ? saved : LEVELS[levelId].speed
}
