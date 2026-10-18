import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import {
  initEcho, echoTransition, isPair, pickKeys, roundSummary, nextDue, dueList, applyRound, maxPlayableLevel,
  loadEcho, saveEcho, exampleWord, ECHO_LEVELS, ECHO_KEY, UNLOCK_ACCURACY, REDEAL_ROUNDS, MAX_LEVEL,
  Phase, MatchEvent, Face, Outcome,
} from './echoMatchCore'
import { ALL_FORMS, FIDEL_FAMILIES, ACTIVE_PACK } from './platform/ethiopic'
import { sameSound } from './platform/sameSound'
import { effectiveKey } from './platform/audioEngine'
import { AM_PACK } from './packs/am'
import { TI_PACK } from './packs/ti'

const ALL_KEYS = ALL_FORMS.map((f) => f.audioKey)
const FIRST_10 = FIDEL_FAMILIES.slice(0, 10).map((f) => f.id)
const KEYS_10 = ALL_KEYS.filter((k) => FIRST_10.includes(k.split('-')[0]))

const flip = (ctx, id) => echoTransition(ctx, { type: MatchEvent.FLIP, payload: { id } })
const resolve = (ctx) => echoTransition(ctx, { type: MatchEvent.RESOLVE }).next
const voiceOf = (ctx, pair) => ctx.cards.find((c) => c.pair === pair && c.face === Face.VOICE)
const letterOf = (ctx, pair) => ctx.cards.find((c) => c.pair === pair && c.face === Face.LETTER)

/** Match every pair cleanly. */
function solve(ctx) {
  let cur = ctx
  for (let p = 0; p < ctx.pairs; p++) {
    cur = flip(cur, voiceOf(cur, p).id).next
    cur = flip(cur, letterOf(cur, p).id).next
  }
  return cur
}

describe('Echo Match board', () => {
  it('is deterministic; every pair is one voice card + one letter card of the same key', () => {
    const a = initEcho(2, 42, KEYS_10)
    expect(initEcho(2, 42, KEYS_10)).toEqual(a)
    expect(a.pairs).toBe(ECHO_LEVELS[2].pairs)
    expect(a.cards).toHaveLength(a.pairs * 2)
    for (let p = 0; p < a.pairs; p++) {
      expect(voiceOf(a, p).key).toBe(letterOf(a, p).key)
    }
  })

  it('L1/L2 deal first-order letters only; L3/L4 may deal any order', () => {
    for (let seed = 1; seed < 40; seed++) {
      for (const c of initEcho(1, seed, KEYS_10).cards) expect(c.key).toMatch(/-1$/)
      for (const c of initEcho(2, seed, KEYS_10).cards) expect(c.key).toMatch(/-1$/)
    }
    const orders = new Set()
    for (let seed = 1; seed < 40; seed++) for (const c of initEcho(3, seed, KEYS_10).cards) orders.add(c.key.split('-')[1])
    expect(orders.size).toBeGreaterThan(3)
  })

  it('L3 deals a decoy family (2-3 orders of one family, e.g. ለ ሉ ሊ); L4 two of them', () => {
    for (let seed = 1; seed < 60; seed++) {
      const famCount = (ctx) => {
        const m = {}
        for (const c of ctx.cards.filter((x) => x.face === Face.LETTER)) m[c.key.split('-')[0]] = (m[c.key.split('-')[0]] || 0) + 1
        return Object.values(m).filter((n) => n >= 2).length
      }
      expect(famCount(initEcho(3, seed, KEYS_10))).toBeGreaterThanOrEqual(1)
      expect(famCount(initEcho(4, seed, KEYS_10))).toBeGreaterThanOrEqual(2)
      for (const n of Object.values(initEcho(3, seed, KEYS_10).cards.reduce((m, c) => ({ ...m, [c.key.split('-')[0]]: (m[c.key.split('-')[0]] || 0) + 0.5 }), {}))) {
        expect(n).toBeLessThanOrEqual(3)
      }
    }
  })

  it('only L1 shows the visual hint; L4 is the timed expert level', () => {
    expect(ECHO_LEVELS[1].hint).toBe(true)
    expect([2, 3, 4].every((l) => !ECHO_LEVELS[l].hint)).toBe(true)
    expect(ECHO_LEVELS[4].seconds).toBeGreaterThan(0)
    expect([1, 2, 3].every((l) => !ECHO_LEVELS[l].seconds)).toBe(true)
  })
})

describe('same-sound safety', () => {
  const groups = [['ha-1', 'ha-4', 'hha-1', 'kha-1'], ['se-1', 'sse-1'], ['tse-1', 'ttse-1'], ['a-1', 'ae-1'], ['ke-1', 'khe-1']]
  it('never deals two Amharic letters that share audio (ሀ/ሃ/ሐ/ኀ, ሰ/ሠ, ጸ/ፀ, አ/ዐ, ከ/ኸ)', () => {
    for (let lv = 1; lv <= MAX_LEVEL; lv++) {
      for (let seed = 1; seed < 150; seed++) {
        const keys = [...new Set(initEcho(lv, seed, ALL_KEYS, [], AM_PACK).cards.map((c) => c.key))]
        for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) expect(sameSound(keys[i], keys[j], AM_PACK)).toBe(false)
        for (const g of groups) expect(keys.filter((k) => g.includes(k)).length).toBeLessThanOrEqual(1)
      }
    }
  })

  // The strongest guarantee: no two cards on a board play byte-identical clip
  // files, in either pack (resolved exactly as the audio engine resolves them).
  const AUDIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/audio/fidel')
  const md5 = new Map()
  const clipHash = (key, pack) => {
    let rel = effectiveKey(`letters/${key}`, pack.audioOverride || null)
    if (!fs.existsSync(path.join(AUDIO, `${rel}.mp3`))) rel = effectiveKey(`letters/${key}`, pack.audioOverride?.orderRemap ? { orderRemap: pack.audioOverride.orderRemap } : null)
    const alias = /^letters\/([a-z]+)-(\d+)$/.exec(rel)
    if (alias && pack.audioAlias?.[alias[1]] && !fs.existsSync(path.join(AUDIO, `${rel}.mp3`))) rel = `letters/${pack.audioAlias[alias[1]]}-${alias[2]}`
    const f = path.join(AUDIO, `${rel}.mp3`)
    if (!md5.has(f)) md5.set(f, crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex'))
    return md5.get(f)
  }
  for (const [name, pack] of [['Amharic', AM_PACK], ['Tigrinya', TI_PACK]]) {
    it(`${name}: no board holds two cards with identical audio`, () => {
      const ids = Object.keys(pack.families)
      const keys = ids.flatMap((id) => [1, 2, 3, 4, 5, 6, 7].map((o) => `${id}-${o}`))
      for (let lv = 1; lv <= MAX_LEVEL; lv++) {
        for (let seed = 1; seed < 80; seed++) {
          const board = [...new Set(initEcho(lv, seed, keys, [], pack).cards.map((c) => c.key))]
          const hashes = board.map((k) => clipHash(k, pack))
          expect(new Set(hashes).size).toBe(hashes.length)
        }
      }
    })
  }

  it('the match rule compares by sound', () => {
    const v = { id: 1, face: Face.VOICE, key: 'se-1' }
    expect(isPair(v, { id: 2, face: Face.LETTER, key: 'sse-1' }, AM_PACK)).toBe(true)
    expect(isPair(v, { id: 2, face: Face.LETTER, key: 'le-1' }, AM_PACK)).toBe(false)
    expect(isPair(v, { id: 2, face: Face.VOICE, key: 'se-1' }, AM_PACK)).toBe(false)
  })
})

describe('flips, informed misses and the ledger signal', () => {
  it('a clean match locks, logs a first-try right answer and grows the streak', () => {
    let ctx = initEcho(2, 7, KEYS_10)
    ctx = flip(ctx, voiceOf(ctx, 0).id).next
    const r = flip(ctx, letterOf(ctx, 0).id)
    expect(r.next.last).toMatchObject({ outcome: Outcome.MATCH, firstTry: true, log: { heard: voiceOf(ctx, 0).key, picked: voiceOf(ctx, 0).key } })
    expect(r.next.matches).toBe(1)
    expect(r.next.streak).toBe(1)
  })

  it('a wrong pair whose real letter was never seen is BLIND: not a miss, not logged', () => {
    let ctx = initEcho(2, 7, KEYS_10)
    ctx = flip(ctx, voiceOf(ctx, 0).id).next
    const r = flip(ctx, letterOf(ctx, 1).id)
    expect(r.next.last.outcome).toBe(Outcome.BLIND)
    expect(r.next.missed).toEqual([])
    expect(r.next.logged).toEqual([])
  })

  it('a wrong pair after the real letter WAS seen is a MISS: logged once, streak reset, pair later not first-try', () => {
    let ctx = initEcho(2, 7, KEYS_10)
    const k0 = voiceOf(ctx, 0).key
    // reveal letter 0 while exploring (letter + letter, same-kind)
    ctx = flip(ctx, letterOf(ctx, 0).id).next
    ctx = flip(ctx, letterOf(ctx, 1).id).next
    expect(ctx.last.outcome).toBe(Outcome.SAME_KIND)
    ctx = resolve(ctx)
    // now voice 0 + wrong letter 1 -> informed miss
    ctx = flip(ctx, voiceOf(ctx, 0).id).next
    ctx = flip(ctx, letterOf(ctx, 1).id).next
    expect(ctx.last).toMatchObject({ outcome: Outcome.MISS, voiceKey: k0, log: { heard: k0, picked: letterOf(ctx, 1).key } })
    expect(ctx.missed).toEqual([k0])
    expect(ctx.streak).toBe(0)
    ctx = resolve(ctx)
    // a second miss on the same letter is not logged again
    ctx = flip(ctx, voiceOf(ctx, 0).id).next
    ctx = flip(ctx, letterOf(ctx, 1).id).next
    expect(ctx.last.log).toBe(null)
    ctx = resolve(ctx)
    ctx = flip(ctx, voiceOf(ctx, 0).id).next
    ctx = flip(ctx, letterOf(ctx, 0).id).next
    expect(ctx.last).toMatchObject({ outcome: Outcome.MATCH, firstTry: false, log: null })
  })

  it('rejects flips while two cards are showing, and re-flips of face-up cards', () => {
    let ctx = initEcho(1, 3, KEYS_10)
    ctx = flip(ctx, voiceOf(ctx, 0).id).next
    expect(flip(ctx, voiceOf(ctx, 0).id).accepted).toBe(false)
    ctx = flip(ctx, voiceOf(ctx, 1).id).next
    expect(flip(ctx, letterOf(ctx, 2).id).accepted).toBe(false)
  })

  it('solving the board wins; TIMEUP only applies to the expert level', () => {
    expect(solve(initEcho(1, 9, KEYS_10)).phase).toBe(Phase.WIN)
    const l2 = initEcho(2, 9, KEYS_10)
    expect(echoTransition(l2, { type: MatchEvent.TIMEUP }).accepted).toBe(false)
    const l4 = initEcho(4, 9, KEYS_10)
    const up = echoTransition(l4, { type: MatchEvent.TIMEUP })
    expect(up.accepted).toBe(true)
    expect(up.next.phase).toBe(Phase.TIMEUP)
  })
})

describe('summary, unlocks on accuracy, adaptive re-deal', () => {
  it('a perfect round: 3 stars, passes, unlocks the next level', () => {
    const ctx = solve(initEcho(1, 5, KEYS_10))
    const s = roundSummary(ctx)
    expect(s.accuracy).toBe(1)
    expect(s.stars).toBe(3)
    expect(s.passed).toBe(true)
    const { state, unlockedNew } = applyRound(loadEcho(), 1, s)
    expect(state.unlocked).toBe(2)
    expect(unlockedNew).toBe(true)
    expect(state.best[1]).toBe(3)
  })

  it('completion alone does NOT unlock: below the accuracy bar the level stays locked', () => {
    // 4 pairs, 2 informed misses -> 50% first try (< 75%)
    let ctx = initEcho(1, 5, KEYS_10)
    for (const p of [0, 1]) {
      const other = p === 0 ? 1 : 0
      ctx = flip(ctx, letterOf(ctx, p).id).next
      ctx = flip(ctx, letterOf(ctx, other).id).next
      ctx = resolve(ctx)
      ctx = flip(ctx, voiceOf(ctx, p).id).next
      ctx = flip(ctx, letterOf(ctx, other).id).next
      ctx = resolve(ctx)
    }
    ctx = solve(ctx)
    expect(ctx.phase).toBe(Phase.WIN)
    const s = roundSummary(ctx)
    expect(s.accuracy).toBe(0.5)
    expect(s.accuracy).toBeLessThan(UNLOCK_ACCURACY)
    expect(s.passed).toBe(false)
    expect(s.practice).toHaveLength(2)
    const { state, unlockedNew } = applyRound(loadEcho(), 1, s)
    expect(state.unlocked).toBe(1)
    expect(unlockedNew).toBe(false)
  })

  it('a timed-out expert round never passes and caps at 2 stars', () => {
    const l4 = initEcho(4, 9, KEYS_10)
    const up = echoTransition(l4, { type: MatchEvent.TIMEUP }).next
    const s = roundSummary(up)
    expect(s.passed).toBe(false)
    expect(s.stars).toBeLessThanOrEqual(2)
    expect(s.missed).toEqual([]) // running out of time is not a miss
  })

  it('missed letters become due for REDEAL_ROUNDS rounds and count down when mastered', () => {
    let due = nextDue({}, { missed: ['le-1'], mastered: ['me-1'], practice: ['le-1'] })
    expect(due).toEqual({ 'le-1': REDEAL_ROUNDS })
    due = nextDue(due, { missed: [], mastered: ['le-1'], practice: [] })
    expect(due['le-1']).toBe(REDEAL_ROUNDS - 1)
    for (let i = 1; i < REDEAL_ROUNDS; i++) due = nextDue(due, { missed: [], mastered: ['le-1'], practice: [] })
    expect(due['le-1']).toBeUndefined()
    // not dealt -> keeps its count
    expect(nextDue({ 'le-1': 2 }, { missed: [], mastered: [], practice: [] })).toEqual({ 'le-1': 2 })
  })

  it('due letters are dealt first in the next round (spaced re-exposure)', () => {
    for (let seed = 1; seed < 40; seed++) {
      const due = ['me-1', 'le-1']
      const keys = new Set(initEcho(1, seed, KEYS_10, due).cards.map((c) => c.key))
      for (const k of due) expect(keys.has(k)).toBe(true)
    }
    // a due letter of another order shows up on L3
    const keys = new Set(initEcho(3, 11, KEYS_10, ['le-3']).cards.map((c) => c.key))
    expect(keys.has('le-3')).toBe(true)
  })

  it('due letters fill at most half the board and never break sound safety', () => {
    const chosen = pickKeys(['ha-1', 'hha-1', 'le-1', 'me-1', 'se-1', 'sse-1', 're-1', 'be-1'], 4, { due: ['ha-1', 'hha-1', 'se-1', 'sse-1', 'le-1'], pack: AM_PACK })
    expect(chosen).toHaveLength(4)
    expect(chosen.includes('ha-1') && chosen.includes('hha-1')).toBe(false)
    expect(chosen.includes('se-1') && chosen.includes('sse-1')).toBe(false)
    expect(chosen.slice(0, 2)).toEqual(['ha-1', 'se-1'])
  })

  it('dueList orders by urgency', () => {
    expect(dueList({ 'a-1': 1, 'le-1': 2, 'me-1': 2 })).toEqual(['le-1', 'me-1', 'a-1'])
  })

  it('progress persists and sanitises bad storage', () => {
    saveEcho({ unlocked: 3, due: { 'le-1': 2 }, best: { 1: 3 } })
    expect(loadEcho()).toEqual({ unlocked: 3, due: { 'le-1': 2 }, best: { 1: 3 } })
    localStorage.setItem(ECHO_KEY, JSON.stringify({ unlocked: 99, due: { 'x': 5, 'le-1': 50 }, best: { 9: 3 } }))
    expect(loadEcho()).toEqual({ unlocked: 1, due: { 'le-1': REDEAL_ROUNDS }, best: {} })
    localStorage.setItem(ECHO_KEY, '{bad')
    expect(loadEcho().unlocked).toBe(1)
  })

  it('maxPlayableLevel caps levels a small pool cannot fill', () => {
    const four = FIDEL_FAMILIES.slice(0, 4).map((f) => f.id)
    const firstOnly = four.map((id) => `${id}-1`)
    expect(maxPlayableLevel(firstOnly, ACTIVE_PACK)).toBe(1)
    expect(maxPlayableLevel(KEYS_10, ACTIVE_PACK)).toBe(4)
  })
})

describe('example word after a match', () => {
  const words = [
    { geez: 'ላም', latin: 'lam', picture: '🐄' },
    { geez: 'ሎሚ', latin: 'lomi', picture: '🍋', noAudio: true },
    { geez: 'ሊጥ', latin: 'lit', picture: '🥣', noAudio: true },
  ]
  it('prefers a word starting with the exact form, else the family', () => {
    const la = ALL_FORMS.find((f) => f.char === 'ላ').audioKey
    expect(exampleWord(la, words).latin).toBe('lam')
    const li = ALL_FORMS.find((f) => f.char === 'ሊ').audioKey
    expect(exampleWord(li, words).latin).toBe('lit')
    const lu = ALL_FORMS.find((f) => f.char === 'ሉ').audioKey
    expect(exampleWord(lu, words).latin).toBe('lam') // family fallback, recorded first
    expect(exampleWord('zzz-1', words)).toBe(null)
  })
})
