/* ============================================================================
   BLOCK CHURCH - snap-on vowel blocks, every consonant family
   ----------------------------------------------------------------------------
   Pick a letter family (all of them, halehame order; the next unbuilt one
   glows) or just follow the glow. A family is one round: the game says a
   target form (the existing recorded fidel clip) and the child drags (or
   taps) the matching vowel piece onto the glowing slot of the big consonant
   block. Right: the block turns into that form, says it, and one brick flies
   onto the church roof. Wrong: the piece wobbles and bounces home. Seven
   right answers finish the dome and cross and add the family to the church
   WALL in front of the church (one studded brick per family, 3 stars saved
   per child profile). Build all families and the church wears its gold dome
   and cross for good.
   LAYOUT: head (back + guide sign) / church / tray. The church is a fixed
   shape fitted into the free space with container units, so it is always
   fully visible next to the tray and the current block, on every screen
   (portrait stacked, landscape side by side; see blockChurch.css).
   Guide text goes through i18n (app-text language, English fallback); no
   Latin transliteration or gloss is ever shown beside the fidel.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Volume2, RotateCcw, Hand, ThumbsUp, Ear, ArrowRight, ArrowLeft, Star, Sparkles } from 'lucide-react'
import { t } from '../platform/i18n'
import { publicUrl } from '../platform/publicUrl'
import { shade, brickCss, studCss, WOOD, WOOD_DARK, BRICK_COLORS, GuideSign, useGuideFeedback, brickLabels, WoodButton, WoodTray, TrayWell, RoundButton, DragBrick, overRect, woodBtnCss } from './brickKit'
import { Brick } from './blockArt'
import './blockChurch.css'
import { afterVoice, playForm, playEffect } from '../platform/audioEngine'
import { INDEXES, FIDEL_FAMILIES } from '../platform/ethiopic'
import { churchStore, withFamilyBuilt, starsForMisses } from '../platform/churchProgress'
import { initRound, snap, target, isComplete, ORDERS, nextFamilyId, builtCount } from '../blockChurchCore'

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

/* The church WALL: one studded brick per family, filled bottom row first in
   halehame order. Built families are coloured; the rest are dotted ghosts;
   the family being built right now pulses. Pure decoration + progress. */
const WALL_COLS = 12 // 34 families -> 3 rows, all inside the 95..675 x 110..760 viewBox
const WALL_X0 = 135, WALL_BW = 38, WALL_PITCH = 42, WALL_Y0 = 654, WALL_ROW = 34
function Wall({ ids, done, currentId, reduce }) {
  const rows = Math.ceil(ids.length / WALL_COLS)
  return (
    <g data-testid="church-wall" data-built={ids.filter((id) => done[id]).length} data-total={ids.length}>
      {ids.map((id, i) => {
        const col = i % WALL_COLS
        const row = rows - 1 - Math.floor(i / WALL_COLS)
        const x = WALL_X0 + col * WALL_PITCH, y = WALL_Y0 + row * WALL_ROW
        if (done[id]) return <g key={id} data-testid="wall-brick"><Brick x={x} y={y} w={WALL_BW} h={24} color={BRICK_COLORS[i % 7]} studs={1} /></g>
        const cur = id === currentId
        return (
          <g key={id} data-testid="wall-ghost">
            <rect x={x} y={y} width={WALL_BW} height="24" rx="3" fill={cur ? 'rgba(255,240,150,.55)' : 'rgba(255,255,255,.22)'} stroke={cur ? '#fff59a' : '#fff'} strokeWidth={cur ? 3 : 1.6} strokeDasharray="4 4">
              {cur && !reduce && <animate attributeName="opacity" values="1;.45;1" dur="1.2s" repeatCount="indefinite" />}
            </rect>
          </g>
        )
      })}
    </g>
  )
}

function Church({ built, complete, reduce, mode, wall, finished }) {
  const play = mode === 'play'
  return (
    <svg viewBox="95 110 580 650" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" aria-hidden="true" data-testid="church-svg">
      <defs>
        <radialGradient id="bc-gold" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff3a8" /><stop offset=".35" stopColor="#f8cf38" /><stop offset=".8" stopColor="#d99a16" /><stop offset="1" stopColor="#a86c0c" />
        </radialGradient>
        <linearGradient id="bc-goldbar" x1="0" x2="1"><stop offset="0" stopColor="#ffe27a" /><stop offset=".5" stopColor="#f2b324" /><stop offset="1" stopColor="#b8780e" /></linearGradient>
        <radialGradient id="bc-glow"><stop offset="0" stopColor="#fff7b0" stopOpacity=".95" /><stop offset="1" stopColor="#fff7b0" stopOpacity="0" /></radialGradient>
      </defs>
      <image href={SCENE} x="0" y="0" width="768" height="1024" />
      {/* dome + cross: dotted until complete (drawn behind the ridge bricks) */}
      {complete || finished ? (
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
      ) : play ? (
        <g data-testid="dome-outline" fill="none" stroke="#fff" strokeWidth="6" strokeDasharray="0.1 15" strokeLinecap="round">
          <path d={`M${CX - DOME_R} ${DOME_Y - 12} A${DOME_R} ${DOME_R * 1.02} 0 0 1 ${CX + DOME_R} ${DOME_Y - 12}`} />
          <path d={`M${CX - 10} ${DOME_Y - 112} V${DOME_Y - 205} H${CX + 10} V${DOME_Y - 112} M${CX - 42} ${DOME_Y - 178} H${CX + 42} V${DOME_Y - 160} H${CX - 42}Z`} />
        </g>
      ) : null}
      <Wall ids={wall.ids} done={wall.done} currentId={wall.currentId} reduce={reduce} />
      {/* roof ridge: one 3D brick per right answer */}
      {play && RIDGE.map((p, i) => (i < built ? (
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
      {(complete || finished) && !reduce && Array.from({ length: 16 }, (_, i) => (
        <motion.rect key={`c${i}`} x={CX - 8} y={DOME_Y - 120} width="16" height="12" rx="3" fill={PIECE_COLORS[i % 7]}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }} animate={{ x: Math.cos(i * 0.9) * 330, y: Math.sin(i * 1.7) * 240 - 30, opacity: 0, rotate: 360 }}
          transition={{ duration: 1.6, repeat: 2, delay: i * 0.04 }} />
      ))}
    </svg>
  )
}

const FAMILY_IDS = FIDEL_FAMILIES.map((f) => f.id)

/** The family picker: every consonant family as a studded brick, in halehame
    order. Built ones are coloured with their stars, the next one bounces. */
function FamilyPicker({ done, suggested, onPick, reduce }) {
  return (
    <div className="bc-grid" data-testid="family-grid" role="list">
      {FAMILY_IDS.map((id, i) => {
        const f = formOf(id, 1)
        if (!f) return null
        const built = done[id]
        const next = id === suggested
        const color = BRICK_COLORS[i % 7]
        return (
          <motion.button key={id} type="button" role="listitem" data-testid="family-tile" data-family={id} data-built={built ? 1 : 0} data-next={next ? 1 : 0}
            aria-label={f.char} onClick={() => onPick(id)}
            whileTap={reduce ? undefined : { scale: 0.92 }}
            className={`bc-tile geez flex select-none items-center justify-center ${next ? 'bc-tile-pulse' : ''}`}
            style={built
              ? { ...brickCss(color, 5), color: '#fff', textShadow: `0 2px 0 ${shade(color, -0.4)}` }
              : { background: 'linear-gradient(#fffdf2,#f0e2bc)', border: next ? '3px solid #f08a24' : '2px dashed #b88a4a', color: '#5a2a0e', boxShadow: next ? '0 0 0 3px rgba(255,236,120,.9), 0 4px 0 #b85a10' : '0 3px 0 rgba(90,52,20,.35)' }}>
            <span className="absolute left-1/2 -translate-x-1/2" style={{ top: -6, ...studCss(built ? color : '#e9d6a3', 14) }} />
            {f.char}
            {built ? (
              <span className="pointer-events-none absolute -bottom-1 left-1/2 flex -translate-x-1/2" aria-hidden="true" data-testid="tile-stars">
                {Array.from({ length: built }, (_, k) => <Star key={k} className="h-3 w-3" fill="#ffd23a" color="#a86c0c" strokeWidth={2} />)}
              </span>
            ) : null}
          </motion.button>
        )
      })}
    </div>
  )
}

export default function BlockChurch({ soundOn = true, onBack, family: startFamily = null, seed }) {
  const reduce = useReducedMotion()
  const seedRef = useRef(seed ?? (Math.floor(Math.random() * 997) + 1))
  const [prog, setProg] = useState(() => churchStore.load())
  const [family, setFamily] = useState(startFamily) // null = picker
  const [s, setS] = useState(() => initRound(seedRef.current))
  const [shown, setShown] = useState(null) // order currently shown on the big block
  const [wobbleOrder, setWobbleOrder] = useState(null)
  const slotRef = useRef(null)
  const [fb, flash, clearFb] = useGuideFeedback()
  const L = brickLabels()
  const timers = useRef([])
  const play = !!family
  const forms = useMemo(() => (family ? ORDERS.map((o) => formOf(family, o)).filter(Boolean) : []), [family])
  const base = family ? formOf(family, 1) : null
  const done = play && isComplete(s)
  const want = play ? target(s) : null
  const built = builtCount(FAMILY_IDS, prog.done)
  const finished = built >= FAMILY_IDS.length
  const suggested = nextFamilyId(FAMILY_IDS, prog.done, family)

  const say = (order) => { const f = formOf(family, order); if (f) playForm(f, soundOn) }
  useEffect(() => {
    if (!family) return undefined
    const id = setTimeout(() => { if (want) say(want) }, 450)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.built, family])
  useEffect(() => () => timers.current.forEach((c) => c()), [])

  const overSlot = (pt) => overRect(slotRef.current, pt, 40) // generous drop zone for small hands

  const startFamily_ = (id) => {
    seedRef.current += 1
    timers.current.forEach((c) => c())
    timers.current = []
    clearFb()
    setShown(null)
    setWobbleOrder(null)
    setS(initRound(seedRef.current))
    setFamily(id)
  }
  const toPicker = () => {
    timers.current.forEach((c) => c())
    timers.current = []
    clearFb()
    setShown(null)
    setFamily(null)
  }

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
    if (next.last === 'done') {
      const np = withFamilyBuilt(prog, family, starsForMisses(next.misses))
      setProg(np)
      churchStore.save(np)
    }
    setS(next)
  }

  const restart = () => startFamily_(family)
  const goNext = () => { const n = nextFamilyId(FAMILY_IDS, prog.done, family); if (n) startFamily_(n); else toPicker() }

  const usedOrders = new Set(play ? s.queue.slice(0, s.built) : [])
  const blockChar = shown ? formOf(family, shown)?.char : base?.char

  const hint = () => {
    if (!want) return
    setWobbleOrder(null)
    requestAnimationFrame(() => setWobbleOrder(want))
    say(want)
  }

  const sign = fb === 'try' ? <GuideSign compact icon={Ear} tone="try" text={L.retry} />
    : (done || fb === 'ok') ? <GuideSign compact icon={ThumbsUp} tone="ok" text={done && finished ? t('blockChurchAllDone', 'The church is finished!') : L.good} />
      : play ? <GuideSign compact icon={Hand} text={t('brickChurchGuide', 'Drag the matching block')} />
        : <GuideSign compact icon={finished ? Sparkles : Hand} text={finished ? t('blockChurchAllDone', 'The church is finished!') : t('blockChurchPick', 'Pick a letter to build')} />

  return (
    <div data-testid="block-church" data-mode={play ? 'play' : 'pick'} className="bc-root" style={WOOD_DARK}>
      <div className="bc-shell">
        <header className="bc-head">
          <WoodButton onClick={play ? toPicker : onBack} label={t('back', 'Back')} testId="church-back" className="bc-back">
            <ArrowLeft className="h-6 w-6" strokeWidth={3} color="#f6c22c" style={{ filter: 'drop-shadow(0 2px 0 #7a4a20)' }} aria-hidden="true" />
          </WoodButton>
          {sign}
        </header>
        <section className="bc-hero">
          <div className="bc-scene" data-testid="church-scene">
            <Church built={s.built} complete={done} reduce={reduce} mode={play ? 'play' : 'pick'} finished={finished && !play}
              wall={{ ids: FAMILY_IDS, done: prog.done, currentId: play ? family : suggested }} />
          </div>
        </section>
        {play ? (
          <section className="bc-panel" data-testid="church-panel">
            <WoodTray className="bc-tray !px-2 !pb-1 items-stretch">
              <div className="flex justify-center">
                <motion.div
                  data-testid="big-block"
                  key={blockChar}
                  initial={reduce ? false : { scale: 0.85 }}
                  animate={{ scale: 1 }}
                  className="bc-block geez flex flex-col items-center justify-start font-black"
                  style={{ ...brickCss('#f08a24', 9), color: '#5a2a0e', textShadow: '0 2px 0 rgba(255,200,140,.7)' }}
                >
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="bc-stud absolute" style={{ left: `${12 + i * 24}%`, ...studCss('#f08a24', 28) }} />
                  ))}
                  <span data-testid="big-glyph" className="bc-glyph">{blockChar}</span>
                  <div ref={slotRef} data-testid="slot" className="bc-slot"
                    style={{ background: 'linear-gradient(#fffbe0,#ffe27a)', border: '3px solid #b85a10', boxShadow: '0 0 18px 6px rgba(255,236,120,.9), inset 0 2px 4px rgba(184,90,16,.4)' }} />
                </motion.div>
              </div>
              <TrayWell className="bc-well">
                <div className="bc-pieces" data-testid="pieces">
                  {forms.map((f, i) => (
                    <DragBrick key={`${f.order}-${seedRef.current}`} char={f.char} dataOrder={f.order} color={PIECE_COLORS[i]} reduce={reduce}
                      w="var(--bc-pw)" h="var(--bc-ph)" fontSize="calc(var(--bc-pw) * 0.52)" studSize={16} className="bc-piece mt-2"
                      wobble={wobbleOrder === f.order} used={usedOrders.has(f.order) || done}
                      onDrop={(pt) => tryPiece(f.order, pt)} />
                  ))}
                </div>
              </TrayWell>
              <div className="bc-bar" style={{ ...WOOD, border: '3px solid #7a4a20', boxShadow: 'inset 0 3px 0 rgba(255,255,255,.3), 0 4px 0 #5a3414' }}>
                <RoundButton onClick={() => want && say(want)} label={L.listen} testId="listen" color="#f6e6c4" border="#c49a5a" className="bc-btn">
                  <Volume2 className="h-7 w-7" color="#1f5fb8" strokeWidth={2.6} aria-hidden="true" />
                </RoundButton>
                <div className="flex gap-3">
                  <RoundButton onClick={restart} label={L.again} testId="again" color="#2f86d6" className="bc-btn">
                    <RotateCcw className="h-6 w-6" color="#fff" strokeWidth={3} aria-hidden="true" />
                  </RoundButton>
                  {done ? (
                    <RoundButton onClick={goNext} label={L.next} testId="next" color="#43b02e" className="bc-btn">
                      <ArrowRight className="h-7 w-7" color="#fff" strokeWidth={3.5} aria-hidden="true" />
                    </RoundButton>
                  ) : (
                    <RoundButton onClick={hint} label={L.hint} testId="hint" color="#43b02e" className="bc-btn">
                      <Hand className="h-7 w-7" color="#fff" strokeWidth={3} aria-hidden="true" />
                    </RoundButton>
                  )}
                </div>
              </div>
            </WoodTray>
          </section>
        ) : (
          <section className="bc-panel bc-panel--pick" data-testid="church-panel">
            <WoodTray className="bc-tray !px-2 !pb-1 min-h-0 flex-1">
              <FamilyPicker done={prog.done} suggested={suggested} onPick={startFamily_} reduce={reduce} />
            </WoodTray>
          </section>
        )}
      </div>
    </div>
  )
}
