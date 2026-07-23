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

const reducer = (ctx, e) => (e.type === '__reset__' ? initCatch(ctx.level, reseed(ctx.seed)) : catchTransition(ctx, e).next)

export default function LetterCatch({ level = 'easy', seed = 1, soundOn = true, onExit }) {
  const [ctx, dispatch] = useReducer(reducer, { level, seed }, (a) => initCatch(a.level, a.seed))
  const areaRef = useRef(null)
  const targetForm = formOf(ctx.target)

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
    if (ctx.flash?.type === 'good') { playEffect('good', soundOn); playForm(formOf(ctx.flash.key), soundOn); recordAnswer(ctx.flash.key, ctx.flash.key, 'catch') }
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

      {/* called-letter prompt */}
      <div className="flex items-center justify-center gap-2 px-6 pt-2 pb-1">
        <Sprite2D draw={drawKokeb} size={34} />
        <p className="text-sm font-black" style={{ color: '#ffe6a6' }}>{t('catchPrompt', 'Catch the letter!')}</p>
        <button type="button" onClick={() => playForm(targetForm, soundOn)} aria-label={t('hearAgain', 'Hear it again')}
          className={`flex items-center gap-2 rounded-2xl px-3 py-1.5 ${FOCUS}`} style={{ background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,210,90,0.5)', outlineColor: '#ffd25a' }}>
          <motion.span key={ctx.target} initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="geez text-3xl font-black" style={{ color: '#fff' }}>{targetForm?.char}</motion.span>
          <Volume2 className="h-5 w-5" style={{ color: '#ffd25a' }} aria-hidden="true" />
        </button>
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
            <motion.div key={`${ctx.caught}-${ctx.lives}`} initial={{ scale: 0.5, opacity: 0.9 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 0.5 }}
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
