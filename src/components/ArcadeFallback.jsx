/* The 2D arcade fallback (Pillar 4): a functionally-identical, WebGL-free
   version of the Runner, driven by the same pure machine, for devices that
   cannot sustain the 3D scene. (Letter Catch, the other gateway game, is
   already a pure 2D game and needs no separate fallback.) */
import { useReducer, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { X, Flame } from 'lucide-react'
import {
  runnerInitial,
  runnerTransition,
  selectRunnerQuestion,
  RunnerState,
  RunnerEvent,
  RUNNER_QPL,
  INDEXES,
  loadRunnerBest,
  saveRunnerBest,
  rngNext,
} from '../FidelQuestApp'
import AnbessaSvg from './AnbessaSvg'
import JibbySvg from './JibbySvg'
import KokebSvg from './KokebSvg'
import { playForm, playEffect } from '../platform/audioEngine'
import { recordAnswer } from '../platform/telemetry'
import { t } from '../platform/i18n'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const formOf = (key) => INDEXES.byAudioKey.get(key)

/* A small ring of stars bursting off Anbessa when he is fed correctly. Cheap
   (a handful of framer nodes, replayed by key) and dropped under reduced
   motion - safe for the low-FPS devices this fallback exists for. */
function FeedSparkle() {
  const rays = [0, 60, 120, 180, 240, 300]
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center" aria-hidden="true">
      {rays.map((deg, i) => (
        <motion.span key={i} className="absolute rounded-full" style={{ width: 8, height: 8, background: i % 2 ? '#ffd25a' : '#8affc1' }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 0.6 }}
          animate={{ opacity: [1, 1, 0], x: Math.cos((deg * Math.PI) / 180) * 52, y: Math.sin((deg * Math.PI) / 180) * 52, scale: [0.6, 1.1, 0.4] }}
          transition={{ duration: 0.6, ease: 'easeOut' }} />
      ))}
    </div>
  )
}

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
  const reduce = useReducedMotion()
  const goodFeed = feeding && ctx.lastFeed?.good

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
        <JibbySvg size={120} />
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

      <main className="relative flex flex-1 flex-col items-center justify-center gap-6 text-center">
        {/* soft ambient spotlight behind the cast (theme-safe, static) */}
        <div className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,180,60,0.16), rgba(255,180,60,0) 68%)' }} aria-hidden="true" />
        <div className="flex items-end justify-center gap-4">
          {/* Kokeb, the caller - pulses each time she voices a new letter */}
          {!boss && (
            <motion.div key={ctx.qIndex} animate={running && !reduce ? { scale: [1, 1.22, 1], rotate: [0, -6, 0] } : {}} transition={{ duration: 0.6, ease: 'easeOut' }}>
              <KokebSvg size={52} />
            </motion.div>
          )}
          <div className="relative">
            <AnbessaSvg size={96} mood={goodFeed ? 'eating' : feeding ? 'sad' : 'happy'} pose={boss ? 'stand' : goodFeed ? 'cheer' : 'stand'} />
            {goodFeed && !reduce && <FeedSparkle key={ctx.fed} />}
          </div>
          {(boss || (feeding && !ctx.lastFeed?.good)) && <JibbySvg size={80} expression={feeding ? 'agitated' : 'grin'} />}
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
