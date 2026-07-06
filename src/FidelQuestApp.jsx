/* ============================================================================
   FIDEL QUEST v2 — an Amharic alphabet learning game for kids
   ----------------------------------------------------------------------------
   Single-file application, structured as if modular. Section map:

     §1  DATA LAYER        canonical Ge'ez table + pure derivations/indexes
     §2  DETERMINISTIC RNG pure, threaded PRNG (mulberry32) — no Math.random
     §3  STATE MACHINE     explicit states/events, table-driven transitions
     §4  QUESTION FACTORY  pure, seeded question-queue builder
     §5  INVARIANT SUITE   data + machine self-tests, run at module load
     §6  SOUND ENGINE      mp3 placeholders with Web Audio fallback tones
     §7  PERSISTENCE       localStorage progress + settings
     §8  UI                Home, Explore Mode, Lesson, Level Complete

   Design language: Duolingo-inspired — chunky press-down buttons, segmented
   lesson progress, bottom feedback sheets, streak flame, star rewards —
   on the Fidel Quest amber identity.

   Provenance: the character table is generated from the test-verified data
   module in the fidel_quest repository, not hand-typed.
   ========================================================================== */

import { lazy, Suspense, useReducer, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import FidelSkylands from './FidelSkylands'
import { playForm, playEffect, preloadForms } from './platform/audioEngine'
import { ORDERS, FIDEL_FAMILIES, ALL_FORMS, INDEXES } from './platform/ethiopic'
import { recordAnswer, loadLedger, troubleLetters, confusions } from './platform/telemetry'
import GrownUps from './GrownUps'
import { StoneLessonForNode } from './LearnLetters'
import { JOURNEY, NodeKind, nextNode, loadJourney, completeNode as applyNodeDone, NODE_BY_ID, wornLayers, equipItem, progressStats, chapterComplete, grantWearable } from './journey'
import Closet from './components/Closet'
import ErrorBoundary from './components/ErrorBoundary'
import { shareAnbessa } from './components/ShareCard'
import { installState, promptInstall, dismissInstall, onInstallChange } from './platform/install'
import { todayKey, loadGift, saveGift, giftAvailable, pickGift } from './dailyGift'
import { track } from './platform/analytics'
import { shareCtaLabel } from './platform/experiments'
import GhostHand from './GhostHand'
import { t, getLang, setLang } from './platform/i18n'
import { LOW_END, isDegraded, usePerfDegrade } from './platform/quality'
import { Runner2D, Skylands2D } from './components/ArcadeFallback'
import { hasOnboarded, markOnboarded, prefersReducedMotion, tutTargetCenter } from './platform/tutorial'

// The original Fidel Quest game (chant mode, tracing pad, first words) lives
// on as the Classic mode; lazy so the heavy page stays out of the home chunk.
const AmharicFidelGame = lazy(() => import('./pages/AmharicFidelGame'))
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import {
  Volume2,
  VolumeX,
  X,
  Lock,
  Star,
  Flame,
  ChevronLeft,
  Sparkles,
  Play,
  BookOpen,
  Check,
  RotateCcw,
  TreePine,
  Pencil,
  Shirt,
  Share2,
  Gift,
  Backpack as BackpackIcon,
} from 'lucide-react'

/* ============================================================================
   §1 DATA LAYER
   ========================================================================== */

/* Script and language data flow from the Ethiopic Engine platform layer:
   the language-invariant glyph table (src/script/ethiopic.js) merged with
   the active language pack (src/packs/*) into these legacy shapes. */
export { ORDERS, FIDEL_FAMILIES, deriveForms, deriveIndexes, ALL_FORMS, INDEXES } from './platform/ethiopic'

/** Level definitions. Levels 1-4 teach the base (1st-order) letters in
   four groups; levels 5-8 revisit the same groups across ALL SEVEN vocal
   orders — same consonant, different vowel mark — which is how the abugida
   actually works. */
export const LEVELS = Object.freeze([
  { id: 'level-1', n: 1, kind: 'base', title: 'First Letters', blurb: 'Meet the first eight Fidel', from: 0, to: 8 },
  { id: 'level-2', n: 2, kind: 'base', title: 'More Letters', blurb: 'Eight new friends', from: 8, to: 16 },
  { id: 'level-3', n: 3, kind: 'base', title: 'Even More Letters', blurb: 'The middle of the table', from: 16, to: 24 },
  { id: 'level-4', n: 4, kind: 'base', title: 'The Last Letters', blurb: 'Finish the whole alphabet', from: 24, to: 33 },
  { id: 'level-5', n: 5, kind: 'orders', title: 'Vowel Magic', blurb: 'Same letter, seven sounds', from: 0, to: 8 },
  { id: 'level-6', n: 6, kind: 'orders', title: 'More Vowel Magic', blurb: 'New families, all their sounds', from: 8, to: 16 },
  { id: 'level-7', n: 7, kind: 'orders', title: 'Deep Vowels', blurb: 'The middle families, every order', from: 16, to: 24 },
  { id: 'level-8', n: 8, kind: 'orders', title: 'Vowel Master', blurb: 'All 231 letters conquered', from: 24, to: 33 },
].map((l) => ({
  ...l,
  families: FIDEL_FAMILIES.slice(l.from, l.to).map((f) => f.id),
  pool: FIDEL_FAMILIES.slice(l.from, l.to).map((f) => `${f.id}-1`),
  questionCount: 8,
  optionCount: 4,
})))

/* ============================================================================
   §2 DETERMINISTIC RNG — threaded mulberry32; a run is pure in (level, seed)
   ========================================================================== */

export function rngNext(state) {
  let t = (state + 0x6d2b79f5) | 0
  let r = Math.imul(t ^ (t >>> 15), 1 | t)
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
  return [((r ^ (r >>> 14)) >>> 0) / 4294967296, t]
}

export function rngShuffle(items, rngState) {
  const out = items.slice()
  let state = rngState
  for (let i = out.length - 1; i > 0; i--) {
    let value
    ;[value, state] = rngNext(state)
    const j = Math.floor(value * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return [out, state]
}

/* ============================================================================
   §3 STATE MACHINE — rigid, table-driven; ill-timed events are rejected
   ========================================================================== */

export const GameState = Object.freeze({
  IDLE: 'IDLE',
  PRESENTATION: 'PRESENTATION',
  AWAITING_INPUT: 'AWAITING_INPUT',
  SUCCESS_BURST: 'SUCCESS_BURST',
  ERROR_RECOVERY: 'ERROR_RECOVERY',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
})

export const GameEvent = Object.freeze({
  START_LEVEL: 'START_LEVEL',
  PRESENTATION_DONE: 'PRESENTATION_DONE',
  SELECT_OPTION: 'SELECT_OPTION',
  FEEDBACK_DONE: 'FEEDBACK_DONE',
  EXIT: 'EXIT',
})

export function initialContext(seed = 1) {
  return {
    status: GameState.IDLE,
    seed,
    rngState: seed,
    levelId: null,
    queue: [],
    cursor: 0,
    wrongPicks: [],
    attempts: 0,
    streak: 0,
    bestStreak: 0,
    history: [],
  }
}

const TRANSITIONS = {
  [GameState.IDLE]: {
    [GameEvent.START_LEVEL]: (ctx, { levelId, seed, queue }) => startLevel(ctx, levelId, seed, queue),
  },
  [GameState.PRESENTATION]: {
    [GameEvent.PRESENTATION_DONE]: (ctx) => ({ ...ctx, status: GameState.AWAITING_INPUT }),
    [GameEvent.EXIT]: exitToIdle,
  },
  [GameState.AWAITING_INPUT]: {
    [GameEvent.SELECT_OPTION]: (ctx, { audioKey }) => {
      const question = ctx.queue[ctx.cursor]
      if (!question.options.includes(audioKey) || ctx.wrongPicks.includes(audioKey)) {
        return null
      }
      if (audioKey === question.target) {
        const streak = ctx.streak + 1
        return {
          ...ctx,
          status: GameState.SUCCESS_BURST,
          attempts: ctx.attempts + 1,
          streak,
          bestStreak: Math.max(ctx.bestStreak, streak),
          history: [...ctx.history, { target: question.target, attempts: ctx.attempts + 1 }],
        }
      }
      return {
        ...ctx,
        status: GameState.ERROR_RECOVERY,
        attempts: ctx.attempts + 1,
        streak: 0,
        wrongPicks: [...ctx.wrongPicks, audioKey],
      }
    },
    [GameEvent.EXIT]: exitToIdle,
  },
  [GameState.SUCCESS_BURST]: {
    [GameEvent.FEEDBACK_DONE]: (ctx) =>
      ctx.cursor + 1 >= ctx.queue.length
        ? { ...ctx, status: GameState.LEVEL_COMPLETE }
        : { ...ctx, status: GameState.PRESENTATION, cursor: ctx.cursor + 1, wrongPicks: [], attempts: 0 },
    [GameEvent.EXIT]: exitToIdle,
  },
  [GameState.ERROR_RECOVERY]: {
    [GameEvent.FEEDBACK_DONE]: (ctx) => ({ ...ctx, status: GameState.AWAITING_INPUT }),
    [GameEvent.EXIT]: exitToIdle,
  },
  [GameState.LEVEL_COMPLETE]: {
    [GameEvent.START_LEVEL]: (ctx, { levelId, seed, queue }) => startLevel(ctx, levelId, seed, queue),
    [GameEvent.EXIT]: exitToIdle,
  },
}

function exitToIdle(ctx) {
  return { ...initialContext(ctx.seed), status: GameState.IDLE }
}

function startLevel(ctx, levelId, seed, presetQueue) {
  const effectiveSeed = seed ?? ctx.seed
  // A preset queue (adaptive practice) bypasses the level table; it is
  // still pure - the caller built it from ledger + seed.
  if (presetQueue && presetQueue.length) {
    return { ...initialContext(effectiveSeed), status: GameState.PRESENTATION, levelId, rngState: effectiveSeed, queue: presetQueue }
  }
  const level = LEVELS.find((l) => l.id === levelId)
  if (!level) return null
  const [queue, rngState] = buildQuestionQueue(level, effectiveSeed)
  return { ...initialContext(effectiveSeed), status: GameState.PRESENTATION, levelId, rngState, queue }
}

export function transition(ctx, event) {
  const handler = TRANSITIONS[ctx.status]?.[event.type]
  if (!handler) return { next: ctx, accepted: false, from: ctx.status }
  const result = handler(ctx, event.payload ?? {})
  if (result === null) return { next: ctx, accepted: false, from: ctx.status }
  return { next: result, accepted: true, from: ctx.status }
}

/* ============================================================================
   §4 QUESTION FACTORY (pure, seeded)
   ========================================================================== */

export function buildQuestionQueue(level, seed) {
  let rngState = seed
  if (level.kind === 'orders') {
    // Target any of the group's 7-order cells; distractors are OTHER ORDERS
    // OF THE SAME FAMILY, so the only difference the child hears and sees
    // is the vowel. Twin letters are irrelevant here by construction.
    let cells
    ;[cells, rngState] = rngShuffle(
      level.families.flatMap((fid) => ORDERS.map((o) => `${fid}-${o.index}`)),
      rngState,
    )
    const queue = cells.slice(0, level.questionCount).map((target) => {
      const fid = target.slice(0, target.lastIndexOf('-'))
      let siblings
      ;[siblings, rngState] = rngShuffle(
        ORDERS.map((o) => `${fid}-${o.index}`).filter((k) => k !== target),
        rngState,
      )
      let options
      ;[options, rngState] = rngShuffle([target, ...siblings.slice(0, level.optionCount - 1)], rngState)
      return { target, options }
    })
    return [queue, rngState]
  }
  let targets
  ;[targets, rngState] = rngShuffle(level.pool, rngState)
  targets = targets.slice(0, level.questionCount)

  const queue = targets.map((target) => {
    // Twin letters (e.g. ሀ/ሐ/ኀ) share a modern pronunciation; a distractor
    // that sounds like the target would make the question unanswerable by
    // ear, so same-sounding characters are excluded from the option pool.
    const targetSound = INDEXES.byAudioKey.get(target).sound
    let distractors
    ;[distractors, rngState] = rngShuffle(
      level.pool.filter((k) => k !== target && INDEXES.byAudioKey.get(k).sound !== targetSound),
      rngState,
    )
    let options
    ;[options, rngState] = rngShuffle(
      [target, ...distractors.slice(0, level.optionCount - 1)],
      rngState,
    )
    return { target, options }
  })
  return [queue, rngState]
}

/**
 * Star Practice: a queue built from the child's own trouble letters, with
 * their actual confusion partners as distractors when twin-safe. Pure in
 * (events, seed). Empty when there is nothing worth practicing yet.
 */
export function buildPracticeQueue(events, seed, count = 8) {
  const trouble = troubleLetters(events, { minSeen: 2, minRate: 0.25, limit: 5 })
  if (!trouble.length) return []
  const pairs = confusions(events, { minCount: 1, limit: 12 })
  let rngState = seed
  let targets = Array.from({ length: count }, (_, i) => trouble[i % trouble.length].key)
  ;[targets, rngState] = rngShuffle(targets, rngState)
  const queue = targets.map((target) => {
    const form = INDEXES.byAudioKey.get(target)
    const confused = pairs
      .filter((p) => p.heard === target)
      .map((p) => p.picked)
      .filter((k) => {
        const other = INDEXES.byAudioKey.get(k)
        return other && other.sound !== form.sound
      })
    const groupStart = Math.floor(form.familyIndex / 8) * 8
    let peers
    ;[peers, rngState] = rngShuffle(
      FIDEL_FAMILIES.slice(groupStart, Math.min(groupStart + 8, FIDEL_FAMILIES.length))
        .map((f) => `${f.id}-${form.order}`)
        .filter((k) => {
          const other = INDEXES.byAudioKey.get(k)
          return k !== target && other && other.sound !== form.sound && !confused.includes(k)
        }),
      rngState,
    )
    // Build options greedily with UNIQUE SOUNDS - confusion partners first,
    // then peers - so twins (e.g. Se/Sse) never co-occur in one question.
    const usedSounds = new Set([form.sound])
    const picked = [target]
    for (const k of [...confused, ...peers]) {
      if (picked.length >= 4) break
      const other = INDEXES.byAudioKey.get(k)
      if (!other || usedSounds.has(other.sound) || picked.includes(k)) continue
      usedSounds.add(other.sound)
      picked.push(k)
    }
    let options
    ;[options, rngState] = rngShuffle(picked, rngState)
    return { target, options }
  })
  return queue
}

/** First Words: the 25 kid words as machine-compatible questions. Options
   are word latins; pictures are guaranteed distinct within a question. */
export const WORDS = FIDEL_FAMILIES.filter((f) => f.word).map((f, _, arr) => ({
  ...f.word,
  familyId: f.id,
  familyIndex: FIDEL_FAMILIES.findIndex((x) => x.id === f.id),
}))
export const WORD_BY_LATIN = new Map(WORDS.map((w) => [w.latin, w]))

/** The look-alike sibling of a family, if any: its twin parent, or a family
    that twins onto it. This is where a phonetic twin is allowed to appear. */
function twinSiblingOf(fam) {
  if (!fam) return null
  const parent = fam.twinOf && FIDEL_FAMILIES.find((f) => f.name === fam.twinOf)
  const child = FIDEL_FAMILIES.find((f) => f.twinOf === fam.name)
  return parent || child || null
}
export const wordFamilyHasTwin = (latin) => {
  const w = WORD_BY_LATIN.get(latin)
  return !!(w && twinSiblingOf(FIDEL_FAMILIES[w.familyIndex]))
}

/* First Words (P5). Two interleaved question shapes over the same machine:
   - type 'picture': hear the word, pick its picture (unchanged behaviour).
   - type 'glyph'  : hear the word, pick the LETTER it starts with. For a
     word whose family has a phonetic twin, the twin glyph is seated as a
     distractor ON PURPOSE. This is the ONE place near-twins co-occur - and
     it is safe because the picture + spoken word disambiguate by meaning,
     not by sound (exactly how Ethiopian schools teach twins via nicknames).
   Options in a glyph round are Ge'ez chars; in a picture round, word latins.
   `wordLatin` always carries the prompt word so the renderer is type-blind. */
export function buildWordQueue(seed, count = 6) {
  let rngState = seed
  let shuffled
  ;[shuffled, rngState] = rngShuffle(WORDS, rngState)
  return shuffled.slice(0, Math.min(count, WORDS.length)).map((target) => {
    const fam = FIDEL_FAMILIES[target.familyIndex]
    const sibling = twinSiblingOf(fam)
    if (sibling) {
      const correct = formOf(`${fam.id}-1`)?.char
      const twinGlyph = formOf(`${sibling.id}-1`)?.char
      let others
      ;[others, rngState] = rngShuffle(
        FIDEL_FAMILIES.filter((f) => f.id !== fam.id && f.id !== sibling.id).map((f) => formOf(`${f.id}-1`)?.char).filter(Boolean),
        rngState,
      )
      const pool = [correct, twinGlyph, others.find((c) => c !== correct && c !== twinGlyph)].filter(Boolean)
      let options
      ;[options, rngState] = rngShuffle(pool, rngState)
      return { type: 'glyph', target: correct, options, wordLatin: target.latin }
    }
    let others
    ;[others, rngState] = rngShuffle(
      WORDS.filter((w) => w.latin !== target.latin && w.picture !== target.picture),
      rngState,
    )
    let options
    ;[options, rngState] = rngShuffle([target.latin, ...others.slice(0, 2).map((w) => w.latin)], rngState)
    return { type: 'picture', target: target.latin, options, wordLatin: target.latin }
  })
}

export const selectQuestion = (ctx) => ctx.queue[ctx.cursor] ?? null
export const selectProgress = (ctx) => ({ answered: ctx.history.length, total: ctx.queue.length })
export const selectAccuracy = (ctx) => {
  if (ctx.history.length === 0) return null
  const firstTry = ctx.history.filter((h) => h.attempts === 1).length
  return Math.round((firstTry / ctx.history.length) * 100)
}
export const starsForAccuracy = (accuracy) => (accuracy >= 90 ? 3 : accuracy >= 65 ? 2 : 1)
const formOf = (audioKey) => INDEXES.byAudioKey.get(audioKey)

/* ============================================================================
   §4b LETTER RUNNER MACHINE
   Endless-runner mode: feed Kokeb the correct letter and she gains power;
   feed her the wrong one and the Letter Muncher gains ground. At the end of
   every RUNNER_QPL-question level the Muncher attacks: power (correct feeds)
   must beat its strength (wrong feeds) or the run is destroyed. Survive and
   the run speeds up into the next level, cycling through the whole fidel.
   Pure and seeded, like the lesson machine.
   ========================================================================== */

export const RunnerState = Object.freeze({
  RUNNING: 'RUNNING',
  FEEDING: 'FEEDING',
  BOSS: 'BOSS',
  DESTROYED: 'DESTROYED',
})

export const RunnerEvent = Object.freeze({
  FEED: 'FEED',
  FEED_DONE: 'FEED_DONE',
  BOSS_DONE: 'BOSS_DONE',
})

export const RUNNER_QPL = 5 // questions ("meals") per level

function runnerLevelSpec(level) {
  // Cycle the four letter groups; option count stays kid-friendly at 3.
  return {
    pool: LEVELS[(level - 1) % LEVELS.length].pool,
    questionCount: RUNNER_QPL,
    optionCount: 3,
  }
}

export function runnerInitial(seed = 1) {
  const [queue, rngState] = buildQuestionQueue(runnerLevelSpec(1), seed)
  return {
    status: RunnerState.RUNNING,
    seed,
    rngState,
    level: 1,
    queue,
    qIndex: 0,
    correct: 0, // power this level
    wrong: 0, // Muncher strength this level
    fed: 0, // total correct feeds this run (the score)
    survivedBoss: false,
    lastFeed: null, // { audioKey, good }
  }
}

const RUNNER_TRANSITIONS = {
  [RunnerState.RUNNING]: {
    [RunnerEvent.FEED]: (ctx, { audioKey }) => {
      const q = ctx.queue[ctx.qIndex]
      if (!q || !q.options.includes(audioKey)) return null
      const good = audioKey === q.target
      return {
        ...ctx,
        status: RunnerState.FEEDING,
        correct: ctx.correct + (good ? 1 : 0),
        wrong: ctx.wrong + (good ? 0 : 1),
        fed: ctx.fed + (good ? 1 : 0),
        lastFeed: { audioKey, good },
      }
    },
  },
  [RunnerState.FEEDING]: {
    [RunnerEvent.FEED_DONE]: (ctx) =>
      ctx.qIndex + 1 < ctx.queue.length
        ? { ...ctx, status: RunnerState.RUNNING, qIndex: ctx.qIndex + 1 }
        : { ...ctx, status: RunnerState.BOSS, survivedBoss: ctx.correct > ctx.wrong },
  },
  [RunnerState.BOSS]: {
    [RunnerEvent.BOSS_DONE]: (ctx) => {
      if (!ctx.survivedBoss) return { ...ctx, status: RunnerState.DESTROYED }
      const [queue, rngState] = buildQuestionQueue(runnerLevelSpec(ctx.level + 1), ctx.rngState)
      return {
        ...ctx,
        status: RunnerState.RUNNING,
        level: ctx.level + 1,
        queue,
        rngState,
        qIndex: 0,
        correct: 0,
        wrong: 0,
        survivedBoss: false,
        lastFeed: null,
      }
    },
  },
  [RunnerState.DESTROYED]: {},
}

export function runnerTransition(ctx, event) {
  const handler = RUNNER_TRANSITIONS[ctx.status]?.[event.type]
  if (!handler) return { next: ctx, accepted: false }
  const result = handler(ctx, event.payload ?? {})
  if (result === null) return { next: ctx, accepted: false }
  return { next: result, accepted: true }
}

export const selectRunnerQuestion = (ctx) => ctx.queue[ctx.qIndex] ?? null

/* ============================================================================
   §5 INVARIANT SUITE — self-tests at module load; failures land in console
   ========================================================================== */

export function runInvariants() {
  const checks = []
  const check = (name, pass, detail = '') => checks.push({ name, pass, detail })

  check('33 consonant families', FIDEL_FAMILIES.length === 33)
  check('Every family has exactly 7 forms', FIDEL_FAMILIES.every((f) => Array.from(f.chars).length === 7))
  const chars = ALL_FORMS.map((f) => f.char)
  check('All 231 characters unique', new Set(chars).size === 231)
  check(
    'All characters in the Ethiopic block',
    chars.every((c) => {
      const cp = c.codePointAt(0)
      return cp >= 0x1200 && cp <= 0x137f
    }),
  )
  check('Audio keys unique and resolvable', new Set(ALL_FORMS.map((f) => f.audioKey)).size === 231 && INDEXES.byAudioKey.size === 231)
  check('Twin references resolve', FIDEL_FAMILIES.every((f) => !f.twinOf || FIDEL_FAMILIES.some((g) => g.name === f.twinOf)))

  for (const level of LEVELS) {
    const [q1] = buildQuestionQueue(level, 42)
    const [q2] = buildQuestionQueue(level, 42)
    check(`${level.id}: deterministic`, JSON.stringify(q1) === JSON.stringify(q2))
    check(
      `${level.id}: answer present, options unique`,
      q1.every((q) => q.options.includes(q.target) && new Set(q.options).size === q.options.length),
    )
    const soundOf = (k) => INDEXES.byAudioKey.get(k).sound
    check(
      `${level.id}: twin-letter safe over 25 seeds`,
      Array.from({ length: 25 }, (_, s) => buildQuestionQueue(level, s + 1)[0]).every((queue) =>
        queue.every((q) => q.options.every((o) => o === q.target || soundOf(o) !== soundOf(q.target))),
      ),
    )
  }

  for (const level of LEVELS.filter((l) => l.kind === 'orders')) {
    const [queue] = buildQuestionQueue(level, 42)
    check(
      `${level.id}: options isolate the vowel within one family`,
      queue.every((q) => {
        const fid = q.target.slice(0, q.target.lastIndexOf('-'))
        const sounds = q.options.map((k) => INDEXES.byAudioKey.get(k).sound)
        return q.options.every((k) => k.startsWith(fid + '-')) && new Set(sounds).size === q.options.length
      }),
    )
  }

  const idle = initialContext(7)
  check('Ill-timed event rejected in IDLE', transition(idle, { type: GameEvent.FEEDBACK_DONE }).accepted === false)

  let sim = transition(idle, { type: GameEvent.START_LEVEL, payload: { levelId: 'level-1', seed: 7 } }).next
  let guard = 0
  while (sim.status !== GameState.LEVEL_COMPLETE && guard++ < 200) {
    if (sim.status === GameState.PRESENTATION) {
      sim = transition(sim, { type: GameEvent.PRESENTATION_DONE }).next
    } else if (sim.status === GameState.AWAITING_INPUT) {
      const q = selectQuestion(sim)
      const wrong = q.options.find((o) => o !== q.target && !sim.wrongPicks.includes(o))
      const pick = sim.cursor === 0 && sim.attempts === 0 && wrong ? wrong : q.target
      sim = transition(sim, { type: GameEvent.SELECT_OPTION, payload: { audioKey: pick } }).next
    } else {
      sim = transition(sim, { type: GameEvent.FEEDBACK_DONE }).next
    }
  }
  check('Headless playthrough reaches LEVEL_COMPLETE', sim.status === GameState.LEVEL_COMPLETE && sim.history.length === 8)

  // Runner: all-correct run survives the boss and levels up with a fresh queue.
  let run = runnerInitial(11)
  for (let i = 0; i < RUNNER_QPL; i++) {
    run = runnerTransition(run, { type: RunnerEvent.FEED, payload: { audioKey: selectRunnerQuestion(run).target } }).next
    run = runnerTransition(run, { type: RunnerEvent.FEED_DONE }).next
  }
  check('Runner: perfect level reaches BOSS with power 5', run.status === RunnerState.BOSS && run.correct === 5 && run.survivedBoss)
  run = runnerTransition(run, { type: RunnerEvent.BOSS_DONE }).next
  check('Runner: surviving the boss levels up and resets power', run.status === RunnerState.RUNNING && run.level === 2 && run.correct === 0 && run.fed === 5)

  // Runner: a mostly-wrong level is destroyed at the boss.
  let doomed = runnerInitial(13)
  for (let i = 0; i < RUNNER_QPL; i++) {
    const q = selectRunnerQuestion(doomed)
    const wrongKey = q.options.find((o) => o !== q.target)
    doomed = runnerTransition(doomed, { type: RunnerEvent.FEED, payload: { audioKey: wrongKey } }).next
    doomed = runnerTransition(doomed, { type: RunnerEvent.FEED_DONE }).next
  }
  doomed = runnerTransition(doomed, { type: RunnerEvent.BOSS_DONE }).next
  check('Runner: losing the boss destroys the run', doomed.status === RunnerState.DESTROYED)
  check('Runner: DESTROYED is terminal', runnerTransition(doomed, { type: RunnerEvent.FEED, payload: { audioKey: 'ha-1' } }).accepted === false)

  return checks
}

export const INVARIANTS = runInvariants()
for (const c of INVARIANTS) {
  if (!c.pass) console.error(`[FidelQuest invariant failed] ${c.name}`, c.detail)
}

/* ============================================================================
   §6 SOUND — provided by the platform AudioEngine (src/platform/audioEngine):
   manifest-driven source cascade (memory pack -> static mp3 -> deterministic
   chime), buffer-cached playback with cross-fades, memoized misses.
   Re-exported here to keep this module's historical surface stable.
   ========================================================================== */

export { playForm, playEffect }

/* ============================================================================
   §7 PERSISTENCE
   ========================================================================== */

const PROGRESS_KEY = 'fq2.progress'
const SOUND_KEY = 'fq2.sound'

export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}
  } catch {
    return {}
  }
}
function saveProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    /* storage unavailable: play session-only */
  }
}
export function mergeResult(progress, levelId, result) {
  const prev = progress[levelId] || { stars: 0, bestStreak: 0, plays: 0 }
  return {
    ...progress,
    [levelId]: {
      stars: Math.max(prev.stars, result.stars),
      bestStreak: Math.max(prev.bestStreak, result.bestStreak),
      plays: prev.plays + 1,
    },
  }
}
const RUNNER_KEY = 'fq2.runner'
export function loadRunnerBest() {
  try {
    return JSON.parse(localStorage.getItem(RUNNER_KEY)) || { fed: 0, level: 0 }
  } catch {
    return { fed: 0, level: 0 }
  }
}
export function saveRunnerBest(best) {
  try {
    localStorage.setItem(RUNNER_KEY, JSON.stringify(best))
  } catch {
    /* session-only */
  }
}

function loadSoundOn() {
  try {
    return localStorage.getItem(SOUND_KEY) !== '0'
  } catch {
    return true
  }
}

export const isLevelUnlocked = (progress, index) =>
  index === 0 || (progress[LEVELS[index - 1].id]?.stars ?? 0) >= 1

/* ============================================================================
   §8 UI
   ========================================================================== */

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'

export default function FidelQuestApp() {
  const [screen, setScreen] = useState({ name: 'home' })
  useEffect(() => {
    try {
      document.documentElement.lang = getLang()
    } catch {
      /* non-browser */
    }
    track('app_open')
  }, [])
  const [progress, setProgress] = useState(loadProgress)
  const [journey, setJourney] = useState(loadJourney)
  const journeyRef = useRef(journey)
  journeyRef.current = journey
  const [justEarned, setJustEarned] = useState(null)
  const [celebration, setCelebration] = useState(null)
  const [gift, setGift] = useState(loadGift)
  const [giftOpened, setGiftOpened] = useState(null) // { reward } | { reward: null }
  const today = useMemo(() => todayKey(), [])
  const [backpackOpen, setBackpackOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(loadSoundOn)
  const [runSeed, setRunSeed] = useState(() => (Date.now() % 1000000) | 1)
  // Recompute the Backpack's Star Practice badge whenever progress advances
  // (the answer ledger it reads grows as the child plays).
  const troubleCount = useMemo(
    () => troubleLetters(loadLedger(), { minSeen: 2, minRate: 0.25, limit: 5 }).length,
    [journey], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      try {
        localStorage.setItem(SOUND_KEY, on ? '0' : '1')
      } catch {
        /* session-only */
      }
      return !on
    })
  }, [])

  const finishLevel = useCallback((levelId, result) => {
    if (result) {
      setProgress((p) => {
        const next = mergeResult(p, levelId, result)
        saveProgress(next)
        return next
      })
    }
    setScreen({ name: 'home' })
  }, [])

  const startLesson = useCallback((levelId) => {
    setRunSeed((Date.now() % 1000000) | 1)
    setScreen({ name: 'lesson', levelId })
  }, [])

  const startWords = useCallback(() => {
    setRunSeed((Date.now() % 1000000) | 1)
    setScreen({ name: 'words' })
  }, [])

  const startPractice = useCallback(() => {
    const seed = (Date.now() % 1000000) | 1
    const queue = buildPracticeQueue(loadLedger(), seed)
    if (!queue.length) return
    setBackpackOpen(false)
    setRunSeed(seed)
    setScreen({ name: 'practice', queue })
  }, [])

  // Mark a Journey node complete (grants its reward) and return to the path.
  // Surface a newly-earned wearable as a celebratory chip on the path.
  const markNodeDone = useCallback((nodeId, stars = 3) => {
    const j = journeyRef.current
    const node = NODE_BY_ID.get(nodeId)
    const isNew = node?.reward && !(j.collection?.owned ?? []).includes(node.reward.id)
    const next = applyNodeDone(j, nodeId, stars)
    setJourney(next)
    track('lesson_complete')
    const chapter = chapterComplete(next, nodeId)
    if (chapter) {
      // Peak pride: a full celebration that also asks for a share.
      track('chapter_complete')
      setCelebration({ chapter, rewardName: node?.reward?.name || null })
    } else if (isNew) {
      setJustEarned(node.reward)
    }
    setScreen({ name: 'home' })
  }, [])

  useEffect(() => {
    if (!justEarned) return undefined
    const timer = setTimeout(() => setJustEarned(null), 2600)
    return () => clearTimeout(timer)
  }, [justEarned])

  const openCloset = useCallback(() => {
    setBackpackOpen(false)
    setScreen({ name: 'closet' })
  }, [])

  // Daily Gift: claim once per calendar day. Grants an un-owned wearable (which
  // feeds the Closet + share loop), or a warm message once all are collected.
  const openGift = useCallback(() => {
    const j = journeyRef.current
    const reward = pickGift(j.collection?.owned || [], today)
    const claimed = { lastClaimed: today }
    saveGift(claimed)
    setGift(claimed)
    if (reward) setJourney(grantWearable(j, reward.id))
    setGiftOpened({ reward })
    track('gift_claim')
  }, [today])

  // Open a node: the single obvious action from the path (Pillar 1).
  const openNode = useCallback((node) => {
    setRunSeed((Date.now() % 1000000) | 1)
    if (node.kind === NodeKind.LEARN || node.kind === NodeKind.MIX) return setScreen({ name: 'stone', node })
    if (node.kind === NodeKind.QUIZ) return setScreen({ name: 'lesson', levelId: node.levelId, nodeId: node.id })
    return setScreen({ name: 'arcade', node }) // ARCADE gateway
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
        <ErrorBoundary onReset={() => setScreen({ name: 'home' })} title="Oops! Let us go back to the path.">
        <AnimatePresence mode="wait">
          {screen.name === 'home' && (
            <Screen key="home">
              <JourneyPath
                journey={journey}
                soundOn={soundOn}
                onToggleSound={toggleSound}
                onOpen={openNode}
                onBackpack={() => setBackpackOpen(true)}
                onCloset={openCloset}
                giftReady={giftAvailable(gift, today)}
                onGift={openGift}
                justEarned={justEarned}
              />
            </Screen>
          )}
          {screen.name === 'closet' && (
            <Screen key="closet">
              <Closet
                collection={journey.collection}
                stats={progressStats(journey)}
                onEquip={(slot, id) => setJourney((j) => equipItem(j, slot, id))}
                onBack={() => setScreen({ name: 'home' })}
              />
            </Screen>
          )}
          {screen.name === 'explore' && (
            <Screen key="explore">
              <Explore soundOn={soundOn} onBack={() => setScreen({ name: 'home' })} initialFamily={screen.family ?? null} />
            </Screen>
          )}
          {screen.name === 'grownups' && (
            <Screen key="grownups">
              <GrownUps
                onBack={() => setScreen({ name: 'home' })}
                onPractice={(familyId) => setScreen({ name: 'explore', family: familyId })}
                onReplayLevel={(levelId) => startLesson(levelId)}
              />
            </Screen>
          )}
          {screen.name === 'classic' && (
            <Screen key="classic">
              <div className="relative">
                <Suspense fallback={null}>
                  <AmharicFidelGame />
                </Suspense>
                <button
                  type="button"
                  onClick={() => setScreen({ name: 'home' })}
                  className="chunk fixed bottom-4 left-4 z-50 rounded-2xl px-4 py-2 font-extrabold text-white"
                  style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px' }}
                >
                  Home
                </button>
              </div>
            </Screen>
          )}
          {screen.name === 'stone' && (
            <Screen key={`stone-${screen.node.id}`}>
              <StoneLessonForNode
                node={screen.node}
                soundOn={soundOn}
                onDone={() => markNodeDone(screen.node.id)}
                onBack={() => setScreen({ name: 'home' })}
              />
            </Screen>
          )}
          {screen.name === 'arcade' && (
            <Screen key={`arcade-${screen.node.id}-${runSeed}`}>
              <ArcadeGateway
                node={screen.node}
                seed={runSeed}
                soundOn={soundOn}
                onDone={() => markNodeDone(screen.node.id)}
                onRetry={() => {
                  setRunSeed((Date.now() % 1000000) | 1)
                  setScreen({ name: 'arcade', node: screen.node })
                }}
              />
            </Screen>
          )}
          {screen.name === 'words' && (
            <Screen key={`words-${runSeed}`}>
              <WordMatch seed={runSeed} soundOn={soundOn} onFinish={() => setScreen({ name: 'home' })} onReplay={startWords} />
            </Screen>
          )}
          {screen.name === 'practice' && (
            <Screen key={`practice-${runSeed}`}>
              <Lesson
                level={{ id: 'practice', n: '★', title: 'Star Practice' }}
                seed={runSeed}
                soundOn={soundOn}
                practiceQueue={screen.queue}
                onFinish={() => setScreen({ name: 'home' })}
                onReplay={startPractice}
              />
            </Screen>
          )}
          {screen.name === 'lesson' && (
            <Screen key={`lesson-${screen.levelId}-${runSeed}`}>
              <Lesson
                level={LEVELS.find((l) => l.id === screen.levelId)}
                seed={runSeed}
                soundOn={soundOn}
                onFinish={(levelId, result) => {
                  // Quitting (result === null) never completes the node - a
                  // boss quiz is a real gate, not a tap-through. Only a
                  // finished level marks its Journey node done + grants reward.
                  if (!result) {
                    setScreen({ name: 'home' })
                  } else if (screen.nodeId) {
                    setProgress((p) => { const n = mergeResult(p, levelId, result); saveProgress(n); return n })
                    markNodeDone(screen.nodeId, result.stars ?? 3)
                  } else {
                    finishLevel(levelId, result)
                  }
                }}
                onReplay={() => startLesson(screen.levelId)}
              />
            </Screen>
          )}
        </AnimatePresence>
        </ErrorBoundary>
        <AnimatePresence>
          {celebration && (
            <Celebration
              key="celebration"
              chapter={celebration.chapter}
              rewardName={celebration.rewardName}
              worn={wornLayers(journey.collection)}
              forms={progressStats(journey).forms}
              onClose={() => setCelebration(null)}
            />
          )}
          {giftOpened && (
            <GiftModal
              key="gift"
              reward={giftOpened.reward}
              worn={wornLayers(journey.collection)}
              forms={progressStats(journey).forms}
              onClose={() => setGiftOpened(null)}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {backpackOpen && (
            <Backpack
              key="backpack"
              onClose={() => setBackpackOpen(false)}
              troubleCount={troubleCount}
              onCloset={openCloset}
              onWords={() => { setBackpackOpen(false); startWords() }}
              onPractice={startPractice}
              onExplore={() => { setBackpackOpen(false); setScreen({ name: 'explore' }) }}
              onClassic={() => { setBackpackOpen(false); setScreen({ name: 'classic' }) }}
              onGrownUps={() => { setBackpackOpen(false); setScreen({ name: 'grownups' }) }}
            />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}

function Screen({ children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
      {children}
    </motion.div>
  )
}

/* ── Shared: chunky button ── */

const CHUNK_STYLES = {
  go: { bg: 'var(--go)', edge: 'var(--go-deep)', fg: '#fff' },
  accent: { bg: 'var(--accent)', edge: 'var(--accent-deep)', fg: '#fff' },
  sky: { bg: 'var(--sky)', edge: 'var(--sky-deep)', fg: '#fff' },
  bad: { bg: 'var(--bad)', edge: 'var(--bad-deep)', fg: '#fff' },
  card: { bg: 'var(--card)', edge: 'var(--line)', fg: 'var(--ink)' },
}

function Chunky({ tone = 'go', className = '', style, children, depth = 4, ...props }) {
  const t = CHUNK_STYLES[tone]
  return (
    <button
      type="button"
      className={`chunk rounded-2xl font-extrabold tracking-wide disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS} ${className}`}
      style={{
        background: t.bg,
        color: t.fg,
        boxShadow: `0 ${depth}px 0 ${t.edge}`,
        '--chunk-depth': `${depth}px`,
        outlineColor: 'var(--sky)',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}

/* ── Shared: character sprites (canvas art rendered into the DOM) ── */

export function Sprite2D({ draw, mood = 'happy', size = 96, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.width = c.height = 256
    const g = c.getContext('2d')
    if (!g) return
    g.clearRect(0, 0, 256, 256)
    draw(g, 256, mood)
  }, [draw, mood])
  return <canvas ref={ref} className={className} style={{ width: size, height: size }} aria-hidden="true" />
}

/* Anbessa's wardrobe (Pillar 3). Wearables are drawn in code as extra
   layers composited over the base sprite - no image assets, consistent with
   the rest of the character art. Order: cape (behind), scarf, hat (on top). */
const CAPE_COLORS = { 'cape-green': '#2fae66', 'cape-star': '#6b46c1', 'cape-royal': '#b23a48' }
const SCARF_COLORS = { 'scarf-red': '#e5484d', 'scarf-gold': '#f5b301', 'scarf-blue': '#4aa3e0' }
export function drawWearables(g, s, worn) {
  const cx = s / 2
  const cape = worn.find((w) => w.slot === 'cape')
  if (cape) {
    g.fillStyle = CAPE_COLORS[cape.id] || '#6b46c1'
    g.beginPath()
    g.moveTo(cx - s * 0.17, s * 0.56)
    g.quadraticCurveTo(cx - s * 0.3, s * 0.82, cx - s * 0.12, s * 0.9)
    g.lineTo(cx + s * 0.12, s * 0.9)
    g.quadraticCurveTo(cx + s * 0.3, s * 0.82, cx + s * 0.17, s * 0.56)
    g.closePath()
    g.fill()
    if (cape.id === 'cape-star') {
      starPath(g, cx, s * 0.74, s * 0.05, s * 0.022)
      g.fillStyle = '#ffd94d'
      g.fill()
    }
  }
  const scarf = worn.find((w) => w.slot === 'scarf')
  if (scarf) {
    g.fillStyle = SCARF_COLORS[scarf.id] || '#e5484d'
    g.beginPath()
    g.roundRect(cx - s * 0.16, s * 0.55, s * 0.32, s * 0.06, s * 0.03)
    g.fill()
    g.beginPath()
    g.roundRect(cx - s * 0.04, s * 0.58, s * 0.08, s * 0.1, s * 0.02)
    g.fill()
  }
  const hat = worn.find((w) => w.slot === 'hat')
  if (hat) {
    if (hat.id === 'hat-crown') {
      g.fillStyle = '#ffc800'
      g.beginPath()
      g.moveTo(cx - s * 0.16, s * 0.17)
      g.lineTo(cx - s * 0.16, s * 0.08)
      g.lineTo(cx - s * 0.08, s * 0.14)
      g.lineTo(cx, s * 0.07)
      g.lineTo(cx + s * 0.08, s * 0.14)
      g.lineTo(cx + s * 0.16, s * 0.08)
      g.lineTo(cx + s * 0.16, s * 0.17)
      g.closePath()
      g.fill()
      g.fillStyle = '#e5484d'
      g.beginPath()
      g.arc(cx, s * 0.145, s * 0.018, 0, 7)
      g.fill()
    } else if (hat.id === 'hat-cap') {
      g.fillStyle = '#3b82f6'
      g.beginPath()
      g.arc(cx, s * 0.16, s * 0.15, Math.PI, 0)
      g.fill()
      g.beginPath()
      g.ellipse(cx + s * 0.16, s * 0.16, s * 0.11, s * 0.028, 0, 0, Math.PI)
      g.fill()
    } else {
      g.fillStyle = '#d9b24e'
      g.beginPath()
      g.ellipse(cx, s * 0.17, s * 0.22, s * 0.05, 0, 0, 7)
      g.fill()
      g.fillStyle = '#e6c86a'
      g.beginPath()
      g.ellipse(cx, s * 0.12, s * 0.11, s * 0.06, 0, 0, 7)
      g.fill()
    }
  }
}

/** Anbessa the lion cub, in his current wardrobe, with Kokeb bobbing along. */
export function Hero({ size = 104, mood = 'happy', worn = [] }) {
  const wornKey = worn.map((w) => w.id).join(',')
  return (
    <div className="relative inline-block" style={{ width: size, height: size }} aria-hidden="true">
      <Sprite2D draw={drawAnbessa} mood={mood} size={size} />
      {worn.length > 0 && <Sprite2D key={wornKey} draw={(g, sz) => drawWearables(g, sz, worn)} size={size} className="absolute left-0 top-0" />}
      <motion.div
        className="absolute"
        style={{ right: -size * 0.08, top: -size * 0.04 }}
        animate={{ y: [0, -size * 0.05, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Star style={{ width: size * 0.3, height: size * 0.3, color: 'var(--star)', fill: 'var(--star)' }} strokeWidth={1} />
      </motion.div>
    </div>
  )
}

/* ── Home: the unified Journey path (Pillar 1) ──────────────────────────
   Nine screens collapsed into one winding path of typed nodes. Exactly one
   node is "current" (the first not-yet-done, from nextNode); it pulses and
   scrolls into view. Boss (QUIZ) and gateway (ARCADE) nodes are shaped and
   coloured differently so a pre-reader reads "something special" without
   reading a word. Utilities live in the Backpack, off the main path. */

const nodeGlyph = (node) => {
  if (node.kind === NodeKind.LEARN) return formOf(`${node.familyId}-1`)?.char ?? '?'
  if (node.kind === NodeKind.MIX) return '፨'
  return null
}

function PathNode({ node, done, unlocked, highlight, side, innerRef, onClick }) {
  const isBoss = node.kind === NodeKind.QUIZ
  const isArcade = node.kind === NodeKind.ARCADE
  const big = isBoss || isArcade
  const size = big ? 76 : 60
  const label =
    node.kind === NodeKind.LEARN
      ? `Learn ${node.familyId}`
      : node.kind === NodeKind.MIX
        ? 'Mix challenge'
        : isBoss
          ? `Quiz level ${node.levelId?.split('-')[1]}`
          : node.gateway.mode === 'runner'
            ? 'Letter Runner'
            : 'Fidel Skylands'
  const bg = done ? 'var(--star)' : unlocked ? (isArcade ? 'var(--go)' : isBoss ? 'var(--accent)' : 'var(--card)') : 'var(--line)'
  const fg = done ? '#7c5200' : unlocked ? (big ? '#fff' : 'var(--ink)') : 'var(--muted)'
  const radius = isBoss ? '30% 70% 70% 30% / 30% 30% 70% 70%' : isArcade ? '50%' : '1.1rem'

  return (
    <div ref={innerRef} className="flex w-full items-center" style={{ justifyContent: side < 0 ? 'flex-start' : 'flex-end' }}>
      <div className="flex flex-col items-center" style={{ width: 132 }}>
        <motion.button
          type="button"
          disabled={!unlocked}
          onClick={onClick}
          whileTap={unlocked ? { scale: 0.92 } : {}}
          animate={highlight ? { scale: [1, 1.08, 1], transition: { duration: 1.3, repeat: Infinity } } : { scale: 1 }}
          className={`geez relative flex items-center justify-center border-2 font-black ${FOCUS}`}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            fontSize: big ? 22 : 26,
            background: bg,
            color: fg,
            borderColor: done ? 'var(--accent)' : unlocked ? (big ? 'transparent' : 'var(--accent)') : 'var(--line)',
            boxShadow: unlocked ? `0 5px 0 ${done ? 'var(--accent)' : big ? 'rgba(0,0,0,0.18)' : 'var(--line)'}` : 'none',
            outlineColor: 'var(--sky)',
          }}
          aria-label={`${label}${done ? ', done' : unlocked ? '' : ', locked'}`}
          aria-current={highlight ? 'step' : undefined}
        >
          {!unlocked ? (
            <Lock className="h-5 w-5" aria-hidden="true" />
          ) : isArcade ? (
            node.gateway.mode === 'runner' ? <Flame className="h-7 w-7" aria-hidden="true" /> : <TreePine className="h-7 w-7" aria-hidden="true" />
          ) : isBoss ? (
            <Star className="h-7 w-7" fill="currentColor" aria-hidden="true" />
          ) : (
            nodeGlyph(node)
          )}
          {done && <Check className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-white p-0.5" style={{ color: 'var(--go)' }} aria-hidden="true" />}
        </motion.button>
        {highlight && (
          <motion.span className="mt-1 rounded-full px-2 py-0.5 text-[11px] font-black text-white" style={{ background: 'var(--go)' }} animate={{ y: [0, -2, 0] }} transition={{ duration: 1, repeat: Infinity }}>
            {t('start', 'Start')}
          </motion.span>
        )}
      </div>
    </div>
  )
}

function JourneyPath({ journey, soundOn, onToggleSound, onOpen, onBackpack, onCloset, giftReady, onGift, justEarned }) {
  const current = nextNode(journey)
  const currentRef = useRef(null)
  const doneCount = Object.keys(journey.done).length
  const worn = wornLayers(journey.collection)
  useEffect(() => {
    currentRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  }, [current?.id])

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 pb-20 pt-3">
      <header className="sticky top-0 z-20 -mx-5 flex items-center justify-between gap-2 px-5 py-2" style={{ background: 'var(--paper)' }}>
        <button type="button" onClick={onCloset} aria-label={t('openCloset', "Open Anbessa's Closet")} className={`flex items-center gap-2 rounded-2xl ${FOCUS}`} style={{ outlineColor: 'var(--sky)' }}>
          <Hero size={48} worn={worn} />
          <div className="text-left">
            <h1 className="text-base font-black leading-none">Fidel Quest</h1>
            <p className="mono text-xs font-bold" style={{ color: 'var(--muted)' }}>
              {doneCount}/{JOURNEY.length}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          {giftReady && (
            <motion.button
              type="button"
              onClick={onGift}
              aria-label={t('dailyGift', "Open Anbessa's gift")}
              animate={{ rotate: [0, -8, 8, -8, 0], scale: [1, 1.06, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.6 }}
              className={`chunk relative flex h-11 w-11 items-center justify-center rounded-2xl text-white ${FOCUS}`}
              style={{ background: 'var(--accent)', border: '2px solid var(--accent)', boxShadow: '0 3px 0 var(--accent-deep)', outlineColor: 'var(--sky)', '--chunk-depth': '3px' }}
            >
              <Gift className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full" style={{ background: 'var(--bad)', border: '2px solid var(--paper)' }} aria-hidden="true" />
            </motion.button>
          )}
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}
            aria-pressed={soundOn}
            className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`}
            style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', color: 'var(--muted)', outlineColor: 'var(--sky)', '--chunk-depth': '3px' }}
          >
            {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={onBackpack}
            aria-label="Open backpack"
            className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`}
            style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', color: 'var(--muted)', outlineColor: 'var(--sky)', '--chunk-depth': '3px' }}
          >
            <BackpackIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {justEarned && (
          <motion.div
            key={justEarned.id}
            initial={{ opacity: 0, y: -14, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="mx-auto mt-2 flex items-center gap-2 rounded-2xl px-4 py-2 font-black text-white"
            style={{ background: 'var(--go)' }}
          >
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            {t('newReward', 'New!')} {justEarned.name}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 flex flex-col items-center gap-2">
        {JOURNEY.map((node, i) => {
          const done = !!journey.done[node.id]
          const isNext = current ? node.id === current.id : false
          const unlocked = isNext || done
          return (
            <PathNode
              key={node.id}
              node={node}
              done={done}
              unlocked={unlocked}
              highlight={isNext}
              side={i % 2 === 0 ? -1 : 1}
              innerRef={isNext ? currentRef : null}
              onClick={unlocked ? () => onOpen(node) : undefined}
            />
          )
        })}
        {!current && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl px-4 py-2 font-extrabold" style={{ background: 'var(--go-soft)', color: 'var(--go-ink)' }}>
            <Sparkles className="h-5 w-5" aria-hidden="true" /> {t('champion', 'Fidel Champion - every star earned!')}
          </div>
        )}
      </div>
      <InstallBanner />
    </div>
  )
}

function BackpackItem({ icon, title, sub, onClick, tone = 'var(--sky)' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chunk flex w-full items-center gap-4 rounded-3xl p-4 text-left ${FOCUS}`}
      style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)', outlineColor: 'var(--sky)' }}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: tone }} aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold">{title}</span>
        <span className="block text-sm font-semibold" style={{ color: 'var(--muted)' }}>
          {sub}
        </span>
      </span>
    </button>
  )
}

function Backpack({ onClose, onExplore, onClassic, onGrownUps, onWords, onPractice, onCloset, troubleCount }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md rounded-3xl p-5"
        style={{ background: 'var(--paper)' }}
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black">{t('backpack', 'Backpack')}</h2>
          <button type="button" onClick={onClose} aria-label="Close backpack" className={`flex h-9 w-9 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <BackpackItem icon={<Shirt className="h-6 w-6" />} tone="var(--go)" title={t('closetTitle', "Anbessa's Closet")} sub={t('closetSub', 'Dress up Anbessa and share!')} onClick={onCloset} />
          <BackpackItem icon={<span className="geez text-xl font-black">ቀለ</span>} tone="var(--go)" title={t('wordsTitle', 'First Words')} sub={t('wordsSub', 'Hear the word, tap its picture')} onClick={onWords} />
          {troubleCount > 0 && (
            <BackpackItem icon={<Star className="h-6 w-6" fill="currentColor" />} tone="var(--star)" title={t('practiceTitle', 'Star Practice')} sub={t('practiceSub', `${troubleCount} tricky letters to make strong`, { n: troubleCount })} onClick={onPractice} />
          )}
          <BackpackItem icon={<BookOpen className="h-6 w-6" />} tone="var(--sky)" title={t('explorerTitle', 'Letter Explorer')} sub={t('explorerSub', 'Tap any of the 231 letters to hear it')} onClick={onExplore} />
          <BackpackItem icon={<Pencil className="h-6 w-6" />} tone="var(--star)" title={t('classicTitle', 'Classic Game')} sub={t('classicSub', 'Chant the orders, trace letters, learn first words')} onClick={onClassic} />
          <BackpackItem icon={<Sparkles className="h-6 w-6" />} tone="var(--accent)" title={t('grownups', 'For grown-ups: progress and tips')} sub={t('grownupsSub', 'See progress and tricky letters')} onClick={onGrownUps} />
        </div>
        <button
          type="button"
          onClick={() => {
            setLang(getLang() === 'am' ? 'en' : 'am')
            window.location.reload()
          }}
          className={`mx-auto mt-4 block rounded-xl px-4 py-2 text-sm font-black ${FOCUS}`}
          style={{ background: 'var(--card)', border: '2px solid var(--line)', color: 'var(--muted)', outlineColor: 'var(--sky)' }}
        >
          {getLang() === 'am' ? 'English' : 'አማርኛ'}
        </button>
      </motion.div>
    </motion.div>
  )
}

/* Add-to-home-screen nudge (growth). Shows a dismissible banner when the app
   is installable (native prompt) or on iOS (manual steps). Never nags twice. */
function InstallBanner() {
  const [state, setState] = useState(installState)
  const [iosOpen, setIosOpen] = useState(false)
  useEffect(() => onInstallChange(() => setState(installState())), [])
  if (state === 'none') return null
  return (
    <AnimatePresence>
      <motion.div
        key="install"
        className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-lg items-center gap-3 rounded-2xl p-3 shadow-lg"
        style={{ background: 'var(--card)', border: '2px solid var(--accent)' }}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
      >
        <Hero size={44} />
        <p className="min-w-0 flex-1 text-sm font-extrabold leading-tight">{t('installTitle', 'Add Anbessa to your home screen')}</p>
        <button
          type="button"
          onClick={state === 'prompt' ? promptInstall : () => setIosOpen(true)}
          className={`chunk shrink-0 rounded-xl px-4 py-2 text-sm font-black text-white ${FOCUS}`}
          style={{ background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}
        >
          {state === 'prompt' ? t('installCta', 'Add') : t('installHow', 'How?')}
        </button>
        <button type="button" onClick={dismissInstall} aria-label={t('dismiss', 'Not now')} className={`shrink-0 rounded-lg p-1 ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <X className="h-5 w-5" />
        </button>
      </motion.div>
      {iosOpen && (
        <motion.div key="ios" className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIosOpen(false)}>
          <motion.div className="w-full max-w-sm rounded-3xl p-6 text-center" style={{ background: 'var(--paper)' }} initial={{ y: 40 }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()}>
            <Hero size={72} />
            <p className="mt-3 font-extrabold">{t('installIosHint', "Tap the Share button, then 'Add to Home Screen'")}</p>
            <button type="button" onClick={() => setIosOpen(false)} className={`chunk mt-4 rounded-2xl px-6 py-2.5 font-black text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}>
              {t('gotIt', 'Got it')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* Daily Gift reveal (retention). A new wearable -> wear it + offer a share;
   once everything is collected -> a warm come-back-anytime moment. */
function GiftModal({ reward, worn, forms, onClose }) {
  const [busy, setBusy] = useState(false)
  const share = async () => {
    setBusy(true)
    await shareAnbessa({ forms, worn })
    setBusy(false)
    onClose()
  }
  return (
    <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.55)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Confetti count={40} />
      <motion.div className="relative w-full max-w-sm rounded-3xl p-6 text-center" style={{ background: 'var(--paper)' }} initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }}>
        <motion.div initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 11, delay: 0.1 }}>
          <Hero size={150} worn={worn} />
        </motion.div>
        <h2 className="mt-3 text-2xl font-black">{t('giftTitle', 'A gift from Anbessa!')}</h2>
        <p className="mt-1 font-bold" style={{ color: 'var(--muted)' }}>
          {reward ? t('giftGot', `A new ${reward.name}!`, { item: reward.name }) : t('giftAllDone', "You've collected everything - so happy you came back!")}
        </p>
        <div className="mt-5 flex flex-col gap-3">
          {reward && (
            <button type="button" onClick={share} disabled={busy} className={`chunk flex items-center justify-center gap-2 rounded-2xl px-6 py-3 font-black text-white disabled:opacity-60 ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}>
              <Share2 className="h-5 w-5" aria-hidden="true" /> {shareCtaLabel(t)}
            </button>
          )}
          <button type="button" onClick={onClose} className={`chunk rounded-2xl px-6 py-3 font-black ${FOCUS}`} style={{ background: reward ? 'var(--card)' : 'var(--go)', border: reward ? '2px solid var(--line)' : 'none', color: reward ? 'var(--ink)' : '#fff', boxShadow: `0 4px 0 ${reward ? 'var(--line)' : 'var(--go-deep)'}`, '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}>
            {reward ? t('keepGoing', 'Keep going') : t('gotIt', 'Got it')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* Chapter-complete celebration (the peak-pride share prompt). Anbessa bursts
   in wearing the freshly-earned item; the primary action is Share. */
function Celebration({ chapter, rewardName, worn, forms, onClose }) {
  const [busy, setBusy] = useState(false)
  const share = async () => {
    setBusy(true)
    await shareAnbessa({ forms, worn })
    setBusy(false)
    onClose()
  }
  return (
    <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.55)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Confetti count={42} />
      <motion.div className="relative w-full max-w-sm rounded-3xl p-6 text-center" style={{ background: 'var(--paper)' }} initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }}>
        <motion.div initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 11, delay: 0.1 }}>
          <Hero size={150} worn={worn} />
        </motion.div>
        <h2 className="mt-3 text-2xl font-black">{t('chapterDone', `Chapter ${chapter} complete!`, { n: chapter })}</h2>
        {rewardName && (
          <p className="mt-1 font-bold" style={{ color: 'var(--muted)' }}>
            {t('earnedItem', `Anbessa earned the ${rewardName}!`, { item: rewardName })}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-3">
          <button type="button" onClick={share} disabled={busy} className={`chunk flex items-center justify-center gap-2 rounded-2xl px-6 py-3 font-black text-white disabled:opacity-60 ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px', outlineColor: 'var(--sky)' }}>
            <Share2 className="h-5 w-5" aria-hidden="true" /> {shareCtaLabel(t)}
          </button>
          <button type="button" onClick={onClose} className={`chunk rounded-2xl px-6 py-3 font-black ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)', '--chunk-depth': '4px', color: 'var(--ink)', outlineColor: 'var(--sky)' }}>
            {t('keepGoing', 'Keep going')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Explore Mode ── */

function Explore({ soundOn, onBack, initialFamily = null }) {
  const [openFamily, setOpenFamily] = useState(initialFamily)
  const family = FIDEL_FAMILIES.find((f) => f.id === openFamily)

  return (
    <div className="mx-auto min-h-screen max-w-xl px-5 pb-12 pt-6">
      <header className="flex items-center gap-3">
        <Chunky tone="card" className="flex h-11 w-11 items-center justify-center" aria-label="Back" onClick={() => (family ? setOpenFamily(null) : onBack())} depth={3}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </Chunky>
        <div>
          <h1 className="text-xl font-black leading-tight">{family ? `The ${family.name} family` : 'Letter Explorer'}</h1>
          <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            {family ? 'Seven forms, one letter — tap to hear each' : '33 letter families · tap to open'}
          </p>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {!family ? (
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {FIDEL_FAMILIES.map((f) => {
              const base = formOf(`${f.id}-1`)
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    playForm(base, soundOn)
                    setOpenFamily(f.id)
                  }}
                  className={`chunk flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 ${FOCUS}`}
                  style={{ background: 'var(--card)', borderColor: 'var(--line)', boxShadow: '0 4px 0 var(--line)', outlineColor: 'var(--sky)' }}
                >
                  <span className="geez text-4xl font-black">{base.char}</span>
                  <span className="text-xs font-extrabold" style={{ color: 'var(--muted)' }}>
                    {f.name}
                    {f.word?.picture && <span className="ml-1" aria-hidden="true">{f.word.picture}</span>}
                  </span>
                </button>
              )
            })}
          </motion.div>
        ) : (
          <motion.div key={family.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="mt-6">
            <FamilyDetail family={family} soundOn={soundOn} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FamilyDetail({ family, soundOn }) {
  const forms = useMemo(() => ALL_FORMS.filter((f) => f.familyId === family.id), [family.id])
  const [active, setActive] = useState(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {forms.map((form) => (
          <motion.button
            key={form.audioKey}
            type="button"
            onClick={() => {
              playForm(form, soundOn)
              setActive(form.audioKey)
            }}
            animate={active === form.audioKey ? { scale: [1, 1.12, 1] } : {}}
            transition={{ duration: 0.3 }}
            className={`chunk flex flex-col items-center gap-1 rounded-2xl border-2 py-4 ${FOCUS}`}
            style={{ background: 'var(--card)', borderColor: active === form.audioKey ? 'var(--sky)' : 'var(--line)', boxShadow: '0 4px 0 var(--line)', outlineColor: 'var(--sky)' }}
          >
            <span className="geez text-5xl font-black">{form.char}</span>
            <span className="mono text-sm font-bold" style={{ color: 'var(--sky)' }}>
              {form.sound}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              {ORDERS[form.order - 1].geezName}
            </span>
          </motion.button>
        ))}
        {family.labial && (
          <button
            type="button"
            onClick={() => playEffect('good', soundOn)}
            className={`chunk flex flex-col items-center gap-1 rounded-2xl border-2 border-dashed py-4 ${FOCUS}`}
            style={{ background: 'var(--card)', borderColor: 'var(--accent)', boxShadow: '0 4px 0 var(--line)', outlineColor: 'var(--sky)' }}
          >
            <span className="geez text-5xl font-black" style={{ color: 'var(--accent)' }}>
              {family.labial}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
              Bonus form
            </span>
          </button>
        )}
      </div>

      {family.word && (
        <div className="flex items-center gap-4 rounded-3xl border-2 p-5" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          <span className="text-5xl" aria-hidden="true">
            {family.word.picture}
          </span>
          <div>
            <p className="geez text-3xl font-black">{family.word.geez}</p>
            <p className="text-sm font-bold" style={{ color: 'var(--muted)' }}>
              {family.word.latin} · {family.word.meaning}
            </p>
          </div>
        </div>
      )}

      {family.nickname && (
        <p className="text-center text-sm font-semibold" style={{ color: 'var(--muted)' }}>
          Schools call this letter “{family.nickname}”
          {family.twinOf && <> — it sounds just like {family.twinOf}</>}
        </p>
      )}
    </div>
  )
}

/* ── Lesson ── */

function machineReducer(ctx, event) {
  return transition(ctx, event).next
}

function Lesson({ level, seed, soundOn, onFinish, onReplay, practiceQueue = null }) {
  const [ctx, dispatch] = useReducer(machineReducer, undefined, () => transition(initialContext(seed), { type: GameEvent.START_LEVEL, payload: { levelId: level.id, seed, queue: practiceQueue ?? undefined } }).next)
  const isPractice = level.id === 'practice'

  // Shadow tutorial: on first open the Ghost Hand plays one question of the
  // REAL machine, then the level restarts fresh and the child takes over.
  const [demo, setDemo] = useState(() => !hasOnboarded('lesson') && !prefersReducedMotion())
  const demoRef = useRef(demo)
  demoRef.current = demo
  const [hand, setHand] = useState({ x: null, y: null })
  const [yourTurn, setYourTurn] = useState(false)
  const endDemo = useCallback(() => {
    markOnboarded('lesson')
    setDemo(false)
    setHand({ x: null, y: null })
    setYourTurn(true)
    setTimeout(() => setYourTurn(false), 1700)
    dispatch({ type: GameEvent.EXIT })
    dispatch({ type: GameEvent.START_LEVEL, payload: { levelId: level.id, seed: ((seed * 7919 + 13) % 1000000) | 1 } })
  }, [level.id, seed])
  useEffect(() => {
    if (!hasOnboarded('lesson') && prefersReducedMotion()) markOnboarded('lesson')
  }, [])

  const question = selectQuestion(ctx)
  const targetForm = question ? formOf(question.target) : null
  const progress = selectProgress(ctx)
  const accuracy = selectAccuracy(ctx)

  // Demo driver: dispatches the correct events on a timeline while the
  // overlay owns input. The machine cannot tell a ghost from a child.
  useEffect(() => {
    if (!demo) return undefined
    const timers = []
    if (ctx.status === GameState.AWAITING_INPUT && question) {
      timers.push(setTimeout(() => setHand(tutTargetCenter(`opt-${question.target}`) || { x: null, y: null }), 550))
      timers.push(setTimeout(() => dispatch({ type: GameEvent.SELECT_OPTION, payload: { audioKey: question.target } }), 2000))
    }
    if (ctx.status === GameState.SUCCESS_BURST) {
      timers.push(setTimeout(() => setHand(tutTargetCenter('continue') || { x: null, y: null }), 450))
      timers.push(setTimeout(() => endDemo(), 1700))
    }
    return () => timers.forEach(clearTimeout)
  }, [demo, ctx.status, ctx.cursor]) // eslint-disable-line react-hooks/exhaustive-deps

  // PRESENTATION: play the prompt, then auto-advance to input.
  useEffect(() => {
    if (ctx.status !== GameState.PRESENTATION) return undefined
    playForm(targetForm, soundOn)
    const next = ctx.queue[ctx.cursor + 1]
    if (next) preloadForms([formOf(next.target)])
    const t = setTimeout(() => dispatch({ type: GameEvent.PRESENTATION_DONE }), 1300)
    return () => clearTimeout(t)
  }, [ctx.status, ctx.cursor]) // eslint-disable-line react-hooks/exhaustive-deps

  // Feedback sounds fire on state entry.
  useEffect(() => {
    const q = ctx.queue[ctx.cursor]
    if (ctx.status === GameState.SUCCESS_BURST) {
      playEffect('good', soundOn)
      if (q && !demoRef.current) recordAnswer(q.target, q.target, isPractice ? 'practice' : 'lesson')
    }
    if (ctx.status === GameState.ERROR_RECOVERY) {
      playEffect('bad', soundOn)
      if (q && !demoRef.current) recordAnswer(q.target, ctx.wrongPicks[ctx.wrongPicks.length - 1], isPractice ? 'practice' : 'lesson')
    }
    if (ctx.status === GameState.LEVEL_COMPLETE) playEffect('win', soundOn)
  }, [ctx.status]) // eslint-disable-line react-hooks/exhaustive-deps

  if (ctx.status === GameState.LEVEL_COMPLETE) {
    const result = isPractice ? null : { stars: starsForAccuracy(accuracy), bestStreak: ctx.bestStreak, accuracy }
    return (
      <LevelComplete
        level={level}
        accuracy={accuracy}
        stars={isPractice ? null : starsForAccuracy(accuracy)}
        bestStreak={ctx.bestStreak}
        onContinue={() => onFinish(level.id, result)}
        onReplay={() => {
          onFinish(level.id, result)
          onReplay()
        }}
      />
    )
  }

  const showSheet = ctx.status === GameState.SUCCESS_BURST || ctx.status === GameState.ERROR_RECOVERY
  const presenting = ctx.status === GameState.PRESENTATION

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 pb-44 pt-5">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => onFinish(level.id, null)} aria-label="Quit lesson" className={`flex h-10 w-10 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <X className="h-6 w-6" />
        </button>
        <div className="flex h-4 flex-1 gap-1.5" role="progressbar" aria-valuenow={progress.answered} aria-valuemin={0} aria-valuemax={progress.total} aria-label="Lesson progress">
          {Array.from({ length: progress.total }, (_, i) => (
            <motion.div
              key={i}
              className="h-full flex-1 rounded-full"
              animate={{ background: i < progress.answered ? 'var(--go)' : i === ctx.cursor ? 'var(--accent)' : 'var(--line)' }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
        <AnimatePresence>
          {ctx.streak >= 2 && (
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              className="flex items-center gap-1 rounded-xl px-2.5 py-1 font-black"
              style={{ background: 'var(--accent)', color: '#fff' }}
              aria-label={`Streak: ${ctx.streak}`}
            >
              <Flame className="h-4 w-4" fill="currentColor" aria-hidden="true" />
              {ctx.streak}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex flex-1 flex-col justify-center gap-6 py-6">
        <div className="text-center">
          <p className="text-lg font-extrabold">
            {t('whichLetter', 'Which letter says')}{' '}
            <button
              type="button"
              onClick={() => playForm(targetForm, soundOn)}
              className={`chunk inline-flex items-center gap-1.5 rounded-xl px-3 py-1 align-middle text-white ${FOCUS}`}
              style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px', outlineColor: 'var(--accent)' }}
              aria-label={`Play the sound ${targetForm?.sound} again`}
            >
              <Volume2 className="h-5 w-5" aria-hidden="true" />“{targetForm?.sound}”
            </button>
            ?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {question?.options.map((key) => {
            const form = formOf(key)
            const isTarget = key === question.target
            const isWrongPick = ctx.wrongPicks.includes(key)
            const showAsCorrect = ctx.status === GameState.SUCCESS_BURST && isTarget
            const showAsWrong = ctx.status === GameState.ERROR_RECOVERY && key === ctx.wrongPicks[ctx.wrongPicks.length - 1]
            return (
              <motion.button
                key={`${ctx.cursor}-${key}`}
                type="button"
                disabled={presenting || showSheet || isWrongPick}
                onClick={() => dispatch({ type: GameEvent.SELECT_OPTION, payload: { audioKey: key } })}
                animate={showAsWrong ? { x: [0, -9, 9, -6, 6, 0] } : showAsCorrect ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 0.4 }}
                className={`chunk geez flex h-32 items-center justify-center rounded-3xl border-2 text-6xl font-black sm:h-36 ${FOCUS}`}
                style={{
                  background: showAsCorrect ? 'var(--go-soft)' : showAsWrong ? 'var(--bad-soft)' : 'var(--card)',
                  borderColor: showAsCorrect ? 'var(--go)' : showAsWrong ? 'var(--bad)' : 'var(--line)',
                  color: showAsCorrect ? 'var(--go-ink)' : showAsWrong ? 'var(--bad-ink)' : 'var(--ink)',
                  boxShadow: `0 5px 0 ${showAsCorrect ? 'var(--go)' : showAsWrong ? 'var(--bad)' : 'var(--line)'}`,
                  '--chunk-depth': '5px',
                  opacity: isWrongPick && !showAsWrong ? 0.35 : presenting ? 0.6 : 1,
                  outlineColor: 'var(--sky)',
                }}
                aria-label={`Choose the letter that says ${form.sound}`}
                data-tut={`opt-${key}`}
              >
                {form.char}
              </motion.button>
            )
          })}
        </div>

        <div className="h-6 text-center" aria-live="polite">
          {presenting && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-bold" style={{ color: 'var(--muted)' }}>
              {t('listen', 'Listen…')}
            </motion.p>
          )}
        </div>
      </main>

      <FeedbackSheet ctx={ctx} targetForm={targetForm} onContinue={() => dispatch({ type: GameEvent.FEEDBACK_DONE })} />
      {demo && <GhostHand x={hand.x} y={hand.y} visible onSkip={endDemo} />}
      <AnimatePresence>
        {yourTurn && (
          <motion.p initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-x-0 top-1/3 z-50 text-center text-3xl font-black" style={{ color: 'var(--go-ink)' }}>
            {t('yourTurn', 'Your turn!')}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function FeedbackSheet({ ctx, targetForm, onContinue }) {
  const success = ctx.status === GameState.SUCCESS_BURST
  const error = ctx.status === GameState.ERROR_RECOVERY
  return (
    <AnimatePresence>
      {(success || error) && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 500, damping: 42 }}
          className="fixed inset-x-0 bottom-0 z-40"
          style={{ background: success ? 'var(--go-soft)' : 'var(--bad-soft)' }}
          role="alertdialog"
          aria-live="assertive"
          aria-label={success ? 'Correct answer' : 'Wrong answer'}
        >
          <div className="mx-auto flex max-w-xl items-center gap-4 px-5 py-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: success ? 'var(--go)' : 'var(--bad)', color: '#fff' }} aria-hidden="true">
              {success ? <Check className="h-7 w-7" strokeWidth={3.5} /> : <X className="h-7 w-7" strokeWidth={3.5} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-black" style={{ color: success ? 'var(--go-ink)' : 'var(--bad-ink)' }}>
                {success ? (ctx.streak >= 3 ? t('amazing', `Amazing! ${ctx.streak} in a row!`, { n: ctx.streak }) : t('nice', 'Nice!')) : t('notQuite', 'Not quite!')}
              </p>
              <p className="font-bold" style={{ color: success ? 'var(--go-ink)' : 'var(--bad-ink)' }}>
                <span className="geez text-xl">{targetForm?.char}</span> {t('saysWord', 'says')} “{targetForm?.sound}”{error && t('tryAgain', ' — listen and try again')}
              </p>
            </div>
            <Chunky tone={success ? 'go' : 'bad'} className="shrink-0 px-6 py-3.5 text-sm uppercase" onClick={onContinue} data-tut="continue">
              {success ? t('continue', 'Continue') : t('gotIt', 'Got it')}
            </Chunky>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── Level complete ── */

function LevelComplete({ level, accuracy, stars, bestStreak, onContinue, onReplay }) {
  return (
    <div className="relative mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center overflow-hidden px-5 py-10 text-center">
      <Confetti />
      <motion.div initial={{ scale: 0.5, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 15 }}>
        <span className="flex items-end gap-3"><Sprite2D draw={drawZebra} size={84} /><Hero size={124} /></span>
      </motion.div>

      <motion.h1 className="mt-4 text-3xl font-black uppercase tracking-wide" style={{ color: 'var(--go-ink)' }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        {stars === null ? t('practiceComplete', 'Practice complete!') : t('levelComplete', 'Level complete!')}
      </motion.h1>
      <p className="mt-1 font-bold" style={{ color: 'var(--muted)' }}>
        {t(`${level.id}.title`, level.title)}
      </p>

      {stars === null ? (
        <p className="mt-5 max-w-xs font-bold" style={{ color: 'var(--muted)' }}>
          {t('practicePraise', 'Those tricky letters are getting stronger. Kokeb is proud of you!')}
        </p>
      ) : (
      <div className="mt-5 flex items-end gap-2" aria-label={`${stars} of 3 stars earned`}>
        {[0, 1, 2].map((i) => (
          <motion.div key={i} initial={{ scale: 0, rotate: -30 }} animate={{ scale: i < stars ? 1 : 0.72, rotate: 0 }} transition={{ delay: 0.35 + i * 0.18, type: 'spring', stiffness: 300, damping: 12 }}>
            <Star
              className={i === 1 ? 'h-20 w-20' : 'h-14 w-14'}
              style={i < stars ? { color: 'var(--star)', fill: 'var(--star)', filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.12))' } : { color: 'var(--line)' }}
              strokeWidth={1}
              aria-hidden="true"
            />
          </motion.div>
        ))}
      </div>
      )}

      <motion.div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
        <div className="rounded-2xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            {t('firstTry', 'First-try')}
          </p>
          <p className="mono text-2xl font-black" style={{ color: 'var(--go-ink)' }}>
            {accuracy}%
          </p>
        </div>
        <div className="rounded-2xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            {t('bestStreak', 'Best streak')}
          </p>
          <p className="mono flex items-center justify-center gap-1 text-2xl font-black" style={{ color: 'var(--accent)' }}>
            <Flame className="h-6 w-6" fill="currentColor" aria-hidden="true" />
            {bestStreak}
          </p>
        </div>
      </motion.div>

      <motion.div className="mt-8 flex w-full max-w-sm flex-col gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
        <Chunky tone="go" className="w-full py-4 text-base uppercase" onClick={onContinue}>
          {t('continue', 'Continue')}
        </Chunky>
        <Chunky tone="card" className="w-full py-4 text-base uppercase" onClick={onReplay}>
          {t('playAgain', 'Play again')}
        </Chunky>
      </motion.div>
    </div>
  )
}

/* ── Letter Runner ── */

function runnerReducer(ctx, event) {
  return runnerTransition(ctx, event).next
}

/* ============================================================================
   §8b LETTER RUNNER — 3D WORLD (three.js)
   A lane-runner rendered in WebGL. Every level is set in a famous place in
   Ethiopia or Eritrea, built procedurally from primitives — no image assets,
   so the artifact stays self-contained. The pure runner machine (§4b) is
   untouched: steering Kokeb into a lane gate dispatches the same FEED event
   the 2D buttons used to send.
   ========================================================================== */

const LANE_X = [-2.4, 0, 2.4]
const CHUNK = 48
const CHUNK_COUNT = 7

export const PLACES = [
  { id: 'lalibela', name: 'Lalibela', country: 'Ethiopia', sky: 0x9cc9e8, ground: 0x96653f, fog: [45, 170] },
  { id: 'aksum', name: 'Aksum', country: 'Ethiopia', sky: 0xaed4ea, ground: 0xb99b62, fog: [45, 170] },
  { id: 'simien', name: 'Simien Mountains', country: 'Ethiopia', sky: 0x9fc6e0, ground: 0x5e8f4e, fog: [40, 150] },
  { id: 'gondar', name: 'Gondar', country: 'Ethiopia', sky: 0xa9cfe6, ground: 0x7c8a56, fog: [45, 170] },
  { id: 'asmara', name: 'Asmara', country: 'Eritrea', sky: 0xb7d8ea, ground: 0x9aa0a8, fog: [45, 170] },
  { id: 'massawa', name: 'Massawa', country: 'Eritrea', sky: 0xa5d8ee, ground: 0xe2d3b3, fog: [50, 180] },
]
export const placeForLevel = (level) => PLACES[(level - 1) % PLACES.length]

/* ── canvas-drawn textures (glyph signs, Kokeb, the Muncher) ── */

function canvasTexture(size, draw) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d'), size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function glyphTexture(char) {
  return canvasTexture(256, (g, s) => {
    g.fillStyle = '#fffdf6'
    g.beginPath()
    g.roundRect(8, 8, s - 16, s - 16, 36)
    g.fill()
    g.lineWidth = 10
    g.strokeStyle = '#e0b25a'
    g.stroke()
    g.fillStyle = '#3c3529'
    g.font = `900 ${s * 0.62}px 'Noto Sans Ethiopic', 'Abyssinica SIL', sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(char, s / 2, s / 2 + s * 0.03)
  })
}

function starPath(g, cx, cy, outer, inner) {
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    g[i === 0 ? 'moveTo' : 'lineTo'](cx + r * Math.cos(a), cy + r * Math.sin(a))
  }
  g.closePath()
}

/* ── character art ──
   All characters are drawn in code so the same art feeds both the DOM
   screens (via <Sprite2D/>) and the WebGL sprites (via charTexture). */

/** Anbessa the lion cub — the hero. Chibi proportions, star on his chest. */
export function drawAnbessa(g, s, mood = 'happy') {
  const cx = s / 2
  // tail with a tuft
  g.strokeStyle = '#e08300'
  g.lineWidth = s * 0.04
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(cx + s * 0.14, s * 0.8)
  g.quadraticCurveTo(cx + s * 0.34, s * 0.82, cx + s * 0.33, s * 0.66)
  g.stroke()
  g.fillStyle = '#8a5a00'
  g.beginPath()
  g.arc(cx + s * 0.33, s * 0.64, s * 0.045, 0, 7)
  g.fill()
  // body
  g.fillStyle = '#f7a83c'
  g.beginPath()
  g.roundRect(cx - s * 0.15, s * 0.58, s * 0.3, s * 0.32, s * 0.13)
  g.fill()
  // belly
  g.fillStyle = '#ffdfae'
  g.beginPath()
  g.ellipse(cx, s * 0.76, s * 0.1, s * 0.11, 0, 0, 7)
  g.fill()
  // paws
  g.fillStyle = '#e08300'
  for (const px of [-0.08, 0.08]) {
    g.beginPath()
    g.ellipse(cx + px * s, s * 0.895, s * 0.05, s * 0.028, 0, 0, 7)
    g.fill()
  }
  // Kokeb's little brother: the star on his chest
  starPath(g, cx, s * 0.72, s * 0.062, s * 0.028)
  g.fillStyle = '#ffc800'
  g.fill()
  g.lineWidth = s * 0.012
  g.strokeStyle = '#e0a400'
  g.stroke()
  // mane
  g.fillStyle = '#d97706'
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    g.beginPath()
    g.arc(cx + Math.cos(a) * s * 0.28, s * 0.4 + Math.sin(a) * s * 0.28, s * 0.1, 0, 7)
    g.fill()
  }
  // ears
  for (const side of [-1, 1]) {
    g.fillStyle = '#f7a83c'
    g.beginPath()
    g.arc(cx + side * s * 0.19, s * 0.17, s * 0.07, 0, 7)
    g.fill()
    g.fillStyle = '#ffdfae'
    g.beginPath()
    g.arc(cx + side * s * 0.19, s * 0.175, s * 0.038, 0, 7)
    g.fill()
  }
  // head
  g.fillStyle = '#f7a83c'
  g.beginPath()
  g.arc(cx, s * 0.4, s * 0.265, 0, 7)
  g.fill()
  // cheeks
  g.fillStyle = 'rgba(255,120,80,0.35)'
  for (const side of [-1, 1]) {
    g.beginPath()
    g.arc(cx + side * s * 0.16, s * 0.46, s * 0.035, 0, 7)
    g.fill()
  }
  // muzzle
  g.fillStyle = '#ffe9c8'
  g.beginPath()
  g.ellipse(cx, s * 0.475, s * 0.115, s * 0.085, 0, 0, 7)
  g.fill()
  // nose
  g.fillStyle = '#8a5a00'
  g.beginPath()
  g.ellipse(cx, s * 0.44, s * 0.034, s * 0.024, 0, 0, 7)
  g.fill()
  // mouth
  g.strokeStyle = '#8a5a00'
  g.lineWidth = s * 0.014
  g.lineCap = 'round'
  if (mood === 'happy') {
    g.beginPath()
    g.arc(cx - s * 0.032, s * 0.468, s * 0.032, 0.15 * Math.PI, 0.85 * Math.PI)
    g.stroke()
    g.beginPath()
    g.arc(cx + s * 0.032, s * 0.468, s * 0.032, 0.15 * Math.PI, 0.85 * Math.PI)
    g.stroke()
  } else {
    g.fillStyle = '#8a5a00'
    g.beginPath()
    g.ellipse(cx, s * 0.5, s * 0.024, s * 0.03, 0, 0, 7)
    g.fill()
  }
  // eyes
  g.fillStyle = '#3c2a10'
  const eyeH = mood === 'happy' ? s * 0.038 : s * 0.026
  for (const side of [-1, 1]) {
    g.beginPath()
    g.ellipse(cx + side * s * 0.1, s * 0.375, s * 0.027, eyeH, 0, 0, 7)
    g.fill()
    g.fillStyle = '#fff'
    g.beginPath()
    g.arc(cx + side * s * 0.1 - s * 0.008, s * 0.365, s * 0.009, 0, 7)
    g.fill()
    g.fillStyle = '#3c2a10'
  }
  if (mood !== 'happy') {
    // worried brows
    g.strokeStyle = '#3c2a10'
    g.lineWidth = s * 0.012
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(cx + side * s * 0.14, s * 0.315)
      g.lineTo(cx + side * s * 0.06, s * 0.335)
      g.stroke()
    }
  }
}

/** Jibby the hyena — the Letter Muncher. Mischievous, not scary. */
export function drawHyena(g, s, mood = 'grin') {
  const cx = s / 2
  // big rounded ears
  for (const side of [-1, 1]) {
    g.fillStyle = '#8a7d6a'
    g.beginPath()
    g.ellipse(cx + side * s * 0.18, s * 0.17, s * 0.08, s * 0.115, side * 0.25, 0, 7)
    g.fill()
    g.fillStyle = '#57493a'
    g.beginPath()
    g.ellipse(cx + side * s * 0.18, s * 0.185, s * 0.045, s * 0.07, side * 0.25, 0, 7)
    g.fill()
  }
  // scruffy crest
  g.fillStyle = '#57493a'
  for (let i = -2; i <= 2; i++) {
    g.beginPath()
    g.moveTo(cx + i * s * 0.055 - s * 0.03, s * 0.185)
    g.lineTo(cx + i * s * 0.055, s * 0.1)
    g.lineTo(cx + i * s * 0.055 + s * 0.03, s * 0.185)
    g.closePath()
    g.fill()
  }
  // head
  g.fillStyle = '#9a8b76'
  g.beginPath()
  g.arc(cx, s * 0.43, s * 0.28, 0, 7)
  g.fill()
  // spots
  g.fillStyle = '#6e614f'
  for (const [px, py, pr] of [[0.3, 0.3, 0.028], [0.68, 0.27, 0.024], [0.74, 0.42, 0.02], [0.26, 0.46, 0.022]]) {
    g.beginPath()
    g.arc(px * s, py * s, pr * s, 0, 7)
    g.fill()
  }
  // heavy brow
  g.strokeStyle = '#57493a'
  g.lineWidth = s * 0.03
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(cx - s * 0.16, s * 0.3)
  g.quadraticCurveTo(cx, s * 0.27, cx + s * 0.16, s * 0.3)
  g.stroke()
  // mischievous eyes
  for (const side of [-1, 1]) {
    g.fillStyle = '#fff'
    g.beginPath()
    g.ellipse(cx + side * s * 0.1, s * 0.36, s * 0.05, s * 0.042, 0, 0, 7)
    g.fill()
    g.fillStyle = '#241c12'
    g.beginPath()
    g.arc(cx + side * s * 0.085, s * 0.372, s * 0.02, 0, 7)
    g.fill()
  }
  // muzzle
  g.fillStyle = '#c9b99d'
  g.beginPath()
  g.ellipse(cx, s * 0.55, s * 0.165, s * 0.125, 0, 0, 7)
  g.fill()
  // nose
  g.fillStyle = '#3a2d1c'
  g.beginPath()
  g.ellipse(cx, s * 0.485, s * 0.045, s * 0.03, 0, 0, 7)
  g.fill()
  // the letter-munching grin
  if (mood === 'agitated') {
    g.fillStyle = '#3a2216'
    g.beginPath()
    g.ellipse(cx, s * 0.6, s * 0.11, s * 0.075, 0, 0, 7)
    g.fill()
    g.fillStyle = '#fff'
    for (let i = 0; i < 3; i++) {
      const x = cx - s * 0.075 + i * s * 0.075
      g.beginPath()
      g.moveTo(x, s * 0.545)
      g.lineTo(x + s * 0.037, s * 0.6)
      g.lineTo(x + s * 0.075, s * 0.545)
      g.closePath()
      g.fill()
    }
  } else {
    g.strokeStyle = '#3a2d1c'
    g.lineWidth = s * 0.016
    g.beginPath()
    g.moveTo(cx - s * 0.12, s * 0.575)
    g.quadraticCurveTo(cx, s * 0.655, cx + s * 0.12, s * 0.575)
    g.stroke()
    g.fillStyle = '#fff'
    for (let i = 0; i < 4; i++) {
      const x = cx - s * 0.105 + i * s * 0.056
      const y = s * (0.585 + Math.sin((i / 3) * Math.PI) * 0.028)
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + s * 0.028, y + s * 0.05)
      g.lineTo(x + s * 0.056, y)
      g.closePath()
      g.fill()
    }
  }
}

/** A friendly Grevy's zebra — cheers Anbessa on and grazes by the track. */
export function drawZebra(g, s) {
  const cx = s / 2
  // ears
  for (const side of [-1, 1]) {
    g.fillStyle = '#f6f3ec'
    g.beginPath()
    g.ellipse(cx + side * s * 0.15, s * 0.15, s * 0.055, s * 0.1, side * 0.2, 0, 7)
    g.fill()
    g.fillStyle = '#2b2b2b'
    g.beginPath()
    g.ellipse(cx + side * s * 0.15, s * 0.095, s * 0.035, s * 0.045, side * 0.2, 0, 7)
    g.fill()
  }
  // mane crest
  g.fillStyle = '#2b2b2b'
  for (let i = -2; i <= 2; i++) {
    g.beginPath()
    g.arc(cx + i * s * 0.06, s * 0.155, s * 0.038, 0, 7)
    g.fill()
  }
  // head
  g.fillStyle = '#f6f3ec'
  g.beginPath()
  g.ellipse(cx, s * 0.44, s * 0.24, s * 0.3, 0, 0, 7)
  g.fill()
  // stripes
  g.strokeStyle = '#2b2b2b'
  g.lineWidth = s * 0.032
  g.lineCap = 'round'
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      g.beginPath()
      g.moveTo(cx + side * s * (0.1 + i * 0.055), s * 0.2)
      g.quadraticCurveTo(cx + side * s * (0.22 + i * 0.05), s * (0.3 + i * 0.05), cx + side * s * (0.17 + i * 0.045), s * (0.42 + i * 0.04))
      g.stroke()
    }
  }
  // eyes
  g.fillStyle = '#241c12'
  for (const side of [-1, 1]) {
    g.beginPath()
    g.ellipse(cx + side * s * 0.1, s * 0.42, s * 0.03, s * 0.042, 0, 0, 7)
    g.fill()
    g.fillStyle = '#fff'
    g.beginPath()
    g.arc(cx + side * s * 0.1 - s * 0.008, s * 0.408, s * 0.01, 0, 7)
    g.fill()
    g.fillStyle = '#241c12'
  }
  // muzzle
  g.fillStyle = '#4a4038'
  g.beginPath()
  g.ellipse(cx, s * 0.63, s * 0.135, s * 0.105, 0, 0, 7)
  g.fill()
  g.fillStyle = '#241c12'
  for (const side of [-1, 1]) {
    g.beginPath()
    g.ellipse(cx + side * s * 0.055, s * 0.615, s * 0.016, s * 0.022, 0, 0, 7)
    g.fill()
  }
  // smile
  g.strokeStyle = '#241c12'
  g.lineWidth = s * 0.014
  g.beginPath()
  g.arc(cx, s * 0.655, s * 0.05, 0.2 * Math.PI, 0.8 * Math.PI)
  g.stroke()
}

/** Draw-function -> WebGL sprite texture. */
function charTexture(draw, mood) {
  return canvasTexture(256, (g, s) => draw(g, s, mood))
}

let ZEBRA_TEX = null
function zebraAt(g, x, z, scale = 2) {
  ZEBRA_TEX = ZEBRA_TEX || charTexture(drawZebra)
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ZEBRA_TEX, transparent: true }))
  sp.scale.set(scale, scale, 1)
  sp.position.set(x, scale * 0.45, z)
  g.add(sp)
}

function ringTexture() {
  return canvasTexture(128, (g, s) => {
    g.lineWidth = 10
    g.strokeStyle = '#ffc800'
    g.beginPath()
    g.arc(s / 2, s / 2, s * 0.42, 0, 7)
    g.stroke()
  })
}

/* ── tiny mesh helpers ── */

const MATS = new Map()
function mat(color) {
  if (!MATS.has(color)) MATS.set(color, new THREE.MeshLambertMaterial({ color }))
  return MATS.get(color)
}
function box(g, w, h, d, color, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color))
  m.position.set(x, y, z)
  m.rotation.y = ry
  g.add(m)
  return m
}
function cyl(g, rt, rb, h, color, x, y, z, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color))
  m.position.set(x, y, z)
  g.add(m)
  return m
}
function cone(g, r, h, color, x, y, z, seg = 8) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat(color))
  m.position.set(x, y, z)
  g.add(m)
  return m
}
function sph(g, r, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat(color))
  m.position.set(x, y, z)
  g.add(m)
  return m
}

/* ── procedural landmarks; i is the chunk index for deterministic variety ── */

function acacia(g, x, z, s = 1) {
  cyl(g, 0.12 * s, 0.2 * s, 2.2 * s, 0x6b4a2d, x, 1.1 * s, z, 6)
  cone(g, 2.1 * s, 0.9 * s, 0x4f7a34, x, 2.6 * s, z, 9)
}
function palm(g, x, z, s = 1) {
  cyl(g, 0.1 * s, 0.18 * s, 3 * s, 0x8a6a45, x, 1.5 * s, z, 6)
  cone(g, 1.4 * s, 0.8 * s, 0x3f7d3a, x, 3.2 * s, z, 7)
  sph(g, 0.42 * s, 0x2f6330, x, 3 * s, z)
}

function chunkLalibela(g, i) {
  // Red-rock mounds and, on alternating chunks, the sunken cross church.
  for (const side of [-1, 1]) {
    cone(g, 2.6, 3 + ((i * 7 + side) % 3), 0x7d4b2a, side * (11 + ((i * 5) % 4)), 1.4, -10, 7)
    cone(g, 1.8, 2.2, 0x8f5a34, side * (15 + ((i * 3) % 5)), 1.1, -30, 6)
    sph(g, 1, 0x6f4225, side * 9, 0.4, -40)
  }
  if (i % 2 === 0) {
    const side = i % 4 === 0 ? -1 : 1
    const px = side * 13
    box(g, 13, 0.3, 13, 0x5b3018, px, 0.16, -22) // the excavated pit rim
    box(g, 9.5, 0.2, 9.5, 0x3c1f0e, px, 0.32, -22)
    box(g, 6.4, 1.7, 2.1, 0xa06a3c, px, 1.15, -22) // Bete Giyorgis cross arms
    box(g, 2.1, 1.7, 6.4, 0xa06a3c, px, 1.15, -22)
    box(g, 5.4, 0.35, 1.6, 0x7d4b24, px, 2.2, -22) // cross relief on the roof
    box(g, 1.6, 0.35, 5.4, 0x7d4b24, px, 2.2, -22)
  }
  acacia(g, -18 - ((i * 11) % 5), -44, 0.9)
}

function chunkAksum(g, i) {
  // The stelae field: tall carved obelisks and acacia savanna.
  for (const side of [-1, 1]) {
    const h = 7 + ((i * 5 + side * 3) % 7)
    const x = side * (9 + ((i * 3) % 4))
    cyl(g, 0.55, 0.95, h, 0xb0a58c, x, h / 2, -14, 4)
    sph(g, 0.62, 0xb0a58c, x, h + 0.1, -14)
    cyl(g, 0.5, 0.7, 2.2, 0x9c9179, side * 14, 1.1, -34, 4)
    box(g, 1.8, 0.5, 1.8, 0x9c9179, side * 11, 0.25, -42)
  }
  acacia(g, 17 + ((i * 7) % 4), -24, 1.1)
  acacia(g, -19 - ((i * 5) % 4), -8, 0.9)
  if (i % 2 === 0) zebraAt(g, 15 + ((i * 5) % 4), -20, 2)
}

function chunkSimien(g, i) {
  // Highland escarpment: layered peaks pushed out beyond the track.
  for (const side of [-1, 1]) {
    cone(g, 9 + ((i * 3 + side) % 4), 11 + ((i * 7) % 6), 0x55794a, side * (22 + ((i * 5) % 6)), 5, -26, 7)
    cone(g, 6, 8, 0x6b8f5b, side * 16, 3.6, -44, 6)
    cone(g, 3.4, 4, 0x7fa06a, side * 12, 1.9, -8, 6)
  }
  sph(g, 0.8, 0x8a9a7a, 8, 0.3, -36)
  sph(g, 0.6, 0x8a9a7a, -7, 0.25, -16)
  acacia(g, 10 + ((i * 3) % 3), -50, 0.8)
  if (i % 3 === 0) zebraAt(g, -12, -28, 1.8)
}

function chunkGondar(g, i) {
  // Fasil Ghebbi: round dome-capped towers and crenellated walls.
  if (i % 2 === 0) {
    const side = i % 4 === 0 ? 1 : -1
    const px = side * 12
    box(g, 10, 2.6, 1.2, 0x8a6b4f, px, 1.3, -24)
    for (let t = 0; t < 5; t++) box(g, 0.9, 0.7, 1.3, 0x8a6b4f, px - 4 + t * 2, 2.95, -24)
    cyl(g, 1.5, 1.7, 5.4, 0x96775a, px - 5.5, 2.7, -24, 12)
    sph(g, 1.5, 0xa8886a, px - 5.5, 5.6, -24)
    cyl(g, 1.2, 1.4, 4.2, 0x96775a, px + 5.5, 2.1, -24, 12)
    sph(g, 1.2, 0xa8886a, px + 5.5, 4.4, -24)
  }
  for (const side of [-1, 1]) acacia(g, side * (16 + ((i * 5) % 4)), -42, 1)
  if (i % 3 === 1) zebraAt(g, 14, -8, 1.9)
  cone(g, 2.2, 2.6, 0x5e7d4e, -10, 1.3, -6, 7)
}

function chunkAsmara(g, i) {
  // Art-deco boulevard; every other chunk carries the winged Fiat Tagliero.
  const pastels = [0xe8c9a0, 0xd8a7a0, 0xc9d3c0, 0xd9c9ae]
  for (const side of [-1, 1]) {
    const h = 3.5 + ((i * 3 + (side + 1)) % 3)
    box(g, 5, h, 6, pastels[(i + side + 2) % 4], side * 13, h / 2, -34)
    box(g, 4, h * 0.7, 5, pastels[(i + side + 3) % 4], side * 12, h * 0.35, -12)
    palm(g, side * 8, -24, 1)
    palm(g, side * 8.5, -46, 0.9)
  }
  if (i % 2 === 1) {
    const px = 11
    box(g, 2.2, 5.4, 2.2, 0xf0e8d8, px, 2.7, -22) // the central tower
    box(g, 9, 0.35, 2.6, 0xf0e8d8, px - 4.5, 3.6, -22) // cantilevered wings
    box(g, 9, 0.35, 2.6, 0xf0e8d8, px + 4.5, 3.6, -22)
    box(g, 1.4, 0.8, 1.4, 0xc94f3f, px, 5.8, -22)
  }
}

function chunkMassawa(g, i) {
  // Red Sea port: white coral-stone arches on the left, open sea to the right.
  box(g, 60, 0.12, CHUNK, 0x2e86b8, 26, 0.06, -CHUNK / 2 + 4) // the sea
  const bx = -(10 + ((i * 3) % 3))
  const h = 3 + ((i * 5) % 2)
  box(g, 6, h, 5, 0xf2ead8, bx, h / 2, -18)
  cyl(g, 1.1, 1.1, 2.4, 0xe8dfc8, bx + 2, 1.2, -14, 12)
  sph(g, 1.1, 0xf2ead8, bx + 2, 2.5, -14)
  box(g, 5, 2.6, 4, 0xefe5d0, bx - 1, 1.3, -38)
  palm(g, -8, -30, 1)
  palm(g, -9, -6, 0.85)
  // dhow with a lateen sail
  const sx = 18 + ((i * 7) % 8)
  box(g, 2.6, 0.5, 1, 0x7a5230, sx, 0.4, -26)
  cone(g, 1.1, 2.4, 0xf6f1e4, sx, 1.9, -26, 3)
}

const CHUNK_BUILDERS = {
  lalibela: chunkLalibela,
  aksum: chunkAksum,
  simien: chunkSimien,
  gondar: chunkGondar,
  asmara: chunkAsmara,
  massawa: chunkMassawa,
}

/* ── the world ── */

class RunnerWorld {
  constructor(canvas, onGate) {
    this.onGate = onGate
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW_END })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LOW_END ? 1.25 : 2))
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(64, 1, 0.1, 260)
    this.camera.position.set(0, 3.6, 7.6)
    this.camera.lookAt(0, 1.2, -12)

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a55, 1.15))
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.4)
    sun.position.set(-6, 12, 4)
    this.scene.add(sun)

    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 560), new THREE.MeshLambertMaterial({ color: 0x888888 }))
    this.ground.rotation.x = -Math.PI / 2
    this.ground.position.z = -200
    this.scene.add(this.ground)
    this.track = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 560), new THREE.MeshLambertMaterial({ color: 0xcfc0a0 }))
    this.track.rotation.x = -Math.PI / 2
    this.track.position.set(0, 0.02, -200)
    this.scene.add(this.track)

    this.playerTexHappy = charTexture(drawAnbessa, 'happy')
    this.playerTexWorried = charTexture(drawAnbessa, 'worried')
    this.player = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.playerTexHappy, transparent: true }))
    this.player.scale.set(2.3, 2.3, 1)
    this.player.position.set(0, 1.25, 0)
    this.scene.add(this.player)

    this.ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTexture(), transparent: true, opacity: 0 }))
    this.ring.position.copy(this.player.position)
    this.scene.add(this.ring)

    // Kokeb the star rides along above Anbessa, brightening with his power.
    this.buddy = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(128, (g, sz) => {
      starPath(g, sz / 2, sz / 2, sz * 0.44, sz * 0.19)
      g.fillStyle = '#ffc800'
      g.fill()
      g.lineWidth = 6
      g.strokeStyle = '#e0a400'
      g.stroke()
    }), transparent: true }))
    this.buddy.scale.set(0.8, 0.8, 1)
    this.buddy.position.set(-1.1, 2.8, 0)
    this.scene.add(this.buddy)
    this.power = 0

    this.muncher = new THREE.Sprite(new THREE.SpriteMaterial({ map: charTexture(drawHyena), transparent: true }))
    this.muncher.scale.set(1.9, 1.9, 1)
    this.muncher.position.set(1.4, 1.1, 5.9)
    this.scene.add(this.muncher)

    this.chunks = []
    this.gate = null
    this.laneIndex = 1
    this.speed = 13
    this.threat = 0 // 0..RUNNER_QPL wrong feeds
    this.bossMode = null // null | 'win' | 'lose'
    this.ringT = -1
    this.t = 0
    this.disposed = false
    this.reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  setPlace(place) {
    this.scene.background = new THREE.Color(place.sky)
    this.scene.fog = new THREE.Fog(place.sky, place.fog[0], place.fog[1])
    this.ground.material = mat(place.ground)
    for (const c of this.chunks) this.scene.remove(c)
    this.chunks = []
    const build = CHUNK_BUILDERS[place.id]
    for (let k = 0; k < CHUNK_COUNT; k++) {
      const g = new THREE.Group()
      build(g, k)
      // lane dashes ride along in the chunk so the ground reads as moving
      for (let d = 0; d < 6; d++) {
        box(g, 0.18, 0.02, 1.6, 0xfff6dd, -1.2, 0.05, -4 - d * 8)
        box(g, 0.18, 0.02, 1.6, 0xfff6dd, 1.2, 0.05, -4 - d * 8)
      }
      g.position.z = -k * CHUNK + 10
      this.scene.add(g)
      this.chunks.push(g)
    }
  }

  setQuestion(options) {
    this.clearGate()
    const g = new THREE.Group()
    for (let lane = 0; lane < 3; lane++) {
      const form = INDEXES.byAudioKey.get(options[lane])
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(1.9, 1.9),
        new THREE.MeshBasicMaterial({ map: glyphTexture(form.char), transparent: true }),
      )
      sign.position.set(LANE_X[lane], 1.75, 0)
      g.add(sign)
      cyl(g, 0.07, 0.07, 1.6, 0x8a6a45, LANE_X[lane], 0.55, 0, 6)
    }
    box(g, 8.4, 0.22, 0.22, 0xe0b25a, 0, 3, 0)
    cyl(g, 0.09, 0.09, 3, 0x8a6a45, -4.1, 1.5, 0, 6)
    cyl(g, 0.09, 0.09, 3, 0x8a6a45, 4.1, 1.5, 0, 6)
    g.position.z = -105
    this.gate = g
    this.gatePassed = false
    this.scene.add(g)
  }

  clearGate() {
    if (this.gate) {
      this.scene.remove(this.gate)
      this.gate = null
    }
  }

  burst() {
    this.ringT = 0
  }

  tick(dt, running) {
    if (this.disposed) return
    this.t += dt
    const dz = running ? this.speed * dt : this.speed * dt * 0.25

    for (const c of this.chunks) {
      c.position.z += dz
      if (c.position.z > CHUNK + 14) c.position.z -= CHUNK_COUNT * CHUNK
    }
    if (this.gate) {
      this.gate.position.z += dz
      if (!this.gatePassed && this.gate.position.z >= -0.2) {
        this.gatePassed = true
        this.onGate(this.laneIndex)
      }
      if (this.gate.position.z > 12) this.clearGate()
    }

    const px = LANE_X[this.laneIndex]
    this.player.position.x += (px - this.player.position.x) * Math.min(1, dt * 10)
    this.player.position.y = 1.25 + (this.reduced ? 0 : Math.abs(Math.sin(this.t * 9)) * 0.22)

    // The Muncher: closer with every wrong feed; lunges or flees at the boss.
    let mz = 6.2 - this.threat * 0.85
    let my = 1.1 + (this.reduced ? 0 : Math.sin(this.t * 7) * 0.12)
    if (this.bossMode === 'lose') {
      mz = 0.4
      my = 1.25
    }
    if (this.bossMode === 'win') {
      mz = 10.5
      my = 5.5 + this.t * 0.01
    }
    this.muncher.position.z += (mz - this.muncher.position.z) * Math.min(1, dt * (this.bossMode ? 4 : 2.5))
    this.muncher.position.x += (this.player.position.x * 0.75 - this.muncher.position.x) * Math.min(1, dt * 2)
    this.muncher.position.y = my
    const mscale = this.bossMode === 'lose' ? 3.1 : 1.9
    this.muncher.scale.x += (mscale - this.muncher.scale.x) * Math.min(1, dt * 4)
    this.muncher.scale.y = this.muncher.scale.x

    if (this.ringT >= 0) {
      this.ringT += dt
      const k = this.ringT / 0.55
      if (k >= 1) {
        this.ringT = -1
        this.ring.material.opacity = 0
      } else {
        this.ring.position.set(this.player.position.x, this.player.position.y, 0.1)
        this.ring.scale.setScalar(1.2 + k * 3.2)
        this.ring.material.opacity = 1 - k
      }
    }

    const bs = 0.7 + this.power * 0.13 + (this.reduced ? 0 : Math.sin(this.t * 5) * 0.05)
    this.buddy.scale.set(bs, bs, 1)
    this.buddy.position.set(this.player.position.x - 1.15, this.player.position.y + 1.5, 0)
    this.buddy.material.rotation = Math.sin(this.t * 2.2) * 0.25

    this.renderer.render(this.scene, this.camera)
  }

  setMood(worried) {
    this.player.material.map = worried ? this.playerTexWorried : this.playerTexHappy
    this.player.material.needsUpdate = true
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  dispose() {
    this.disposed = true
    this.renderer.dispose()
  }
}

/* ── ARCADE gateway router (Pillar 4) ──────────────────────────────────
   A degraded device NEVER mounts WebGL: it gets the functionally-identical
   2D fallback over the same pure machine. A capable device plays the 3D
   scene, which measures its own frame rate (usePerfDegrade) and persists the
   verdict so the NEXT arcade node degrades if this one stuttered. */
function Arcade3D({ children }) {
  usePerfDegrade() // measure + persist; the swap applies on the next arcade entry
  return children
}

function ArcadeGateway({ node, seed, soundOn, onDone, onRetry }) {
  const isRunner = node.gateway.mode === 'runner'
  if (isDegraded()) {
    return isRunner ? (
      <Runner2D seed={seed} soundOn={soundOn} onExit={onDone} />
    ) : (
      <Skylands2D island={node.gateway.island} seed={seed} soundOn={soundOn} onExit={onDone} />
    )
  }
  return (
    <Arcade3D>
      {isRunner ? <Runner seed={seed} soundOn={soundOn} onExit={onDone} onRetry={onRetry} /> : <FidelSkylands onExit={onDone} />}
    </Arcade3D>
  )
}

/* ── the 3D runner screen ── */

function Runner({ seed, soundOn, onExit, onRetry }) {
  const [ctx, dispatch] = useReducer(runnerReducer, seed, runnerInitial)
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const worldRef = useRef(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const [lane, setLane] = useState(1)
  const [webglOk, setWebglOk] = useState(true)
  const [banner, setBanner] = useState(true)
  const [demo, setDemo] = useState(() => !hasOnboarded('runner') && !prefersReducedMotion())
  const demoRef = useRef(demo)
  demoRef.current = demo
  const [hand, setHand] = useState({ x: null, y: null })
  const [yourTurn, setYourTurn] = useState(false)
  const endDemo = useCallback(() => {
    markOnboarded('runner')
    setDemo(false)
    setHand({ x: null, y: null })
    setYourTurn(true)
    setTimeout(() => setYourTurn(false), 1700)
  }, [])
  useEffect(() => {
    if (!hasOnboarded('runner') && prefersReducedMotion()) markOnboarded('runner')
  }, [])

  const question = selectRunnerQuestion(ctx)
  const targetForm = question ? formOf(question.target) : null
  const place = placeForLevel(ctx.level)
  const running = ctx.status === RunnerState.RUNNING
  const feeding = ctx.status === RunnerState.FEEDING
  const boss = ctx.status === RunnerState.BOSS
  const destroyed = ctx.status === RunnerState.DESTROYED

  const steerTo = useCallback((target) => {
    setLane(() => {
      const next = Math.max(0, Math.min(2, target))
      if (worldRef.current) worldRef.current.laneIndex = next
      return next
    })
  }, [])
  const steer = useCallback((delta) => {
    setLane((l) => {
      const next = Math.max(0, Math.min(2, l + delta))
      if (worldRef.current) worldRef.current.laneIndex = next
      return next
    })
  }, [])

  // World lifecycle.
  useEffect(() => {
    let world
    try {
      world = new RunnerWorld(canvasRef.current, (laneIdx) => {
        const q = selectRunnerQuestion(ctxRef.current)
        if (q) dispatch({ type: RunnerEvent.FEED, payload: { audioKey: q.options[laneIdx] } })
      })
    } catch {
      setWebglOk(false)
      return undefined
    }
    worldRef.current = world
    let raf
    let last = performance.now()
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const st = ctxRef.current.status
      world.tick(dt, st === RunnerState.RUNNING)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const ro = new ResizeObserver(() => {
      const r = wrapRef.current?.getBoundingClientRect()
      if (r) world.resize(r.width, r.height)
    })
    ro.observe(wrapRef.current)
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') steer(-1)
      if (e.key === 'ArrowRight') steer(1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('keydown', onKey)
      world.dispose()
      worldRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Level changes re-dress the world and show the destination banner.
  useEffect(() => {
    const world = worldRef.current
    if (!world) return undefined
    world.setPlace(place)
    world.speed = Math.min(30, 16 + (ctx.level - 1) * 2.2)
    setBanner(true)
    const t = setTimeout(() => setBanner(false), 1900)
    return () => clearTimeout(t)
  }, [ctx.level, webglOk]) // eslint-disable-line react-hooks/exhaustive-deps

  // Machine-state side effects drive the 3D scene.
  useEffect(() => {
    const world = worldRef.current
    if (!world) return undefined
    world.threat = ctx.wrong
    world.power = ctx.correct
    if (running) {
      world.bossMode = null
      world.setMood(false)
      world.setQuestion(question.options)
      playForm(targetForm, soundOn)
    }
    if (feeding) {
      world.clearGate()
      playEffect(ctx.lastFeed?.good ? 'good' : 'bad', soundOn)
      const fedQ = ctx.queue[ctx.qIndex]
      if (fedQ && ctx.lastFeed && !demoRef.current) recordAnswer(fedQ.target, ctx.lastFeed.audioKey, 'runner')
      if (demoRef.current) endDemo()
      if (ctx.lastFeed?.good) world.burst()
      else world.setMood(true)
      const t = setTimeout(() => dispatch({ type: RunnerEvent.FEED_DONE }), 900)
      return () => clearTimeout(t)
    }
    if (boss) {
      world.bossMode = ctx.survivedBoss ? 'win' : 'lose'
      world.setMood(!ctx.survivedBoss)
      playEffect(ctx.survivedBoss ? 'win' : 'bad', soundOn)
      const t = setTimeout(() => dispatch({ type: RunnerEvent.BOSS_DONE }), 2200)
      return () => clearTimeout(t)
    }
    return undefined
  }, [ctx.status, ctx.qIndex, ctx.level]) // eslint-disable-line react-hooks/exhaustive-deps

  // Demo driver: nudge Anbessa toward the correct gate, one tap at a time.
  useEffect(() => {
    if (!demo || ctx.status !== RunnerState.RUNNING || !question) return undefined
    const correctLane = question.options.indexOf(question.target)
    const t = setInterval(() => {
      if (lane < correctLane) {
        setHand(tutTargetCenter('steer-right') || { x: null, y: null })
        steer(1)
      } else if (lane > correctLane) {
        setHand(tutTargetCenter('steer-left') || { x: null, y: null })
        steer(-1)
      } else {
        setHand({ x: null, y: null })
      }
    }, 750)
    return () => clearInterval(t)
  }, [demo, ctx.status, ctx.qIndex, lane]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!destroyed) return
    const best = loadRunnerBest()
    if (ctx.fed > best.fed) saveRunnerBest({ fed: ctx.fed, level: ctx.level })
  }, [destroyed]) // eslint-disable-line react-hooks/exhaustive-deps

  if (destroyed) {
    return <RunnerDestroyed ctx={ctx} onRetry={onRetry} onExit={onExit} />
  }

  return (
    <div className="mx-auto flex h-screen max-w-xl flex-col px-4 pb-4 pt-4">
      <header className="flex items-center gap-2">
        <button type="button" onClick={onExit} aria-label="Quit run" className={`flex h-10 w-10 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <X className="h-6 w-6" />
        </button>
        <span className="rounded-xl px-2.5 py-1 text-xs font-black text-white" style={{ background: 'var(--sky)' }}>
          L{ctx.level} · {place.name}
        </span>
        <div className="flex flex-1 items-center justify-center gap-1.5" aria-label={`Power ${ctx.correct}, Muncher ${ctx.wrong}, of ${RUNNER_QPL} meals`}>
          {Array.from({ length: RUNNER_QPL }, (_, i) => {
            const state = i < ctx.correct ? 'power' : i < ctx.correct + ctx.wrong ? 'muncher' : 'empty'
            return <motion.span key={i} className="block h-3.5 w-3.5 rounded-full" animate={{ background: state === 'power' ? 'var(--go)' : state === 'muncher' ? 'var(--bad)' : 'var(--line)', scale: state === 'empty' ? 0.8 : 1 }} />
          })}
        </div>
        <span className="mono flex items-center gap-1 rounded-xl px-2.5 py-1 text-sm font-black" style={{ background: 'var(--card)', border: '2px solid var(--line)' }} aria-label={`${ctx.fed} letters fed`}>
          <Sparkles className="h-4 w-4" style={{ color: 'var(--star)' }} aria-hidden="true" />
          {ctx.fed}
        </span>
      </header>

      <div ref={wrapRef} className="relative mt-3 min-h-0 flex-1 overflow-hidden rounded-3xl border-2" style={{ borderColor: 'var(--line)' }}>
        {webglOk ? (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
            onPointerDown={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              steerTo(Math.min(2, Math.floor(((e.clientX - r.left) / r.width) * 3)))
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center font-bold" style={{ color: 'var(--muted)' }}>
            3D graphics are not available on this device. Try the lesson levels instead!
          </div>
        )}
        <AnimatePresence>
          {banner && (
            <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-x-0 top-4 text-center">
              <span className="rounded-2xl px-4 py-2 text-sm font-black uppercase tracking-widest text-white" style={{ background: 'rgba(0,0,0,0.45)' }}>
                Level {ctx.level} — {place.name}, {place.country}
              </span>
            </motion.div>
          )}
          {boss && (
            <motion.div key="bosscap" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-x-0 bottom-5 text-center">
              <span className="rounded-2xl px-4 py-2 text-base font-black uppercase tracking-wider text-white" style={{ background: ctx.survivedBoss ? 'var(--go)' : 'var(--bad)' }}>
                {ctx.survivedBoss ? 'Anbessa’s letter power wins!' : 'Jibby the hyena attacks!'}
              </span>
            </motion.div>
          )}
          {feeding && !ctx.lastFeed?.good && (
            <motion.div key="flash" className="pointer-events-none absolute inset-0" style={{ background: 'var(--bad)' }} initial={{ opacity: 0.4 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} />
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex flex-col gap-2.5">
        <p className="text-center font-extrabold" aria-live="polite">
          {t('steerInto', 'Steer Anbessa into')}{' '}
          <button
            type="button"
            onClick={() => playForm(targetForm, soundOn)}
            disabled={boss}
            className={`chunk inline-flex items-center gap-1.5 rounded-xl px-3 py-1 align-middle text-white ${FOCUS}`}
            style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px', outlineColor: 'var(--accent)' }}
            aria-label={`Play the sound ${targetForm?.sound} again`}
          >
            <Volume2 className="h-5 w-5" aria-hidden="true" />“{targetForm?.sound}”
          </button>
        </p>
        <div className="flex items-center gap-2.5">
          {demo && <GhostHand x={hand.x} y={hand.y} visible onSkip={endDemo} />}
          <AnimatePresence>
            {yourTurn && (
              <motion.p initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-x-0 top-1/3 z-50 text-center text-3xl font-black" style={{ color: 'var(--go-ink)' }}>
                Your turn!
              </motion.p>
            )}
          </AnimatePresence>
          <Chunky tone="card" className="flex h-16 flex-1 items-center justify-center" aria-label="Move left" onClick={() => steer(-1)} data-tut="steer-left">
            <ChevronLeft className="h-8 w-8" aria-hidden="true" />
          </Chunky>
          <div className="flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className="block h-2.5 w-6 rounded-full" style={{ background: i === lane ? 'var(--accent)' : 'var(--line)' }} />
            ))}
          </div>
          <Chunky tone="card" className="flex h-16 flex-1 items-center justify-center" aria-label="Move right" onClick={() => steer(1)} data-tut="steer-right">
            <ChevronLeft className="h-8 w-8 rotate-180" aria-hidden="true" />
          </Chunky>
        </div>
      </div>
    </div>
  )
}

/** Jibby the hyena, drawn from the same art as his 3D sprite. */
function Muncher({ size = 56 }) {
  return (
    <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}>
      <Sprite2D draw={drawHyena} size={size} />
    </motion.div>
  )
}

function RunnerDestroyed({ ctx, onRetry, onExit }) {
  const best = loadRunnerBest()
  const isBest = ctx.fed >= best.fed && ctx.fed > 0
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-5 py-10 text-center">
      <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 14 }}>
        <Muncher size={96} />
      </motion.div>
      <h1 className="mt-5 text-3xl font-black uppercase tracking-wide" style={{ color: 'var(--bad-ink)' }}>
        {t('munched', 'Munched!')}
      </h1>
      <p className="mt-2 max-w-xs font-bold" style={{ color: 'var(--muted)' }}>
        Jibby the hyena caught Anbessa in {placeForLevel(ctx.level).name}, {placeForLevel(ctx.level).country} (level {ctx.level}). Feed him more correct letters to keep him strong!
      </p>

      <div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-3">
        <div className="rounded-2xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Letters fed
          </p>
          <p className="mono flex items-center justify-center gap-1 text-2xl font-black" style={{ color: 'var(--go-ink)' }}>
            <Sparkles className="h-5 w-5" style={{ color: 'var(--star)' }} aria-hidden="true" />
            {ctx.fed}
          </p>
        </div>
        <div className="rounded-2xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            {isBest ? 'New best!' : 'Best'}
          </p>
          <p className="mono text-2xl font-black" style={{ color: 'var(--accent)' }}>
            {Math.max(best.fed, ctx.fed)}
          </p>
        </div>
      </div>

      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
        <Chunky tone="go" className="w-full py-4 text-base uppercase" onClick={onRetry}>
          {t('runAgain', 'Run again')}
        </Chunky>
        <Chunky tone="card" className="w-full py-4 text-base uppercase" onClick={onExit}>
          {t('home', 'Home')}
        </Chunky>
      </div>
    </div>
  )
}

/* ── First Words: hear the word, tap its picture ── */

function WordMatch({ seed, soundOn, onFinish, onReplay }) {
  const [ctx, dispatch] = useReducer(machineReducer, undefined, () =>
    transition(initialContext(seed), { type: GameEvent.START_LEVEL, payload: { levelId: 'words', seed, queue: buildWordQueue(seed) } }).next,
  )
  const question = selectQuestion(ctx)
  const word = question ? WORD_BY_LATIN.get(question.wordLatin ?? question.target) : null
  const isGlyph = question?.type === 'glyph'
  const progress = selectProgress(ctx)

  useEffect(() => {
    if (ctx.status !== GameState.PRESENTATION || !word) return undefined
    audioPlayWord(word, soundOn)
    const timer = setTimeout(() => dispatch({ type: GameEvent.PRESENTATION_DONE }), 1400)
    return () => clearTimeout(timer)
  }, [ctx.status, ctx.cursor]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (ctx.status === GameState.SUCCESS_BURST) {
      playEffect('good', soundOn)
      if (word) recordAnswer(`word:${word.latin}`, `word:${word.latin}`, 'words')
      const timer = setTimeout(() => dispatch({ type: GameEvent.FEEDBACK_DONE }), 1100)
      return () => clearTimeout(timer)
    }
    if (ctx.status === GameState.ERROR_RECOVERY) {
      playEffect('bad', soundOn)
      if (word) recordAnswer(`word:${word.latin}`, `word:${ctx.wrongPicks[ctx.wrongPicks.length - 1]}`, 'words')
      const timer = setTimeout(() => dispatch({ type: GameEvent.FEEDBACK_DONE }), 1100)
      return () => clearTimeout(timer)
    }
    if (ctx.status === GameState.LEVEL_COMPLETE) playEffect('win', soundOn)
    return undefined
  }, [ctx.status]) // eslint-disable-line react-hooks/exhaustive-deps

  if (ctx.status === GameState.LEVEL_COMPLETE) {
    return (
      <LevelComplete
        level={{ id: 'words', title: t('wordsTitle', 'First Words') }}
        accuracy={selectAccuracy(ctx)}
        stars={null}
        bestStreak={ctx.bestStreak}
        onContinue={() => onFinish()}
        onReplay={() => {
          onFinish()
          onReplay()
        }}
      />
    )
  }

  const busy = ctx.status !== GameState.AWAITING_INPUT

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 pb-10 pt-5">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => onFinish()} aria-label="Quit words" className={`flex h-10 w-10 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <X className="h-6 w-6" />
        </button>
        <div className="flex h-4 flex-1 gap-1.5" role="progressbar" aria-valuenow={progress.answered} aria-valuemin={0} aria-valuemax={progress.total} aria-label="Words progress">
          {Array.from({ length: progress.total }, (_, i) => (
            <motion.div key={i} className="h-full flex-1 rounded-full" animate={{ background: i < progress.answered ? 'var(--go)' : i === ctx.cursor ? 'var(--accent)' : 'var(--line)' }} />
          ))}
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center gap-7 py-6 text-center" aria-live="polite">
        <div>
          {/* Glyph rounds show the PICTURE (not the spelled word, which would
              reveal the target letter); picture rounds show the geez word. */}
          {isGlyph ? (
            <p className="text-7xl" aria-hidden="true">{word?.picture}</p>
          ) : (
            <p className="geez text-6xl font-black">{word?.geez}</p>
          )}
          <button
            type="button"
            onClick={() => audioPlayWord(word, soundOn)}
            className={`chunk mt-3 inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-white ${FOCUS}`}
            style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px', outlineColor: 'var(--accent)' }}
            aria-label={`Play the word ${word?.latin} again`}
          >
            <Volume2 className="h-5 w-5" aria-hidden="true" />
            {word?.latin}
          </button>
          {isGlyph && (
            <p className="mt-2 font-bold" style={{ color: 'var(--muted)' }}>
              {t('whichStart', 'Which letter does it start with?')}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {question?.options.map((opt) => {
            const option = isGlyph ? null : WORD_BY_LATIN.get(opt)
            const isTarget = opt === question.target
            const showGood = ctx.status === GameState.SUCCESS_BURST && isTarget
            const showBad = ctx.status === GameState.ERROR_RECOVERY && opt === ctx.wrongPicks[ctx.wrongPicks.length - 1]
            const dead = ctx.wrongPicks.includes(opt)
            return (
              <motion.button
                key={`${ctx.cursor}-${opt}`}
                type="button"
                disabled={busy || dead}
                onClick={() => dispatch({ type: GameEvent.SELECT_OPTION, payload: { audioKey: opt } })}
                animate={showBad ? { x: [0, -8, 8, -5, 5, 0] } : showGood ? { scale: [1, 1.12, 1] } : {}}
                transition={{ duration: 0.4 }}
                className={`chunk flex h-28 items-center justify-center rounded-3xl border-2 ${isGlyph ? 'geez text-7xl font-black' : 'text-6xl'} ${FOCUS}`}
                style={{
                  background: showGood ? 'var(--go-soft)' : showBad ? 'var(--bad-soft)' : 'var(--card)',
                  borderColor: showGood ? 'var(--go)' : showBad ? 'var(--bad)' : 'var(--line)',
                  boxShadow: `0 5px 0 ${showGood ? 'var(--go)' : showBad ? 'var(--bad)' : 'var(--line)'}`,
                  '--chunk-depth': '5px',
                  opacity: dead && !showBad ? 0.35 : 1,
                  outlineColor: 'var(--sky)',
                }}
                aria-label={isGlyph ? `Letter ${opt}` : `Picture of ${option?.meaning}`}
              >
                <span aria-hidden="true">{isGlyph ? opt : option?.picture}</span>
              </motion.button>
            )
          })}
        </div>

        <p className="h-6 font-bold" style={{ color: ctx.status === GameState.SUCCESS_BURST ? 'var(--go-ink)' : ctx.status === GameState.ERROR_RECOVERY ? 'var(--bad-ink)' : 'var(--muted)' }}>
          {ctx.status === GameState.SUCCESS_BURST && `${t('nice', 'Nice!')} ${word?.geez} = ${word?.meaning}`}
          {ctx.status === GameState.ERROR_RECOVERY && t('notQuite', 'Not quite!')}
          {ctx.status === GameState.PRESENTATION && t('listen', 'Listen…')}
        </p>
      </main>
    </div>
  )
}

function audioPlayWord(word, enabled) {
  if (!word) return
  import('./platform/audioEngine').then(({ audio }) =>
    audio.play(`words/${word.latin}`, { enabled, chime: { familyIndex: word.familyIndex, order: 1 } }),
  )
}

function Confetti({ count = 28 }) {
  const palette = ['var(--go)', 'var(--star)', 'var(--sky)', 'var(--accent)', 'var(--bad)']
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <motion.span
          key={i}
          className="absolute top-0 block"
          style={{
            left: `${(i * 137) % 100}%`,
            width: 8 + ((i * 53) % 7),
            height: 12 + ((i * 31) % 8),
            background: palette[i % palette.length],
            borderRadius: i % 3 === 0 ? '9999px' : '3px',
          }}
          initial={{ y: -30, opacity: 1, rotate: 0 }}
          animate={{ y: '105vh', opacity: [1, 1, 0.7], rotate: ((i % 2 ? 1 : -1) * (180 + ((i * 97) % 360))) }}
          transition={{ duration: 2.4 + ((i * 37) % 14) / 10, delay: (i % 9) * 0.12, ease: 'linear' }}
        />
      ))}
    </div>
  )
}
