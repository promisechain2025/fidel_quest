/* ============================================================================
   STACK THE TOWER (sample) - replaces "Order" (the vowel ladder)
   ----------------------------------------------------------------------------
   Seven shuffled fidel bricks (one family, vowel order 1-7) wait in a wooden
   tray, each with a small Ge'ez numeral. A tower is built on a studded
   baseplate: the game says the next form (existing recording) and the child
   drags (or taps) that brick onto the glowing level. Right: it snaps on and
   says its sound. Wrong: wobble + the wanted sound again, softly. When all
   seven are stacked the tower turns gold and grows cross arms: a Meskel cross.
   Logic is the existing ladderCore (no new rules). No English on screen.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Volume2, RotateCcw, Check, ArrowRight, Star } from 'lucide-react'
import { publicUrl } from '../platform/publicUrl'
import { afterVoice, playForm, playEffect } from '../platform/audioEngine'
import { INDEXES } from '../platform/ethiopic'
import { recordAnswer } from '../platform/telemetry'
import { GEEZ_DIGITS } from '../data/numerals'
import { initLadder, ladderTransition, LadderEvent, Phase } from '../ladderCore'
import { BRICK_COLORS, BrickScreen, WoodTopBar, WoodBottomBar, WoodTray, TrayWell, RoundButton, Baseplate, DragBrick, Confetti, overRect, brickCss, studCss, shade } from './brickKit'

const TOWER_FAMILIES = ['me', 'se', 'ke', 'le']
const formOf = (k) => INDEXES.byAudioKey.get(k)
const SCENE = publicUrl('/img/games/brick-meadow.webp')
const GOLD = '#f2b324'
const TW = 118, TH = 52 // tower brick size
const ARM_AT = 5 // level index (0 = bottom) that grows the cross arms

function Level({ k, i, color, top, win, reduce }) {
  const f = formOf(k)
  return (
    <motion.div data-testid="tower-block" className="geez relative flex items-center justify-center rounded-md text-[36px] font-black text-white"
      style={{ width: TW, height: TH, zIndex: 10 + i, ...brickCss(color, 4), textShadow: `0 2px 0 ${shade(color, -0.4)}` }}
      initial={reduce ? false : { y: -260, scale: 1.2, opacity: 0.3 }} animate={{ y: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 230, damping: 14 }}>
      {top && !win && [0, 1].map((n) => (
        <span key={n} className="absolute" style={{ top: -9, left: n ? '60%' : '14%', ...studCss(color, 28) }} />
      ))}
      {win && (
        <motion.div className="absolute inset-0 rounded-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 * (i + 1), duration: 0.5 }}
          style={{ background: `linear-gradient(180deg, #fff2a6, ${GOLD} 45%, #b8780e)`, boxShadow: 'inset 0 3px 0 rgba(255,255,255,.6)' }} />
      )}
      <span className="relative">{f?.char}</span>
      <span className="absolute right-1 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[13px] font-black leading-none" style={{ color: shade(color, -0.35) }}>{GEEZ_DIGITS[i]}</span>
    </motion.div>
  )
}

function Arm({ side, reduce }) {
  return (
    <motion.div data-testid="cross-arm" className="absolute rounded-md"
      style={{ top: 0, height: TH, width: 132, [side]: TW - 4, zIndex: 5, transformOrigin: side === 'left' ? 'right center' : 'left center',
        background: `linear-gradient(180deg, #fff2a6, ${GOLD} 45%, #b8780e)`, boxShadow: '0 4px 0 #7a4a08, inset 0 3px 0 rgba(255,255,255,.6), 0 8px 12px rgba(0,0,0,.3)', border: '1px solid #9a620a' }}
      initial={reduce ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.1, type: 'spring', stiffness: 120, damping: 12 }}>
      <div className="absolute inset-x-0 top-0 flex justify-around px-3">
        {[0, 1].map((n) => <span key={n} style={{ marginTop: -9, ...studCss(GOLD, 24) }} />)}
      </div>
    </motion.div>
  )
}

export default function StackTower({ soundOn = true, onBack, seed }) {
  const reduce = useReducedMotion()
  const seedRef = useRef(seed ?? (Math.floor(Math.random() * 997) + 1))
  const [round, setRound] = useState(0)
  const family = TOWER_FAMILIES[round % TOWER_FAMILIES.length]
  const [ctx, setCtx] = useState(() => initLadder(family, seedRef.current))
  const [wobble, setWobble] = useState(null)
  const slotRef = useRef(null)
  const timers = useRef([])
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id) }

  const won = ctx.phase === Phase.WIN
  const want = ctx.order[ctx.placed]
  const say = (k) => { const f = formOf(k); if (f) playForm(f, soundOn) }

  useEffect(() => {
    setCtx(initLadder(family, seedRef.current + round * 17))
    setWobble(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])
  useEffect(() => {
    if (won) return undefined
    const id = setTimeout(() => say(ctx.order[ctx.placed]), ctx.placed === 0 ? 500 : 900)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.placed, ctx.seed])
  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])

  const bump = (k) => { setWobble(null); requestAnimationFrame(() => setWobble(k)) }
  const colorOf = (k) => BRICK_COLORS[ctx.order.indexOf(k)]

  const tryBrick = (k, pt) => {
    if (won) return
    if (pt && !overRect(slotRef.current, pt, 60)) return // dropped elsewhere: springs back
    recordAnswer(want, k, 'ladder')
    const r = ladderTransition(ctx, { type: LadderEvent.TAP, payload: { key: k } })
    if (r.accepted) {
      say(k)
      afterVoice(() => playEffect(r.next.phase === Phase.WIN ? 'win' : 'good', soundOn), 300)
      setCtx(r.next)
    } else {
      bump(k)
      playEffect('bad', soundOn)
      later(() => say(want), 300)
    }
  }
  const hint = () => { if (!won) { bump(want); say(want) } }
  const again = () => { setCtx(initLadder(family, seedRef.current + round * 17 + 5)); setWobble(null) }

  const placedKeys = ctx.order.slice(0, ctx.placed)
  const usedSet = useMemo(() => new Set(placedKeys), [placedKeys.join()])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BrickScreen testId="stack-tower">
      <div className="relative min-h-0 overflow-hidden" style={{ flex: '1 1 auto', background: `#8fd0ff url(${SCENE}) center bottom / cover no-repeat` }}>
        <WoodTopBar onBack={onBack} value={ctx.placed} total={7} done={won} />
        {won && <Confetti reduce={reduce} />}
        {won && !reduce && (
          <>
            <motion.div className="pointer-events-none absolute left-1/2 top-[150px] h-[520px] w-[520px] -translate-x-1/2 rounded-full" data-testid="rays"
              initial={{ opacity: 0, rotate: 0 }} animate={{ opacity: 0.95, rotate: 90 }} transition={{ opacity: { delay: 1, duration: 0.6 }, rotate: { duration: 14, ease: 'linear' } }}
              style={{ background: 'repeating-conic-gradient(from 0deg, rgba(255,244,160,.9) 0 9deg, rgba(255,244,160,0) 9deg 22deg)', WebkitMaskImage: 'radial-gradient(circle, #000 20%, transparent 68%)', maskImage: 'radial-gradient(circle, #000 20%, transparent 68%)' }} />
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <motion.span key={n} className="pointer-events-none absolute left-1/2 top-[230px]" initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                animate={{ opacity: [0, 1, 1, 0], x: Math.cos(n * 1.05 + 0.4) * 150, y: Math.sin(n * 1.05 + 0.4) * 110, scale: [0.3, 1.2, 1] }} transition={{ duration: 1.6, delay: 1.2 + n * 0.08 }}>
                <Star className="h-8 w-8" fill="#ffd23a" color="#e0971c" strokeWidth={2} style={{ filter: 'drop-shadow(0 0 6px #fff59a)' }} />
              </motion.span>
            ))}
          </>
        )}

        <div className="absolute inset-x-0 bottom-4 flex flex-col items-center">
          {/* the tower: level 0 at the bottom */}
          <div className="relative flex flex-col-reverse items-center" data-testid="tower" style={{ marginBottom: -6, zIndex: 3 }}>
            {ctx.order.map((k, i) => {
              const filled = i < ctx.placed
              const active = i === ctx.placed && !won
              return (
                <div key={k} ref={active ? slotRef : undefined} data-testid="level" data-filled={filled ? '1' : '0'} className="relative" style={{ width: TW, height: TH }}>
                  {filled ? (
                    <>
                      <Level k={k} i={i} color={colorOf(k)} top={i === ctx.placed - 1} win={won} reduce={reduce} />
                      {won && i === ARM_AT && <><Arm side="left" reduce={reduce} /><Arm side="right" reduce={reduce} /></>}
                    </>
                  ) : (
                    <div className="geez flex h-full w-full items-center justify-center rounded-md text-[30px] font-black text-white"
                      style={{ background: active ? 'rgba(30,60,20,.45)' : 'rgba(30,60,20,.38)', border: `3px dashed ${active ? '#fff7a8' : 'rgba(255,255,255,.8)'}`, textShadow: '0 2px 0 rgba(0,0,0,.6), 0 0 6px rgba(0,0,0,.5)',
                        boxShadow: active ? '0 0 20px 8px rgba(255,240,130,.9)' : 'none' }}>
                      {GEEZ_DIGITS[i]}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <Baseplate testId="baseplate" stud={26} className="h-[46px]" style={{ width: 340 }} />
        </div>
      </div>

      <WoodTray>
        <TrayWell className="flex flex-wrap items-end justify-center gap-x-2.5 gap-y-4 px-2 pt-5">
          {ctx.tray.map((k) => (usedSet.has(k)
            ? <div key={`${ctx.seed}-${k}`} className="rounded-lg" style={{ width: 72, height: 50, border: '2px dashed rgba(60,30,10,.35)', background: 'rgba(60,30,10,.12)' }} />
            : (
              <DragBrick key={`${ctx.seed}-${k}`} char={formOf(k)?.char} dataOrder={k} color={colorOf(k)} reduce={reduce}
                w={72} h={50} fontSize={30} studs={2} studSize={20} wobble={wobble === k} onDrop={(pt) => tryBrick(k, pt)}>
                <span className="absolute right-1 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[13px] font-black leading-none" style={{ color: shade(colorOf(k), -0.35) }}>{GEEZ_DIGITS[ctx.order.indexOf(k)]}</span>
              </DragBrick>
            )))}
        </TrayWell>
      </WoodTray>

      <WoodBottomBar>
        <RoundButton onClick={() => want && say(want)} label="listen" testId="listen" color="#f6e6c4" border="#c49a5a">
          <Volume2 className="h-8 w-8" color="#1f5fb8" strokeWidth={2.6} aria-hidden="true" />
        </RoundButton>
        <div className="flex gap-3">
          <RoundButton onClick={again} label="again" testId="again" color="#2f86d6">
            <RotateCcw className="h-7 w-7" color="#fff" strokeWidth={3} aria-hidden="true" />
          </RoundButton>
          {won ? (
            <motion.div animate={reduce ? undefined : { scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
              <RoundButton onClick={() => setRound((r) => r + 1)} label="next" testId="next" color="#43b02e">
                <ArrowRight className="h-8 w-8" color="#fff" strokeWidth={3.6} aria-hidden="true" />
              </RoundButton>
            </motion.div>
          ) : (
            <RoundButton onClick={hint} label="hint" testId="hint" color="#43b02e">
              <Check className="h-8 w-8" color="#fff" strokeWidth={3.5} aria-hidden="true" />
            </RoundButton>
          )}
        </div>
      </WoodBottomBar>
    </BrickScreen>
  )
}
