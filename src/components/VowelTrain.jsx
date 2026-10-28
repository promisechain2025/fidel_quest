/* ============================================================================
   VOWEL TRAIN — the renderer (toy-brick train; replaces Line Up)
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

   LOOK: a studded green baseplate track carries a brick engine and one
   coloured brick wagon per vowel order (colour + dot pips = the order, no
   numerals). Cargo letters are cream bricks on a wooden tray: drag one onto a
   wagon (or tap it, then tap a wagon) and it snaps on in that wagon's colour.

   L4 is ears-only: cargo shows a speaker instead of the letter.
   Only letters with a real recording are used. First attempts go to the
   answer ledger (mode 'train'); picked = the same consonant in the chosen
   order, so the confusion matrix reads "heard ሉ, chose ሊ".
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Volume2, Hand, Ear, ThumbsUp, RotateCcw } from 'lucide-react'
import { audio, afterVoice, playForm, playEffect, playPluck } from '../platform/audioEngine'
import { INDEXES } from '../platform/ethiopic'
import { recordAnswer } from '../platform/telemetry'
import { t } from '../platform/i18n'
import { exampleWord } from '../platform/exampleWord'
import { ALL_WORDS } from '../FidelQuestApp'
import {
  BrickScreen, GameStage, FitBox, useShortScreen, WoodTopBar, GuideSign, useGuideFeedback, WoodTray, TrayWell, WoodBottomBar, RoundButton, Baseplate,
  BrickTile, DragBrick, Pips, Confetti, Brick, BRICK_COLORS, shade, brickLabels, overRect,
} from './brickKit'
import { BrickLevels, BrickStreak, BrickSummary, sceneStyle } from './brickRoundKit'
import BrickExample from './brickExample'
import { NeedMore } from './gameKit'
import KokebSvg from './KokebSvg'
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
  const carRefs = useRef({})
  const [fb, flash, clearFb] = useGuideFeedback()
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
    applyLoad(r.next, order)
  }

  const applyLoad = (next, order) => {
    setCtx(next)
    const last = next.last
    if (last.log) recordAnswer(last.log.heard, last.log.picked, 'train')
    if (last.outcome === Outcome.LOADED) {
      playPluck(order, soundOn)
      playEffect('good', soundOn)
      flash('ok', 1100)
      const word = exampleWord(last.key, ALL_WORDS, { strict: true })
      setExample({ id: last.key, glyph: glyphOf(last.key), word })
      later(afterVoice(() => {
        say(last.key, order)
        later(afterVoice(() => sayWord(word), 300, 3000))
      }, 350, 2500))
    } else {
      // Hear the difference: the cargo, then the car it was put in.
      playEffect('bad', soundOn)
      flash('try', 1400)
      setShakeCar(order)
      later(afterVoice(() => setShakeCar(null), 450, 1000))
      later(afterVoice(() => {
        say(last.key)
        later(afterVoice(() => say(anchorKey(order), order), 250, 3000))
      }, 300, 3000))
    }
  }

  /* ── layout ── */
  const L = brickLabels()
  const cfg = TRAIN_LEVELS[effLevel]
  const carW = 84
  const bodyH = effLevel === 1 ? 104 : 80
  const colorOfCar = (order) => BRICK_COLORS[(order - 1) % BRICK_COLORS.length]
  const win = ctx?.phase === Phase.WIN
  const loadedCount = ctx ? ctx.cargo.filter((c) => c.done).length : 0

  // Drop on a wagon (or tap it): the brick drop picks the nearest wagon under the finger.
  const dropOn = (c, pt) => {
    if (!pt) { pick(c); return }
    let hit = null
    for (const o of cfg.orders) { if (overRect(carRefs.current[o], pt, 14)) { hit = o; break } }
    if (hit == null) { pick(c); return } // dropped on nothing: just pick it up (no penalty)
    if (!ctx || ctx.phase !== Phase.PLAY) return
    const r = trainTransition(ctx, { type: TrainEvent.PICK, payload: { id: c.id } })
    if (!r.accepted) return
    // pick + load in one go, through the same core transitions
    const r2 = trainTransition(r.next, { type: TrainEvent.LOAD, payload: { order: hit } })
    if (!r2.accepted) { setCtx(r.next); return }
    clearTimers()
    setExample(null)
    applyLoad(r2.next, hit)
  }

  const renderWagon = (order) => {
    const loaded = ctx.cargo.filter((c) => c.done && orderOf(c.key) === order)
    const glow = ctx.hint === order
    const talking = talkingCar === order
    const color = win ? '#f2b324' : colorOfCar(order)
    return (
      <motion.button
        type="button"
        key={order}
        ref={(el) => { carRefs.current[order] = el }}
        data-testid={`car-${order}`}
        data-glow={glow ? '1' : undefined}
        onClick={() => tapCar(order)}
        animate={reduce ? { x: 0, y: 0 }
          : win ? { y: [0, -10, 0] }
          : shakeCar === order ? { x: [0, -8, 8, -5, 5, 0], y: 0 }
          : ctx.held != null ? { x: 0, y: [0, -5, 0] } // "now pick a wagon"
          : talking ? { x: 0, y: [0, -6, 0] }
          : { x: 0, y: 0 }}
        transition={win ? { duration: 0.5, delay: order * 0.07, repeat: 2 } : shakeCar === order ? { duration: 0.45 } : ctx.held != null ? { duration: 0.9, repeat: Infinity, delay: order * 0.08 } : { duration: 0.3 }}
        aria-label={`${t('trainCar', 'Car')} ${order}: ${glyphOf(anchorKey(order))}`}
        className="relative shrink-0 touch-manipulation"
        style={{ width: carW, height: bodyH + 22 }}
      >
        {/* loaded cargo: small bricks snapped onto the wagon's studs */}
        <span className="pointer-events-none absolute bottom-full left-0 right-0 flex flex-wrap-reverse items-end justify-center gap-[3px]" style={{ marginBottom: -3 }}>
          {loaded.map((c) => (
            <motion.span key={c.id} initial={reduce ? false : { y: -46, scale: 1.3, opacity: 0.3 }} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}>
              <BrickTile testId="loaded" color={shade(color, 0.12)} studs={1} width={(carW - 10) / 2} height={30} depth={3} className="text-[20px]">{glyphOf(c.key)}</BrickTile>
            </motion.span>
          ))}
        </span>
        <BrickTile color={color} studs={2} width={carW} height={bodyH} depth={6}
          style={glow ? { boxShadow: `${brickShadow(color)}, 0 0 0 5px #fff59a, 0 0 22px 8px rgba(255,235,90,.95)` } : talking ? { boxShadow: `${brickShadow(color)}, 0 0 20px 6px rgba(255,255,255,.9)` } : undefined}>
          <span className="flex flex-col items-center gap-1">
            <span className="geez flex items-center justify-center rounded-lg font-black" style={{ width: carW * 0.7, height: effLevel === 1 ? carW * 0.7 : carW * 0.52, fontSize: effLevel === 1 ? carW * 0.46 : carW * 0.38, background: '#fff8e6', color: shade(color, -0.35), textShadow: 'none', boxShadow: 'inset 0 2px 5px rgba(0,0,0,.3)' }}>
              {glyphOf(anchorKey(order))}
            </span>
            <Pips n={order} size={5} />
          </span>
        </BrickTile>
        {/* wheels */}
        <span className="absolute -bottom-0.5 left-0 right-0 flex justify-around px-2" aria-hidden="true">
          {[0, 1].map((i) => (
            <span key={i} className="block rounded-full" style={{ width: 22, height: 22, background: 'radial-gradient(circle at 50% 50%, #cfd5db 0 22%, #3a3f47 26%)', border: '2px solid #1f2329', boxShadow: '0 2px 0 rgba(0,0,0,.35)' }} />
          ))}
        </span>
        {glow && !reduce && (
          <motion.span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 rounded-lg" style={{ height: bodyH, border: '4px solid #fff59a' }} animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.9, repeat: Infinity }} />
        )}
      </motion.button>
    )
  }

  const engW = carW + 10
  const renderEngine = () => (
    <span className="relative shrink-0" aria-hidden="true" data-testid="engine" style={{ width: engW, height: engW * (100 / 90) }}>
      <svg viewBox="0 0 90 100" width={engW} height={engW * (100 / 90)} style={{ overflow: 'visible', filter: 'drop-shadow(0 6px 4px rgba(0,0,0,.25))' }}>
        <Brick x={10} y={0} w={20} h={20} color="#3b3f47" studs={1} />
        <Brick x={4} y={22} w={52} h={34} color="#e2453c" studs={2} />
        <Brick x={56} y={8} w={32} h={48} color="#2f86d6" studs={2} />
        <rect x={62} y={18} width={20} height={16} rx={4} fill="#fff8e6" stroke="#1d5a9a" strokeWidth={2} />
        <Brick x={2} y={56} w={86} h={14} color="#f2c230" studs={0} />
        <circle cx={6} cy={44} r={5} fill="#fff59a" stroke="#b9871c" strokeWidth={2} />
        {[20, 46, 72].map((x, i) => (
          <g key={i}><circle cx={x} cy={78} r={i === 2 ? 13 : 11} fill="#3a3f47" stroke="#1f2329" strokeWidth={2.5} /><circle cx={x} cy={78} r={4} fill="#cfd5db" /></g>
        ))}
      </svg>
      {(departing || win) && !reduce && [0, 1, 2].map((i) => (
        <motion.span key={i} className="absolute rounded-full" style={{ left: 14 * (engW / 90), top: -6, width: 18, height: 18, background: 'rgba(255,255,255,.9)' }}
          initial={{ opacity: 0, y: 0, scale: 0.4 }} animate={{ opacity: [0, 0.9, 0], y: -70, x: -20 - i * 10, scale: 1.6 }} transition={{ duration: 1.2, delay: i * 0.3, repeat: 2 }} />
      ))}
    </span>
  )

  const rows = effLevel === 1 ? [cfg.orders] : [cfg.orders.slice(0, 3), cfg.orders.slice(3)]

  const summaryView = result && ctx && (
    <BrickSummary
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
    />
  )

  const playing = ready && enough && ctx && !result
  const short = useShortScreen()
  const trainW = 374
  const trainH = 88 + rows.length * (bodyH + 22 + 36 + 14) + 18
  return (
    <BrickScreen testId="brick-train" side>
      <GameStage style={sceneStyle}
        head={(
          <WoodTopBar onBack={onBack} value={loadedCount} total={ctx ? ctx.cargo.length : 6} done={win}
            guide={playing ? (fb === 'try' ? <GuideSign icon={Ear} tone="try" text={L.retry} />
              : (win || fb === 'ok') ? <GuideSign icon={ThumbsUp} tone="ok" text={L.good} />
                : ctx.held != null ? <GuideSign icon={Ear} text={t('trainBrickHeld', 'Now tap its wagon')} />
                  : <GuideSign icon={Hand} text={t('trainBrickGuide', 'Find the matching wagon')} />) : null} />
        )}>
        {win && <Confetti reduce={reduce} />}
        {!ready ? null : !enough ? (
          <div className="flex h-full items-center justify-center px-6"><NeedMore onBack={onBack}><KokebSvg size={72} /></NeedMore></div>
        ) : !ctx ? null : result ? summaryView : (
          <FitBox w={trainW} h={trainH} anchor="center" pad={2}>
            <div className="flex h-full w-full flex-col items-center">
              <BrickExample example={example} color={example ? colorOfCar(orderOf(example.id)) : undefined}
                onTap={() => { say(example.id); later(afterVoice(() => sayWord(example.word), 300, 3000)) }} />
              <motion.div className="flex w-full flex-1 flex-col items-center justify-around pb-3" data-testid="train"
                animate={departing && !reduce ? { x: '125vw' } : { x: 0 }} transition={departing ? { duration: 1.4, ease: 'easeIn', delay: 0.5 } : { duration: 0 }}>
                {rows.map((orders, ri) => (
                  <div key={ri} className="relative flex items-end justify-center gap-1.5 pt-9">
                    <Baseplate className="-left-3 -right-3 h-[34px]" stud={22} style={{ position: 'absolute', bottom: -12, zIndex: 0 }} />
                    <div className="relative z-10 flex items-end justify-center gap-1.5">
                      {ri === 0 && renderEngine()}
                      {orders.map((o) => renderWagon(o))}
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </FitBox>
        )}
      </GameStage>

      {playing && (
        <WoodTray>
          <div className="absolute -top-4 right-4 z-20"><BrickStreak streak={ctx.streak} /></div>
          <TrayWell className={`flex flex-wrap content-center items-end justify-center px-2 ${short ? 'min-h-0 gap-x-2 gap-y-3 pt-3' : 'min-h-[170px] gap-x-3 gap-y-5 pt-5'}`}>
            <div className="contents" data-testid="platform" role="group" aria-label={t('trainCargo', 'Cargo')}>
              {ctx.cargo.filter((c) => !c.done).map((c) => {
                const held = ctx.held === c.id
                return (
                  <motion.div key={c.id} data-key={c.key} data-held={held ? 'true' : undefined}
                    animate={held && !reduce ? { y: -12, scale: 1.1 } : { y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                    style={{ borderRadius: 10, boxShadow: held ? '0 0 0 4px #fff59a, 0 0 22px 8px rgba(255,235,90,.95)' : 'none' }}>
                    <DragBrick testId="cargo" dataOrder={c.key} color="#f7efd9" reduce={reduce} w={short ? 48 : 58} h={short ? 54 : 64} fontSize={short ? 30 : 38} studSize={short ? 17 : 22}
                      label={ctx.earsOnly ? t('trainSoundCargo', 'Sound cargo. Tap to hear it') : `${glyphOf(c.key)}. ${t('trainPick', 'Tap to pick it up')}`}
                      onDrop={(pt) => dropOn(c, pt)}>
                      {ctx.earsOnly
                        ? <Volume2 style={{ width: 30, height: 30 }} color="#2f6fb8" strokeWidth={3} aria-hidden="true" />
                        : <span style={{ color: '#2c4a7a', textShadow: '0 1px 0 #fff' }}>{glyphOf(c.key)}</span>}
                    </DragBrick>
                  </motion.div>
                )
              })}
            </div>
          </TrayWell>
        </WoodTray>
      )}

      {playing && (
        <WoodBottomBar>
          <BrickLevels max={MAX_LEVEL} current={effLevel} unlocked={progress.unlocked} playable={playable} best={progress.best} onPick={(lv) => { setLevel(lv); setRound((r) => r + 1) }} />
          <RoundButton onClick={() => setRound((r) => r + 1)} label={L.again} testId="again" color="#2f86d6">
            <RotateCcw className="h-7 w-7" color="#fff" strokeWidth={3} aria-hidden="true" />
          </RoundButton>
        </WoodBottomBar>
      )}
    </BrickScreen>
  )
}

const brickShadow = (c) => `inset 0 3px 0 rgba(255,255,255,.4), inset 0 -3px 0 rgba(0,0,0,.12), 0 6px 0 ${shade(c, -0.45)}, 0 10px 10px rgba(0,0,0,.25)`
