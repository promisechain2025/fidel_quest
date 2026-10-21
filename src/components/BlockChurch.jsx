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
import { ArrowLeft, Star, Volume2, RotateCcw, Check } from 'lucide-react'
import { Brick, Stud, shade, brickCss, studCss, WOOD, WOOD_DARK } from './blockArt'
import { afterVoice, playForm, playEffect } from '../platform/audioEngine'
import { INDEXES } from '../platform/ethiopic'
import { initRound, snap, target, isComplete, SAMPLE_FAMILY, ORDERS } from '../blockChurchCore'

const PIECE_COLORS = ['#e2453c', '#f08a24', '#f2c230', '#4fb04a', '#2f86d6', '#7a4fc9', '#d94f9a']
const formOf = (family, order) => INDEXES.byAudioKey.get(`${family}-${order}`)

/* --- the church scene (layered SVG toy bricks) ------------------------ */
const COLS = 7, BW = 27, BH = 16, WX = 100
const ROOF = ORDERS.map((_, i) => ({ x: WX + i * BW, y: 206 }))
const TEAL = '#25b3b0'

function Cloud({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="2" cy="6" rx="44" ry="12" fill="#9fc8e8" opacity=".5" />
      <circle cx="-22" cy="0" r="14" fill="#fff" /><circle cx="0" cy="-8" r="19" fill="#fff" />
      <circle cx="22" cy="-2" r="15" fill="#fff" /><rect x="-36" y="-2" width="72" height="12" rx="6" fill="#fff" />
      <circle cx="-6" cy="-14" r="7" fill="#fff" opacity=".9" />
    </g>
  )
}
function Flower({ x, y, c }) {
  return (
    <g>
      <rect x={x - 1} y={y} width="2" height="10" fill="#2e7d32" />
      {[0, 72, 144, 216, 288].map((d) => (
        <circle key={d} cx={x + Math.cos((d * Math.PI) / 180) * 4} cy={y + Math.sin((d * Math.PI) / 180) * 4} r="3.2" fill={c} stroke={shade(c, -0.3)} strokeWidth=".5" />
      ))}
      <circle cx={x} cy={y} r="2.2" fill="#ffd54a" />
    </g>
  )
}

function Church({ built, complete, reduce }) {
  const wallRows = [0, 1, 2, 3, 4]
  return (
    <svg viewBox="0 0 390 470" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="bc-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1f7fe0" /><stop offset=".6" stopColor="#5fb4f4" /><stop offset="1" stopColor="#bfe5ff" />
        </linearGradient>
        <linearGradient id="bc-hill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#8fd25a" /><stop offset="1" stopColor="#4fa83a" />
        </linearGradient>
        <radialGradient id="bc-glow"><stop offset="0" stopColor="#fff7b0" stopOpacity=".9" /><stop offset="1" stopColor="#fff7b0" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="390" height="470" fill="url(#bc-sky)" />
      <Cloud x={70} y={120} s={1.1} /><Cloud x={320} y={95} s={1.3} /><Cloud x={300} y={250} s={0.8} /><Cloud x={60} y={240} s={0.7} />
      {/* distant hills */}
      <path d="M0 300 Q60 255 120 290 T240 285 T390 280 V360 H0Z" fill="#7fb0c8" opacity=".75" />
      <path d="M0 325 Q80 285 160 318 T320 305 T390 315 V380 H0Z" fill="#5aa36a" />
      {[20, 48, 330, 360].map((x, i) => (
        <g key={x}><rect x={x - 2} y={318 - (i % 2) * 6} width="4" height="12" fill="#5d4030" />
          <circle cx={x} cy={312 - (i % 2) * 6} r="10" fill="#2f8a45" /><circle cx={x - 3} cy={308 - (i % 2) * 6} r="4" fill="#4fae5e" /></g>
      ))}
      {/* studded hill */}
      <path d="M-20 470 V352 Q195 318 410 352 V470Z" fill="#3d8f2e" />
      <path d="M-20 362 Q195 326 410 362 L410 400 Q195 372 -20 400Z" fill="url(#bc-hill)" />
      {Array.from({ length: 4 }, (_, r) => Array.from({ length: 16 }, (_, c) => {
        const x = 12 + c * 24 + (r % 2) * 12, y = 352 + r * 11 - Math.max(0, 18 - Math.abs(x - 195) / 9)
        return (x > 92 && x < 298 && y < 352) ? null : <Stud key={`h${r}-${c}`} cx={x} cy={y + 6} r={4.2} color="#6cc444" />
      }))}
      <Brick x={40} y={340} w={22} h={12} color="#9aa3ad" /><Brick x={318} y={346} w={22} h={12} color="#9aa3ad" />
      <Brick x={70} y={372} w={22} h={12} color="#3e9e3a" /><Brick x={300} y={380} w={22} h={12} color="#3e9e3a" />
      <Flower x={30} y={378} c="#8e4fd0" /><Flower x={88} y={360} c="#f2c230" /><Flower x={350} y={372} c="#8e4fd0" />
      <Flower x={276} y={386} c="#f2c230" /><Flower x={150} y={392} c="#8e4fd0" /><Flower x={240} y={398} c="#f2c230" />
      {/* church: walls */}
      <ellipse cx="195" cy="348" rx="110" ry="9" fill="#000" opacity=".2" />
      {wallRows.map((r) => Array.from({ length: COLS }, (_, i) => {
        const edge = i === 0 || i === COLS - 1
        const col = edge ? (r % 2 ? '#f08a24' : '#7a4fc9') : (r % 2 ? shade(TEAL, -0.06) : TEAL)
        return <Brick key={`w${r}-${i}`} x={WX + i * BW} y={262 + r * BH} w={BW} h={BH} color={col} studs={0} shadow={false} />
      }))}
      {/* trim rows */}
      {Array.from({ length: COLS }, (_, i) => <Brick key={`y${i}`} x={WX + i * BW} y={246} w={BW} h={BH} color="#f6c22c" studs={0} shadow={false} />)}
      {Array.from({ length: COLS }, (_, i) => <Brick key={`p${i}`} x={WX + i * BW} y={230} w={BW} h={BH} color={i % 3 === 0 ? '#f08a24' : '#7a4fc9'} studs={2} shadow={false} />)}
      {/* door + windows */}
      <path d="M174 342 V300 A21 21 0 0 1 216 300 V342Z" fill="#f08a24" stroke="#b85a10" strokeWidth="1.2" />
      <path d="M180 342 V302 A15 15 0 0 1 210 302 V342Z" fill="#8a5426" />
      {[186, 194, 202].map((x) => <line key={x} x1={x} y1="292" x2={x} y2="342" stroke="#6a3a18" strokeWidth="1" />)}
      <circle cx="205" cy="322" r="2.2" fill="#f6c22c" />
      <rect x="172" y="342" width="46" height="5" rx="2" fill="#b8bec6" /><rect x="168" y="347" width="54" height="5" rx="2" fill="#9aa3ad" />
      {[124, 242].map((x) => (
        <g key={x}><path d={`M${x} 312 V290 A12 12 0 0 1 ${x + 24} 290 V312Z`} fill="#f6c22c" stroke="#c4922a" />
          <path d={`M${x + 4} 310 V291 A8 8 0 0 1 ${x + 20} 291 V310Z`} fill="#5b2f9a" />
          <line x1={x + 12} y1="283" x2={x + 12} y2="310" stroke="#f6c22c" strokeWidth="1.5" /><line x1={x + 4} y1="298" x2={x + 20} y2="298" stroke="#f6c22c" strokeWidth="1.5" /></g>
      ))}
      <path d="M187 268 l8 -8 l8 8 l-8 8z" fill="#f6c22c" stroke="#c4922a" />
      {/* roof row: one glossy brick per right answer */}
      {ROOF.map((p, i) => (i < built ? (
        <motion.g key={`r${i}`} data-testid="church-block"
          initial={reduce ? false : { y: 160, opacity: 0, scale: 1.4 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          style={{ transformOrigin: `${p.x + 13}px ${p.y + 10}px` }}
          transition={{ type: 'spring', stiffness: 170, damping: 13 }}>
          <Brick x={p.x} y={p.y} w={BW} h={22} color={PIECE_COLORS[i]} studs={2} />
        </motion.g>
      ) : (
        <rect key={`g${i}`} x={p.x + 1} y={p.y + 1} width={BW - 2} height="21" rx="3" fill="rgba(255,255,255,.28)"
          stroke="#fff" strokeWidth="1.6" strokeDasharray="3 3" />
      )))}
      {/* dome + cross: dotted until complete */}
      {complete ? (
        <motion.g data-testid="dome-done" initial={reduce ? false : { scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ transformOrigin: '195px 200px' }} transition={{ type: 'spring', stiffness: 140, damping: 11 }}>
          <circle cx="195" cy="150" r="95" fill="url(#bc-glow)" />
          <path d="M135 204 A60 60 0 0 1 255 204 Z" fill="#f6c22c" stroke="#c4922a" strokeWidth="2" />
          <path d="M150 196 A46 52 0 0 1 195 150" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".5" />
          {[150, 172, 195, 218, 240].map((x) => <Stud key={x} cx={x} cy={200} r={4} color="#f6c22c" />)}
          <rect x="189" y="84" width="12" height="62" rx="3" fill="#f08a24" stroke="#b85a10" />
          <rect x="174" y="98" width="42" height="12" rx="3" fill="#f08a24" stroke="#b85a10" />
          <rect x="191" y="86" width="3" height="58" fill="#fff" opacity=".4" />
        </motion.g>
      ) : (
        <g data-testid="dome-outline" fill="none" stroke="#fff" strokeWidth="3.2" strokeDasharray="0.1 8" strokeLinecap="round">
          <path d="M135 204 A60 60 0 0 1 255 204" />
          <path d="M195 144 V86 M174 104 H216 M189 86 H201 M189 144 V86 M201 144 V86" />
        </g>
      )}
      {complete && !reduce && Array.from({ length: 14 }, (_, i) => (
        <motion.rect key={`c${i}`} x="190" y="150" width="9" height="7" rx="1.5" fill={PIECE_COLORS[i % 7]}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }} animate={{ x: Math.cos(i * 0.9) * 170, y: Math.sin(i * 1.7) * 130 - 20, opacity: 0, rotate: 360 }}
          transition={{ duration: 1.6, repeat: 2, delay: i * 0.04 }} />
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
      className="geez relative mt-2 flex h-[60px] w-[46px] touch-none select-none items-center justify-center rounded-lg text-[28px] font-black text-white"
      style={{
        ...brickCss(color, 5), opacity: used ? 0.35 : 1, zIndex: drag ? 30 : 1,
        textShadow: `0 2px 0 ${shade(color, -0.4)}`,
        x: drag ? drag.dx : 0, y: drag ? drag.dy : 0, scale: drag ? 1.12 : 1, cursor: used ? 'default' : 'grab',
      }}
      animate={wobble && !reduce ? { rotate: [0, -14, 12, -8, 5, 0], x: [0, -6, 6, -4, 0] } : { rotate: 0 }}
      transition={{ duration: 0.55 }}
    >
      <span className="absolute -top-[9px] left-1/2 -translate-x-1/2" style={studCss(color, 18)} />
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

  const hint = () => {
    if (!want) return
    setWobbleOrder(null)
    requestAnimationFrame(() => setWobbleOrder(want))
    say(want)
  }
  const woodBtn = 'flex h-14 w-14 items-center justify-center rounded-full'
  const woodBtnCss = { ...WOOD, border: '3px solid #7a4a20', boxShadow: 'inset 0 3px 0 rgba(255,255,255,.35), 0 4px 0 #5a3414, 0 8px 12px rgba(0,0,0,.3)' }
  const roundBtn = (bg) => ({ background: `radial-gradient(circle at 35% 30%, ${shade(bg, 0.35)}, ${bg} 60%, ${shade(bg, -0.25)})`, border: '3px solid #fff', boxShadow: `0 4px 0 ${shade(bg, -0.45)}, 0 8px 12px rgba(0,0,0,.3)` })

  return (
    <div className="mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden" data-testid="block-church" style={{ ...WOOD_DARK }}>
      {/* top: scene + round wooden buttons + pill progress */}
      <div className="relative min-h-0" style={{ flex: '1 1 auto' }}>
        <Church built={s.built} complete={done} reduce={reduce} />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <button type="button" onClick={onBack} aria-label="back" className={woodBtn} style={woodBtnCss}>
            <ArrowLeft className="h-7 w-7" strokeWidth={3} color="#f6c22c" style={{ filter: 'drop-shadow(0 2px 0 #7a4a20)' }} aria-hidden="true" />
          </button>
          <div className="flex gap-1 rounded-full p-1.5" data-testid="progress" style={{ background: 'rgba(30,60,110,.35)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,.3)' }}>
            {ORDERS.map((_, i) => (
              <span key={i} className="h-4 w-7 rounded-full" style={i < s.built
                ? { background: 'linear-gradient(#9be86a,#43a92e)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,.5), 0 1px 0 #2e7a1e' }
                : { background: 'linear-gradient(#fff,#d8e4ee)', boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.12)' }} />
            ))}
          </div>
          <div className={woodBtn} style={woodBtnCss} aria-hidden="true">
            <Star className="h-7 w-7" fill={done ? '#ffd23a' : '#f6c22c'} color="#c4841c" strokeWidth={2} style={{ filter: done ? 'drop-shadow(0 0 6px #fff59a)' : 'none' }} />
          </div>
        </div>
      </div>
      {/* bottom: wooden tray */}
      <div className="relative mx-2 flex flex-col gap-2 rounded-3xl px-3 pb-3 pt-6" style={{ ...WOOD, flex: '0 0 auto', marginTop: -18, border: '4px solid #8a5426', boxShadow: 'inset 0 4px 0 rgba(255,255,255,.3), inset 0 -6px 10px rgba(0,0,0,.25), 0 -6px 14px rgba(0,0,0,.25)' }}>
        <div className="flex items-center justify-center pb-2 pt-3">
          <motion.div
            data-testid="big-block"
            key={blockChar}
            initial={reduce ? false : { scale: 0.85 }}
            animate={{ scale: 1 }}
            className="geez relative flex h-[150px] w-[200px] flex-col items-center justify-start rounded-2xl pt-3 text-[76px] font-black leading-none"
            style={{ ...brickCss('#f08a24', 9), color: '#5a2a0e', textShadow: '0 2px 0 rgba(255,200,140,.7)' }}
          >
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="absolute -top-[16px]" style={{ left: 18 + i * 44, ...studCss('#f08a24', 32) }} />
            ))}
            <span data-testid="big-glyph" className="mt-2">{blockChar}</span>
            <div ref={slotRef} data-testid="slot"
              className={`absolute bottom-4 h-8 w-36 rounded-xl `}
              style={{ background: 'linear-gradient(#fffbe0,#ffe27a)', border: '3px solid #b85a10', boxShadow: '0 0 20px 8px rgba(255,236,120,.9), inset 0 2px 4px rgba(184,90,16,.4)' }} />
          </motion.div>
        </div>
        <div className="flex justify-between gap-1 rounded-2xl px-1 pb-3 pt-2" style={{ background: 'rgba(90,52,20,.25)', boxShadow: 'inset 0 3px 6px rgba(0,0,0,.3)' }}>
          {forms.map((f, i) => (
            <Piece key={`${f.order}-${seedRef.current}`} form={f} color={PIECE_COLORS[i]} reduce={reduce}
              wobble={wobbleOrder === f.order} used={usedOrders.has(f.order) || done}
              onDrop={(pt) => tryPiece(f.order, pt)} />
          ))}
        </div>
      </div>
      {/* bottom wooden bar */}
      <div className="mx-2 my-2 flex items-center justify-between rounded-full px-3 py-2" style={{ ...WOOD, border: '3px solid #7a4a20', boxShadow: 'inset 0 3px 0 rgba(255,255,255,.3), 0 4px 0 #5a3414' }}>
        <button type="button" onClick={() => want && say(want)} aria-label="listen" data-testid="listen" className={woodBtn} style={{ ...roundBtn('#f6e6c4'), border: '3px solid #c49a5a' }}>
          <Volume2 className="h-8 w-8" color="#1f5fb8" strokeWidth={2.6} aria-hidden="true" />
        </button>
        <div className="flex gap-3">
          <button type="button" onClick={restart} aria-label="again" data-testid="again" className={woodBtn} style={roundBtn('#2f86d6')}>
            <RotateCcw className="h-7 w-7" color="#fff" strokeWidth={3} aria-hidden="true" />
          </button>
          <button type="button" onClick={hint} aria-label="hint" data-testid="hint" className={woodBtn} style={roundBtn('#43b02e')}>
            <Check className="h-8 w-8" color="#fff" strokeWidth={3.5} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
