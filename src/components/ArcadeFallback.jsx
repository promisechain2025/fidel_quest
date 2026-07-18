/* eslint-disable react-refresh/only-export-components --
   bossQuestions is the pure Skylands-boss builder, exported for direct unit
   testing beside its components (repo pattern, cf. FidelTracePad). */
/* The 2D arcade fallbacks (Pillar 4): functionally-identical, WebGL-free
   versions of the Runner and Skylands, driven by the same pure machines,
   for devices that cannot sustain the 3D scenes. */
import { useReducer, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Flame, RotateCcw } from 'lucide-react'
import {
  runnerInitial,
  runnerTransition,
  selectRunnerQuestion,
  RunnerState,
  RunnerEvent,
  RUNNER_QPL,
  INDEXES,
  Sprite2D,
  drawAnbessa,
  drawHyena,
  loadRunnerBest,
  saveRunnerBest,
  rngShuffle,
  rngNext,
} from '../FidelQuestApp'
import { buildQuiz, pickStolen, SESSIONS } from '../skylandsCore'
import { playForm, playEffect } from '../platform/audioEngine'
import { markIslandCleared } from '../platform/skylandsSave'
import { recordAnswer } from '../platform/telemetry'
import { t } from '../platform/i18n'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const formOf = (key) => INDEXES.byAudioKey.get(key)

/* ============================================================================
   RUNNER 2D  -  the same runner machine (feed / boss / muncher / destroyed)
   presented without WebGL: Kokeb calls a sound, tap the right letter gate.
   ========================================================================== */
// Reset reseeds through the project PRNG so all seeding stays in one place.
const reseed = (s) => (Math.floor(rngNext(s)[0] * 0x7fffffff) | 1)
const runnerReducer = (c, e) => (e.type === '__reset__' ? runnerInitial(reseed(c.seed), c.pool) : runnerTransition(c, e).next)

export function Runner2D({ seed, soundOn, onExit, pool }) {
  const [ctx, dispatch] = useReducer(runnerReducer, { seed, pool }, (a) => runnerInitial(a.seed, a.pool))
  const q = selectRunnerQuestion(ctx)
  const targetForm = q ? formOf(q.target) : null
  const running = ctx.status === RunnerState.RUNNING
  const feeding = ctx.status === RunnerState.FEEDING
  const boss = ctx.status === RunnerState.BOSS
  const destroyed = ctx.status === RunnerState.DESTROYED

  useEffect(() => {
    if (running && targetForm) {
      const timer = setTimeout(() => playForm(targetForm, soundOn), 350)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [running, ctx.qIndex, ctx.level]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (feeding) {
      playEffect(ctx.lastFeed?.good ? 'good' : 'bad', soundOn)
      const fedQ = ctx.queue[ctx.qIndex]
      if (fedQ && ctx.lastFeed) recordAnswer(fedQ.target, ctx.lastFeed.audioKey, 'runner')
      const timer = setTimeout(() => dispatch({ type: RunnerEvent.FEED_DONE }), 800)
      return () => clearTimeout(timer)
    }
    if (boss) {
      playEffect(ctx.survivedBoss ? 'win' : 'bad', soundOn)
      const timer = setTimeout(() => dispatch({ type: RunnerEvent.BOSS_DONE }), 1800)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [ctx.status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!destroyed) return
    const best = loadRunnerBest()
    if (ctx.fed > best.fed) saveRunnerBest({ fed: ctx.fed, level: ctx.level })
  }, [destroyed]) // eslint-disable-line react-hooks/exhaustive-deps

  if (destroyed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
        <Sprite2D draw={drawHyena} size={120} />
        <h2 className="text-2xl font-black">{t('munched', 'Munched!')}</h2>
        <p className="font-bold" style={{ color: 'var(--muted)' }}>
          {t('bestStreak', 'Best streak')}: {ctx.fed}
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={() => dispatch({ type: '__reset__' })} className={`chunk rounded-2xl px-5 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--accent)', boxShadow: '0 4px 0 var(--accent-deep)', '--chunk-depth': '4px' }}>
            {t('runAgain', 'Run again')}
          </button>
          <button type="button" onClick={() => onExit({ level: ctx.level, survivedBoss: ctx.survivedBoss })} className={`chunk rounded-2xl px-5 py-3 font-black ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)' }}>
            {t('home', 'Home')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 pb-6 pt-4">
      <header className="flex items-center gap-2">
        <button type="button" onClick={() => onExit({ level: ctx.level, survivedBoss: ctx.survivedBoss })} aria-label="Quit run" className={`flex h-10 w-10 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <X className="h-6 w-6" />
        </button>
        <span className="rounded-xl px-2.5 py-1 text-xs font-black text-white" style={{ background: 'var(--sky)' }}>
          L{ctx.level}
        </span>
        <div className="flex flex-1 items-center justify-center gap-1.5" aria-label={`Power ${ctx.correct}, Muncher ${ctx.wrong}`}>
          {Array.from({ length: RUNNER_QPL }, (_, i) => {
            const state = i < ctx.correct ? 'power' : i < ctx.correct + ctx.wrong ? 'muncher' : 'empty'
            return <span key={i} className="h-3 w-6 rounded-full" style={{ background: state === 'power' ? 'var(--go)' : state === 'muncher' ? 'var(--bad)' : 'var(--line)' }} />
          })}
        </div>
        <Flame className="h-6 w-6" style={{ color: 'var(--accent)' }} aria-hidden="true" />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="flex items-end justify-center gap-6">
          <Sprite2D draw={drawAnbessa} size={96} mood={feeding && !ctx.lastFeed?.good ? 'sad' : 'happy'} />
          {(boss || (feeding && !ctx.lastFeed?.good)) && <Sprite2D draw={drawHyena} size={80} />}
        </div>

        {boss ? (
          <h2 className="text-2xl font-black" style={{ color: ctx.survivedBoss ? 'var(--go-ink)' : 'var(--bad-ink)' }}>
            {ctx.survivedBoss ? t('levelUp', 'Level up!') : t('muncherWins', 'The Muncher wins!')}
          </h2>
        ) : (
          <>
            <p className="text-lg font-extrabold">{t('runFeedHint', 'Feed Anbessa the letter Kokeb says')}</p>
            <div className="grid w-full grid-cols-3 gap-3">
              {q?.options.map((opt) => {
                const form = formOf(opt)
                const isTarget = opt === q.target
                const showGood = feeding && ctx.lastFeed?.audioKey === opt && ctx.lastFeed?.good
                const showBad = feeding && ctx.lastFeed?.audioKey === opt && !ctx.lastFeed?.good
                return (
                  <motion.button
                    key={`${ctx.qIndex}-${opt}`}
                    type="button"
                    disabled={!running}
                    onClick={() => dispatch({ type: RunnerEvent.FEED, payload: { audioKey: opt } })}
                    onFocus={() => playForm(form, soundOn)}
                    animate={showBad ? { x: [0, -8, 8, 0] } : showGood ? { scale: [1, 1.15, 1] } : {}}
                    className={`geez chunk flex h-24 items-center justify-center rounded-3xl border-2 text-5xl font-black ${FOCUS}`}
                    style={{
                      background: showGood ? 'var(--go-soft)' : showBad ? 'var(--bad-soft)' : 'var(--card)',
                      // Never hint the answer: the 2D runner is a LISTEN-and-pick game, same
                      // as the 3D one - an accent border on the target made it tap-the-color.
                      borderColor: showGood ? 'var(--go)' : showBad ? 'var(--bad)' : 'var(--line)',
                      boxShadow: `0 5px 0 ${showGood ? 'var(--go)' : showBad ? 'var(--bad)' : 'var(--line)'}`,
                      '--chunk-depth': '5px',
                      outlineColor: 'var(--sky)',
                    }}
                    aria-label={`Gate ${form?.sound}`}
                  >
                    {form?.char}
                  </motion.button>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

/* ============================================================================
   SKYLANDS 2D  -  the cumulative island quiz + Jibby's boss review, as a
   tap-the-fruit 2D quiz (same buildQuiz / pickStolen logic as the 3D scene).
   ========================================================================== */
export function bossQuestions(island, seed, allForms = false) {
  const stolen = pickStolen(island, seed, allForms)
  // Distractors come from the CUMULATIVE pool of every session up to this one
  // (the same material the 3D boss uses), so a stolen old letter is not the
  // lone odd-group-out. "All letters" widens it to every session's pool.
  const pool = allForms
    ? SESSIONS.flatMap((s) => s.pool)
    : SESSIONS.slice(0, Math.min(island, SESSIONS.length)).flatMap((s) => s.pool)
  let state = (seed ^ 0x5151) | 1
  return stolen.map((target) => {
    const sound = formOf(target)?.sound
    let distractors
    ;[distractors, state] = rngShuffle(pool.filter((k) => k !== target && formOf(k)?.sound !== sound), state)
    let options
    ;[options, state] = rngShuffle([target, ...distractors.slice(0, 2)], state)
    return { target, options, boss: true }
  })
}

export function Skylands2D({ island = 1, seed, soundOn, onExit, allLetters = false }) {
  const [questions] = useState(() => [...buildQuiz(island, seed, allLetters).map((q) => ({ ...q, boss: false })), ...bossQuestions(island, seed, allLetters)])
  const [cursor, setCursor] = useState(0)
  const [picked, setPicked] = useState(null) // { key, good }
  const q = questions[cursor]
  const session = SESSIONS[Math.min(island, SESSIONS.length) - 1]
  const targetForm = q ? formOf(q.target) : null
  const done = cursor >= questions.length

  useEffect(() => {
    if (q && targetForm) {
      const timer = setTimeout(() => playForm(targetForm, soundOn), 400)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [cursor]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!done) return
    playEffect('win', soundOn)
    // Clearing the island on the 2D fallback counts exactly like the 3D
    // map: one shared save (platform/skylandsSave), both views agree.
    markIslandCleared(island)
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  if (done) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
        <Sprite2D draw={drawAnbessa} size={120} />
        <h2 className="text-2xl font-black">{t('islandCleared', 'Island cleared!')}</h2>
        <button type="button" onClick={() => onExit({ sessionsCompleted: island })} className={`chunk rounded-2xl px-6 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep)', '--chunk-depth': '4px' }}>
          {t('continue', 'Continue')}
        </button>
      </div>
    )
  }

  const pick = (key) => {
    if (picked) return
    const good = key === q.target
    playForm(formOf(key), soundOn)
    recordAnswer(q.target, key, 'skylands')
    setPicked({ key, good })
    playEffect(good ? 'good' : 'bad', soundOn)
    if (good) setTimeout(() => { setPicked(null); setCursor((c) => c + 1) }, 650)
    else setTimeout(() => setPicked(null), 700)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 pb-6 pt-4">
      <header className="flex items-center gap-2">
        <button type="button" onClick={() => onExit({ sessionsCompleted: 0 })} aria-label="Leave island" className={`flex h-10 w-10 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <X className="h-6 w-6" />
        </button>
        <span className="rounded-xl px-2.5 py-1 text-xs font-black text-white" style={{ background: 'var(--go)' }}>
          {session.place}
        </span>
        <div className="flex flex-1 gap-1" role="progressbar" aria-valuenow={cursor} aria-valuemax={questions.length}>
          {questions.map((qq, i) => (
            <span key={i} className="h-2 flex-1 rounded-full" style={{ background: i < cursor ? 'var(--go)' : i === cursor ? 'var(--accent)' : 'var(--line)' }} />
          ))}
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <AnimatePresence>
          {q.boss && (
            <motion.div key="jibby" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2 rounded-2xl px-4 py-2 font-black" style={{ background: 'var(--bad-soft)', color: 'var(--bad-ink)' }}>
              <Sprite2D draw={drawHyena} size={40} /> {t('stolenHint', 'Jibby stole it! Grab the letter you hear')}
            </motion.div>
          )}
        </AnimatePresence>
        <p className="text-lg font-extrabold">{t('tapFeedHint', 'Tap the letter Kokeb says')}</p>
        <div className="grid w-full grid-cols-3 gap-3">
          {q.options.map((opt) => {
            const form = formOf(opt)
            const showGood = picked?.key === opt && picked.good
            const showBad = picked?.key === opt && !picked.good
            return (
              <motion.button
                key={`${cursor}-${opt}`}
                type="button"
                disabled={!!picked}
                onClick={() => pick(opt)}
                animate={showBad ? { x: [0, -8, 8, 0] } : showGood ? { scale: [1, 1.15, 1] } : {}}
                className={`geez chunk flex h-24 items-center justify-center rounded-3xl border-2 text-5xl font-black ${FOCUS}`}
                style={{
                  background: showGood ? 'var(--go-soft)' : showBad ? 'var(--bad-soft)' : 'var(--card)',
                  borderColor: showGood ? 'var(--go)' : showBad ? 'var(--bad)' : 'var(--line)',
                  boxShadow: `0 5px 0 ${showGood ? 'var(--go)' : showBad ? 'var(--bad)' : 'var(--line)'}`,
                  '--chunk-depth': '5px',
                  outlineColor: 'var(--sky)',
                }}
                aria-label={`Fruit ${form?.sound}`}
              >
                {form?.char}
              </motion.button>
            )
          })}
        </div>
      </main>
    </div>
  )
}
