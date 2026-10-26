/* ============================================================================
   LETTER CATCH (renderer) - Anbessa's brick basket
   ----------------------------------------------------------------------------
   Big glossy fidel bricks float down in the daylight; Kokeb calls a letter
   (SOUND ONLY) and the child taps the matching brick - it zips into Anbessa's
   basket and lands in the wooden bin. Fill the bin to win; a wrong tap costs
   a heart.

   All logic is the pure seeded machine (letterCatchCore.js). This file is the
   shell: a per-frame rAF that feeds TICK dt into the machine, DOM falling
   bricks you tap, and a small flight layer (presentation only).
   ========================================================================== */
import { useReducer, useEffect, useRef, useState, memo } from 'react'
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { Volume2, Heart, Ear, ThumbsUp, PartyPopper, RotateCcw, Home } from 'lucide-react'
import AnbessaSvg from './components/AnbessaSvg'
import { INDEXES } from './platform/ethiopic'
import { playForm, playEffect } from './platform/audioEngine'
import { recordAnswer } from './platform/telemetry'
import { t } from './platform/i18n'
import { initCatch, catchTransition, Phase, CatchEvent } from './letterCatchCore'
import {
  BrickScreen, GameStage, WoodTopBar, GuideSign, useGuideFeedback, WoodTray, RoundButton, BrickTile, Confetti, useShortScreen,
  roundBtnCss, brickLabels, WOOD,
} from './components/brickKit'
import { BrickStreak, sceneStyle } from './components/brickRoundKit'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const formOf = (k) => INDEXES.byAudioKey.get(k)
const reseed = (s) => ((s * 1664525 + 1013904223) >>> 0) | 1
// glyph bricks skip gold (white fidel on gold is too faint)
const TILE_COLORS = ['#e2453c', '#f08a24', '#4fb04a', '#2f86d6', '#7a4fc9', '#d94f9a']
const colorOf = (id) => TILE_COLORS[id % TILE_COLORS.length]

const reducer = (ctx, e) => (e.type === '__reset__' ? initCatch(ctx.level, reseed(ctx.seed), ctx.pool) : catchTransition(ctx, e).next)

/** Anbessa holding his wicker basket; the bricks he has caught peek out. */
const Lion = memo(function Lion({ mood, pose, filled = 0, size = 210 }) {
  const peek = ['#e2453c', '#2f86d6', '#4fb04a', '#f08a24', '#7a4fc9']
  return (
    <div className="relative" style={{ width: size, height: size * 0.98 }} data-testid="catch-lion">
      <AnbessaSvg size={size} mood={mood} pose={pose} title="" />
      <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: -6, width: size * 0.62, height: size * 0.27 }} data-testid="catch-basket">
        <div className="absolute inset-x-3 flex justify-center gap-1" style={{ top: -14 }} aria-hidden="true">
          {Array.from({ length: Math.min(filled, 5) }, (_, i) => (
            <span key={i} className="block rounded-[5px]" style={{ width: size * 0.12, height: size * 0.11, background: peek[i % peek.length], boxShadow: 'inset 0 3px 0 rgba(255,255,255,.5), 0 2px 0 rgba(0,0,0,.35)' }} />
          ))}
        </div>
        <div className="absolute inset-0 rounded-b-[26px] rounded-t-[10px]"
          style={{ background: 'repeating-linear-gradient(90deg, #c98a45 0 9px, #a96b2c 9px 11px), linear-gradient(180deg,#d9a05c,#a96b2c)', backgroundBlendMode: 'multiply', border: '4px solid #6e3f14', boxShadow: 'inset 0 5px 0 rgba(255,255,255,.3), inset 0 -6px 8px rgba(0,0,0,.3), 0 6px 8px rgba(0,0,0,.3)' }} />
        <div className="absolute inset-x-[-3px] top-0 h-[10px] rounded-full" style={{ background: 'linear-gradient(180deg,#e8b36e,#b9792f)', border: '3px solid #6e3f14' }} />
      </div>
    </div>
  )
})

/** The wooden bin that fills up with the letters caught so far. */
function Bin({ need, keys, short }) {
  const cw = short ? 44 : 54, ch = short ? 40 : 44
  return (
    <div className="mx-auto flex flex-wrap justify-center gap-1.5 rounded-2xl px-2 py-2" data-testid="catch-bin"
      style={{ maxWidth: 330, background: 'rgba(90,52,20,.28)', boxShadow: 'inset 0 3px 6px rgba(0,0,0,.35)' }}>
      {Array.from({ length: need }, (_, i) => keys[i] ? (
        <motion.div key={i} data-testid="bin-brick" initial={{ scale: 0.3, y: -16 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 14 }}>
          <BrickTile color={colorOf(i + 1)} studs={1} width={cw} height={ch} depth={4} className={short ? 'text-[22px]' : 'text-[26px]'}>{formOf(keys[i])?.char}</BrickTile>
        </motion.div>
      ) : (
        <span key={i} className="block rounded-lg" style={{ width: cw, height: ch, border: '3px dashed rgba(255,244,214,.55)', background: 'rgba(60,34,12,.3)' }} />
      ))}
    </div>
  )
}

export default function LetterCatch({ level = 'easy', seed = 1, soundOn = true, pool, onExit }) {
  const [ctx, dispatch] = useReducer(reducer, { level, seed, pool }, (a) => initCatch(a.level, a.seed, a.pool))
  const targetForm = formOf(ctx.target)
  const revealTarget = !soundOn // sound-only; only show the letter when muted
  const reduce = useReducedMotion()
  const fieldCtl = useAnimationControls()
  const basketCtl = useAnimationControls()
  const [fb, flash] = useGuideFeedback()
  const [flights, setFlights] = useState([]) // bricks in flight to the basket (or falling away)
  const [bin, setBin] = useState([]) // keys caught so far
  const L = brickLabels()
  const short = useShortScreen()
  const bw = short ? 64 : 84, bh = short ? 68 : 88, tw = bw, th = short ? 58 : 76, tdep = short ? 5 : 7
  const fh = short ? 124 : 196, lionSize = short ? 112 : 210, rb = short ? '!h-[52px] !w-[52px]' : '!h-[68px] !w-[68px]'

  /* per-frame game clock */
  useEffect(() => {
    let raf, last = performance.now()
    const loop = (now) => { dispatch({ type: CatchEvent.TICK, payload: { dt: (now - last) / 1000 } }); last = now; raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  /* tap a falling brick */
  const onShoot = (item) => {
    if (ctx.phase !== Phase.PLAY) return
    const good = item.key === ctx.target
    recordAnswer(ctx.target, item.key, 'catch')
    dispatch({ type: CatchEvent.SHOOT, payload: { id: item.id } })
    if (!reduce) setFlights((f) => [...f, { id: item.id, key: item.key, x: item.x, y: item.y, good }])
    if (good) {
      setBin((b) => [...b, item.key])
      playEffect('good', soundOn); playForm(formOf(item.key), soundOn)
      flash('ok', 1100)
      if (!reduce) basketCtl.start({ scale: [1, 1.14, 1], y: [0, 6, 0] }, { duration: 0.35, delay: 0.3 })
    } else {
      // A wrong tap re-plays the CALLED letter so the miss is a listen-again moment.
      playEffect('bad', soundOn); setTimeout(() => playForm(targetForm, soundOn), 420)
      flash('try', 1300)
      if (!reduce) fieldCtl.start({ x: [0, -9, 8, -6, 4, 0] }, { duration: 0.34 })
    }
  }

  /* announce the called letter (sound only) */
  useEffect(() => { if (ctx.phase === Phase.PLAY) playForm(targetForm, soundOn) }, [ctx.target]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ctx.phase === Phase.WIN) { playEffect('win', soundOn); const id = setTimeout(() => onExit({ won: true }), reduce ? 900 : 2300); return () => clearTimeout(id) } }, [ctx.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const again = () => { setBin([]); setFlights([]); dispatch({ type: '__reset__' }) }
  const lives = (
    <div className="flex items-center gap-1 rounded-full px-2.5 py-1.5" data-testid="catch-lives" aria-label={t('lives', 'Lives')}
      style={{ ...WOOD, border: '3px solid #7a4a20', boxShadow: 'inset 0 3px 0 rgba(255,255,255,.3), 0 3px 0 #5a3414' }}>
      {Array.from({ length: ctx.cfg.lives }, (_, i) => (
        <Heart key={i} className="h-6 w-6" strokeWidth={2.5} color={i < ctx.lives ? '#fff' : 'rgba(255,255,255,.35)'} fill={i < ctx.lives ? '#e2453c' : 'rgba(0,0,0,.2)'} aria-hidden="true" />
      ))}
    </div>
  )

  if (ctx.phase === Phase.LOSE) {
    return (
      <BrickScreen testId="brick-catch-lose">
        <div className={`relative flex min-h-0 flex-1 flex-col items-center justify-center ${short ? 'gap-2' : 'gap-6'} overflow-hidden`} style={sceneStyle}>
          <GuideSign icon={Heart} tone="try" text={t('catchLose', 'Out of hearts!')} />
          <Lion mood="sad" pose="stand" filled={bin.length} size={short ? 120 : 230} />
          <div className="flex gap-5">
            <RoundButton testId="catch-again" onClick={again} label={t('runAgain', 'Run again')} color="#2f86d6" className={rb}>
              <RotateCcw className="h-9 w-9" color="#fff" strokeWidth={3} aria-hidden="true" />
            </RoundButton>
            <RoundButton testId="catch-home" onClick={() => onExit({ won: false })} label={t('home', 'Home')} color="#4fb04a" className={rb}>
              <Home className="h-9 w-9" color="#fff" strokeWidth={3} aria-hidden="true" />
            </RoundButton>
          </div>
        </div>
      </BrickScreen>
    )
  }

  const win = ctx.phase === Phase.WIN
  return (
    <BrickScreen testId="brick-catch" side>
      <GameStage style={sceneStyle}
        head={(
          <WoodTopBar onBack={() => onExit({ won: false })} value={ctx.caught} total={ctx.need} done={win}
            guide={win ? <GuideSign icon={PartyPopper} tone="ok" text={t('catchBrickWin', 'Great catching!')} />
              : fb === 'try' ? <GuideSign icon={Ear} tone="try" text={L.retry} />
                : fb === 'ok' ? <GuideSign icon={ThumbsUp} tone="ok" text={L.good} />
                  : <GuideSign icon={Ear} text={t('catchBrickGuide', 'Listen, then catch it!')} />} />
        )}>
        {win && <Confetti reduce={reduce} count={40} />}
        <div className="pointer-events-none absolute right-3 top-1 z-20"><BrickStreak streak={ctx.combo} /></div>

        {/* play field: the bricks fall here */}
        <motion.div animate={fieldCtl} data-catch-target={ctx.target} data-catch-phase={ctx.phase} data-testid="catch-field"
          className="absolute inset-x-0 top-0 z-[5]" style={{ bottom: fh, touchAction: 'none' }}>
          {ctx.items.map((it) => {
            const f = formOf(it.key)
            return (
              <motion.button key={it.id} type="button" data-fam={it.key} data-testid="catch-brick" onClick={() => onShoot(it)} whileTap={{ scale: 0.88 }}
                aria-label={`${t('lcShoot', 'Catch')} ${f?.char}`}
                className={`absolute rounded-xl ${FOCUS}`}
                style={{ left: `${it.x * 100}%`, top: `${it.y * 100}%`, transform: 'translate(-50%,-50%)', width: bw, height: bh, paddingTop: short ? 8 : 12, background: 'transparent', border: 'none', outlineColor: '#fff59a' }}>
                <BrickTile color={colorOf(it.id)} studs={2} width={tw} height={th} depth={tdep} className={short ? 'text-[34px]' : 'text-[46px]'}>{f?.char}</BrickTile>
              </motion.button>
            )
          })}
          {/* bricks flying into the basket (or dropping away after a wrong tap) */}
          {flights.map((fl) => (
            <motion.div key={fl.id} className="pointer-events-none absolute" aria-hidden="true"
              style={{ left: `${fl.x * 100}%`, top: `${fl.y * 100}%`, translateX: '-50%', translateY: '-50%' }}
              initial={{ scale: 1, opacity: 1 }}
              animate={fl.good ? { left: '50%', top: '108%', scale: 0.55, opacity: 1 } : { top: `${fl.y * 100 + 22}%`, opacity: 0, rotate: 24 }}
              transition={{ duration: fl.good ? 0.38 : 0.5, ease: 'easeIn' }}
              onAnimationComplete={() => setFlights((f) => f.filter((x) => x.id !== fl.id))}>
              <BrickTile color={fl.good ? colorOf(fl.id) : '#9aa3ad'} studs={2} width={tw} height={th} depth={tdep} className={short ? 'text-[34px]' : 'text-[46px]'}>{formOf(fl.key)?.char}</BrickTile>
            </motion.div>
          ))}
        </motion.div>

        {/* Anbessa and his basket, on a baseplate */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-center" style={{ height: fh }}>
          <div className="absolute bottom-1 left-3">{lives}</div>
          <motion.div animate={basketCtl} className={`relative ${short ? 'mb-2' : 'mb-3'}`}><Lion mood={ctx.flash?.type === 'bad' ? 'sad' : 'happy'} pose={win ? 'cheer' : 'stand'} filled={bin.length} size={lionSize} /></motion.div>
          <div className="absolute bottom-2 right-4 flex items-center gap-2">
            {revealTarget && (
              <BrickTile color="#f7efd9" studs={1} width={short ? 44 : 54} height={short ? 44 : 50} depth={5} className={short ? 'text-[26px]' : 'text-[34px]'} style={{ color: '#2c4a7a', textShadow: '0 1px 0 #fff' }}>{targetForm?.char}</BrickTile>
            )}
            <motion.div key={ctx.target} initial={{ scale: 0.85 }} animate={{ scale: 1 }}>
              <RoundButton testId="catch-hear" onClick={() => playForm(targetForm, soundOn)} label={t('hearAgain', 'Hear it again')} color="#2f86d6" className={rb}>
                <Volume2 className="h-9 w-9" color="#fff" strokeWidth={3} aria-hidden="true" />
              </RoundButton>
            </motion.div>
          </div>
        </div>
      </GameStage>

      <WoodTray style={short ? undefined : { paddingTop: 22, paddingBottom: 14 }}>
        <Bin need={ctx.need} keys={bin} short={short} />
      </WoodTray>
    </BrickScreen>
  )
}
