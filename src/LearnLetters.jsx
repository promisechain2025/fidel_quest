/* ============================================================================
   LETTER STEPS — the learn-first mode that gates the quizzes
   ----------------------------------------------------------------------------
   Kids must LEARN letters before being quizzed on them. Per family:

     MEET      each form arrives alone, huge; touch it to hear it
     FORWARD   stepping stones: a letter is SPOKEN; pick it from the
               bottom tray and Anbessa hops the next stone (tray in
               reading order)
     BACKWARD  the same trip home with the tray lightly mixed; two
               misses and Anbessa sinks - the missed letter is taught
               (big + voiced), never a wall
     ECHO      a form is spoken; touch it in the ORDERED row (position helps)
     SHUFFLE   the row scrambles; five spoken rounds prove real recognition

   Between families: a MIX challenge over everything mastered so far
   (ha+le, then ha+le+me, ...), sampled sound-unique so twins never make a
   spoken round ambiguous. Mastering a group unlocks that group's quiz
   level on the home screen.

   Touch-first by design: every target is finger-of-a-four-year-old sized,
   wrong touches speak the letter instead of punishing, and a stuck child
   always gets a pulsing hint - nothing here ever blocks.

   The step machine is pure and seeded like every other machine in the app;
   the UI dispatches TOUCH events and renders the phase.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ArrowRight, ArrowLeft, Volume2, Star, Lock, Check } from 'lucide-react'
import { FIDEL_FAMILIES, ORDERS, INDEXES } from './platform/ethiopic'
import { playForm, playEffect, playPluck } from './platform/audioEngine'
import { recordAnswer } from './platform/telemetry'
import { t } from './platform/i18n'
import { rngNext, rngShuffle, Hero, Sprite2D, drawAnbessa, drawHyena } from './FidelQuestApp'
import FidelTracePad from './components/FidelTracePad'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const formOf = (key) => INDEXES.byAudioKey.get(key)

/* ============================================================================
   §1 THE STEP MACHINE (pure, seeded)
   ========================================================================== */

export const LearnPhase = Object.freeze({
  MEET: 'MEET',
  FORWARD: 'FORWARD',
  BACKWARD: 'BACKWARD',
  ECHO: 'ECHO',
  SHUFFLE: 'SHUFFLE',
  TRACE: 'TRACE',
  DONE: 'DONE',
})

// Pacing (P2): pre-readers encode phonemes fast but fatigue fast. Three
// high-impact rounds each; reinforcement is handled downstream by adaptive
// Star Practice and the cumulative Skylands boss, not by front-loaded grind.
export const ECHO_ROUNDS = 3
export const SHUFFLE_ROUNDS = 3
export const MIX_ROUNDS = 4
// Mix tray size: base form of every mastered family plus extra vocal orders
// up to this many sound-distinct letters. 12 wraps to three rows of cards on
// a phone and makes the challenge feel like a real review, not a rerun.
export const MIX_POOL_SIZE = 12

// Writing finale: trace EVERY form of the family, hearing each first. Kids
// should write all 7 real letters, not a sample - the pad never blocks, so
// a quick pass per letter keeps it light while covering the full row.
export const TRACE_ORDERS = [0, 1, 2, 3, 4, 5, 6]

// `avoid` may be a single key or a list of keys (the letters already eaten
// this round-set). Excluding all of them keeps the spoken target inside the
// letters still on the tray, so a fed-and-removed letter is never asked for.
function pickTarget(pool, avoid, rngState) {
  const avoidSet = new Set(avoid == null ? [] : Array.isArray(avoid) ? avoid : [avoid])
  let candidates = pool.filter((k) => !avoidSet.has(k))
  if (!candidates.length) candidates = pool
  const [value, next] = rngNext(rngState)
  return [candidates[Math.floor(value * candidates.length)], next]
}

/** A family lesson: all five phases over the family's 7 forms. */
export function learnInitial(familyId, seed) {
  const family = FIDEL_FAMILIES.find((f) => f.id === familyId)
  const forms = ORDERS.map((o) => `${familyId}-${o.index}`)
  return {
    kind: 'family',
    familyId,
    familyName: family ? family.name : familyId,
    phase: LearnPhase.MEET,
    forms,
    order: forms, // display order; re-shuffled for SHUFFLE
    idx: 0,
    round: 0,
    rounds: SHUFFLE_ROUNDS,
    target: null,
    wrongs: 0,
    eaten: [], // fed letters, removed from the tray during ECHO/SHUFFLE
    lastTouch: null,
    rngState: seed,
  }
}

/** A mix challenge: shuffle-only over several mastered families. */
export function mixInitial(familyIds, seed) {
  let rngState = seed
  const pool = []
  const usedSounds = new Set()
  // Base form of every family first (sound-unique), then extra orders.
  for (const fid of familyIds) {
    const key = `${fid}-1`
    const form = formOf(key)
    if (form && !usedSounds.has(form.sound)) {
      usedSounds.add(form.sound)
      pool.push(key)
    }
  }
  let extras
  ;[extras, rngState] = rngShuffle(
    familyIds.flatMap((fid) => ORDERS.slice(1).map((o) => `${fid}-${o.index}`)),
    rngState,
  )
  for (const key of extras) {
    if (pool.length >= MIX_POOL_SIZE) break
    const form = formOf(key)
    if (form && !usedSounds.has(form.sound)) {
      usedSounds.add(form.sound)
      pool.push(key)
    }
  }
  let order
  ;[order, rngState] = rngShuffle(pool, rngState)
  let target
  ;[target, rngState] = pickTarget(order, null, rngState)
  return {
    kind: 'mix',
    familyId: null,
    familyName: null,
    phase: LearnPhase.SHUFFLE,
    forms: order,
    order,
    idx: 0,
    round: 0,
    rounds: MIX_ROUNDS,
    target,
    wrongs: 0,
    eaten: [],
    lastTouch: null,
    rngState,
  }
}

/**
 * The only event: TOUCH(key). Every touch is accepted as a *sound* (letters
 * always speak when touched - that is the point) but only the expected
 * touch advances. Returns { next, advanced, correct }.
 */
export function learnTransition(ctx, key) {
  const touched = { ...ctx, lastTouch: key }
  switch (ctx.phase) {
    case LearnPhase.MEET: {
      if (key !== ctx.forms[ctx.idx]) return { next: touched, advanced: false, correct: false }
      if (ctx.idx + 1 < ctx.forms.length) {
        return { next: { ...touched, idx: ctx.idx + 1 }, advanced: true, correct: true }
      }
      return { next: { ...touched, phase: LearnPhase.FORWARD, idx: 0 }, advanced: true, correct: true }
    }
    case LearnPhase.FORWARD: {
      if (key !== ctx.forms[ctx.idx]) return { next: touched, advanced: false, correct: false }
      if (ctx.idx + 1 < ctx.forms.length) {
        return { next: { ...touched, idx: ctx.idx + 1 }, advanced: true, correct: true }
      }
      return { next: { ...touched, phase: LearnPhase.BACKWARD, idx: ctx.forms.length - 1 }, advanced: true, correct: true }
    }
    case LearnPhase.BACKWARD: {
      if (key !== ctx.forms[ctx.idx]) return { next: touched, advanced: false, correct: false }
      if (ctx.idx > 0) {
        return { next: { ...touched, idx: ctx.idx - 1 }, advanced: true, correct: true }
      }
      // Enter ECHO with a first spoken target and a full tray.
      const [target, rngState] = pickTarget(ctx.forms, null, ctx.rngState)
      return {
        next: { ...touched, phase: LearnPhase.ECHO, round: 0, wrongs: 0, eaten: [], target, rngState },
        advanced: true,
        correct: true,
      }
    }
    case LearnPhase.ECHO:
    case LearnPhase.SHUFFLE: {
      if (key !== ctx.target) {
        return { next: { ...touched, wrongs: ctx.wrongs + 1 }, advanced: false, correct: false }
      }
      const round = ctx.round + 1
      const isEcho = ctx.phase === LearnPhase.ECHO
      const roundLimit = isEcho ? ECHO_ROUNDS : ctx.rounds
      // Anbessa just ate this letter: it leaves the tray, and the next spoken
      // target is drawn only from letters still on it.
      const eaten = [...(ctx.eaten || []), key]
      if (round < roundLimit) {
        const [target, rngState] = pickTarget(ctx.forms, eaten, ctx.rngState)
        return { next: { ...touched, round, wrongs: 0, eaten, target, rngState }, advanced: true, correct: true }
      }
      if (isEcho) {
        // ECHO done -> SHUFFLE: scramble the display order, refill the tray.
        let [order, rngState] = rngShuffle(ctx.forms, ctx.rngState)
        let target
        ;[target, rngState] = pickTarget(order, null, rngState)
        return {
          next: { ...touched, phase: LearnPhase.SHUFFLE, order, round: 0, wrongs: 0, eaten: [], target, rngState },
          advanced: true,
          correct: true,
        }
      }
      // Families finish by writing a few of their letters; mixes end here.
      if (ctx.kind === 'family') {
        const traceForms = TRACE_ORDERS.map((i) => ctx.forms[i]).filter(Boolean)
        return {
          next: { ...touched, phase: LearnPhase.TRACE, traceForms, traceIdx: 0, eaten, target: null },
          advanced: true,
          correct: true,
        }
      }
      return { next: { ...touched, phase: LearnPhase.DONE, eaten, target: null }, advanced: true, correct: true }
    }
    case LearnPhase.TRACE: {
      if (key !== '__traced__') return { next: touched, advanced: false, correct: false }
      const traceIdx = (ctx.traceIdx ?? 0) + 1
      if (traceIdx < (ctx.traceForms?.length ?? 1)) {
        return { next: { ...touched, traceIdx }, advanced: true, correct: true }
      }
      return { next: { ...touched, phase: LearnPhase.DONE }, advanced: true, correct: true }
    }
    default:
      return { next: ctx, advanced: false, correct: false }
  }
}

/* ============================================================================
   §2 THE PATH (stones, persistence, level gating)
   ========================================================================== */

const LEARN_KEY = 'fq.learn.v1'

export function loadLearn() {
  try {
    const data = JSON.parse(localStorage.getItem(LEARN_KEY)) || {}
    return { mastered: data.mastered || [], mixes: data.mixes || [] }
  } catch {
    return { mastered: [], mixes: [] }
  }
}
function saveLearn(state) {
  try {
    localStorage.setItem(LEARN_KEY, JSON.stringify(state))
  } catch {
    /* session-only */
  }
}

/** The stone sequence: family, family, mix, family, mix, ... per group. */
export function buildStones() {
  const stones = []
  for (let g = 0; g < 4; g++) {
    const familyIds = FIDEL_FAMILIES.slice(g * 8, g === 3 ? FIDEL_FAMILIES.length : g * 8 + 8).map((f) => f.id)
    familyIds.forEach((fid, i) => {
      stones.push({ type: 'family', id: fid, group: g + 1 })
      if (i > 0) {
        stones.push({ type: 'mix', id: `mix-${fid}`, group: g + 1, families: familyIds.slice(0, i + 1) })
      }
    })
  }
  return stones
}
export const STONES = buildStones()

export const stoneDone = (learn, stone) =>
  stone.type === 'family' ? learn.mastered.includes(stone.id) : learn.mixes.includes(stone.id)

/** Stones unlock strictly in sequence. */
export function stoneUnlocked(learn, index) {
  for (let i = 0; i < index; i++) if (!stoneDone(learn, STONES[i])) return false
  return true
}

/** A quiz group is playable once all its families are mastered. */
export function groupMastered(learn, group) {
  return FIDEL_FAMILIES.slice((group - 1) * 8, group === 4 ? FIDEL_FAMILIES.length : (group - 1) * 8 + 8).every((f) =>
    learn.mastered.includes(f.id),
  )
}

/* ============================================================================
   §3 UI — every phase is a mini-game
   MEET     Bubble Pop: the letter drifts in a wobbling bubble; pop it
   FORWARD/ Stepping Stones: hear a letter, pick its card in the bottom
   BACKWARD tray, Anbessa hops on; two misses = he sinks + we teach it
   ECHO     Feed Anbessa: touch the spoken cookie and it flies to his mouth
   SHUFFLE  Jibby the Thief: he creeps toward the cookies each round; grab
            the spoken letter and he retreats (tension, never punishment)
   The machine (§1) is untouched - these are pure presentation.
   ========================================================================== */

/* Bubble palette: vivid, glossy balls carrying a WHITE letter. Legibility here
   is luminance-based, not hue-based, so it stays clear for color-blind kids and
   in both themes - every base is dark enough for white large text to clear a
   3:1 contrast ratio. One color per letter index for variety, not meaning. */
const BUBBLE_COLORS = [
  { hi: '#ff8ea0', base: '#e6304f', lo: '#a5183a' }, // strawberry
  { hi: '#ffb152', base: '#f0700f', lo: '#b04c06' }, // tangerine
  { hi: '#b48bf2', base: '#7d43d8', lo: '#532c99' }, // grape
  { hi: '#56b7f7', base: '#1f83db', lo: '#135a97' }, // blue raspberry
  { hi: '#ff92c8', base: '#e6459a', lo: '#a52a6d' }, // bubblegum
  { hi: '#66cf83', base: '#1aa15a', lo: '#0f6d3c' }, // apple green
  { hi: '#48d3ca', base: '#0c988f', lo: '#086862' }, // turquoise
]

/** MEET: pop the drifting bubble to hear the letter. */
function BubbleMeet({ ctx, onTouch }) {
  const form = formOf(ctx.forms[ctx.idx])
  const met = ctx.forms.slice(0, ctx.idx)
  const [popped, setPopped] = useState(false)
  if (!form) return null
  const c = BUBBLE_COLORS[ctx.idx % BUBBLE_COLORS.length]
  // On pop: freeze the wandering, voice the letter, and let the bubble swell and
  // fade. The parent holds the advance (~0.9s) so the next letter only drifts in
  // once this one has been fully spoken and cleared.
  const pop = () => {
    if (popped) return
    setPopped(true)
    onTouch(form.audioKey)
  }
  return (
    <motion.div key={`meet-${ctx.idx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} className="flex w-full flex-col items-center gap-5">
      <p className="font-extrabold" style={{ color: 'var(--muted)' }}>
        {t('popHint', 'Pop the bubble!')} · {ctx.idx + 1}/7
      </p>
      <div className="relative h-64 w-full overflow-hidden rounded-3xl" style={{ background: 'linear-gradient(to bottom, #cfeafd 0%, #eaf7ff 55%, #fff6e8 100%)' }}>
        {/* floating sparkles for a lively stage */}
        {[14, 40, 66, 88, 28, 74].map((left, i) => (
          <motion.span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-white"
            style={{ left: `${left}%`, top: `${(i * 37) % 78 + 8}%` }}
            animate={{ opacity: [0.15, 0.8, 0.15], scale: [0.6, 1.2, 0.6] }}
            transition={{ duration: 2 + (i % 3) * 0.7, repeat: Infinity, delay: i * 0.3 }}
            aria-hidden="true"
          />
        ))}
        <motion.button
          type="button"
          onPointerDown={pop}
          disabled={popped}
          initial={{ x: '-30%', y: 30, scale: 0.5 }}
          animate={
            popped
              ? // Popped: stop wandering, swell and fade out slowly while the
                // letter is voiced, so the stage clears before the next drifts in.
                { scale: 1.4, opacity: 0 }
              : {
                  // A wandering loop (roughly a figure-8) instead of a straight
                  // back-and-forth, with a rocking tilt and a bouncy squash-stretch
                  // so the letter looks like it is dancing around the stage.
                  x: ['-34%', '0%', '32%', '38%', '10%', '-24%', '-40%', '-34%'],
                  y: [24, 8, 26, 52, 66, 54, 30, 24],
                  rotate: [0, 9, -5, 8, -9, 6, -3, 0],
                  scale: [1, 1.06, 0.95, 1.05, 0.97, 1.07, 0.96, 1],
                }
          }
          transition={
            popped
              ? { duration: 0.85, ease: 'easeInOut' }
              : { duration: 8.5, repeat: Infinity, ease: 'easeInOut', times: [0, 0.14, 0.3, 0.45, 0.6, 0.74, 0.88, 1] }
          }
          className={`geez absolute left-1/2 top-4 flex h-40 w-40 items-center justify-center rounded-full text-8xl font-black ${FOCUS}`}
          style={{
            // Glossy candy ball: a bright off-centre core melts into the rich
            // base and a deep rim, an inner top-light gives the sheen, and a
            // soft glow in the bubble's own colour makes it pop off the stage.
            background: `radial-gradient(circle at 36% 26%, ${c.hi} 0%, ${c.base} 56%, ${c.lo} 100%)`,
            border: '4px solid rgba(255,255,255,0.95)',
            boxShadow: `inset -7px -11px 24px rgba(0,0,0,0.20), inset 7px 9px 20px rgba(255,255,255,0.28), 0 12px 30px ${c.base}59`,
            color: '#ffffff',
            textShadow: '0 2px 5px rgba(0,0,0,0.4)',
            touchAction: 'none',
            outlineColor: 'var(--sky)',
          }}
          aria-label={`Pop the bubble to hear ${form.sound}`}
        >
          {/* counter-rotate the glyph a touch so it stays readable while the
              bubble rocks, then give it its own gentle wiggle (the dance) */}
          <motion.span
            animate={{ rotate: [0, -6, 4, -5, 0], y: [0, -2, 1, -2, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="block"
          >
            {form.char}
          </motion.span>
          <span className="absolute left-8 top-7 h-7 w-11 rotate-[-25deg] rounded-full bg-white/85" aria-hidden="true" />
        </motion.button>
      </div>
      <p className="mono text-2xl font-black" style={{ color: 'var(--sky)' }}>
        {form.sound}
      </p>
      {/* Anbessa's shelf of collected letters */}
      <div className="flex min-h-12 items-end gap-2">
        <Hero size={48} />
        {met.map((k) => (
          <motion.span key={k} initial={{ scale: 0 }} animate={{ scale: 1 }} className="geez flex h-11 w-9 items-center justify-center rounded-xl border-2 text-xl font-black" style={{ background: 'var(--go-soft)', color: 'var(--go-ink)', borderColor: 'var(--go)' }}>
            {formOf(k)?.char}
          </motion.span>
        ))}
      </div>
    </motion.div>
  )
}

/* ── STEPPING STONES ──
   The seven forms are stones across a river, and their letter CARDS sit in
   a tray at the bottom. The game is LISTEN-AND-FIND: the app speaks the
   next letter, the child picks its card by ear, and ANBESSA HOPS onto the
   next stone - cross the river one way, then hop back home: the exact
   ordered traversal the step machine asks for. Difficulty is staged: the
   first crossing keeps the tray in reading order, the trip home lightly
   mixes it, and the spoken games after go harder still. A wrong pick
   shakes the card and re-voices the ASKED letter; on the second miss
   Anbessa SINKS and the rescue banner teaches the missed letter (shown
   big, voiced, its card pulsing) - tapping it pulls him back up, so a
   sink is a lesson, never a wall. Every pick lands in the trouble ledger,
   so the warm-up coach later recommends reviewing the letters that sank
   him. Each hop plays a rising pentatonic plop. */
const STONE_POINTS = [0, 1, 2, 3, 4, 5, 6].map((i) => ({
  left: 12 + i * 12.6,
  top: i % 2 === 0 ? 62 : 40,
}))
const BANKS = { left: { left: 9, top: 58 }, right: { left: 92, top: 58 } }

/** BACKWARD tray: "a little mix" - seeded swaps of adjacent pairs, so every
    card sits at most one step from its reading-order spot. Deterministic in
    the lesson seed like everything else. */
export function trayMix(forms, seed) {
  const arr = forms.slice()
  let state = ((seed ?? 1) | 0) ^ 0x51ed
  for (let i = 0; i + 1 < arr.length; i += 2) {
    let value
    ;[value, state] = rngNext(state)
    if (value < 0.7) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
  }
  return arr
}

const SINK_MISSES = 2

function StoneHops({ ctx, onTouch, soundOn = true, seed = 1 }) {
  const forward = ctx.phase === LearnPhase.FORWARD
  const activeKey = ctx.forms[ctx.idx]
  const activeForm = formOf(activeKey)
  // Wrong-pick feedback is view-local: which card is shaking and how many
  // misses on the CURRENT stone. At SINK_MISSES Anbessa slips into the
  // water and the rescue banner takes over; a correct pick (the pulsing
  // card) pulls him back up and the crossing continues. `teachKey` pins
  // the letter the banner teaches to the one that was actually MISSED -
  // the live target advances in the same tap that rescues him, so reading
  // it from ctx would flash the next letter as a free hint.
  const [wrongKey, setWrongKey] = useState(null)
  const [misses, setMisses] = useState(0)
  const [teachKey, setTeachKey] = useState(null)
  const wrongTimer = useRef(null)
  useEffect(() => () => clearTimeout(wrongTimer.current), [])
  const sunk = misses >= SINK_MISSES
  const tray = useMemo(() => (forward ? ctx.forms : trayMix(ctx.forms, seed)), [forward, ctx.forms, seed])
  const pick = useCallback(
    (k) => {
      if (k === activeKey) {
        // Clear the sink state in the SAME event as the advance: doing it in
        // an activeKey effect runs after paint, leaving a visible moment
        // where the banner and pulse point at the next letter.
        setMisses(0)
        setWrongKey(null)
        clearTimeout(wrongTimer.current)
        playPluck(formOf(k)?.order ?? 1, soundOn)
      } else {
        setWrongKey(k)
        setTeachKey(activeKey)
        setMisses((m) => m + 1)
        clearTimeout(wrongTimer.current)
        wrongTimer.current = setTimeout(() => setWrongKey(null), 520)
      }
      onTouch(k)
    },
    [onTouch, soundOn, activeKey],
  )
  const isDone = (i) => (forward ? i < ctx.idx : i > ctx.idx)
  // Anbessa stands on the last stone he won; before the first win he waits
  // on the bank he is crossing FROM.
  const standIdx = forward ? ctx.idx - 1 : ctx.idx + 1
  const stand = standIdx < 0 ? BANKS.left : standIdx >= ctx.forms.length ? BANKS.right : STONE_POINTS[standIdx]
  return (
    <motion.div key={ctx.phase} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex w-full flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <p className="flex items-center gap-2 text-lg font-extrabold">
          {forward ? <ArrowRight className="h-7 w-7" style={{ color: 'var(--star)' }} aria-hidden="true" /> : <ArrowLeft className="h-7 w-7" style={{ color: 'var(--star)' }} aria-hidden="true" />}
          {forward ? t('stoneFwd', 'Listen! Tap the letter to hop across!') : t('stoneBack', 'Listen! Hop back home!')}
        </p>
        <button
          type="button"
          onClick={() => playForm(activeForm, soundOn)}
          aria-label={t('hearIt', 'Hear it again')}
          className={`chunk flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${FOCUS}`}
          style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px', outlineColor: 'var(--accent)' }}
        >
          <Volume2 className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      {/* The river is a picture now, not a touch target: the child plays the
          TRAY below, and the stones show where Anbessa is going. */}
      <div className="fq-land-short pointer-events-none relative h-64 w-full overflow-hidden rounded-3xl" style={{ background: 'linear-gradient(to bottom, #aee3ff 0%, #7ecbfa 26%, #2fa8ec 30%, #1287cf 100%)' }} aria-hidden="true">
        {/* far bank, sun, and the two grassy shores */}
        <div className="absolute inset-x-0 top-[22%] h-3" style={{ background: 'rgba(255,255,255,0.35)', filter: 'blur(3px)' }} />
        <div className="absolute left-[46%] top-2 h-10 w-10 rounded-full" style={{ background: 'radial-gradient(circle at 40% 35%, #fff3b0, #ffc800)', boxShadow: '0 0 24px 6px rgba(255,200,0,0.45)' }} />
        <div className="absolute bottom-0 left-0 top-[26%] w-[9%] rounded-r-3xl" style={{ background: 'linear-gradient(to right, #58cc02, #3f9302)' }} />
        <div className="absolute bottom-0 right-0 top-[26%] w-[9%] rounded-l-3xl" style={{ background: 'linear-gradient(to left, #58cc02, #3f9302)' }} />
        {/* drifting ripples */}
        {[18, 42, 66, 84].map((left, i) => (
          <motion.span key={i} className="absolute h-1.5 w-10 rounded-full" style={{ left: `${left}%`, top: `${34 + (i * 17) % 46}%`, background: 'rgba(255,255,255,0.35)' }} animate={{ x: [0, 10, 0], opacity: [0.25, 0.6, 0.25] }} transition={{ duration: 3 + i, repeat: Infinity }} />
        ))}
        {/* The stones are BLANK until crossed: showing their letters would
            let the child shape-match card to stone instead of picking by
            ear. A stone earns its letter (golden) once Anbessa lands on
            it, leaving a readable trail of the crossing so far. */}
        {ctx.forms.map((k, i) => {
          const form = formOf(k)
          const p2 = STONE_POINTS[i]
          const active = k === activeKey
          const done = isDone(i)
          return (
            <motion.div
              key={k}
              animate={active ? { scale: [1, 1.12, 1], transition: { duration: 0.9, repeat: Infinity } } : { scale: 1 }}
              className="geez absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 select-none items-center justify-center rounded-[45%] text-2xl font-black"
              style={{
                left: `${p2.left}%`,
                top: `${p2.top}%`,
                background: done
                  ? 'radial-gradient(circle at 35% 30%, #ffe08a, #f5b91e)'
                  : active
                    ? 'radial-gradient(circle at 35% 30%, #fffbe9, #efe3c8)'
                    : 'radial-gradient(circle at 35% 30%, #d7dde2, #97a3ac)',
                color: '#7c5200',
                border: `3px solid ${done ? '#c98d0a' : active ? '#ffc800' : 'rgba(255,255,255,0.55)'}`,
                boxShadow: active
                  ? '0 0 0 5px rgba(255,200,0,0.35), 0 6px 0 rgba(0,0,0,0.22)'
                  : '0 6px 0 rgba(0,0,0,0.22)',
              }}
            >
              {done ? form?.char : ''}
            </motion.div>
          )
        })}
        {/* Anbessa hops to the stone he just won (spring = the jump). The
            animated element is a ZERO-SIZE anchor at the stone's center and
            the sprite hangs off it by fixed pixel offsets - framer-motion
            owns `transform`, so percentage self-offsets there get dropped
            and he would drift off the stones (the bug this replaces).
            When the child misses twice he SINKS: the anchor drops into the
            water, he tilts, and a splash ring blooms on the surface. */}
        <motion.div
          className="absolute z-10 h-0 w-0"
          initial={false}
          animate={{ left: `${stand.left}%`, top: `${stand.top + (sunk ? 15 : 0)}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        >
          <motion.div className="absolute" style={{ left: -27, top: -66 }} animate={{ rotate: sunk ? -16 : 0 }}>
            <Hero size={54} />
          </motion.div>
        </motion.div>
        <AnimatePresence>
          {sunk && (
            <motion.div
              key="splash"
              className="absolute z-10 h-4 w-16 rounded-full"
              style={{ left: `calc(${stand.left}% - 2rem)`, top: `${stand.top}%`, border: '3px solid rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.25)' }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 0.9, 0.5], scale: [0.4, 1.15, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
            />
          )}
        </AnimatePresence>
        {/* Rescue banner: the sink becomes the lesson - the missed letter,
            big and voiced, with its card pulsing in the tray below. */}
        <AnimatePresence>
          {sunk && (
            <motion.div
              key="teach"
              className="absolute inset-x-0 top-2 z-20 mx-auto flex w-fit max-w-[92%] items-center gap-3 rounded-2xl px-4 py-2"
              style={{ background: 'var(--card)', boxShadow: '0 6px 18px rgba(0,0,0,0.3)' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <span className="geez text-4xl font-black" style={{ color: 'var(--accent-deep)' }}>{formOf(teachKey)?.char}</span>
              <span className="text-left text-sm font-extrabold leading-tight" style={{ color: 'var(--ink)' }}>
                {t('stoneTeach', 'This is the letter! Tap it below to pull Anbessa up')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* the tray: FORWARD keeps reading order, BACKWARD is lightly mixed */}
      <div className="grid w-full grid-cols-7 gap-1.5" role="group" aria-label={t('stoneTray', 'Letter cards')}>
        {tray.map((k) => {
          const form = formOf(k)
          const done = isDone(ctx.forms.indexOf(k))
          const wrong = k === wrongKey
          // Once Anbessa is in the water the right card pulses: the rescue
          // is guided, so the sink teaches instead of stalling the child.
          // Keyed to the MISSED letter, never the live target.
          const hinted = sunk && k === teachKey
          return (
            <motion.button
              key={k}
              type="button"
              onClick={() => pick(k)}
              disabled={done}
              aria-label={`Letter ${form?.sound}`}
              animate={
                wrong
                  ? { x: [0, -7, 7, -5, 5, 0], transition: { duration: 0.42 } }
                  : hinted
                    ? { scale: [1, 1.12, 1], transition: { duration: 0.8, repeat: Infinity } }
                    : { x: 0, scale: 1 }
              }
              className={`geez flex h-14 w-full select-none items-center justify-center rounded-xl border-b-4 text-2xl font-black ${FOCUS}`}
              style={{
                background: done
                  ? 'var(--line)'
                  : wrong
                    ? 'radial-gradient(circle at 32% 26%, #ff9a8a, #e23b2c)'
                    : 'radial-gradient(circle at 32% 26%, #f7d9a2, #e0a856)',
                borderColor: done ? 'transparent' : wrong ? '#8f160c' : hinted ? 'var(--accent)' : '#a06a30',
                color: done ? 'var(--muted)' : wrong ? '#fff' : '#5b3a12',
                opacity: done ? 0.45 : 1,
                boxShadow: hinted ? '0 0 0 4px rgba(255,150,0,0.4)' : undefined,
                outlineColor: 'var(--sky)',
              }}
            >
              {form?.char}
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}

/** One draggable letter card. Drag it onto Anbessa's mouth (or tap it) to
    feed him. `mouthRef` is the drop target; a drop within it feeds `k`.
    `onFeed(k, rect)` reports the card's screen rect so the parent can fly the
    letter from here into the mouth. */
function LetterCard({ k, hinted, delay, mouthRef, onFeed, onDragActive, refusing }) {
  const form = formOf(k)
  const elRef = useRef(null)
  const feed = () => onFeed(k, elRef.current?.getBoundingClientRect())
  const overMouth = (event, info) => {
    const zone = mouthRef.current
    if (!zone) return false
    const r = zone.getBoundingClientRect()
    const x = event?.clientX ?? info?.point?.x
    const y = event?.clientY ?? info?.point?.y
    if (x == null || y == null) return false
    const pad = 36 // generous catch radius for little fingers
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad
  }
  return (
    <motion.div
      ref={elRef}
      layout
      data-form={k}
      role="button"
      tabIndex={0}
      aria-label={`Letter ${form?.sound} — drag to Anbessa or tap`}
      drag
      dragSnapToOrigin
      dragElastic={0.5}
      whileDrag={{ scale: 1.25, zIndex: 60 }}
      onDragStart={() => onDragActive(true)}
      onDragEnd={(event, info) => {
        onDragActive(false)
        if (overMouth(event, info)) feed()
      }}
      onTap={feed}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          feed()
        }
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={
        refusing
          ? { scale: 1, opacity: 1, x: [0, -9, 9, -6, 6, 0], transition: { duration: 0.45 } }
          : hinted
            ? { scale: [1, 1.14, 1], opacity: 1, transition: { duration: 0.8, repeat: Infinity } }
            : { scale: 1, opacity: 1, y: [0, -4, 0], transition: { y: { duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay } } }
      }
      // Quick lift-off: the flying letter (in CookieField) carries the char
      // into the mouth, so the card itself just clears out fast.
      exit={{ scale: 0.2, opacity: 0, transition: { duration: 0.16, ease: 'easeIn' } }}
      className={`geez relative flex h-16 w-16 cursor-grab touch-none select-none items-center justify-center rounded-2xl border-4 text-3xl font-black active:cursor-grabbing ${FOCUS}`}
      style={{
        // Wrong pick: the card goes red so the child sees which letter missed.
        background: refusing ? 'radial-gradient(circle at 32% 26%, #ff9a8a, #e23b2c)' : 'radial-gradient(circle at 32% 26%, #f7d9a2, #e0a856)',
        borderColor: refusing ? '#b21e12' : hinted ? 'var(--accent)' : '#c68a44',
        color: refusing ? '#fff' : '#5b3a12',
        boxShadow: refusing ? '0 4px 0 #8f160c, 0 0 0 4px rgba(226,59,44,0.30)' : '0 4px 0 #a06a30',
        outlineColor: 'var(--sky)',
      }}
    >
      {form?.char}
    </motion.div>
  )
}

/** ECHO/SHUFFLE: drag the spoken letter into Anbessa's mouth. Correct letters
    are eaten (open mouth, then removed from the tray); wrong ones make him
    refuse with a paw swat. Jibby creeps in during SHUFFLE for gentle tension. */
function CookieField({ ctx, lionMood, refuseKey, onTouch }) {
  const isShuffle = ctx.phase === LearnPhase.SHUFFLE
  const roundLimit = ctx.phase === LearnPhase.ECHO ? ECHO_ROUNDS : ctx.rounds
  const trayRef = useRef(null)
  const mouthRef = useRef(null)
  const pendingRef = useRef({}) // key -> tray-relative point where it was fed
  const prevEaten = useRef(ctx.eaten || [])
  const flyerId = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [flyers, setFlyers] = useState([]) // letters mid-flight into the mouth
  // Only letters still on the tray; always keep the current target so a wrong
  // drag on a removed letter can never strand the round.
  const eaten = ctx.eaten || []
  const visible = ctx.order.filter((k) => !eaten.includes(k) || k === ctx.target)
  const mood = dragging ? 'hungry' : lionMood

  // Record where a card was when fed, so its flight can start from there.
  const feed = (k, rect) => {
    const tray = trayRef.current
    if (tray && rect) {
      const t = tray.getBoundingClientRect()
      pendingRef.current[k] = { x: rect.left + rect.width / 2 - t.left, y: rect.top + rect.height / 2 - t.top }
    }
    onTouch(k)
  }

  // When a letter becomes eaten, launch it flying from its card into the mouth.
  useEffect(() => {
    const now = ctx.eaten || []
    const newly = now.filter((k) => !prevEaten.current.includes(k))
    prevEaten.current = now
    if (!newly.length) return
    const tray = trayRef.current
    const mouthEl = mouthRef.current
    if (!tray || !mouthEl) return
    const t = tray.getBoundingClientRect()
    const m = mouthEl.getBoundingClientRect()
    const to = { x: m.left + m.width / 2 - t.left, y: m.top + m.height * 0.5 - t.top }
    const added = newly.map((k) => ({
      id: (flyerId.current += 1),
      char: formOf(k)?.char,
      from: pendingRef.current[k] || { x: to.x, y: t.height * 0.22 },
      to,
    }))
    setFlyers((f) => [...f, ...added])
  }, [ctx.eaten])

  return (
    <motion.div key={`${ctx.phase}-field`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex w-full flex-col items-center gap-4">
      <p className="text-lg font-extrabold">
        {isShuffle ? t('catchHint', 'Feed Anbessa before Jibby grabs it!') : t('feedHint', 'Drag the letter Kokeb says to Anbessa')}{' '}
        <span className="mono" style={{ color: 'var(--muted)' }}>
          {ctx.round + 1}/{roundLimit}
        </span>
      </p>
      <div ref={trayRef} className="relative w-full overflow-hidden rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
        <div className="grid grid-cols-4 place-items-center gap-3 sm:gap-4">
          <AnimatePresence>
            {visible.map((k, i) => (
              <LetterCard
                key={`${ctx.phase}-${k}`}
                k={k}
                hinted={ctx.wrongs >= 2 && k === ctx.target}
                delay={(i % 4) * 0.12}
                mouthRef={mouthRef}
                onFeed={feed}
                onDragActive={setDragging}
                refusing={k === refuseKey}
              />
            ))}
          </AnimatePresence>
        </div>
        {/* Letters in flight: arc from the card into Anbessa's open mouth. */}
        <AnimatePresence>
          {flyers.map((fl) => (
            <motion.span
              key={fl.id}
              className="geez pointer-events-none absolute left-0 top-0 z-40 flex h-9 w-9 items-center justify-center rounded-lg text-xl font-black"
              style={{ background: 'radial-gradient(circle at 32% 26%, #f7d9a2, #e0a856)', color: '#5b3a12', boxShadow: '0 2px 0 #a06a30' }}
              // A slow, watchable arc: shrink steadily so it never covers
              // Anbessa, but stay fully visible until it reaches the mouth,
              // then pop out (swallowed) as he chomps - so it is clear he ate
              // it, not that it vanished mid-air.
              initial={{ x: fl.from.x - 18, y: fl.from.y - 18, scale: 0.72, opacity: 1 }}
              animate={{
                x: fl.to.x - 18,
                y: [fl.from.y - 18, Math.min(fl.from.y, fl.to.y) - 46, fl.to.y - 18],
                scale: [0.72, 0.5, 0.22],
                opacity: [1, 1, 1, 0],
                rotate: 16,
                transition: { duration: 0.9, ease: 'easeInOut' },
              }}
              onAnimationComplete={() => setFlyers((f) => f.filter((x) => x.id !== fl.id))}
              aria-hidden="true"
            >
              {fl.char}
            </motion.span>
          ))}
        </AnimatePresence>
        {/* Jibby creeps toward the tray during SHUFFLE rounds */}
        {isShuffle && (
          <motion.div
            key={`jibby-${ctx.round}`}
            className="pointer-events-none absolute -right-2 top-2"
            initial={{ x: 90, rotate: 8 }}
            animate={{ x: 14 }}
            transition={{ duration: 6.5, ease: 'linear' }}
            aria-hidden="true"
          >
            <Sprite2D draw={drawHyena} size={56} />
          </motion.div>
        )}
        {/* Anbessa waits below — alive: he breathes and sways, leans in when a
            letter is dragged near, chews on a correct feed, and shakes+swats
            on a wrong one. He is the drop target (mouthRef). */}
        <div className="mt-3 flex justify-center">
          <motion.div
            ref={mouthRef}
            className="relative origin-bottom"
            animate={
              mood === 'refuse'
                ? { rotate: [0, -12, 12, -7, 0], y: [0, -2, 0], transition: { duration: 0.5 } }
                : mood === 'eating'
                  ? {
                      // Hold the open mouth steady while the letter flies in
                      // (~0.7s), then chomp - so the catch is legible.
                      scaleX: [1, 1, 1.09, 0.92, 1.04, 1],
                      scaleY: [1, 1, 0.92, 1.1, 0.97, 1],
                      transition: { duration: 1.0, times: [0, 0.66, 0.78, 0.88, 0.95, 1], ease: 'easeInOut' },
                    }
                  : mood === 'hungry'
                    ? { scale: 1.08, y: [0, -3, 0], transition: { scale: { duration: 0.2 }, y: { duration: 0.7, repeat: Infinity, ease: 'easeInOut' } } }
                    : { scale: 1, y: [0, -2.5, 0], rotate: [0, -1.5, 0, 1.5, 0], transition: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' } }
            }
          >
            <Sprite2D draw={drawAnbessa} mood={mood} size={88} />
            {/* the swatting paw on a refusal */}
            <AnimatePresence>
              {mood === 'refuse' && (
                <motion.span
                  key="paw"
                  className="absolute left-1/2 top-2 h-7 w-7 rounded-full"
                  style={{ background: '#e08300', boxShadow: '0 0 0 3px #c66f00 inset' }}
                  initial={{ x: 30, y: -10, rotate: -20, opacity: 0 }}
                  animate={{ x: [-24, 22], y: [-6, 2], opacity: [0, 1, 0], transition: { duration: 0.5 } }}
                  exit={{ opacity: 0 }}
                  aria-hidden="true"
                />
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

function learnReducer(ctx, key) {
  return learnTransition(ctx, key).next
}

/** One lesson (family or mix), machine-driven. */
function StoneLesson({ stone, seed, soundOn, onDone, onBack }) {
  const [ctx, dispatch] = useReducer(
    learnReducer,
    undefined,
    () => (stone.type === 'family' ? learnInitial(stone.id, seed) : mixInitial(stone.families, seed)),
  )
  const [burst, setBurst] = useState(0)
  // Feed feedback: Anbessa's mood ('happy' idle, 'eating' on a correct feed,
  // 'refuse' on a wrong one) and which letter he just swatted away.
  const [lionMood, setLionMood] = useState('happy')
  const [refuseKey, setRefuseKey] = useState(null)
  const prevPhase = useRef(ctx.phase)
  const moodTimer = useRef(null)
  const refuseTimer = useRef(null)
  const meetTimer = useRef(null)
  const retargetTimer = useRef(null)
  useEffect(
    () => () => {
      clearTimeout(moodTimer.current)
      clearTimeout(refuseTimer.current)
      clearTimeout(meetTimer.current)
      clearTimeout(retargetTimer.current)
    },
    [],
  )
  const flashMood = useCallback((mood, ms) => {
    setLionMood(mood)
    clearTimeout(moodTimer.current)
    moodTimer.current = setTimeout(() => setLionMood('happy'), ms)
  }, [])

  const touch = useCallback(
    (key) => {
      const { advanced, correct } = learnTransition(ctx, key)
      const spoken = ctx.phase === LearnPhase.ECHO || ctx.phase === LearnPhase.SHUFFLE
      const stones = ctx.phase === LearnPhase.FORWARD || ctx.phase === LearnPhase.BACKWARD
      // The stones are a listen-and-find game: the target was already spoken,
      // so a correct pick needs no re-voicing (the pluck + hop confirm it) and
      // a wrong pick re-voices the ASKED letter, same as the feed game. Every
      // pick lands in the trouble ledger so the warm-up coach later recommends
      // reviewing the letters that sank Anbessa.
      if (stones) {
        recordAnswer(ctx.forms[ctx.idx], key, 'learn')
        if (!correct) {
          playEffect('bad', soundOn)
          clearTimeout(retargetTimer.current)
          retargetTimer.current = setTimeout(() => playForm(formOf(ctx.forms[ctx.idx]), soundOn), 420)
        }
        if (advanced) setBurst((b) => b + 1)
        dispatch(key)
        return
      }
      // Outside the feed game every tap voices the letter it touched (that IS
      // the point - hear each bubble). In the feed game we never voice the
      // tapped letter: a correct pick is announced as the next target, and
      // a wrong pick is deliberately NOT voiced (see the wrong branch below).
      if (!spoken) playForm(formOf(key), soundOn)
      if (spoken) {
        recordAnswer(ctx.target, key, 'learn')
        if (correct) {
          setBurst((b) => b + 1)
          playEffect('good', soundOn)
          // Keep the mouth open through the letter's ~0.9s flight and the
          // chomp that follows, so he is visibly eating it.
          flashMood('eating', 1050)
          dispatch(key)
          return
        }
        // Wrong: he refuses (paw swat + head shake), the wrong card flashes RED,
        // and instead of voicing what they picked (which makes them forget the
        // ask) we RE-VOICE THE ASKED LETTER so the target stays anchored.
        playEffect('bad', soundOn)
        setRefuseKey(key)
        clearTimeout(refuseTimer.current)
        refuseTimer.current = setTimeout(() => setRefuseKey(null), 950)
        clearTimeout(retargetTimer.current)
        retargetTimer.current = setTimeout(() => playForm(formOf(ctx.target), soundOn), 420)
        flashMood('refuse', 550)
        dispatch(key)
        return
      }
      if (advanced) setBurst((b) => b + 1)
      dispatch(key)
    },
    [ctx, soundOn, flashMood],
  )

  // MEET (Bubble Pop): voice the letter right away, but hold the advance so the
  // popped bubble can fade out while it is being spoken - only then does the
  // next letter drift in (otherwise it appears mid-word and confuses the child).
  const popMeet = useCallback(
    (key) => {
      playForm(formOf(key), soundOn)
      setBurst((b) => b + 1)
      clearTimeout(meetTimer.current)
      meetTimer.current = setTimeout(() => dispatch(key), 900)
    },
    [soundOn],
  )

  // Stones: the game is listen-and-find, so speak the letter to pick whenever
  // it becomes the target. Entering the phase waits longer - the last bubble
  // (or the far bank's last letter) may still be voicing - and the engine's
  // voice queue guards whatever this timing misses.
  const prevStonePhase = useRef(null)
  useEffect(() => {
    if (ctx.phase !== LearnPhase.FORWARD && ctx.phase !== LearnPhase.BACKWARD) {
      prevStonePhase.current = null
      return undefined
    }
    const entering = prevStonePhase.current !== ctx.phase
    prevStonePhase.current = ctx.phase
    const timer = setTimeout(() => playForm(formOf(ctx.forms[ctx.idx]), soundOn), entering ? 1400 : 700)
    return () => clearTimeout(timer)
  }, [ctx.phase, ctx.idx]) // eslint-disable-line react-hooks/exhaustive-deps

  // Speak spoken-round targets; celebrate phase changes and completion.
  const prevSpokenPhase = useRef(null)
  useEffect(() => {
    if ((ctx.phase === LearnPhase.ECHO || ctx.phase === LearnPhase.SHUFFLE) && ctx.target) {
      // After a correct feed the letter takes ~0.9s to be eaten; hold the next
      // spoken target until it lands so the prompt does not race the eating.
      // Entering the phase waits longer still: the previous game's last letter
      // (the final star of the trail) is often still being voiced, and the
      // first prompt must not talk over it.
      const entering = prevSpokenPhase.current !== ctx.phase
      prevSpokenPhase.current = ctx.phase
      const timer = setTimeout(() => playForm(formOf(ctx.target), soundOn), entering ? 1700 : 850)
      return () => clearTimeout(timer)
    }
    prevSpokenPhase.current = ctx.phase
    return undefined
  }, [ctx.phase, ctx.target]) // eslint-disable-line react-hooks/exhaustive-deps
  // Writing phase: say each letter as it appears so the child traces by ear.
  useEffect(() => {
    if (ctx.phase !== LearnPhase.TRACE) return undefined
    const key = (ctx.traceForms?.length ? ctx.traceForms : [`${ctx.familyId}-1`])[ctx.traceIdx ?? 0]
    const timer = setTimeout(() => playForm(formOf(key), soundOn), 450)
    return () => clearTimeout(timer)
  }, [ctx.phase, ctx.traceIdx]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (prevPhase.current !== ctx.phase) {
      prevPhase.current = ctx.phase
      if (ctx.phase === LearnPhase.DONE) {
        playEffect('win', soundOn)
        const timer = setTimeout(onDone, 1800)
        return () => clearTimeout(timer)
      }
      playEffect('good', soundOn)
    }
    return undefined
  }, [ctx.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const spoken = ctx.phase === LearnPhase.ECHO || ctx.phase === LearnPhase.SHUFFLE
  const phaseIndex = [LearnPhase.MEET, LearnPhase.FORWARD, LearnPhase.BACKWARD, LearnPhase.ECHO, LearnPhase.SHUFFLE, LearnPhase.TRACE].indexOf(ctx.phase)

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 pb-10 pt-5">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Back" className={`flex h-10 w-10 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex flex-1 justify-center gap-1.5" aria-label="Lesson steps">
          {(stone.type === 'family' ? [0, 1, 2, 3, 4, 5] : [4]).map((i) => (
            <span key={i} className="block h-2.5 w-8 rounded-full" style={{ background: phaseIndex > i || ctx.phase === LearnPhase.DONE ? 'var(--go)' : phaseIndex === i ? 'var(--accent)' : 'var(--line)' }} />
          ))}
        </div>
        <span className="geez w-10 text-center text-xl font-black" aria-hidden="true">
          {stone.type === 'family' ? formOf(`${stone.id}-1`)?.char : '፨'}
        </span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 py-6 text-center">
        <AnimatePresence mode="wait">
          {ctx.phase === LearnPhase.MEET && <BubbleMeet key={`meet-${ctx.idx}`} ctx={ctx} onTouch={popMeet} />}
          {(ctx.phase === LearnPhase.FORWARD || ctx.phase === LearnPhase.BACKWARD) && <StoneHops key={ctx.phase} ctx={ctx} onTouch={touch} soundOn={soundOn} seed={seed} />}
          {spoken && <CookieField key={`${ctx.phase}-field`} ctx={ctx} lionMood={lionMood} refuseKey={refuseKey} onTouch={touch} />}
          {ctx.phase === LearnPhase.TRACE && (() => {
            const traceForms = ctx.traceForms?.length ? ctx.traceForms : [`${ctx.familyId}-1`]
            const traceForm = formOf(traceForms[ctx.traceIdx ?? 0])
            return (
              <motion.div key={`trace-${ctx.traceIdx ?? 0}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex w-full flex-col items-center gap-3">
                <p className="text-lg font-extrabold">
                  {t('traceHint', 'Hear it, then trace it with your finger')}{' '}
                  <span className="mono" style={{ color: 'var(--muted)' }}>{(ctx.traceIdx ?? 0) + 1}/{traceForms.length}</span>
                </p>
                <button
                  type="button"
                  onClick={() => playForm(traceForm, soundOn)}
                  className={`chunk flex items-center gap-2 rounded-2xl px-5 py-2 font-black text-white ${FOCUS}`}
                  style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px', outlineColor: 'var(--accent)' }}
                  aria-label={t('hearIt', 'Hear it again')}
                >
                  <Volume2 className="h-6 w-6" aria-hidden="true" />
                  <span className="geez text-2xl">{traceForm?.char}</span>
                </button>
                <FidelTracePad
                  key={`pad-${traceForms[ctx.traceIdx ?? 0]}`}
                  char={traceForm?.char}
                  chapter={stone.group}
                  familyId={ctx.familyId}
                  labels={{
                    clear: t('traceClear', 'Clear'),
                    check: t('traceCheck', 'Check'),
                    instruction: '',
                    unsupported: '-',
                  }}
                  onScored={(r) => {
                    // Celebration-grade acceptance: covering the letter always
                    // wins (never blocks). A miss soft-cues origin/direction via
                    // the pad's overlays and lets the child try again.
                    if (r.pass || r.coverage >= 0.5) touch('__traced__')
                    else playEffect('bad', soundOn)
                  }}
                />
              </motion.div>
            )
          })()}
          {ctx.phase === LearnPhase.DONE && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
              <Hero size={120} />
              <p className="text-3xl font-black uppercase" style={{ color: 'var(--go-ink)' }}>
                {stone.type === 'family' ? t('familyDone', 'Family mastered!') : t('mixDone', 'Great mixing!')}
              </p>
              <div className="flex gap-1" aria-hidden="true">
                {ctx.forms.map((k) => (
                  <span key={k} className="geez text-2xl font-black" style={{ color: 'var(--star)' }}>
                    {formOf(k)?.char}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {spoken && (
          <button
            type="button"
            onClick={() => playForm(formOf(ctx.target), soundOn)}
            className={`chunk flex items-center gap-2 rounded-full px-5 py-3 font-black text-white ${FOCUS}`}
            style={{ background: 'var(--sky)', boxShadow: '0 4px 0 var(--sky-deep)', '--chunk-depth': '4px', outlineColor: 'var(--accent)' }}
            aria-label={t('hearIt', 'Hear it again')}
          >
            <Volume2 className="h-7 w-7" aria-hidden="true" /> {t('hearIt', 'Hear it again')}
          </button>
        )}

        <AnimatePresence>
          {burst > 0 && (
            <motion.div key={burst} className="pointer-events-none fixed inset-x-0 top-24 flex justify-center" initial={{ opacity: 1, y: 0, scale: 0.6 }} animate={{ opacity: 0, y: -34, scale: 1.25 }} transition={{ duration: 0.7 }} aria-hidden="true">
              <Star className="h-9 w-9" style={{ color: 'var(--star)', fill: 'var(--star)' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

/* Open a single stone for a Journey node (Pillar 1). The Journey now owns
   ordering and persistence, so this just runs the one lesson and reports
   done - it does not touch fq.learn.v1. A LEARN node carries `familyId`; a
   MIX node carries `families`. */
export function StoneLessonForNode({ node, soundOn, onDone, onBack }) {
  const [seed] = useState(() => (Date.now() % 1000000) | 1)
  const stone = node.families
    ? { type: 'mix', id: `mix-${node.families[node.families.length - 1]}`, group: node.chapter, families: node.families }
    : { type: 'family', id: node.familyId, group: node.chapter }
  return <StoneLesson stone={stone} seed={seed} soundOn={soundOn} onDone={onDone} onBack={onBack} />
}

/** The path of stones, grouped, with locks and gold states. */
export default function LearnLetters({ soundOn, onBack }) {
  const [learn, setLearn] = useState(loadLearn)
  const [active, setActive] = useState(null) // stone index
  const [seed, setSeed] = useState(1)

  const openStone = (index) => {
    setSeed((Date.now() % 1000000) | 1)
    setActive(index)
  }
  const finishStone = (index) => {
    const stone = STONES[index]
    setLearn((prev) => {
      const next =
        stone.type === 'family'
          ? { ...prev, mastered: prev.mastered.includes(stone.id) ? prev.mastered : [...prev.mastered, stone.id] }
          : { ...prev, mixes: prev.mixes.includes(stone.id) ? prev.mixes : [...prev.mixes, stone.id] }
      saveLearn(next)
      return next
    })
    setActive(null)
  }

  if (active !== null) {
    return <StoneLesson stone={STONES[active]} seed={seed} soundOn={soundOn} onDone={() => finishStone(active)} onBack={() => setActive(null)} />
  }

  const masteredCount = learn.mastered.length
  const groups = [1, 2, 3, 4]

  return (
    <div className="mx-auto min-h-screen max-w-xl px-5 pb-12 pt-6">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Back" className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-black leading-tight">{t('learnTitle', 'Letter Steps')}</h1>
          <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            {t('learnSub', 'Learn every letter, one step at a time')} · {masteredCount}/{FIDEL_FAMILIES.length}
          </p>
        </div>
        <Hero size={56} />
      </header>

      <div className="mt-6 flex flex-col gap-6">
        {groups.map((g) => (
          <section key={g}>
            <h2 className="mb-2 text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              {t('level', 'Level')} {g} {groupMastered(learn, g) && <Check className="ml-1 inline h-4 w-4" style={{ color: 'var(--go)' }} aria-label="complete" />}
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {STONES.map((stone, i) => {
                if (stone.group !== g) return null
                const done = stoneDone(learn, stone)
                const unlocked = stoneUnlocked(learn, i)
                const glyph = stone.type === 'family' ? formOf(`${stone.id}-1`)?.char : '፨'
                return (
                  <motion.button
                    key={stone.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => openStone(i)}
                    whileTap={unlocked ? { scale: 0.92 } : {}}
                    animate={unlocked && !done ? { scale: [1, 1.06, 1], transition: { duration: 1.3, repeat: Infinity } } : {}}
                    className={`geez relative flex h-16 w-14 items-center justify-center rounded-2xl border-2 text-2xl font-black ${FOCUS}`}
                    style={{
                      background: done ? 'var(--star)' : unlocked ? 'var(--card)' : 'var(--line)',
                      color: done ? '#7c5200' : unlocked ? 'var(--ink)' : 'var(--muted)',
                      borderColor: done ? 'var(--accent)' : unlocked ? 'var(--accent)' : 'var(--line)',
                      boxShadow: `0 4px 0 ${done ? 'var(--accent)' : 'var(--line)'}`,
                      outlineColor: 'var(--sky)',
                    }}
                    aria-label={`${stone.type === 'family' ? `Learn ${stone.id}` : 'Mix challenge'}${done ? ', mastered' : unlocked ? '' : ', locked'}`}
                  >
                    {unlocked || done ? glyph : <Lock className="h-5 w-5" aria-hidden="true" />}
                    {done && <Star className="absolute -right-1.5 -top-1.5 h-5 w-5" style={{ color: 'var(--star)', fill: 'var(--star)', stroke: 'var(--accent)' }} aria-hidden="true" />}
                  </motion.button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
