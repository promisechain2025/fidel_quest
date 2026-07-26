/* ============================================================================
   FIDEL SKY SHOOTER (renderer)
   ----------------------------------------------------------------------------
   Letters rain from the night sky; Kokeb calls a letter (SOUND ONLY) and the
   child SHOOTS the matching one as it falls - Anbessa fires a spark that flies
   up and the letter bursts into a firework. Fill the meter to win.

   All logic is the pure seeded machine (letterCatchCore.js). This file is the
   shell: a per-frame rAF that feeds TICK dt into the machine, DOM falling
   letters you tap to shoot, and a capped 2D-canvas firework layer.
   ========================================================================== */
import { useReducer, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useAnimationControls, useReducedMotion } from 'framer-motion'
import { X, Volume2, Heart, Star } from 'lucide-react'
import AnbessaSvg from './components/AnbessaSvg'
import KokebSvg from './components/KokebSvg'
import JibbySvg from './components/JibbySvg'
import { INDEXES } from './platform/ethiopic'
import { playForm, playEffect } from './platform/audioEngine'
import { recordAnswer } from './platform/telemetry'
import { t } from './platform/i18n'
import { initCatch, catchTransition, Phase, CatchEvent } from './letterCatchCore'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const formOf = (k) => INDEXES.byAudioKey.get(k)
const reseed = (s) => ((s * 1664525 + 1013904223) >>> 0) | 1
const SPARK = ['#ffd25a', '#ff8a3d', '#8affc1', '#7db8ff', '#ffffff']

const reducer = (ctx, e) => (e.type === '__reset__' ? initCatch(ctx.level, reseed(ctx.seed), ctx.pool) : catchTransition(ctx, e).next)

export default function LetterCatch({ level = 'easy', seed = 1, soundOn = true, pool, onExit }) {
  const [ctx, dispatch] = useReducer(reducer, { level, seed, pool }, (a) => initCatch(a.level, a.seed, a.pool))
  const areaRef = useRef(null)
  const canvasRef = useRef(null)
  const partsRef = useRef([])
  const rocketRef = useRef(null) // { x0,y0,tx,ty,born,combo } a spark in flight
  const targetForm = formOf(ctx.target)
  const revealTarget = !soundOn // sound-only; only show the letter when muted
  // Game-feel layer (presentation only - never touches the pure machine):
  // Anbessa recoils when firing, the field shakes on a miss, and a running
  // combo makes the burst bigger and pops a "xN!".
  const reduce = useReducedMotion()
  const anbessaCtl = useAnimationControls()
  const fieldCtl = useAnimationControls()
  const [comboPop, setComboPop] = useState(null)

  /* per-frame game clock */
  useEffect(() => {
    let raf, last = performance.now()
    const loop = (now) => { dispatch({ type: CatchEvent.TICK, payload: { dt: (now - last) / 1000 } }); last = now; raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  /* firework layer: a spark rises from Anbessa to the shot letter, then bursts */
  const disperse = (cx, cy, combo = 1) => {
    const P = partsRef.current
    // A bigger, more golden burst as the combo climbs - the reward for a streak.
    const n = 60 + Math.min(combo, 8) * 12
    const boost = 1 + Math.min(combo, 8) * 0.06
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.25
      const sp = 3.2 * boost * (0.35 + Math.random())
      const gold = combo >= 3 && i % 2 === 0
      P.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, decay: 0.012 + Math.random() * 0.009, color: gold ? '#ffd25a' : SPARK[i % SPARK.length], size: (1.8 + Math.random() * 2.2) * (combo >= 5 ? 1.25 : 1) })
    }
    if (P.length > 420) P.splice(0, P.length - 420)
  }
  const shootFireworkTo = (nx, ny, combo = 1) => {
    const el = areaRef.current
    if (!el) return
    rocketRef.current = { x0: el.clientWidth * 0.5, y0: el.clientHeight * 0.9, tx: el.clientWidth * nx, ty: el.clientHeight * ny, born: performance.now(), combo }
  }
  useEffect(() => {
    const c = canvasRef.current, el = areaRef.current
    if (!c || !el) return undefined
    const size = () => { const dpr = Math.min(2, window.devicePixelRatio || 1); c.width = el.clientWidth * dpr; c.height = el.clientHeight * dpr; c.style.width = `${el.clientWidth}px`; c.style.height = `${el.clientHeight}px`; const g = c.getContext('2d'); if (g) g.setTransform(dpr, 0, 0, dpr, 0, 0) }
    size(); window.addEventListener('resize', size)
    let raf
    const loop = () => {
      const g = c.getContext('2d')
      if (g) {
        g.clearRect(0, 0, c.clientWidth, c.clientHeight)
        g.globalCompositeOperation = 'lighter'
        const rk = rocketRef.current
        if (rk) {
          const p = Math.min(1, (performance.now() - rk.born) / 240)
          const x = rk.x0 + (rk.tx - rk.x0) * p
          const y = rk.y0 + (rk.ty - rk.y0) * (p * (2 - p))
          g.globalAlpha = 1; g.fillStyle = '#ffe9a6'
          g.beginPath(); g.arc(x | 0, y | 0, 4, 0, 6.283); g.fill()
          g.globalAlpha = 0.5; g.fillStyle = '#ff9a4d'
          g.beginPath(); g.arc(x | 0, (y + 10) | 0, 2.6, 0, 6.283); g.fill()
          if (p >= 1) { disperse(rk.tx, rk.ty, rk.combo || 1); rocketRef.current = null }
        }
        const P = partsRef.current
        for (let i = P.length - 1; i >= 0; i--) {
          const q = P[i]; q.x += q.vx; q.y += q.vy; q.vy += 0.05; q.vx *= 0.985; q.life -= q.decay
          if (q.life <= 0) { P.splice(i, 1); continue }
          g.globalAlpha = Math.max(0, q.life); g.fillStyle = q.color
          g.beginPath(); g.arc(q.x | 0, q.y | 0, q.size, 0, 6.283); g.fill()
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size) }
  }, [])

  /* SHOOT a falling letter */
  const onShoot = (item) => {
    if (ctx.phase !== Phase.PLAY) return
    const good = item.key === ctx.target
    recordAnswer(ctx.target, item.key, 'catch')
    dispatch({ type: CatchEvent.SHOOT, payload: { id: item.id } })
    if (good) {
      playEffect('good', soundOn); playForm(formOf(item.key), soundOn)
      shootFireworkTo(item.x, item.y, ctx.combo + 1)
      if (!reduce) anbessaCtl.start({ y: [0, -9, 0], scale: [1, 1.12, 1] }, { duration: 0.3, ease: 'easeOut' })
    } else {
      // A wrong shot re-plays the CALLED letter so the miss is a listen-again
      // teaching moment, not just a buzzer - now with a little shake.
      playEffect('bad', soundOn); setTimeout(() => playForm(targetForm, soundOn), 420)
      if (!reduce) {
        fieldCtl.start({ x: [0, -9, 8, -6, 4, 0] }, { duration: 0.34 })
        anbessaCtl.start({ y: [0, 5, 0] }, { duration: 0.24 })
      }
    }
  }

  /* announce the called letter (sound only) */
  useEffect(() => { if (ctx.phase === Phase.PLAY) playForm(targetForm, soundOn) }, [ctx.target]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ctx.phase === Phase.WIN) { playEffect('win', soundOn); const id = setTimeout(() => onExit({ won: true }), 1700); return () => clearTimeout(id) } }, [ctx.phase]) // eslint-disable-line react-hooks/exhaustive-deps
  /* streak celebration: pop "xN!" at each combo milestone */
  useEffect(() => {
    if (ctx.combo < 3) return undefined
    setComboPop(ctx.combo)
    const id = setTimeout(() => setComboPop(null), 850)
    return () => clearTimeout(id)
  }, [ctx.combo])

  if (ctx.phase === Phase.LOSE) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-6 text-center" style={{ background: 'linear-gradient(180deg,#171334,#3a2352)', color: '#fdf4e2' }}>
        <JibbySvg size={120} />
        <h2 className="text-2xl font-black">{t('catchLose', 'Out of hearts!')}</h2>
        <p className="font-bold" style={{ color: '#c9bfe6' }}>{t('caughtCount', `Shot ${ctx.caught}`, { n: ctx.caught })}</p>
        <div className="flex gap-3">
          <button type="button" onClick={() => dispatch({ type: '__reset__' })} className={`chunk rounded-2xl px-5 py-3 font-black text-white ${FOCUS}`} style={{ background: '#ff8a3d', boxShadow: '0 4px 0 #b5561f', '--chunk-depth': '4px' }}>
            {t('runAgain', 'Run again')}
          </button>
          <button type="button" onClick={() => onExit({ won: false })} className={`chunk rounded-2xl px-5 py-3 font-black ${FOCUS}`} style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,210,90,0.4)', color: '#fdf4e2' }}>
            {t('home', 'Home')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col" style={{ background: 'linear-gradient(180deg,#171334 0%,#241a49 55%,#3a2352 100%)', color: '#fdf4e2' }}>
      <header className="flex items-center gap-2 px-4 pt-3">
        <button type="button" onClick={() => onExit({ won: false })} aria-label={t('quit', 'Quit')} className={`flex h-10 w-10 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: '#c9bfe6', outlineColor: '#ffd25a' }}>
          <X className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-1" aria-label={t('lives', 'Lives')}>
          {Array.from({ length: ctx.cfg.lives }, (_, i) => (
            <Heart key={i} className="h-5 w-5" style={{ color: i < ctx.lives ? '#ff5d73' : 'rgba(253,244,226,0.2)' }} fill={i < ctx.lives ? '#ff5d73' : 'none'} aria-hidden="true" />
          ))}
        </div>
        <div className="flex flex-1 items-center justify-end gap-1.5" role="progressbar" aria-valuenow={ctx.caught} aria-valuemax={ctx.need}>
          <Star className="h-4 w-4" style={{ color: '#ffd25a' }} fill="#ffd25a" aria-hidden="true" />
          <span className="mono text-sm font-black" style={{ color: '#ffe6a6' }}>{ctx.caught}/{ctx.need}</span>
          {ctx.combo >= 2 && <span className="ml-1 rounded-full px-2 py-0.5 text-xs font-black" style={{ background: '#ff8a3d', color: '#2a1204' }}>x{ctx.combo}</span>}
        </div>
      </header>

      {/* sound-only prompt: tap the ear to hear the called letter again */}
      <div className="flex items-center justify-center gap-2 px-6 pt-2 pb-1">
        <KokebSvg size={34} />
        <p className="text-sm font-black" style={{ color: '#ffe6a6' }}>{t('catchPrompt', 'Listen, then shoot it!')}</p>
        <motion.button key={ctx.target} initial={{ scale: 0.85 }} animate={{ scale: 1 }} type="button" onClick={() => playForm(targetForm, soundOn)} aria-label={t('hearAgain', 'Hear it again')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 ${FOCUS}`} style={{ background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,210,90,0.5)', outlineColor: '#ffd25a' }}>
          {revealTarget && <span className="geez text-2xl font-black" style={{ color: '#fff' }}>{targetForm?.char}</span>}
          <Volume2 className="h-6 w-6" style={{ color: '#ffd25a' }} aria-hidden="true" />
          <span className="text-sm font-black" style={{ color: '#ffe6a6' }}>{t('lcListen', 'Listen')}</span>
        </motion.button>
      </div>

      {/* play field */}
      <motion.div ref={areaRef} animate={fieldCtl} data-catch-target={ctx.target} data-catch-phase={ctx.phase} className="relative flex-1 overflow-hidden" style={{ touchAction: 'manipulation' }}>
        <SkyScape reduce={reduce} />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" aria-hidden="true" />
        {/* falling letters - tap to shoot */}
        {ctx.items.map((it) => {
          const f = formOf(it.key)
          return (
            <motion.button key={it.id} type="button" data-fam={it.key} onClick={() => onShoot(it)} whileTap={{ scale: 0.86 }}
              aria-label={`${t('lcShoot', 'Shoot')} ${f?.sound}`}
              className={`geez absolute flex h-14 w-14 items-center justify-center rounded-2xl text-3xl font-black ${FOCUS}`}
              style={{ left: `${it.x * 100}%`, top: `${it.y * 100}%`, transform: 'translate(-50%,-50%)', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,210,90,0.4)', color: '#fff', boxShadow: '0 3px 10px rgba(0,0,0,0.35)', outlineColor: '#ffd25a' }}>
              {f?.char}
            </motion.button>
          )
        })}
        {/* shot feedback */}
        <AnimatePresence>
          {ctx.flash && (
            <motion.div key={`${ctx.caught}-${ctx.lives}`} initial={{ scale: 0.6, opacity: 1 }} animate={{ scale: ctx.flash.type === 'good' ? 1.6 : 1, opacity: 0, x: ctx.flash.type === 'bad' ? [0, -6, 6, 0] : 0 }} transition={{ duration: 0.5 }}
              className="pointer-events-none absolute" style={{ left: `${ctx.flash.x * 100}%`, top: `${ctx.flash.y * 100}%`, transform: 'translate(-50%,-50%)' }}>
              <span className="geez text-4xl font-black" style={{ color: ctx.flash.type === 'good' ? '#8affc1' : '#ff5d73' }}>{formOf(ctx.flash.key)?.char}</span>
            </motion.div>
          )}
        </AnimatePresence>
        {/* combo pop */}
        <AnimatePresence>
          {comboPop && (
            <motion.div key={comboPop} initial={{ scale: 0.4, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 1.5 }} transition={{ type: 'spring', stiffness: 420, damping: 15 }}
              className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 text-center">
              <span className="text-4xl font-black" style={{ color: '#ffd25a', textShadow: '0 2px 16px rgba(255,150,60,0.85)' }}>x{comboPop}!</span>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Anbessa the launcher, at the bottom (recoils when firing) */}
        <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2">
          <motion.div animate={anbessaCtl}>
            <AnbessaSvg size={84} mood={ctx.flash?.type === 'bad' ? 'sad' : 'happy'} pose={ctx.phase === Phase.WIN ? 'cheer' : 'stand'} />
          </motion.div>
        </div>
        {/* win banner */}
        <AnimatePresence>
          {ctx.phase === Phase.WIN && (
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <AnbessaSvg size={130} mood="happy" pose="cheer" />
              <h2 className="text-3xl font-black" style={{ color: '#ffd25a', textShadow: '0 2px 16px rgba(255,150,60,0.7)' }}>{t('catchWin', 'Great shooting!')}</h2>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <p className="px-4 pb-5 pt-2 text-center text-sm font-black" style={{ color: '#c9bfe6' }}>
        {t('lcTapHint', 'Tap the letter you hear')}
      </p>
    </div>
  )
}

/* A living night sky (no game logic): a glowing moon, soft nebula haze, layered
   twinkling stars, two slow shooting stars, and a horizon glow that grounds
   Anbessa. Deterministic positions (stable across renders); all motion is
   dropped when the player prefers reduced motion. */
const SKY_CSS = `
@keyframes lc-twk { 0%,100% { opacity: var(--o); } 50% { opacity: calc(var(--o) * 0.3); } }
@keyframes lc-shoot {
  0% { transform: translate(-10%, -10%) rotate(18deg) scaleX(0.2); opacity: 0; }
  6% { opacity: 1; }
  16% { transform: translate(120%, 120%) rotate(18deg) scaleX(1); opacity: 0; }
  100% { opacity: 0; }
}`
function SkyScape({ reduce = false }) {
  const stars = useRef(Array.from({ length: 66 }, (_, i) => ({
    left: `${(i * 71 + 7) % 100}%`, top: `${(i * 37 + 3) % 82}%`,
    s: 1 + (i % 4) * 0.9, o: 0.32 + (i % 5) * 0.13, dur: 2.2 + (i % 5) * 0.6, delay: (i % 7) * 0.5,
  })))
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <style>{SKY_CSS}</style>
      {/* nebula haze */}
      <div className="absolute" style={{ left: '-12%', top: '4%', width: '58%', height: '46%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(120,90,220,0.30), rgba(120,90,220,0) 68%)', filter: 'blur(8px)' }} />
      <div className="absolute" style={{ right: '-16%', top: '30%', width: '62%', height: '52%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(60,120,220,0.22), rgba(60,120,220,0) 70%)', filter: 'blur(10px)' }} />
      {/* moon */}
      <div className="absolute" style={{ right: '11%', top: '7%', width: 58, height: 58, borderRadius: '50%', background: 'radial-gradient(circle at 36% 32%, #fff7e0, #f3d998 62%, #e6c273)', boxShadow: '0 0 34px 10px rgba(255,230,160,0.4), 0 0 90px 30px rgba(255,220,150,0.16)' }}>
        <span className="absolute rounded-full" style={{ left: 14, top: 12, width: 10, height: 10, background: 'rgba(198,160,90,0.35)' }} />
        <span className="absolute rounded-full" style={{ left: 30, top: 30, width: 14, height: 14, background: 'rgba(198,160,90,0.28)' }} />
        <span className="absolute rounded-full" style={{ left: 20, top: 38, width: 6, height: 6, background: 'rgba(198,160,90,0.3)' }} />
      </div>
      {/* stars */}
      {stars.current.map((st, i) => (
        <span key={i} className="absolute rounded-full" style={{
          left: st.left, top: st.top, width: st.s, height: st.s, background: '#fff', '--o': st.o, opacity: st.o,
          boxShadow: st.s > 2.6 ? '0 0 5px 1px rgba(255,255,255,0.7)' : 'none',
          animation: reduce ? 'none' : `lc-twk ${st.dur}s ease-in-out ${st.delay}s infinite`,
        }} />
      ))}
      {/* shooting stars */}
      {!reduce && [0, 1].map((k) => (
        <span key={k} className="absolute" style={{
          left: `${18 + k * 34}%`, top: `${6 + k * 10}%`, width: 90, height: 2, borderRadius: 2,
          background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 90%, #fff 100%)',
          animation: `lc-shoot ${7 + k * 4}s ease-in ${2 + k * 5}s infinite`,
        }} />
      ))}
      {/* horizon glow grounding Anbessa */}
      <div className="absolute inset-x-0 bottom-0" style={{ height: '22%', background: 'radial-gradient(120% 90% at 50% 118%, rgba(120,86,190,0.55), rgba(120,86,190,0) 70%)' }} />
    </div>
  )
}
