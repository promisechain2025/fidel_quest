/* ============================================================================
   LETTER STEPS — the learn-first mode that gates the quizzes
   ----------------------------------------------------------------------------
   Kids must LEARN letters before being quizzed on them. Per family:

     MEET      each form arrives alone, huge; touch it to hear it
     FORWARD   the row becomes a piano: slide a finger across, left to right
     BACKWARD  same row, right to left (breaks rote position-memory)
     ECHO      a form is spoken; touch it in the ORDERED row (position helps)
     SHUFFLE   the row scrambles; five spoken rounds prove real recognition

   Between families: a MIX challenge over everything mastered so far
   (ha+le, then ha+le+me, ...), sampled sound-unique so twins never make a
   spoken round ambiguous. Mastering a group unlocks that group's quiz
   level on the home screen.

   Touch-first by design: rows use pointermove + elementFromPoint so a
   finger SLIDING across letters plays them - no precise tapping required -
   and every target is finger-of-a-four-year-old sized.

   The step machine is pure and seeded like every other machine in the app;
   the UI dispatches TOUCH events and renders the phase.
   ========================================================================== */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ArrowRight, ArrowLeft, Volume2, Star, Lock, Check } from 'lucide-react'
import { FIDEL_FAMILIES, ORDERS, INDEXES } from './platform/ethiopic'
import { playForm, playEffect } from './platform/audioEngine'
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
    if (pool.length >= 8) break
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
      // Families finish by carving the base letter; mixes are done here.
      return {
        next: { ...touched, phase: ctx.kind === 'family' ? LearnPhase.TRACE : LearnPhase.DONE, eaten, target: null },
        advanced: true,
        correct: true,
      }
    }
    case LearnPhase.TRACE: {
      if (key !== '__traced__') return { next: touched, advanced: false, correct: false }
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
    const familyIds = FIDEL_FAMILIES.slice(g * 8, g === 3 ? 33 : g * 8 + 8).map((f) => f.id)
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
  return FIDEL_FAMILIES.slice((group - 1) * 8, group === 4 ? 33 : (group - 1) * 8 + 8).every((f) =>
    learn.mastered.includes(f.id),
  )
}

/* ============================================================================
   §3 UI — every phase is a mini-game
   MEET     Bubble Pop: the letter drifts in a wobbling bubble; pop it
   FORWARD/ Star Constellation: slide finger star-to-star across a night
   BACKWARD band; a glowing trail draws behind the finger
   ECHO     Feed Anbessa: touch the spoken cookie and it flies to his mouth
   SHUFFLE  Jibby the Thief: he creeps toward the cookies each round; grab
            the spoken letter and he retreats (tension, never punishment)
   The machine (§1) is untouched - these are pure presentation.
   ========================================================================== */

/** Shared slide/touch resolution: fingers, not clicks. */
function useSlideTouch(onTouch) {
  const lastRef = useRef(null)
  const touchAt = useCallback(
    (clientX, clientY) => {
      const el = document.elementFromPoint(clientX, clientY)
      const cell = el && el.closest('[data-form]')
      if (!cell) return
      const key = cell.getAttribute('data-form')
      if (key && key !== lastRef.current) {
        lastRef.current = key
        onTouch(key)
      }
    },
    [onTouch],
  )
  return {
    style: { touchAction: 'none' },
    onPointerDown: (e) => {
      lastRef.current = null
      touchAt(e.clientX, e.clientY)
    },
    onPointerMove: (e) => {
      if (e.buttons > 0 || e.pointerType === 'touch') touchAt(e.clientX, e.clientY)
    },
    onPointerUp: () => {
      lastRef.current = null
    },
  }
}

/** MEET: pop the drifting bubble to hear the letter. */
function BubbleMeet({ ctx, onTouch }) {
  const form = formOf(ctx.forms[ctx.idx])
  const met = ctx.forms.slice(0, ctx.idx)
  if (!form) return null
  return (
    <motion.div key={`meet-${ctx.idx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} className="flex w-full flex-col items-center gap-5">
      <p className="font-extrabold" style={{ color: 'var(--muted)' }}>
        {t('popHint', 'Pop the bubble!')} · {ctx.idx + 1}/7
      </p>
      <div className="relative h-64 w-full overflow-hidden rounded-3xl" style={{ background: 'linear-gradient(to bottom, #bfe6f7, #e8f6fd)' }}>
        <motion.button
          type="button"
          onPointerDown={() => onTouch(form.audioKey)}
          initial={{ x: '-30%', y: 30, scale: 0.5 }}
          animate={{
            x: ['-25%', '25%', '-15%', '20%', '-25%'],
            y: [26, 60, 14, 52, 26],
            scale: [1, 1.05, 0.97, 1.04, 1],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className={`geez absolute left-1/2 top-4 flex h-44 w-44 items-center justify-center rounded-full text-8xl font-black ${FOCUS}`}
          style={{
            background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95) 0%, rgba(190,229,247,0.55) 38%, rgba(120,190,230,0.35) 100%)',
            border: '3px solid rgba(255,255,255,0.9)',
            boxShadow: 'inset -8px -10px 24px rgba(70,150,200,0.35), 0 10px 22px rgba(70,150,200,0.25)',
            color: 'var(--ink)',
            touchAction: 'none',
            outlineColor: 'var(--sky)',
          }}
          aria-label={`Pop the bubble to hear ${form.sound}`}
        >
          {form.char}
          <span className="absolute left-7 top-6 h-6 w-10 rotate-[-25deg] rounded-full bg-white/80" aria-hidden="true" />
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

/** Star positions along a gentle wave (percent coordinates). */
const STAR_POINTS = [8, 22, 36, 50, 64, 78, 92].map((left, i) => ({
  left,
  top: 38 + Math.sin(i * 1.9) * 20,
}))

/** FORWARD/BACKWARD: draw the family constellation with a finger. */
function StarTrail({ ctx, onTouch }) {
  const forward = ctx.phase === LearnPhase.FORWARD
  const handlers = useSlideTouch(onTouch)
  const doneKeys = forward ? ctx.forms.slice(0, ctx.idx) : ctx.forms.slice(ctx.idx + 1)
  const activeKey = ctx.forms[ctx.idx]
  const donePoints = ctx.forms
    .map((k, i) => ({ k, p: STAR_POINTS[i] }))
    .filter(({ k }) => doneKeys.includes(k) || k === activeKey)
  const ordered = forward ? donePoints : donePoints.slice().reverse()

  return (
    <motion.div key={ctx.phase} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex w-full flex-col items-center gap-4">
      <p className="flex items-center gap-2 text-lg font-extrabold">
        {forward ? <ArrowRight className="h-7 w-7" style={{ color: 'var(--star)' }} aria-hidden="true" /> : <ArrowLeft className="h-7 w-7" style={{ color: 'var(--star)' }} aria-hidden="true" />}
        {t('starHint', 'Slide star to star and draw the constellation')}
      </p>
      <div {...handlers} className="relative h-64 w-full overflow-hidden rounded-3xl" style={{ ...handlers.style, background: 'linear-gradient(to bottom, #1b2b4a, #2c3f66)' }}>
        {/* twinkle dust */}
        {[12, 30, 55, 70, 88, 42, 62].map((left, i) => (
          <motion.span key={i} className="absolute h-1 w-1 rounded-full bg-white" style={{ left: `${left}%`, top: `${(i * 31) % 80 + 6}%` }} animate={{ opacity: [0.2, 0.9, 0.2] }} transition={{ duration: 2 + (i % 3), repeat: Infinity }} aria-hidden="true" />
        ))}
        {/* the drawn trail */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline
            points={ordered.map(({ p }) => `${p.left},${p.top}`).join(' ')}
            fill="none"
            stroke="#ffc800"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
        </svg>
        {ctx.forms.map((k, i) => {
          const p = STAR_POINTS[i]
          const done = doneKeys.includes(k)
          const active = k === activeKey
          const form = formOf(k)
          return (
            <motion.div
              key={k}
              data-form={k}
              role="button"
              tabIndex={0}
              aria-label={`Star ${form?.sound}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onTouch(k)
              }}
              animate={active ? { scale: [1, 1.18, 1], transition: { duration: 0.9, repeat: Infinity } } : { scale: 1 }}
              className={`geez absolute flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 select-none items-center justify-center text-2xl font-black ${FOCUS}`}
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                color: done || active ? '#7c5200' : '#dbe6ff',
                clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                background: done ? 'var(--star)' : active ? '#ffe08a' : 'rgba(150,170,220,0.45)',
                outlineColor: 'var(--sky)',
              }}
            >
              {form?.char}
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

/** One draggable letter card. Drag it onto Anbessa's mouth (or tap it) to
    feed him. `mouthRef` is the drop target; a drop within it feeds `k`. */
function LetterCard({ k, hinted, delay, mouthRef, onFeed, onDragActive, refusing }) {
  const form = formOf(k)
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
        if (overMouth(event, info)) onFeed(k)
      }}
      onTap={() => onFeed(k)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onFeed(k)
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
      exit={{ y: 150, scale: 0.15, opacity: 0, transition: { duration: 0.5, ease: 'easeIn' } }}
      className={`geez relative flex h-16 w-16 cursor-grab touch-none select-none items-center justify-center rounded-2xl border-4 text-3xl font-black active:cursor-grabbing ${FOCUS}`}
      style={{
        background: 'radial-gradient(circle at 32% 26%, #f7d9a2, #e0a856)',
        borderColor: hinted ? 'var(--accent)' : '#c68a44',
        color: '#5b3a12',
        boxShadow: '0 4px 0 #a06a30',
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
  const mouthRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  // Only letters still on the tray; always keep the current target so a wrong
  // drag on a removed letter can never strand the round.
  const eaten = ctx.eaten || []
  const visible = ctx.order.filter((k) => !eaten.includes(k) || k === ctx.target)
  const mood = dragging ? 'hungry' : lionMood
  return (
    <motion.div key={`${ctx.phase}-field`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex w-full flex-col items-center gap-4">
      <p className="text-lg font-extrabold">
        {isShuffle ? t('catchHint', 'Feed Anbessa before Jibby grabs it!') : t('feedHint', 'Drag the letter Kokeb says to Anbessa')}{' '}
        <span className="mono" style={{ color: 'var(--muted)' }}>
          {ctx.round + 1}/{roundLimit}
        </span>
      </p>
      <div className="relative w-full overflow-hidden rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
        <div className="grid grid-cols-4 place-items-center gap-3 sm:gap-4">
          <AnimatePresence>
            {visible.map((k, i) => (
              <LetterCard
                key={`${ctx.phase}-${k}`}
                k={k}
                hinted={ctx.wrongs >= 2 && k === ctx.target}
                delay={(i % 4) * 0.12}
                mouthRef={mouthRef}
                onFeed={onTouch}
                onDragActive={setDragging}
                refusing={k === refuseKey}
              />
            ))}
          </AnimatePresence>
        </div>
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
        {/* Anbessa waits below, mouth open when hungry — the drop target. */}
        <div className="mt-3 flex justify-center">
          <motion.div
            ref={mouthRef}
            className="relative"
            animate={
              mood === 'refuse'
                ? { rotate: [0, -10, 10, -6, 0], transition: { duration: 0.5 } }
                : mood === 'eating'
                  ? { scale: [1, 1.12, 1], transition: { duration: 0.5 } }
                  : dragging
                    ? { scale: 1.06 }
                    : { scale: 1 }
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
  useEffect(
    () => () => {
      clearTimeout(moodTimer.current)
      clearTimeout(refuseTimer.current)
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
      playForm(formOf(key), soundOn)
      if (ctx.phase === LearnPhase.ECHO || ctx.phase === LearnPhase.SHUFFLE) {
        recordAnswer(ctx.target, key, 'learn')
        if (correct) {
          setBurst((b) => b + 1)
          playEffect('good', soundOn)
          flashMood('eating', 650) // open mouth; the eaten card exits into it
          dispatch(key)
          return
        }
        // Wrong: he refuses (paw swat + head shake) and the card bonks back.
        playEffect('bad', soundOn)
        setRefuseKey(key)
        clearTimeout(refuseTimer.current)
        refuseTimer.current = setTimeout(() => setRefuseKey(null), 480)
        flashMood('refuse', 550)
        dispatch(key)
        return
      }
      if (advanced) setBurst((b) => b + 1)
      dispatch(key)
    },
    [ctx, soundOn, flashMood],
  )

  // Speak spoken-round targets; celebrate phase changes and completion.
  useEffect(() => {
    if ((ctx.phase === LearnPhase.ECHO || ctx.phase === LearnPhase.SHUFFLE) && ctx.target) {
      const timer = setTimeout(() => playForm(formOf(ctx.target), soundOn), 550)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [ctx.phase, ctx.target]) // eslint-disable-line react-hooks/exhaustive-deps
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
          {ctx.phase === LearnPhase.MEET && <BubbleMeet key={`meet-${ctx.idx}`} ctx={ctx} onTouch={touch} />}
          {(ctx.phase === LearnPhase.FORWARD || ctx.phase === LearnPhase.BACKWARD) && <StarTrail key={ctx.phase} ctx={ctx} onTouch={touch} />}
          {spoken && <CookieField key={`${ctx.phase}-field`} ctx={ctx} lionMood={lionMood} refuseKey={refuseKey} onTouch={touch} />}
          {ctx.phase === LearnPhase.TRACE && (
            <motion.div key="trace" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex w-full flex-col items-center gap-3">
              <p className="text-lg font-extrabold">{t('traceHint', 'Now carve it! Trace the letter with your finger')}</p>
              <FidelTracePad
                char={formOf(`${ctx.familyId}-1`)?.char}
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
                  if (r.pass || r.coverage >= 0.55) touch('__traced__')
                  else playEffect('bad', soundOn)
                }}
              />
            </motion.div>
          )}
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
            className={`chunk flex h-14 w-14 items-center justify-center rounded-full text-white ${FOCUS}`}
            style={{ background: 'var(--sky)', boxShadow: '0 4px 0 var(--sky-deep)', outlineColor: 'var(--accent)' }}
            aria-label="Play the sound again"
          >
            <Volume2 className="h-7 w-7" aria-hidden="true" />
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
            {t('learnSub', 'Learn every letter, one step at a time')} · {masteredCount}/33
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
