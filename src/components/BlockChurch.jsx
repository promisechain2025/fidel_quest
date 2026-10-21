/* ============================================================================
   BLOCK CHURCH (sample) - snap-on vowel blocks
   ----------------------------------------------------------------------------
   Top: a toy-block church, partly built; the roof row is ghost blocks and the
   dome + cross are dotted outlines. Bottom: a wooden tray with the big
   consonant block (ለ) and its glowing slot, plus a row of snap-on form pieces.
   The game says a target form (the existing recorded fidel clip); the child
   drags (or taps) the matching piece onto the slot. Right: the block turns
   into that form, says it, and one block flies into the church. Wrong: the
   piece wobbles and bounces home. Seven right answers finish the dome and
   cross. No English in the kid UI - only letters, sounds and pictures.
   ONE family (ለ) on purpose: this is a sample before any bulk work.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, Volume2, RotateCcw } from 'lucide-react'
import { afterVoice, playForm, playEffect } from '../platform/audioEngine'
import { INDEXES } from '../platform/ethiopic'
import { initRound, snap, target, isComplete, SAMPLE_FAMILY, ORDERS } from '../blockChurchCore'

const PIECE_COLORS = ['#e2453c', '#f08a24', '#f2c230', '#4fb04a', '#2f86d6', '#7a4fc9', '#d94f9a']
const formOf = (family, order) => INDEXES.byAudioKey.get(`${family}-${order}`)

/* --- the church scene --------------------------------------------------- */
const ROOF = ORDERS.map((_, i) => ({ x: 82 + i * 28, y: 112 }))

function Church({ built, complete, reduce }) {
  return (
    <svg viewBox="0 -170 360 420" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="bc-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#5bb6f2" /><stop offset="1" stopColor="#bfe6ff" />
        </linearGradient>
      </defs>
      <rect y="-170" width="360" height="420" fill="url(#bc-sky)" />
      <ellipse cx="120" cy="-60" rx="40" ry="14" fill="#fff" opacity=".9" />
      <ellipse cx="70" cy="45" rx="38" ry="14" fill="#fff" opacity=".9" />
      <ellipse cx="290" cy="60" rx="44" ry="15" fill="#fff" opacity=".9" />
      <ellipse cx="180" cy="262" rx="230" ry="70" fill="#6cc04a" />
      <ellipse cx="180" cy="262" rx="200" ry="55" fill="#80cf58" />
      {/* walls: block rows */}
      {[0, 1, 2, 3].map((r) => ORDERS.map((_, i) => (
        <rect key={`w${r}-${i}`} x={82 + i * 28} y={140 + r * 20} width="27" height="19" rx="3"
          fill={['#2bb3a6', '#26a093', '#2bb3a6', '#26a093'][r]} stroke="#1b7a70" strokeWidth="1" />
      )))}
      <rect x="160" y="176" width="40" height="44" rx="18" fill="#3a2a1e" stroke="#e8a83a" strokeWidth="4" />
      <rect x="100" y="160" width="22" height="26" rx="10" fill="#3a2a1e" stroke="#e8a83a" strokeWidth="3" />
      <rect x="238" y="160" width="22" height="26" rx="10" fill="#3a2a1e" stroke="#e8a83a" strokeWidth="3" />
      {/* roof row: one block per right answer */}
      {ROOF.map((p, i) => (i < built ? (
        <motion.g key={`r${i}`} data-testid="church-block"
          initial={reduce ? false : { y: 120, opacity: 0, scale: 1.6 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 14 }}>
          <rect x={p.x} y={p.y} width="27" height="27" rx="4" fill={PIECE_COLORS[i]} stroke="rgba(0,0,0,.25)" />
          <circle cx={p.x + 8} cy={p.y - 2} r="4" fill={PIECE_COLORS[i]} />
          <circle cx={p.x + 19} cy={p.y - 2} r="4" fill={PIECE_COLORS[i]} />
        </motion.g>
      ) : (
        <rect key={`g${i}`} x={p.x} y={p.y} width="27" height="27" rx="4" fill="rgba(255,255,255,.35)"
          stroke="#fff" strokeWidth="2" strokeDasharray="3 4" />
      )))}
      {/* dome + cross: dotted until complete */}
      {complete ? (
        <motion.g data-testid="dome-done" initial={reduce ? false : { scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ transformOrigin: '180px 110px' }} transition={{ type: 'spring', stiffness: 140, damping: 11 }}>
          <path d="M128 110 A52 52 0 0 1 232 110 Z" fill="#f2c230" stroke="#c4922a" strokeWidth="3" />
          <rect x="174" y="20" width="12" height="40" rx="3" fill="#e8a83a" stroke="#a8701a" strokeWidth="2" />
          <rect x="162" y="30" width="36" height="11" rx="3" fill="#e8a83a" stroke="#a8701a" strokeWidth="2" />
        </motion.g>
      ) : (
        <g data-testid="dome-outline" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round">
          <path d="M128 110 A52 52 0 0 1 232 110" />
          <path d="M180 58 V20 M162 35 H198" />
        </g>
      )}
      {complete && !reduce && [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <motion.circle key={`c${i}`} cx="180" cy="80" r="6" fill={PIECE_COLORS[i % 7]}
          initial={{ opacity: 1 }} animate={{ cx: 180 + Math.cos(i) * 150, cy: 80 + Math.sin(i * 1.7) * 90, opacity: 0 }}
          transition={{ duration: 1.4, repeat: 2, delay: i * 0.05 }} />
      ))}
    </svg>
  )
}

/* --- a draggable snap-on piece ------------------------------------------ */
function Piece({ form, color, wobble, used, onDrop, reduce }) {
  const [drag, setDrag] = useState(null) // { sx, sy, dx, dy }
  const down = (e) => {
    if (used) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ sx: e.clientX, sy: e.clientY, dx: 0, dy: 0 })
  }
  const move = (e) => { if (drag) setDrag({ ...drag, dx: e.clientX - drag.sx, dy: e.clientY - drag.sy }) }
  const up = (e) => {
    if (!drag) return
    const moved = Math.hypot(drag.dx, drag.dy) > 12
    setDrag(null)
    onDrop(moved ? { x: e.clientX, y: e.clientY } : null)
  }
  return (
    <motion.button
      type="button"
      data-testid="piece"
      data-order={form.order}
      aria-label={form.char}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => setDrag(null)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDrop(null) } }}
      className="geez relative flex h-[68px] w-[46px] touch-none select-none items-center justify-center rounded-xl text-3xl font-black text-white"
      style={{
        background: color, opacity: used ? 0.3 : 1, zIndex: drag ? 30 : 1,
        boxShadow: '0 4px 0 rgba(0,0,0,.28), inset 0 2px 0 rgba(255,255,255,.35)',
        x: drag ? drag.dx : 0, y: drag ? drag.dy : 0, cursor: used ? 'default' : 'grab',
      }}
      animate={wobble && !reduce ? { rotate: [0, -14, 12, -8, 5, 0], x: [0, -6, 6, -4, 0] } : { rotate: 0 }}
      transition={{ duration: 0.55 }}
    >
      <span className="absolute -top-2 left-1/2 h-3 w-5 -translate-x-1/2 rounded-full" style={{ background: color, filter: 'brightness(1.1)' }} />
      {form.char}
    </motion.button>
  )
}

export default function BlockChurch({ soundOn = true, onBack, family = SAMPLE_FAMILY, seed }) {
  const reduce = useReducedMotion()
  const seedRef = useRef(seed ?? (Math.floor(Math.random() * 997) + 1))
  const [s, setS] = useState(() => initRound(seedRef.current))
  const [shown, setShown] = useState(null) // order currently shown on the big block
  const [wobbleOrder, setWobbleOrder] = useState(null)
  const slotRef = useRef(null)
  const timers = useRef([])
  const forms = useMemo(() => ORDERS.map((o) => formOf(family, o)).filter(Boolean), [family])
  const base = formOf(family, 1)
  const done = isComplete(s)
  const want = target(s)

  const say = (order) => { const f = formOf(family, order); if (f) playForm(f, soundOn) }
  useEffect(() => {
    const t = setTimeout(() => { if (want) say(want) }, 450)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.built])
  useEffect(() => () => timers.current.forEach((c) => c()), [])

  const overSlot = (pt) => {
    const r = slotRef.current?.getBoundingClientRect()
    if (!r) return false
    const pad = 40 // generous drop zone for small hands
    return pt.x >= r.left - pad && pt.x <= r.right + pad && pt.y >= r.top - pad && pt.y <= r.bottom + pad
  }

  const tryPiece = (order, pt) => {
    if (done) return
    if (pt && !overSlot(pt)) return // dropped elsewhere: it just springs back
    const next = snap(s, order)
    if (next.last === 'wrong') {
      setWobbleOrder(null)
      requestAnimationFrame(() => setWobbleOrder(order))
      playEffect('bad', soundOn)
      setS(next)
      return
    }
    setShown(order)
    say(order)
    timers.current.push(afterVoice(() => {
      playEffect(next.last === 'done' ? 'win' : 'good', soundOn)
      setShown(next.last === 'done' ? order : null)
    }, 300))
    setS(next)
  }

  const restart = () => {
    seedRef.current += 1
    setShown(null)
    setWobbleOrder(null)
    setS(initRound(seedRef.current))
  }

  const usedOrders = new Set(s.queue.slice(0, s.built))
  const blockChar = shown ? formOf(family, shown)?.char : base?.char

  return (
    <div className="mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden" data-testid="block-church" style={{ background: '#8a5a32' }}>
      {/* top: scene + progress */}
      <div className="relative" style={{ flex: '1 1 50%' }}>
        <Church built={s.built} complete={done} reduce={reduce} />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <button type="button" onClick={onBack} aria-label="back" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#c98a3e] text-white shadow-md">
            <ChevronLeft className="h-7 w-7" aria-hidden="true" />
          </button>
          <div className="flex gap-1.5" data-testid="progress">
            {ORDERS.map((_, i) => (
              <span key={i} className="h-3 w-6 rounded-full" style={{ background: i < s.built ? '#5fc24a' : 'rgba(255,255,255,.8)' }} />
            ))}
          </div>
          <div className="w-12" />
        </div>
      </div>
      {/* bottom: wooden tray */}
      <div className="flex flex-col gap-3 rounded-t-3xl p-4" style={{ flex: '0 0 auto', background: 'linear-gradient(#c98f55,#a8703c)', boxShadow: 'inset 0 4px 0 rgba(255,255,255,.2)' }}>
        <div className="flex items-center justify-center py-1">
          <motion.div
            data-testid="big-block"
            key={blockChar}
            initial={reduce ? false : { scale: 0.85 }}
            animate={{ scale: 1 }}
            className="geez relative flex h-[150px] w-[190px] flex-col items-center justify-start rounded-2xl pt-5 text-7xl font-black"
            style={{ background: 'linear-gradient(#f59a3c,#e27a1c)', color: '#5a2e12', boxShadow: '0 8px 0 #a8501a' }}
          >
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="absolute -top-3 h-5 w-9 rounded-full" style={{ left: 14 + i * 42, background: '#f6a84c', boxShadow: '0 3px 0 #c4661a' }} />
            ))}
            <span data-testid="big-glyph">{blockChar}</span>
            <div ref={slotRef} data-testid="slot"
              className={`absolute bottom-4 h-7 w-32 rounded-lg ${done || shown ? '' : 'animate-pulse'}`}
              style={{ background: '#fff6b0', boxShadow: '0 0 18px 6px rgba(255,236,120,.85)' }} />
          </motion.div>
        </div>
        <div className="flex justify-between gap-1 pt-1">
          {forms.map((f, i) => (
            <Piece key={`${f.order}-${seedRef.current}`} form={f} color={PIECE_COLORS[i]} reduce={reduce}
              wobble={wobbleOrder === f.order} used={usedOrders.has(f.order) || done}
              onDrop={(pt) => tryPiece(f.order, pt)} />
          ))}
        </div>
        <div className="flex items-center justify-between pb-2">
          <button type="button" onClick={() => want && say(want)} aria-label="listen" data-testid="listen"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f3e2c0] text-[#2a5aa8] shadow-md">
            <Volume2 className="h-8 w-8" aria-hidden="true" />
          </button>
          <button type="button" onClick={restart} aria-label="again" data-testid="again"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2f86d6] text-white shadow-md">
            <RotateCcw className="h-7 w-7" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
