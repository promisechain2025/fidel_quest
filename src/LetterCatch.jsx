/* ============================================================================
   LETTER CATCH — Anbessa's Harvest (renderer)
   ----------------------------------------------------------------------------
   Letters rain from the sky; slide Anbessa's basket left/right to CATCH the
   letter Kokeb calls and dodge the rest. Fill the basket to win.

   All logic is the pure seeded machine (letterCatchCore.js). This file is the
   shell: a per-frame rAF that feeds TICK dt into the machine, DOM letters +
   a code-drawn Anbessa basket, pointer-follow control, and audio at the seams.
   Fully playable with sound off (the called letter is always shown).
   ========================================================================== */
import { useReducer, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2, Heart, Star } from 'lucide-react'
import { Sprite2D, drawAnbessa, drawKokeb, drawHyena } from './FidelQuestApp'
import { INDEXES } from './platform/ethiopic'
import { playForm, playEffect } from './platform/audioEngine'
import { recordAnswer } from './platform/telemetry'
import { t } from './platform/i18n'
import { initCatch, catchTransition, CATCH_Y, Phase, CatchEvent } from './letterCatchCore'

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
  const targetForm = formOf(ctx.target)
  // Sound-only by design: the child must LISTEN. Only reveal the letter as a
  // fallback when sound is off, so the game stays playable muted.
  const revealTarget = !soundOn

  /* per-frame game clock: feed real dt into the pure machine */
  useEffect(() => {
    let raf, last = performance.now()
    const loop = (now) => {
      const dt = (now - last) / 1000
      last = now
      dispatch({ type: CatchEvent.TICK, payload: { dt } })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  /* a small firework pops at the basket on a correct catch (capped) */
  const burst = () => {
    const el = areaRef.current
    if (!el) return
    const cx = el.clientWidth * ctx.basketX
    const cy = el.clientHeight * CATCH_Y
    const P = partsRef.current
    for (let i = 0; i < 26; i++) {
      const a = (Math.PI * 2 * i) / 26 + Math.random() * 0.3
      const sp = 1.7 * (0.5 + Math.random())
      P.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.1, life: 1, decay: 0.02 + Math.random() * 0.012, color: SPARK[i % SPARK.length], size: 2 + Math.random() * 2 })
    }
    if (P.length > 260) P.splice(0, P.length - 260)
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
        const P = partsRef.current
        for (let i = P.length - 1; i >= 0; i--) {
          const p = P[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.vx *= 0.98; p.life -= p.decay
          if (p.life <= 0) { P.splice(i, 1); continue }
          g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.color
          g.beginPath(); g.arc(p.x | 0, p.y | 0, p.size, 0, 6.283); g.fill()
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size) }
  }, [])

  /* pointer follows the basket */
  const moveTo = (clientX) => {
    const el = areaRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    dispatch({ type: CatchEvent.MOVE, payload: { x: (clientX - r.left) / r.width } })
  }

  /* audio at the seams: announce the called letter, cheer a catch, bonk a miss */
  useEffect(() => { if (ctx.phase === Phase.PLAY) playForm(targetForm, soundOn) }, [ctx.target]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ctx.flash?.type === 'good') { playEffect('good', soundOn); playForm(formOf(ctx.flash.key), soundOn); recordAnswer(ctx.flash.key, ctx.flash.key, 'catch'); burst() }
  }, [ctx.caught]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ctx.flash?.type === 'bad') { playEffect('bad', soundOn); recordAnswer(ctx.target, ctx.flash.key, 'catch') }
  }, [ctx.lives]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ctx.phase === Phase.WIN) { playEffect('win', soundOn); const id = setTimeout(() => onExit({ won: true }), 1700); return () => clearTimeout(id) } }, [ctx.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  if (ctx.phase === Phase.LOSE) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-6 text-center" style={{ background: 'linear-gradient(180deg,#171334,#3a2352)', color: '#fdf4e2' }}>
        <Sprite2D draw={drawHyena} size={120} />
        <h2 className="text-2xl font-black">{t('catchLose', 'Out of hearts!')}</h2>
        <p className="font-bold" style={{ color: '#c9bfe6' }}>{t('caughtCount', `Caught ${ctx.caught}`, { n: ctx.caught })}</p>
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

  const basketPct = ctx.basketX * 100
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
        <div className="flex flex-1 items-center justify-end gap-1.5" role="progressbar" aria-valuenow={ctx.caught} aria-valuemax={ctx.need} aria-label={t('basket', 'Basket')}>
          <Star className="h-4 w-4" style={{ color: '#ffd25a' }} fill="#ffd25a" aria-hidden="true" />
          <span className="mono text-sm font-black" style={{ color: '#ffe6a6' }}>{ctx.caught}/{ctx.need}</span>
          {ctx.combo >= 2 && <span className="ml-1 rounded-full px-2 py-0.5 text-xs font-black" style={{ background: '#ff8a3d', color: '#2a1204' }}>x{ctx.combo}</span>}
        </div>
      </header>

      {/* called-letter prompt - SOUND ONLY: tap the ear to hear it again */}
      <div className="flex items-center justify-center gap-2 px-6 pt-2 pb-1">
        <Sprite2D draw={drawKokeb} size={34} />
        <p className="text-sm font-black" style={{ color: '#ffe6a6' }}>{t('catchPrompt', 'Listen, then catch it!')}</p>
        <motion.button key={ctx.target} initial={{ scale: 0.85 }} animate={{ scale: 1 }} type="button" onClick={() => playForm(targetForm, soundOn)} aria-label={t('hearAgain', 'Hear it again')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 ${FOCUS}`} style={{ background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,210,90,0.5)', outlineColor: '#ffd25a' }}>
          {revealTarget && <span className="geez text-2xl font-black" style={{ color: '#fff' }}>{targetForm?.char}</span>}
          <Volume2 className="h-6 w-6" style={{ color: '#ffd25a' }} aria-hidden="true" />
          <span className="text-sm font-black" style={{ color: '#ffe6a6' }}>{t('lcListen', 'Listen')}</span>
        </motion.button>
      </div>

      {/* play field */}
      <div
        ref={areaRef}
        data-catch-target={ctx.target} data-catch-phase={ctx.phase}
        className="relative flex-1 overflow-hidden"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => { e.preventDefault(); moveTo(e.clientX) }}
        onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch') moveTo(e.clientX) }}
      >
        <StarField />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" aria-hidden="true" />
        {/* falling letters */}
        {ctx.items.map((it) => {
          const f = formOf(it.key)
          return (
            <div key={it.id} className="geez pointer-events-none absolute flex h-14 w-14 items-center justify-center rounded-2xl text-3xl font-black"
              style={{ left: `${it.x * 100}%`, top: `${it.y * 100}%`, transform: 'translate(-50%,-50%)', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,210,90,0.4)', color: '#fff', boxShadow: '0 3px 10px rgba(0,0,0,0.35)' }}>
              {f?.char}
            </div>
          )
        })}
        {/* catch flash */}
        <AnimatePresence>
          {ctx.flash && (
            <motion.div key={`${ctx.caught}-${ctx.lives}`} initial={{ scale: 0.5, opacity: 1, y: 0 }} animate={{ scale: 1.5, opacity: 0, y: ctx.flash.type === 'good' ? -70 : 10 }} transition={{ duration: 0.6 }}
              className="pointer-events-none absolute" style={{ left: `${basketPct}%`, top: `${CATCH_Y * 100}%`, transform: 'translate(-50%,-50%)' }}>
              <span className="geez text-4xl font-black" style={{ color: ctx.flash.type === 'good' ? '#8affc1' : '#ff5d73' }}>{formOf(ctx.flash.key)?.char}</span>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Anbessa + basket, tracking the pointer */}
        <div className="pointer-events-none absolute flex flex-col items-center" style={{ left: `${basketPct}%`, top: `${CATCH_Y * 100}%`, transform: 'translate(-50%,-42%)' }}>
          <Sprite2D draw={drawAnbessa} size={72} mood={ctx.flash?.type === 'bad' ? 'sad' : 'happy'} />
          <div style={{ marginTop: -10, width: 74, height: 30, background: 'linear-gradient(#c98a3f,#8a5a24)', borderRadius: '0 0 40px 40px / 0 0 34px 34px', border: '3px solid #e2c069', borderTop: 'none', boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.25)' }} aria-hidden="true" />
        </div>
        {/* win banner */}
        <AnimatePresence>
          {ctx.phase === Phase.WIN && (
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <Sprite2D draw={drawAnbessa} size={130} mood="happy" pose="cheer" />
              <h2 className="text-3xl font-black" style={{ color: '#ffd25a', textShadow: '0 2px 16px rgba(255,150,60,0.7)' }}>{t('catchWin', 'Basket full!')}</h2>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="px-4 pb-5 pt-2 text-center text-sm font-black" style={{ color: '#c9bfe6' }}>
        {t('lcSlide', 'Slide to move the basket')}
      </p>
    </div>
  )
}

/* Cheap static star field for the night sky (no logic). */
function StarField() {
  const stars = useRef(Array.from({ length: 42 }, (_, i) => ({ left: `${(i * 97) % 100}%`, top: `${(i * 41) % 70}%`, s: 1 + (i % 3), o: 0.3 + (i % 5) * 0.12 })))
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {stars.current.map((st, i) => <span key={i} className="absolute rounded-full" style={{ left: st.left, top: st.top, width: st.s, height: st.s, background: '#fff', opacity: st.o }} />)}
    </div>
  )
}
