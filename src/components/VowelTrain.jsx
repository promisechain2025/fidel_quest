/* ============================================================================
   VOWEL TRAIN — the renderer (replaces Line Up)
   ----------------------------------------------------------------------------
   Thin shell over the pure trainCore. The cars carry an anchor family, one
   vowel order per car (tap a car to hear it). Cargo letters from other
   families wait on the platform: tap one to pick it up (it speaks), then tap
   the car whose vowel it shares. Right car: the cargo flies in, the car
   plucks its note (the krar scale rises car by car), the letter is said again
   and an example word + picture appears. Wrong car: the car shakes and both
   sounds replay - the cargo, then that car - so the child hears the
   difference; after two misses the right car glows. Fill the train and it
   pulls out of the station; then the round summary.

   L4 is ears-only: cargo shows a speaker instead of the letter.
   Only letters with a real recording are used. First attempts go to the
   answer ledger (mode 'train'); picked = the same consonant in the chosen
   order, so the confusion matrix reads "heard ሉ, chose ሊ".
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, LayoutGroup, useReducedMotion } from 'framer-motion'
import { Volume2 } from 'lucide-react'
import { audio, afterVoice, playForm, playEffect, playPluck } from '../platform/audioEngine'
import { INDEXES } from '../platform/ethiopic'
import { recordAnswer } from '../platform/telemetry'
import { t } from '../platform/i18n'
import { exampleWord } from '../platform/exampleWord'
import { useWide } from '../platform/gameUi'
import { GEEZ_ONES } from '../data/numerals'
import { FOCUS, ALL_WORDS } from '../FidelQuestApp'
import KokebSvg from './KokebSvg'
import WordPicture from './Pictures'
import { GameHeader, LevelPills, StreakStars, ExampleSlot, RoundSummary, NeedMore } from './gameKit'
import {
  initTrain, trainTransition, trainSummary, maxPlayableLevel, loadTrain, saveTrain, applyRound,
  TRAIN_LEVELS, MAX_LEVEL, Phase, TrainEvent, Outcome,
} from '../trainCore'
import { dueList } from '../platform/roundProgress'

const formOf = (k) => INDEXES.byAudioKey.get(k)
const glyphOf = (k) => formOf(k)?.char || ''
const orderOf = (k) => Number(/-(\d+)$/.exec(k)?.[1] || 0)

/** Keep only keys with a real recording (a cargo that could only chime is
    unanswerable by ear). */
function useVoiced(keys) {
  const sig = [...new Set(keys)].join(',')
  const [voiced, setVoiced] = useState(null)
  useEffect(() => {
    let live = true
    const ks = sig ? sig.split(',') : []
    Promise.all(ks.map((k) => audio.hasClip(`letters/${k}`).then((ok) => (ok ? k : null)).catch(() => k)))
      .then((res) => { if (live) setVoiced(res.filter(Boolean)) })
    return () => { live = false }
  }, [sig])
  return voiced
}

export default function VowelTrain({ soundOn, onBack, pool = [], extra = [] }) {
  const voiced = useVoiced(pool)
  const voicedExtra = useVoiced(extra)
  const keys = useMemo(() => voiced || [], [voiced])
  const extraKeys = useMemo(() => voicedExtra || [], [voicedExtra])
  const ready = voiced !== null && voicedExtra !== null
  const playable = useMemo(() => maxPlayableLevel(keys), [keys])
  const enough = ready && playable >= 1

  const [progress, setProgress] = useState(loadTrain)
  const [level, setLevel] = useState(() => loadTrain().unlocked)
  const startRef = useRef(Math.floor(Math.random() * 997) + 1)
  const [round, setRound] = useState(0)
  const [ctx, setCtx] = useState(null)
  const [result, setResult] = useState(null)
  const [example, setExample] = useState(null)
  const [shakeCar, setShakeCar] = useState(null)
  const [talkingCar, setTalkingCar] = useState(null)
  const [departing, setDeparting] = useState(false)
  const reduce = useReducedMotion()
  const wide = useWide()
  const timers = useRef([])
  const later = (c) => { timers.current.push(c) }
  const clearTimers = () => { timers.current.forEach((c) => c()); timers.current = [] }

  const effLevel = Math.max(1, Math.min(level, progress.unlocked, playable || 1))
  const dueRef = useRef(progress.due)
  dueRef.current = progress.due

  useEffect(() => {
    if (!enough) return undefined
    clearTimers()
    setCtx(initTrain(effLevel, (round + 1) * 173 + startRef.current, keys, { extraKeys, due: dueList(dueRef.current) }))
    setResult(null)
    setExample(null)
    setDeparting(false)
    return clearTimers
  }, [enough, effLevel, round, keys, extraKeys])

  // Round over: the train pulls out, then the summary.
  useEffect(() => {
    if (!ctx || ctx.phase !== Phase.WIN || result) return undefined
    setDeparting(true)
    playEffect('win', soundOn)
    const id = setTimeout(() => {
      const summary = trainSummary(ctx)
      const { state, unlockedNew } = applyRound(loadTrain(), ctx.level, summary)
      saveTrain(state)
      setProgress(state)
      setResult({ summary, unlockedNew })
    }, reduce ? 300 : 1500)
    return () => clearTimeout(id)
  }, [ctx, result, soundOn, reduce])

  const anchorKey = (order) => `${ctx.anchor}-${order}`
  const say = (key, car = null) => {
    playForm(formOf(key), soundOn)
    if (car == null) return
    setTalkingCar(car)
    later(afterVoice(() => setTalkingCar((c) => (c === car ? null : c)), 250, 3000))
  }
  const sayWord = (w) => {
    if (!w || w.noAudio) return
    audio.play(`words/${w.latin}`, { enabled: soundOn, chime: { familyIndex: w.familyIndex || 0, order: 1 } })
  }

  const pick = (c) => {
    if (!ctx || ctx.phase !== Phase.PLAY || c.done) return
    const r = trainTransition(ctx, { type: TrainEvent.PICK, payload: { id: c.id } })
    if (!r.accepted) return
    clearTimers()
    setExample(null)
    setCtx(r.next)
    say(c.key)
  }

  const tapCar = (order) => {
    if (!ctx || ctx.phase !== Phase.PLAY) return
    if (ctx.held == null) { say(anchorKey(order), order); return } // hear the car
    const r = trainTransition(ctx, { type: TrainEvent.LOAD, payload: { order } })
    if (!r.accepted) return
    setCtx(r.next)
    const last = r.next.last
    if (last.log) recordAnswer(last.log.heard, last.log.picked, 'train')
    if (last.outcome === Outcome.LOADED) {
      playPluck(order, soundOn)
      playEffect('good', soundOn)
      const word = exampleWord(last.key, ALL_WORDS, { strict: true })
      setExample({ id: last.key, glyph: glyphOf(last.key), word })
      later(afterVoice(() => {
        say(last.key, order)
        later(afterVoice(() => sayWord(word), 300, 3000))
      }, 350, 2500))
    } else {
      // Hear the difference: the cargo, then the car it was put in.
      playEffect('bad', soundOn)
      setShakeCar(order)
      later(afterVoice(() => setShakeCar(null), 450, 1000))
      later(afterVoice(() => {
        say(last.key)
        later(afterVoice(() => say(anchorKey(order), order), 250, 3000))
      }, 300, 3000))
    }
  }

  /* ── layout ── */
  const carW = wide ? 112 : 80
  const tileW = wide ? 84 : 62
  const cfg = TRAIN_LEVELS[effLevel]

  const car = (order) => {
    const loaded = ctx.cargo.filter((c) => c.done && orderOf(c.key) === order)
    const glow = ctx.hint === order
    const talking = talkingCar === order
    return (
      <motion.button
        key={order}
        type="button"
        data-testid={`car-${order}`}
        onClick={() => tapCar(order)}
        animate={reduce ? { x: 0, y: 0 }
          : shakeCar === order ? { x: [0, -8, 8, -5, 5, 0], y: 0 }
          : ctx.held != null ? { x: 0, y: [0, -4, 0] } // "now pick a car"
          : { x: 0, y: 0 }}
        transition={shakeCar === order ? { duration: 0.45 } : ctx.held != null ? { duration: 0.9, repeat: Infinity, delay: order * 0.08 } : { duration: 0.2 }}
        aria-label={`${t('trainCar', 'Car')} ${order}: ${glyphOf(anchorKey(order))}`}
        className={`relative flex flex-col items-center rounded-2xl ${FOCUS}`}
        style={{ width: carW, outlineColor: 'var(--sky)' }}
      >
        <span
          className="relative flex w-full flex-col items-center rounded-xl pb-2 pt-1"
          style={{
            minHeight: carW * 0.95,
            background: talking ? 'linear-gradient(180deg,#5aa0e6,#2c6cb0)' : 'linear-gradient(180deg,#d8553f,#a63a28)',
            border: '3px solid #6b2417',
            boxShadow: glow ? '0 0 0 4px var(--go), 0 0 18px var(--go)' : '0 3px 0 #4a1a10',
          }}
        >
          <span className="absolute left-1 top-0.5 text-xs font-black text-white/80" aria-hidden="true">{GEEZ_ONES[order]}</span>
          <span className="geez mt-1 flex items-center justify-center rounded-lg bg-[#fff6dc] font-black" style={{ width: carW * 0.62, height: carW * 0.5, fontSize: carW * 0.36, color: '#6d4501' }}>
            {glyphOf(anchorKey(order))}
          </span>
          <span className="mt-1 flex min-h-[22px] flex-wrap justify-center gap-0.5 px-1">
            {loaded.map((c) => (
              <motion.span
                key={c.id}
                layoutId={reduce ? undefined : `cargo-${c.id}`}
                className="geez flex items-center justify-center rounded-md bg-white font-black"
                style={{ width: carW * 0.26, height: carW * 0.26, fontSize: carW * 0.18, color: '#2c4373' }}
              >
                {glyphOf(c.key)}
              </motion.span>
            ))}
          </span>
        </span>
        {/* wheels */}
        <span className="-mt-2 flex w-full justify-around" aria-hidden="true">
          {[0, 1].map((i) => <span key={i} className="block rounded-full" style={{ width: carW * 0.22, height: carW * 0.22, background: '#2b2b2b', border: '3px solid #9aa0a6' }} />)}
        </span>
        {glow && !reduce && (
          <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-2xl" style={{ border: '3px solid var(--go)' }} animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
        )}
      </motion.button>
    )
  }

  const summaryView = result && ctx && (
    <RoundSummary
      testId="train-summary"
      summary={result.summary}
      unlockedNew={result.unlockedNew}
      canNext={effLevel < Math.min(progress.unlocked, playable)}
      atMax={effLevel >= MAX_LEVEL}
      belowUnlock={effLevel >= progress.unlocked}
      item={(k) => ({ label: glyphOf(k) })}
      onHear={(k) => say(k)}
      onNext={() => { setLevel(effLevel + 1); setRound((r) => r + 1) }}
      onAgain={() => setRound((r) => r + 1)}
      onDone={onBack}
      wide={wide}
    />
  )

  return (
    <div className="mx-auto flex min-h-dvh max-w-md md:max-w-2xl flex-col px-4 pb-6 pt-4">
      <GameHeader title={t('trainTitle', 'Vowel Train')} onBack={onBack} />
      <main className="flex flex-1 flex-col items-center justify-center gap-3">
        {!ready ? null : !enough ? (
          <NeedMore onBack={onBack}><KokebSvg size={72} /></NeedMore>
        ) : !ctx ? null : result ? summaryView : (
          <>
            <LevelPills max={MAX_LEVEL} current={effLevel} unlocked={progress.unlocked} playable={playable} best={progress.best} onPick={(lv) => { setLevel(lv); setRound((r) => r + 1) }} />
            <StreakStars streak={ctx.streak} />
            {/* picture instructions: pick up a letter, put it in the car that sounds the same */}
            <p className="flex items-center gap-2 text-2xl" aria-hidden="true" data-testid="train-howto">
              <span>👆</span><span>📦</span><span>➜</span><span>🚃</span><span>👂</span>
            </p>
            <ExampleSlot wide={wide} example={example} onTap={() => { say(example.id); later(afterVoice(() => sayWord(example.word), 300, 3000)) }} />
            <LayoutGroup>
              {/* the train */}
              <motion.div
                className="flex w-full flex-wrap items-end justify-center gap-x-2 gap-y-3"
                animate={departing && !reduce ? { x: '120vw' } : { x: 0 }}
                transition={departing ? { duration: 1.3, ease: 'easeIn' } : { duration: 0 }}
                data-testid="train"
              >
                <span className="flex items-end" aria-hidden="true" style={{ width: carW, height: carW }}>
                  <WordPicture emoji="🚂" size={carW} />
                </span>
                {cfg.orders.map(car)}
              </motion.div>
              <div className="h-1.5 w-full rounded-full" style={{ background: 'repeating-linear-gradient(90deg,#7a5a3a 0 14px,transparent 14px 22px)' }} aria-hidden="true" />
              {/* the platform */}
              <div className="mt-2 flex flex-wrap justify-center gap-3" data-testid="platform" role="group" aria-label={t('trainCargo', 'Cargo')}>
                {ctx.cargo.filter((c) => !c.done).map((c) => {
                  const held = ctx.held === c.id
                  return (
                    <motion.button
                      key={c.id}
                      layoutId={reduce ? undefined : `cargo-${c.id}`}
                      type="button"
                      data-key={c.key}
                      data-held={held || undefined}
                      onClick={() => pick(c)}
                      animate={held && !reduce ? { y: -10, scale: 1.08 } : { y: 0, scale: 1 }}
                      aria-pressed={held}
                      aria-label={ctx.earsOnly ? t('trainSoundCargo', 'Sound cargo. Tap to hear it and pick it up') : `${glyphOf(c.key)}. ${t('trainPick', 'Tap to pick it up')}`}
                      className={`geez flex items-center justify-center rounded-2xl font-black ${FOCUS}`}
                      style={{
                        width: tileW, height: tileW, fontSize: tileW * 0.55,
                        background: '#f3e2b3', color: '#6d4501',
                        border: `3px solid ${held ? 'var(--sky)' : '#b8892f'}`,
                        boxShadow: held ? '0 8px 16px rgba(0,0,0,.35)' : '0 3px 0 #8a6420',
                        outlineColor: 'var(--sky)',
                      }}
                    >
                      {ctx.earsOnly ? <Volume2 style={{ width: tileW * 0.5, height: tileW * 0.5 }} aria-hidden="true" /> : glyphOf(c.key)}
                    </motion.button>
                  )
                })}
              </div>
            </LayoutGroup>
          </>
        )}
      </main>
    </div>
  )
}
