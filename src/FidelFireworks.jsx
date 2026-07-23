/* ============================================================================
   FIDEL FIREWORKS — Anbessa's Sky Festival (renderer)
   ----------------------------------------------------------------------------
   The arcade-gateway game. Pick the consonant FAMILY (a firework shell), then
   CHARGE the mortar up the vowel-ORDER ladder and LAUNCH — every perfect launch
   bursts into a giant firework that draws the letter in sparks. Fill Kokeb's
   Sky Meter for the Grand Finale.

   All logic lives in the pure seeded machine (fireworksCore.js). This file is
   the shell: DOM + code-drawn characters (Sprite2D) + a capped 2D-canvas
   particle layer for the bursts. No three.js. Fully playable with sound OFF
   (tap a ladder rung — no timing needed).
   ========================================================================== */
import { useReducer, useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2, Star } from 'lucide-react'
import { Sprite2D, drawAnbessa, drawKokeb, drawHyena, drawZebra } from './FidelQuestApp'
import { FIDEL_FAMILIES, INDEXES } from './platform/ethiopic'
import { playForm, playEffect } from './platform/audioEngine'
import { t } from './platform/i18n'
import {
  initFireworks, fireworksTransition, ladderOrders, isMastered,
  Phase, FwEvent, MS_PER_RUNG, JIBBY_THRESHOLD,
} from './fireworksCore'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const formOf = (k) => INDEXES.byAudioKey.get(k)
const famById = new Map(FIDEL_FAMILIES.map((f) => [f.id, f]))
const SPARK_COLORS = ['#ffd25a', '#ff8a3d', '#ff5d73', '#7db8ff', '#8affc1', '#ffffff']
const reseed = (s) => ((s * 1103515245 + 12345) & 0x7fffffff) | 1

const reducer = (ctx, e) =>
  e.type === '__reset__' ? initFireworks(ctx.level, reseed(ctx.seed)) : fireworksTransition(ctx, e).next

export default function FidelFireworks({ level = 'island1', seed = 1, soundOn = true, onExit }) {
  const [ctx, dispatch] = useReducer(reducer, { level, seed }, (a) => initFireworks(a.level, a.seed))
  const cfg = ctx.cfg
  const orders = ladderOrders(cfg)
  const [climb, setClimb] = useState(-1) // highlighted rung during a hold
  const [replayTick, setReplayTick] = useState(0)

  const skyRef = useRef(null)
  const canvasRef = useRef(null)
  const partsRef = useRef([])
  const holdRef = useRef(null) // { start, rung } while pressing the ladder
  const finaleRef = useRef(null) // scheduled finale bursts
  const rocketRef = useRef(null) // { x, y, tx, ty, born, perfect } a shell in flight

  /* ── canvas particle layer ───────────────────────────────────────────── */
  const sizeCanvas = useCallback(() => {
    const c = canvasRef.current, box = skyRef.current
    if (!c || !box) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = Math.round(box.clientWidth * dpr)
    c.height = Math.round(box.clientHeight * dpr)
    c.style.width = `${box.clientWidth}px`
    c.style.height = `${box.clientHeight}px`
    const g = c.getContext('2d')
    if (g) g.setTransform(dpr, 0, 0, dpr, 0, 0)
  }, [])

  const burst = useCallback((perfect, atX, atY) => {
    const box = skyRef.current
    if (!box) return
    const cx = atX ?? box.clientWidth / 2
    const cy = atY ?? box.clientHeight * 0.34
    const n = perfect ? 74 : 22
    const parts = partsRef.current
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.3
      const sp = (perfect ? 2.4 : 1.3) * (0.5 + Math.random() * 1.1)
      parts.push({
        x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (perfect ? 0.6 : 0.2),
        life: 1, decay: 0.012 + Math.random() * 0.01,
        color: perfect ? SPARK_COLORS[i % SPARK_COLORS.length] : '#c9a15a',
        size: perfect ? 2 + Math.random() * 2.5 : 1.5 + Math.random() * 1.5,
      })
    }
    if (parts.length > 420) parts.splice(0, parts.length - 420) // hard cap for low-end phones
  }, [])

  useEffect(() => {
    sizeCanvas()
    window.addEventListener('resize', sizeCanvas)
    let raf
    const tick = () => {
      const c = canvasRef.current
      const g = c?.getContext('2d')
      if (g && c) {
        const w = c.clientWidth, h = c.clientHeight
        g.clearRect(0, 0, w, h)
        g.globalCompositeOperation = 'lighter'
        const parts = partsRef.current
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i]
          p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.vx *= 0.985; p.life -= p.decay
          if (p.life <= 0) { parts.splice(i, 1); continue }
          g.globalAlpha = Math.max(0, p.life)
          g.fillStyle = p.color
          g.beginPath(); g.arc(p.x | 0, p.y | 0, p.size, 0, 6.283); g.fill()
        }
        // a shell in flight: a bright trailing streak that bursts at its apex
        const rk = rocketRef.current
        if (rk) {
          const p = Math.min(1, (performance.now() - rk.born) / 360)
          const x = rk.x + (rk.tx - rk.x) * p
          const y = rk.y + (rk.ty - rk.y) * p
          g.globalCompositeOperation = 'lighter'
          g.globalAlpha = 1; g.fillStyle = '#ffe9a6'
          g.beginPath(); g.arc(x | 0, y | 0, 3.5, 0, 6.283); g.fill()
          g.globalAlpha = 0.5; g.fillStyle = '#ff9a4d'
          g.beginPath(); g.arc(x | 0, (y + 8) | 0, 2.4, 0, 6.283); g.fill()
          if (p >= 1) { burst(rk.perfect, rk.tx, rk.ty); rocketRef.current = null }
        }
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'
      }
      // charge highlight while holding the ladder
      if (holdRef.current) {
        const idx = Math.max(0, Math.min(orders.length - 1, Math.floor((performance.now() - holdRef.current.start) / MS_PER_RUNG)))
        setClimb((c0) => (c0 === idx ? c0 : idx))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', sizeCanvas); if (finaleRef.current) clearInterval(finaleRef.current) }
  }, [sizeCanvas, orders.length, burst])

  /* ── phase orchestration (timers + sound live at the shell seams) ─────── */
  // Reveal the rack + speak the wish.
  useEffect(() => {
    if (ctx.phase !== Phase.WISH) return undefined
    const target = formOf(`${ctx.wish.familyId}-${ctx.wish.order}`)
    const a = setTimeout(() => dispatch({ type: FwEvent.WISH_SHOWN }), 260)
    const b = setTimeout(() => playForm(target, soundOn), 480)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [ctx.phase, ctx.cursor, soundOn, ctx.wish])

  // Resolve a launch: fireworks + sound, then advance.
  useEffect(() => {
    if (ctx.phase !== Phase.RESOLVING || !ctx.lastResult) return undefined
    const { perfect, madeKey } = ctx.lastResult
    // Fire the shell up from the mortar; it bursts at the apex (rAF loop).
    const box = skyRef.current
    if (box) rocketRef.current = { x: box.clientWidth / 2, y: box.clientHeight - 96, tx: box.clientWidth / 2, ty: box.clientHeight * 0.32, born: performance.now(), perfect }
    else burst(perfect)
    playForm(formOf(madeKey), soundOn)
    playEffect(perfect ? 'good' : 'bad', soundOn)
    const done = setTimeout(() => dispatch({ type: FwEvent.BLOOM_DONE }), perfect ? 1450 : 1150)
    return () => clearTimeout(done)
  }, [ctx.phase, soundOn]) // eslint-disable-line react-hooks/exhaustive-deps

  // Grand finale: a barrage, then complete the node.
  useEffect(() => {
    if (ctx.phase !== Phase.FINALE) return undefined
    playEffect('win', soundOn)
    let n = 0
    finaleRef.current = setInterval(() => {
      const box = skyRef.current
      burst(true, box ? box.clientWidth * (0.2 + Math.random() * 0.6) : undefined, box ? box.clientHeight * (0.15 + Math.random() * 0.4) : undefined)
      if (++n > 8 && finaleRef.current) { clearInterval(finaleRef.current); finaleRef.current = null }
    }, 240)
    const end = setTimeout(() => dispatch({ type: FwEvent.FINALE_DONE }), 2600)
    return () => { clearTimeout(end); if (finaleRef.current) { clearInterval(finaleRef.current); finaleRef.current = null } }
  }, [ctx.phase, soundOn, burst])

  // Node complete.
  useEffect(() => {
    if (ctx.phase === Phase.DONE) onExit({ won: ctx.skyMeter >= cfg.targetCount })
  }, [ctx.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Jibby's mud accrues only while the child is choosing; tap to shoo.
  useEffect(() => {
    if (ctx.phase !== Phase.SELECT_SHELL && ctx.phase !== Phase.CHARGING) return undefined
    const id = setInterval(() => dispatch({ type: FwEvent.TICK, payload: { ms: 700 } }), 700)
    return () => clearInterval(id)
  }, [ctx.phase])

  /* ── input ───────────────────────────────────────────────────────────── */
  const selectShell = (familyId) => { if (ctx.phase === Phase.SELECT_SHELL) dispatch({ type: FwEvent.SELECT_SHELL, payload: { familyId } }) }
  const launchAt = (rung) => { holdRef.current = null; setClimb(-1); dispatch({ type: FwEvent.RELEASE, payload: { rung } }) }
  const holdStart = (rung) => { holdRef.current = { start: performance.now(), rung }; setClimb(rung) }
  const holdEnd = () => {
    const h = holdRef.current
    holdRef.current = null
    if (!h || ctx.phase !== Phase.CHARGING) { setClimb(-1); return }
    const dt = performance.now() - h.start
    setClimb(-1)
    if (dt < 220) dispatch({ type: FwEvent.RELEASE, payload: { rung: h.rung } })       // quick tap = that rung
    else dispatch({ type: FwEvent.RELEASE, payload: { elapsedMs: dt } })                 // hold = charge
  }
  const shooJibby = () => dispatch({ type: FwEvent.SHOO_JIBBY })
  const replayWish = () => { setReplayTick((n) => n + 1); playForm(formOf(`${ctx.wish.familyId}-${ctx.wish.order}`), soundOn) }

  /* ── derived view state ──────────────────────────────────────────────── */
  const targetForm = formOf(`${ctx.wish.familyId}-${ctx.wish.order}`)
  const mysteryHidden = ctx.wish.flavor === 'mystery' && soundOn // hide the glyph; the sound IS the clue
  const jibbyOut = ctx.jibbyMud > JIBBY_THRESHOLD * 0.45
  const anbessaMood = ctx.phase === Phase.RESOLVING ? (ctx.lastResult?.perfect ? 'happy' : 'worried') : 'happy'

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col" style={{ background: 'linear-gradient(180deg,#171334 0%,#241a49 55%,#3a2352 100%)', color: '#fdf4e2' }}>
      {/* header: quit + place + sky meter */}
      <header className="flex items-center gap-2 px-4 pt-3">
        <button type="button" onClick={() => onExit({ won: false })} aria-label={t('quit', 'Quit')} className={`flex h-10 w-10 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: '#c9bfe6', outlineColor: '#ffd25a' }}>
          <X className="h-6 w-6" />
        </button>
        <div className="flex flex-1 items-center justify-center gap-1.5" role="progressbar" aria-valuenow={ctx.skyMeter} aria-valuemax={cfg.targetCount} aria-label={t('skyMeter', 'Sky meter')}>
          {Array.from({ length: cfg.targetCount }, (_, i) => (
            <Star key={i} className="h-4 w-4" style={{ color: i < ctx.skyMeter ? '#ffd25a' : 'rgba(253,244,226,0.22)' }} fill={i < ctx.skyMeter ? '#ffd25a' : 'none'} aria-hidden="true" />
          ))}
        </div>
        {ctx.combo >= 2 && (
          <span className="rounded-full px-2 py-0.5 text-xs font-black" style={{ background: '#ff8a3d', color: '#2a1204' }}>x{ctx.combo}</span>
        )}
      </header>

      {/* sky stage */}
      <div ref={skyRef} className="relative mt-2 flex-1 overflow-hidden" onPointerDown={jibbyOut ? shooJibby : undefined}
        data-fw-target-family={ctx.wish.familyId} data-fw-target-order={ctx.wish.order} data-fw-phase={ctx.phase}>
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" aria-hidden="true" />
        <StarField />
        {/* silhouetted festival hillside */}
        <svg className="pointer-events-none absolute inset-x-0 bottom-0" viewBox="0 0 100 24" preserveAspectRatio="none" style={{ height: '22%' }} aria-hidden="true">
          <path d="M0 24 L0 12 Q18 4 34 10 Q52 17 68 8 Q84 1 100 9 L100 24 Z" fill="#120c28" opacity="0.9" />
          <path d="M0 24 L0 17 Q26 11 50 15 Q74 19 100 14 L100 24 Z" fill="#0c081d" />
        </svg>
        {/* Kokeb wishing + the wish banner */}
        <div className="absolute inset-x-0 top-3 flex flex-col items-center gap-2 px-6 text-center">
          <div className="flex items-center gap-2">
            <Sprite2D draw={drawKokeb} size={40 + Math.min(28, ctx.skyMeter * 3)} />
            <p className="text-sm font-black" style={{ color: '#ffe6a6' }}>
              {mysteryHidden ? t('fwWishListen', 'Listen — which letter?') : t('fwWishFor', 'Launch this letter!')}
            </p>
          </div>
          <button type="button" onClick={replayWish} aria-label={t('hearAgain', 'Hear it again')}
            className={`flex items-center gap-3 rounded-3xl px-6 py-3 ${FOCUS}`}
            style={{ background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,210,90,0.5)', outlineColor: '#ffd25a' }}>
            <motion.span key={`${ctx.cursor}-${replayTick}`} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="geez text-6xl font-black" style={{ color: '#fff', textShadow: '0 2px 12px rgba(255,180,80,0.6)' }}>
              {mysteryHidden ? '?' : targetForm?.char}
            </motion.span>
            <Volume2 className="h-6 w-6" style={{ color: '#ffd25a' }} aria-hidden="true" />
          </button>
        </div>

        {/* ladder of vowel-order rungs (during charging) */}
        <AnimatePresence>
          {ctx.phase === Phase.CHARGING && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="absolute right-3 top-1/2 flex -translate-y-1/2 flex-col-reverse gap-2" style={{ touchAction: 'none' }}>
              {orders.map((ord, i) => {
                const form = formOf(`${ctx.mortarShell}-${ord}`)
                const hot = climb === i
                const faded = isMastered(ctx, ctx.mortarShell)
                return (
                  <button key={ord} type="button" data-fw-order={ord}
                    onPointerDown={(e) => { e.preventDefault(); holdStart(i) }}
                    onPointerUp={(e) => { e.preventDefault(); holdEnd() }}
                    onPointerLeave={() => { if (holdRef.current) holdEnd() }}
                    aria-label={`${t('order', 'Order')} ${ord}: ${form?.sound}`}
                    className={`geez relative flex h-14 w-16 items-center justify-center rounded-2xl border-2 text-3xl font-black ${FOCUS}`}
                    style={{
                      background: hot ? '#ffd25a' : 'rgba(255,255,255,0.1)',
                      color: hot ? '#2a1204' : '#fff',
                      borderColor: hot ? '#fff' : 'rgba(255,210,90,0.45)',
                      boxShadow: hot ? '0 0 20px rgba(255,210,90,0.8)' : 'none',
                      outlineColor: '#ffd25a', touchAction: 'none',
                    }}>
                    {faded && !hot ? '' : form?.char}
                    <span className="mono absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black" style={{ background: '#3a2352', color: '#ffd25a', border: '1px solid rgba(255,210,90,0.5)' }}>{ord}</span>
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Anbessa + mortar (bottom) */}
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 flex-col items-center">
          <AnimatePresence>
            {ctx.mortarShell && ctx.phase === Phase.CHARGING && (
              <motion.div initial={{ y: 8, scale: 0.7, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                className="geez mb-1 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-black" style={{ background: '#ff8a3d', color: '#fff', boxShadow: '0 0 16px rgba(255,138,61,0.7)' }}>
                {famById.get(ctx.mortarShell) ? Array.from(famById.get(ctx.mortarShell).chars)[0] : ''}
              </motion.div>
            )}
          </AnimatePresence>
          <Sprite2D draw={drawAnbessa} mood={anbessaMood} size={96} />
          {/* bonfire glow */}
          <div className="mt-[-8px] h-3 w-40 rounded-full" style={{ background: 'radial-gradient(ellipse at center, rgba(255,150,60,0.8), rgba(255,90,40,0) 70%)' }} aria-hidden="true" />
        </div>

        {/* zebra friends cheering on a big combo */}
        <AnimatePresence>
          {ctx.combo >= 3 && (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-2 left-3">
              <Sprite2D draw={drawZebra} size={54} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Jibby lobbing mud - tap to shoo */}
        <AnimatePresence>
          {jibbyOut && ctx.phase !== Phase.FINALE && (
            <motion.button type="button" onClick={shooJibby} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
              aria-label={t('shooJibby', 'Shoo Jibby')} className="absolute bottom-16 right-2">
              <Sprite2D draw={drawHyena} size={64} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* finale banner */}
        <AnimatePresence>
          {ctx.phase === Phase.FINALE && (
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <Sprite2D draw={drawAnbessa} size={130} mood="happy" pose="cheer" />
              <h2 className="text-3xl font-black" style={{ color: '#ffd25a', textShadow: '0 2px 16px rgba(255,150,60,0.7)' }}>{t('fwFinale', 'Grand Finale!')}</h2>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* control tray: shells (select) or the charge hint */}
      <div className="min-h-[104px] px-4 pb-5 pt-2">
        {ctx.phase === Phase.SELECT_SHELL ? (
          <>
            <p className="mb-2 text-center text-sm font-black" style={{ color: '#c9bfe6' }}>{t('fwPickShell', 'Pick the matching firework')}</p>
            <div className="flex justify-center gap-3">
              {ctx.rack.map((fid) => {
                const fam = famById.get(fid)
                const base = fam ? Array.from(fam.chars)[0] : ''
                const cue = level === 'finale' && fam?.twinOf ? fam.word?.picture : null
                return (
                  <motion.button key={fid} type="button" data-fw-family={fid} onClick={() => selectShell(fid)} whileTap={{ scale: 0.92 }}
                    aria-label={`${t('fwShell', 'Firework')} ${formOf(`${fid}-1`)?.sound}`}
                    className={`geez relative flex h-20 w-20 items-center justify-center rounded-3xl border-2 text-4xl font-black ${FOCUS}`}
                    style={{ background: 'linear-gradient(160deg,#ff8a3d,#c0563d)', color: '#fff', borderColor: 'rgba(255,210,90,0.7)', boxShadow: '0 5px 0 rgba(0,0,0,0.3)', outlineColor: '#ffd25a' }}>
                    {base}
                    {cue && <span className="absolute -bottom-1.5 -right-1.5 text-lg" aria-hidden="true">{cue}</span>}
                  </motion.button>
                )
              })}
            </div>
          </>
        ) : ctx.phase === Phase.CHARGING ? (
          <p className="pt-4 text-center text-sm font-black" style={{ color: '#c9bfe6' }}>
            {t('fwChargeHint', 'Hold to charge, or tap a rung — release to launch!')}
          </p>
        ) : null}
      </div>
    </div>
  )
}

/* A cheap static star field for the night sky (deterministic-looking, no logic). */
function StarField() {
  const stars = useRef(Array.from({ length: 46 }, (_, i) => ({
    left: `${(i * 97) % 100}%`, top: `${(i * 53) % 62}%`, s: 1 + (i % 3), o: 0.3 + (i % 5) * 0.12,
  })))
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {stars.current.map((st, i) => (
        <span key={i} className="absolute rounded-full" style={{ left: st.left, top: st.top, width: st.s, height: st.s, background: '#fff', opacity: st.o }} />
      ))}
    </div>
  )
}
