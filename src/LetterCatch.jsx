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
import { useReducer, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2, Heart, Star } from 'lucide-react'
import { Sprite2D, drawAnbessa, drawKokeb, drawHyena } from './FidelQuestApp'
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
  const rocketRef = useRef(null) // { x0,y0,tx,ty,born } a spark in flight
  const targetForm = formOf(ctx.target)
  const revealTarget = !soundOn // sound-only; only show the letter when muted

  /* per-frame game clock */
  useEffect(() => {
    let raf, last = performance.now()
    const loop = (now) => { dispatch({ type: CatchEvent.TICK, payload: { dt: (now - last) / 1000 } }); last = now; raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  /* firework layer: a spark rises from Anbessa to the shot letter, then bursts */
  const disperse = (cx, cy) => {
    const P = partsRef.current
    for (let i = 0; i < 60; i++) {
      const a = (Math.PI * 2 * i) / 60 + Math.random() * 0.25
      const sp = 3.2 * (0.35 + Math.random())
      P.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, decay: 0.012 + Math.random() * 0.009, color: SPARK[i % SPARK.length], size: 1.8 + Math.random() * 2.2 })
    }
    if (P.length > 340) P.splice(0, P.length - 340)
  }
  const shootFireworkTo = (nx, ny) => {
    const el = areaRef.current
    if (!el) return
    rocketRef.current = { x0: el.clientWidth * 0.5, y0: el.clientHeight * 0.9, tx: el.clientWidth * nx, ty: el.clientHeight * ny, born: performance.now() }
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
          if (p >= 1) { disperse(rk.tx, rk.ty); rocketRef.current = null }
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
    if (good) { playEffect('good', soundOn); playForm(formOf(item.key), soundOn); shootFireworkTo(item.x, item.y) }
    else { playEffect('bad', soundOn) }
  }

  /* announce the called letter (sound only) */
  useEffect(() => { if (ctx.phase === Phase.PLAY) playForm(targetForm, soundOn) }, [ctx.target]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ctx.phase === Phase.WIN) { playEffect('win', soundOn); const id = setTimeout(() => onExit({ won: true }), 1700); return () => clearTimeout(id) } }, [ctx.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  if (ctx.phase === Phase.LOSE) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-6 text-center" style={{ background: 'linear-gradient(180deg,#171334,#3a2352)', color: '#fdf4e2' }}>
        <Sprite2D draw={drawHyena} size={120} />
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
        <Sprite2D draw={drawKokeb} size={34} />
        <p className="text-sm font-black" style={{ color: '#ffe6a6' }}>{t('catchPrompt', 'Listen, then shoot it!')}</p>
        <motion.button key={ctx.target} initial={{ scale: 0.85 }} animate={{ scale: 1 }} type="button" onClick={() => playForm(targetForm, soundOn)} aria-label={t('hearAgain', 'Hear it again')}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2 ${FOCUS}`} style={{ background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,210,90,0.5)', outlineColor: '#ffd25a' }}>
          {revealTarget && <span className="geez text-2xl font-black" style={{ color: '#fff' }}>{targetForm?.char}</span>}
          <Volume2 className="h-6 w-6" style={{ color: '#ffd25a' }} aria-hidden="true" />
          <span className="text-sm font-black" style={{ color: '#ffe6a6' }}>{t('lcListen', 'Listen')}</span>
        </motion.button>
      </div>

      {/* play field */}
      <div ref={areaRef} data-catch-target={ctx.target} data-catch-phase={ctx.phase} className="relative flex-1 overflow-hidden" style={{ touchAction: 'manipulation' }}>
        <StarField />
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
        {/* Anbessa the launcher, at the bottom */}
        <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2">
          <Sprite2D draw={drawAnbessa} size={84} mood={ctx.flash?.type === 'bad' ? 'sad' : 'happy'} pose={ctx.phase === Phase.WIN ? 'cheer' : 'stand'} />
        </div>
        {/* win banner */}
        <AnimatePresence>
          {ctx.phase === Phase.WIN && (
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <Sprite2D draw={drawAnbessa} size={130} mood="happy" pose="cheer" />
              <h2 className="text-3xl font-black" style={{ color: '#ffd25a', textShadow: '0 2px 16px rgba(255,150,60,0.7)' }}>{t('catchWin', 'Great shooting!')}</h2>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="px-4 pb-5 pt-2 text-center text-sm font-black" style={{ color: '#c9bfe6' }}>
        {t('lcTapHint', 'Tap the letter you hear')}
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
