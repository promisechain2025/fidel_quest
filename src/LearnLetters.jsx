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

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ArrowRight, ArrowLeft, Volume2, Star, Lock, Check } from 'lucide-react'
import { FIDEL_FAMILIES, ORDERS, INDEXES } from './platform/ethiopic'
import { playForm, playEffect } from './platform/audioEngine'
import { recordAnswer } from './platform/telemetry'
import { t } from './platform/i18n'
import { rngNext, rngShuffle, Hero } from './FidelQuestApp'

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
  DONE: 'DONE',
})

export const ECHO_ROUNDS = 5
export const SHUFFLE_ROUNDS = 5
export const MIX_ROUNDS = 6

function pickTarget(pool, avoid, rngState) {
  let candidates = pool.filter((k) => k !== avoid)
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
      // Enter ECHO with a first spoken target.
      const [target, rngState] = pickTarget(ctx.forms, null, ctx.rngState)
      return {
        next: { ...touched, phase: LearnPhase.ECHO, round: 0, wrongs: 0, target, rngState },
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
      if (round < roundLimit) {
        const [target, rngState] = pickTarget(ctx.forms, key, ctx.rngState)
        return { next: { ...touched, round, wrongs: 0, target, rngState }, advanced: true, correct: true }
      }
      if (isEcho) {
        // ECHO done -> SHUFFLE: scramble the display order, new target.
        let [order, rngState] = rngShuffle(ctx.forms, ctx.rngState)
        let target
        ;[target, rngState] = pickTarget(order, null, rngState)
        return {
          next: { ...touched, phase: LearnPhase.SHUFFLE, order, round: 0, wrongs: 0, target, rngState },
          advanced: true,
          correct: true,
        }
      }
      return { next: { ...touched, phase: LearnPhase.DONE, target: null }, advanced: true, correct: true }
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
   §3 UI
   ========================================================================== */

/** Touch-sensitive letter row: sliding a finger across plays each letter. */
function SlideRow({ keys, activeKey, doneKeys, hintKey, onTouch, big = false }) {
  const rowRef = useRef(null)
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

  return (
    <div
      ref={rowRef}
      className="flex flex-wrap justify-center gap-2"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        lastRef.current = null
        touchAt(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => {
        if (e.buttons > 0 || e.pointerType === 'touch') touchAt(e.clientX, e.clientY)
      }}
      onPointerUp={() => {
        lastRef.current = null
      }}
    >
      {keys.map((key) => {
        const form = formOf(key)
        const done = doneKeys.includes(key)
        const active = key === activeKey
        const hinted = key === hintKey
        return (
          <motion.div
            key={key}
            data-form={key}
            role="button"
            tabIndex={0}
            aria-label={`Letter ${form?.sound}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onTouch(key)
            }}
            animate={
              active || hinted
                ? { scale: [1, 1.12, 1], transition: { duration: 0.8, repeat: Infinity } }
                : { scale: 1 }
            }
            className={`geez flex select-none items-center justify-center rounded-2xl border-2 font-black ${big ? 'h-20 w-16 text-4xl' : 'h-16 w-12 text-3xl'} ${FOCUS}`}
            style={{
              background: done ? 'var(--go-soft)' : active || hinted ? 'var(--accent)' : 'var(--card)',
              color: done ? 'var(--go-ink)' : active || hinted ? '#fff' : 'var(--ink)',
              borderColor: done ? 'var(--go)' : active || hinted ? 'var(--accent-deep)' : 'var(--line)',
              boxShadow: `0 4px 0 ${done ? 'var(--go)' : active || hinted ? 'var(--accent-deep)' : 'var(--line)'}`,
              outlineColor: 'var(--sky)',
            }}
          >
            {form?.char}
          </motion.div>
        )
      })}
    </div>
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
  const prevPhase = useRef(ctx.phase)

  const touch = useCallback(
    (key) => {
      const { advanced, correct } = learnTransition(ctx, key)
      playForm(formOf(key), soundOn)
      if (ctx.phase === LearnPhase.ECHO || ctx.phase === LearnPhase.SHUFFLE) {
        recordAnswer(ctx.target, key, 'learn')
        if (correct) setBurst((b) => b + 1)
        else if (!correct) playEffect('bad', soundOn)
      } else if (advanced) {
        setBurst((b) => b + 1)
      }
      dispatch(key)
    },
    [ctx, soundOn],
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

  const meetForm = ctx.phase === LearnPhase.MEET ? formOf(ctx.forms[ctx.idx]) : null
  const doneKeys =
    ctx.phase === LearnPhase.FORWARD
      ? ctx.forms.slice(0, ctx.idx)
      : ctx.phase === LearnPhase.BACKWARD
        ? ctx.forms.slice(ctx.idx + 1)
        : []
  const spoken = ctx.phase === LearnPhase.ECHO || ctx.phase === LearnPhase.SHUFFLE
  const phaseIndex = [LearnPhase.MEET, LearnPhase.FORWARD, LearnPhase.BACKWARD, LearnPhase.ECHO, LearnPhase.SHUFFLE].indexOf(ctx.phase)

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 pb-10 pt-5">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Back" className={`flex h-10 w-10 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex flex-1 justify-center gap-1.5" aria-label="Lesson steps">
          {(stone.type === 'family' ? [0, 1, 2, 3, 4] : [4]).map((i) => (
            <span key={i} className="block h-2.5 w-8 rounded-full" style={{ background: phaseIndex > i || ctx.phase === LearnPhase.DONE ? 'var(--go)' : phaseIndex === i ? 'var(--accent)' : 'var(--line)' }} />
          ))}
        </div>
        <span className="geez w-10 text-center text-xl font-black" aria-hidden="true">
          {stone.type === 'family' ? formOf(`${stone.id}-1`)?.char : '፨'}
        </span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 py-6 text-center">
        <AnimatePresence mode="wait">
          {ctx.phase === LearnPhase.MEET && meetForm && (
            <motion.div key={`meet-${ctx.idx}`} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.15, transition: { duration: 0.1 } }} className="flex flex-col items-center gap-6">
              <p className="font-extrabold" style={{ color: 'var(--muted)' }}>
                {t('meetHint', 'Touch the letter to hear it')} · {ctx.idx + 1}/7
              </p>
              <motion.button
                type="button"
                onPointerDown={() => touch(meetForm.audioKey)}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className={`geez flex h-52 w-52 items-center justify-center rounded-[3rem] border-4 text-9xl font-black ${FOCUS}`}
                style={{ background: 'var(--card)', borderColor: 'var(--accent)', boxShadow: '0 8px 0 var(--accent-deep)', outlineColor: 'var(--sky)', touchAction: 'none' }}
                aria-label={`Touch to hear ${meetForm.sound}`}
              >
                {meetForm.char}
              </motion.button>
              <p className="mono text-2xl font-black" style={{ color: 'var(--sky)' }}>
                {meetForm.sound}
              </p>
              <SlideRow keys={ctx.forms.slice(0, ctx.idx)} activeKey={null} doneKeys={ctx.forms.slice(0, ctx.idx)} hintKey={null} onTouch={touch} />
            </motion.div>
          )}

          {(ctx.phase === LearnPhase.FORWARD || ctx.phase === LearnPhase.BACKWARD) && (
            <motion.div key={ctx.phase} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6">
              <p className="flex items-center gap-2 text-lg font-extrabold">
                {ctx.phase === LearnPhase.FORWARD ? <ArrowRight className="h-7 w-7" style={{ color: 'var(--accent)' }} aria-hidden="true" /> : <ArrowLeft className="h-7 w-7" style={{ color: 'var(--accent)' }} aria-hidden="true" />}
                {t('slideHint', 'Slide your finger along the letters')}
              </p>
              <SlideRow keys={ctx.forms} activeKey={ctx.forms[ctx.idx]} doneKeys={doneKeys} hintKey={null} onTouch={touch} big />
            </motion.div>
          )}

          {spoken && (
            <motion.div key={`${ctx.phase}-row`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6">
              <p className="text-lg font-extrabold">
                {ctx.phase === LearnPhase.ECHO ? t('echoHint', 'Kokeb says... touch that letter!') : t('shuffleHint', 'All mixed up! Find the letter you hear')}
                {' '}
                <span className="mono" style={{ color: 'var(--muted)' }}>
                  {ctx.round + 1}/{ctx.phase === LearnPhase.ECHO ? ECHO_ROUNDS : ctx.rounds}
                </span>
              </p>
              <button
                type="button"
                onClick={() => playForm(formOf(ctx.target), soundOn)}
                className={`chunk flex h-16 w-16 items-center justify-center rounded-full text-white ${FOCUS}`}
                style={{ background: 'var(--sky)', boxShadow: '0 4px 0 var(--sky-deep)', outlineColor: 'var(--accent)' }}
                aria-label="Play the sound again"
              >
                <Volume2 className="h-8 w-8" aria-hidden="true" />
              </button>
              <SlideRow keys={ctx.order} activeKey={null} doneKeys={[]} hintKey={ctx.wrongs >= 2 ? ctx.target : null} onTouch={touch} big />
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

        {/* touch burst */}
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
