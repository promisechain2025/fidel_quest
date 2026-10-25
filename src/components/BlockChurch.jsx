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
   cross. Guide text goes through i18n (app-text language, English fallback);
   no Latin transliteration or gloss is ever shown beside the fidel.
   ONE family (ለ) on purpose: this is a sample before any bulk work.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Volume2, RotateCcw, Check, Hand, ThumbsUp, Ear } from 'lucide-react'
import { t } from '../platform/i18n'
import { publicUrl } from '../platform/publicUrl'
import { shade, brickCss, studCss, WOOD, BRICK_COLORS, BrickScreen, GuideSign, useGuideFeedback, brickLabels, WoodTopBar, WoodBottomBar, WoodTray, TrayWell, RoundButton, DragBrick, overRect } from './brickKit'
import { afterVoice, playForm, playEffect } from '../platform/audioEngine'
import { INDEXES } from '../platform/ethiopic'
import { initRound, snap, target, isComplete, SAMPLE_FAMILY, ORDERS } from '../blockChurchCore'

const PIECE_COLORS = BRICK_COLORS
const formOf = (family, order) => INDEXES.byAudioKey.get(`${family}-${order}`)

/* --- the church scene: 3D background art + SVG overlay ------------------
   The art (public/img/games/block-church-3d.webp, no text) is the church on
   its hill. The overlay, in the image's own pixel space, adds the 7 progress
   bricks along the roof ridge and the dome + cross above the peak. */
const SCENE = publicUrl('/img/games/block-church-3d.webp')
const RIDGE = ORDERS.map((_, i) => {
  // the ridge runs left->right across the roof in a gentle 3D curve
  const u = i / (ORDERS.length - 1)
  return { x: 240 + u * 290, y: 350 - Math.sin(u * Math.PI) * 6 }
})
const BRW = 42, BRH = 26, DEP = 12

/** A 3D toy brick: front face, top face, right side and studs (iso-ish). */
function Brick3D({ x, y, color, w = BRW, h = BRH, d = DEP }) {
  const top = shade(color, 0.28), side = shade(color, -0.28), edge = shade(color, -0.45)
  return (
    <g>
      <ellipse cx={x + w / 2 + d / 2} cy={y + h + 3} rx={w * 0.62} ry="5" fill="#000" opacity=".22" />
      <path d={`M${x + w} ${y} l${d} ${-d * 0.6} v${h} l${-d} ${d * 0.6}Z`} fill={side} stroke={edge} strokeWidth=".8" />
      <path d={`M${x} ${y} l${d} ${-d * 0.6} h${w} l${-d} ${d * 0.6}Z`} fill={top} stroke={edge} strokeWidth=".8" />
      <rect x={x} y={y} width={w} height={h} rx="2" fill={color} stroke={edge} strokeWidth=".8" />
      <rect x={x + 2} y={y + 2} width={w - 4} height="4" rx="2" fill="#fff" opacity=".35" />
      {[0.3, 0.75].map((f) => {
        const cx = x + w * f + d * 0.45, cy = y - d * 0.3
        return (
          <g key={f}>
            <rect x={cx - 6} y={cy - 6} width="12" height="5" fill={shade(color, -0.12)} />
            <ellipse cx={cx} cy={cy - 1} rx="6" ry="3" fill={side} />
            <ellipse cx={cx} cy={cy - 6} rx="6" ry="3" fill={shade(color, 0.38)} />
            <ellipse cx={cx - 2} cy={cy - 7} rx="2.2" ry="1" fill="#fff" opacity=".7" />
          </g>
        )
      })}
    </g>
  )
}

const CX = 390, DOME_Y = 342, DOME_R = 92

function Church({ built, complete, reduce }) {
  return (
    <svg viewBox="110 40 548 640" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id="bc-gold" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff3a8" /><stop offset=".35" stopColor="#f8cf38" /><stop offset=".8" stopColor="#d99a16" /><stop offset="1" stopColor="#a86c0c" />
        </radialGradient>
        <linearGradient id="bc-goldbar" x1="0" x2="1"><stop offset="0" stopColor="#ffe27a" /><stop offset=".5" stopColor="#f2b324" /><stop offset="1" stopColor="#b8780e" /></linearGradient>
        <radialGradient id="bc-glow"><stop offset="0" stopColor="#fff7b0" stopOpacity=".95" /><stop offset="1" stopColor="#fff7b0" stopOpacity="0" /></radialGradient>
      </defs>
      <image href={SCENE} x="0" y="0" width="768" height="1024" />
      {/* dome + cross: dotted until complete (drawn behind the ridge bricks) */}
      {complete ? (
        <motion.g data-testid="dome-done" initial={reduce ? false : { scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ transformOrigin: `${CX}px ${DOME_Y}px` }} transition={{ type: 'spring', stiffness: 140, damping: 11 }}>
          <circle cx={CX} cy={DOME_Y - 90} r="200" fill="url(#bc-glow)" />
          {/* drum */}
          <path d={`M${CX - 84} ${DOME_Y + 6} Q${CX} ${DOME_Y + 30} ${CX + 84} ${DOME_Y + 6} V${DOME_Y - 14} Q${CX} ${DOME_Y + 10} ${CX - 84} ${DOME_Y - 14}Z`} fill="#e0a21c" stroke="#9a620a" strokeWidth="2" />
          {/* dome */}
          <path d={`M${CX - DOME_R} ${DOME_Y - 12} A${DOME_R} ${DOME_R * 1.02} 0 0 1 ${CX + DOME_R} ${DOME_Y - 12} Q${CX} ${DOME_Y + 14} ${CX - DOME_R} ${DOME_Y - 12}Z`} fill="url(#bc-gold)" stroke="#9a620a" strokeWidth="2.5" />
          <path d={`M${CX - 66} ${DOME_Y - 34} A74 84 0 0 1 ${CX - 8} ${DOME_Y - 98}`} fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" opacity=".45" />
          {[-80, -40, 0, 40, 80].map((dx) => (
            <path key={dx} d={`M${CX + dx * 1.2} ${DOME_Y - 8} Q${CX + dx * 0.6} ${DOME_Y - 90} ${CX} ${DOME_Y - DOME_R - 10}`} fill="none" stroke="#b87a10" strokeWidth="1.5" opacity=".5" />
          ))}
          <ellipse cx={CX} cy={DOME_Y - DOME_R - 10} rx="12" ry="6" fill="#f8cf38" stroke="#9a620a" />
          {/* 3D cross */}
          <g>
            <path d={`M${CX + 10} ${DOME_Y - 205} l8 -5 v93 l-8 5Z`} fill="#b8780e" />
            <path d={`M${CX + 42} ${DOME_Y - 178} l8 -5 v22 l-8 5Z`} fill="#b8780e" />
            <path d={`M${CX - 10} ${DOME_Y - 205} l8 -5 h20 l-8 5Z`} fill="#ffe892" />
            <path d={`M${CX - 42} ${DOME_Y - 178} l8 -5 h84 l-8 5Z`} fill="#ffe892" />
            <rect x={CX - 10} y={DOME_Y - 205} width="20" height="93" rx="2" fill="url(#bc-goldbar)" stroke="#9a620a" strokeWidth="1.5" />
            <rect x={CX - 42} y={DOME_Y - 178} width="84" height="22" rx="2" fill="url(#bc-goldbar)" stroke="#9a620a" strokeWidth="1.5" />
          </g>
        </motion.g>
      ) : (
        <g data-testid="dome-outline" fill="none" stroke="#fff" strokeWidth="6" strokeDasharray="0.1 15" strokeLinecap="round">
          <path d={`M${CX - DOME_R} ${DOME_Y - 12} A${DOME_R} ${DOME_R * 1.02} 0 0 1 ${CX + DOME_R} ${DOME_Y - 12}`} />
          <path d={`M${CX - 10} ${DOME_Y - 112} V${DOME_Y - 205} H${CX + 10} V${DOME_Y - 112} M${CX - 42} ${DOME_Y - 178} H${CX + 42} V${DOME_Y - 160} H${CX - 42}Z`} />
        </g>
      )}
      {/* roof ridge: one 3D brick per right answer */}
      {RIDGE.map((p, i) => (i < built ? (
        <motion.g key={`r${i}`} data-testid="church-block"
          initial={reduce ? false : { y: 260, opacity: 0, scale: 1.4 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          style={{ transformOrigin: `${p.x + 20}px ${p.y + 12}px` }}
          transition={{ type: 'spring', stiffness: 170, damping: 13 }}>
          <Brick3D x={p.x - BRW / 2} y={p.y} color={PIECE_COLORS[i]} />
        </motion.g>
      ) : (
        <g key={`g${i}`} fill="rgba(255,255,255,.3)" stroke="#fff" strokeWidth="2.5" strokeDasharray="5 5" strokeLinejoin="round">
          <path d={`M${p.x - BRW / 2} ${p.y} l${DEP} ${-DEP * 0.6} h${BRW} l${-DEP} ${DEP * 0.6}Z`} />
          <rect x={p.x - BRW / 2} y={p.y} width={BRW} height={BRH} rx="2" />
          <path d={`M${p.x + BRW / 2} ${p.y} l${DEP} ${-DEP * 0.6} v${BRH} l${-DEP} ${DEP * 0.6}`} />
        </g>
      )))}
      {complete && !reduce && Array.from({ length: 16 }, (_, i) => (
        <motion.rect key={`c${i}`} x={CX - 8} y={DOME_Y - 120} width="16" height="12" rx="3" fill={PIECE_COLORS[i % 7]}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }} animate={{ x: Math.cos(i * 0.9) * 330, y: Math.sin(i * 1.7) * 240 - 30, opacity: 0, rotate: 360 }}
          transition={{ duration: 1.6, repeat: 2, delay: i * 0.04 }} />
      ))}
    </svg>
  )
}

export default function BlockChurch({ soundOn = true, onBack, family = SAMPLE_FAMILY, seed }) {
  const reduce = useReducedMotion()
  const seedRef = useRef(seed ?? (Math.floor(Math.random() * 997) + 1))
  const [s, setS] = useState(() => initRound(seedRef.current))
  const [shown, setShown] = useState(null) // order currently shown on the big block
  const [wobbleOrder, setWobbleOrder] = useState(null)
  const slotRef = useRef(null)
  const [fb, flash, clearFb] = useGuideFeedback()
  const L = brickLabels()
  const timers = useRef([])
  const forms = useMemo(() => ORDERS.map((o) => formOf(family, o)).filter(Boolean), [family])
  const base = formOf(family, 1)
  const done = isComplete(s)
  const want = target(s)

  const say = (order) => { const f = formOf(family, order); if (f) playForm(f, soundOn) }
  useEffect(() => {
    const id = setTimeout(() => { if (want) say(want) }, 450)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.built])
  useEffect(() => () => timers.current.forEach((c) => c()), [])

  const overSlot = (pt) => overRect(slotRef.current, pt, 40) // generous drop zone for small hands

  const tryPiece = (order, pt) => {
    if (done) return
    if (pt && !overSlot(pt)) return // dropped elsewhere: it just springs back
    const next = snap(s, order)
    if (next.last === 'wrong') {
      setWobbleOrder(null)
      requestAnimationFrame(() => setWobbleOrder(order))
      playEffect('bad', soundOn)
      flash('try')
      setS(next)
      return
    }
    flash('ok', next.last === 'done' ? 0 : 1100)
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
    clearFb()
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
  return (
    <BrickScreen testId="block-church">
      {/* top: scene + round wooden buttons + pill progress */}
      <div className="relative min-h-0" style={{ flex: '1 1 auto' }}>
        <Church built={s.built} complete={done} reduce={reduce} />
        <WoodTopBar onBack={onBack} value={s.built} total={ORDERS.length} done={done} />
        <div className="pointer-events-none absolute inset-x-0 top-[62px] z-30 flex justify-center">
          {fb === 'try' ? <GuideSign icon={Ear} tone="try" text={L.retry} />
            : (done || fb === 'ok') ? <GuideSign icon={ThumbsUp} tone="ok" text={L.good} />
              : <GuideSign icon={Hand} text={t('brickChurchGuide', 'Drag the matching block')} />}
        </div>
      </div>
      {/* bottom: wooden tray */}
      <WoodTray>
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
              className="absolute bottom-4 h-8 w-36 rounded-xl"
              style={{ background: 'linear-gradient(#fffbe0,#ffe27a)', border: '3px solid #b85a10', boxShadow: '0 0 20px 8px rgba(255,236,120,.9), inset 0 2px 4px rgba(184,90,16,.4)' }} />
          </motion.div>
        </div>
        <TrayWell className="flex justify-between gap-1">
          {forms.map((f, i) => (
            <DragBrick key={`${f.order}-${seedRef.current}`} char={f.char} dataOrder={f.order} color={PIECE_COLORS[i]} reduce={reduce}
              w={46} h={60} fontSize={28} studSize={18} className="mt-2"
              wobble={wobbleOrder === f.order} used={usedOrders.has(f.order) || done}
              onDrop={(pt) => tryPiece(f.order, pt)} />
          ))}
        </TrayWell>
      </WoodTray>
      {/* bottom wooden bar */}
      <WoodBottomBar>
        <RoundButton onClick={() => want && say(want)} label={L.listen} testId="listen" color="#f6e6c4" border="#c49a5a">
          <Volume2 className="h-8 w-8" color="#1f5fb8" strokeWidth={2.6} aria-hidden="true" />
        </RoundButton>
        <div className="flex gap-3">
          <RoundButton onClick={restart} label={L.again} testId="again" color="#2f86d6">
            <RotateCcw className="h-7 w-7" color="#fff" strokeWidth={3} aria-hidden="true" />
          </RoundButton>
          <RoundButton onClick={hint} label={L.hint} testId="hint" color="#43b02e">
            <Check className="h-8 w-8" color="#fff" strokeWidth={3.5} aria-hidden="true" />
          </RoundButton>
        </div>
      </WoodBottomBar>
    </BrickScreen>
  )
}
