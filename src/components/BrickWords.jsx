/* ============================================================================
   WORD BRICKS (sample) - replaces Word Build, Find the letter, First Words
   ----------------------------------------------------------------------------
   A 3D toy-brick picture sits on a wooden board. The word is spoken (existing
   recording). Under it, a studded baseplate has one slot per letter; the child
   drags (or taps) letter bricks from the wooden tray onto the next slot. Right:
   the brick snaps in and says its sound. Wrong: it wobbles and the wanted
   letter is said softly. Last letter: confetti, the picture bounces, the word
   is said. Guide text ("Build the word", "Nice!", "Try again!") goes through
   i18n (app-text language, English fallback) on a wooden sign with an icon.
   No Latin transliteration or English gloss is ever shown beside the fidel or
   the picture: the picture and the recording carry the meaning.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Volume2, RotateCcw, Check, ArrowRight, Star, Hand, ThumbsUp, Ear } from 'lucide-react'
import { t } from '../platform/i18n'
import { publicUrl } from '../platform/publicUrl'
import { playForm, playEffect, audio } from '../platform/audioEngine'
import { INDEXES } from '../platform/ethiopic'
import { recordAnswer } from '../platform/telemetry'
import { BRICK_COLORS, BrickScreen, GameStage, FitBox, useShortScreen, GuideSign, useGuideFeedback, brickLabels, WoodTopBar, WoodBottomBar, WoodTray, TrayWell, RoundButton, Baseplate, DragBrick, Confetti, overRect, brickCss, studCss, shade, WOOD } from './brickKit'
import { BRICK_SESSION, wordAt, initBrickWord, usedIndices, place } from '../brickWordsCore'

const formOf = (k) => INDEXES.byAudioKey.get(k)
const SCENE = publicUrl('/img/games/brick-sunrise.webp')
const PIC_H = 262 // px: picture board (212 + padding + border) incl. shadow, at scale 1
const PLATE_H = 156 // px: baseplate (slot row + padding + shadow)
const colorOf = (i, seed) => BRICK_COLORS[(i * 3 + seed) % BRICK_COLORS.length]

export default function BrickWords({ soundOn = true, onBack, seed }) {
  const reduce = useReducedMotion()
  const startRef = useRef(seed ?? Math.floor(Math.random() * 997))
  const [round, setRound] = useState(0)
  const word = wordAt(startRef.current, round)
  const roundSeed = (round + 1) * 101 + startRef.current
  const [ctx, setCtx] = useState(() => initBrickWord(word, roundSeed, round))
  const [wobble, setWobble] = useState(null)
  const [miss, setMiss] = useState(false)
  const slotRefs = useRef([])
  const [fb, flash, clearFb] = useGuideFeedback()
  const L = brickLabels()
  const timers = useRef([])
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id) }

  const sayWord = () => audio.play(`words/${word.latin}`, { enabled: soundOn, chime: { familyIndex: 0, order: 1 } })

  useEffect(() => {
    setCtx(initBrickWord(word, roundSeed, round))
    setWobble(null)
    clearFb()
    const id = setTimeout(sayWord, 350)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const won = ctx.placed >= ctx.target.length
  const want = ctx.target[ctx.placed]
  const used = useMemo(() => usedIndices(ctx), [ctx])
  const big = ctx.tray.length <= 5
  const short = useShortScreen()
  const TW_ = short ? (big ? 56 : 48) : (big ? 68 : 56), TH_ = short ? (big ? 64 : 56) : (big ? 80 : 66)
  const bump = (i) => { setWobble(null); requestAnimationFrame(() => setWobble(i)) }
  const flashMiss = () => { setMiss(true); later(() => setMiss(false), 650) }

  const tryBrick = (i, pt) => {
    if (won) return
    if (pt && !overRect(slotRefs.current[ctx.placed], pt, 44)) return // dropped elsewhere: springs back
    const key = ctx.tray[i]
    recordAnswer(want, key, 'workshop')
    const r = place(ctx, key)
    if (r.accepted) {
      playForm(formOf(key), soundOn)
      setCtx(r.ctx)
      flash('ok', r.won ? 0 : 1100)
      if (r.won) later(() => { playEffect('win', soundOn); sayWord() }, 380)
    } else {
      bump(i)
      flashMiss()
      flash('try')
      playEffect('bad', soundOn)
      later(() => playForm(formOf(want), soundOn), 300)
    }
  }
  const hint = () => {
    if (won) return
    const i = ctx.tray.findIndex((k, idx) => k === want && !used.has(idx))
    if (i >= 0) bump(i)
    playForm(formOf(want), soundOn)
  }
  const again = () => { clearFb(); setCtx(initBrickWord(word, roundSeed + 7, round)); setWobble(null) }
  const next = () => setRound((r) => r + 1)

  // resolve each placed key to a distinct tray index for a stable colour
  const taken = new Set()
  const placedColors = ctx.target.slice(0, ctx.placed).map((k) => {
    const i = ctx.tray.findIndex((tk, idx) => tk === k && !taken.has(idx))
    taken.add(i)
    return colorOf(i, startRef.current)
  })

  const n = ctx.target.length
  const plateW = Math.max(300, n * 72 + (n - 1) * 10 + 44)
  const guide = fb === 'try' ? <GuideSign icon={Ear} tone="try" text={L.retry} />
    : (won || fb === 'ok') ? <GuideSign icon={ThumbsUp} tone="ok" text={L.good} />
      : <GuideSign icon={Hand} text={t('brickWordsGuide', 'Build the word')} />

  return (
    <BrickScreen testId="brick-words" side>
      <GameStage style={{ background: `#f7c9a0 url(${SCENE}) center bottom / cover no-repeat` }}
        head={<WoodTopBar onBack={onBack} value={(round % BRICK_SESSION) + (won ? 1 : 0)} total={BRICK_SESSION} done={won} guide={guide} />}>
        {won && <Confetti reduce={reduce} />}
        {won && !reduce && (
          <>
            <motion.div className="pointer-events-none absolute left-1/2 top-[34%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full" data-testid="rays"
              initial={{ opacity: 0, rotate: 0 }} animate={{ opacity: 0.9, rotate: 90 }} transition={{ opacity: { duration: 0.4 }, rotate: { duration: 12, ease: 'linear' } }}
              style={{ background: 'repeating-conic-gradient(from 0deg, rgba(255,240,150,.85) 0 9deg, rgba(255,240,150,0) 9deg 22deg)', WebkitMaskImage: 'radial-gradient(circle, #000 25%, transparent 70%)', maskImage: 'radial-gradient(circle, #000 25%, transparent 70%)' }} />
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <motion.span key={k} className="pointer-events-none absolute left-1/2 top-[40%]" initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                animate={{ opacity: [0, 1, 1, 0], x: Math.cos(k * 1.05) * 150, y: Math.sin(k * 1.05) * 130 - 20, scale: [0.3, 1.2, 1] }} transition={{ duration: 1.6, delay: k * 0.08 }}>
                <Star className="h-8 w-8" fill="#ffd23a" color="#e0971c" strokeWidth={2} style={{ filter: 'drop-shadow(0 0 6px #fff59a)' }} />
              </motion.span>
            ))}
          </>
        )}
        {/* picture board + studded baseplate, fitted together into the room the stage really has */}
        <FitBox testId="picture-fit" w={plateW} h={PIC_H + 18 + PLATE_H} anchor="center" pad={4}>
          <div className="flex h-full w-full flex-col items-center justify-between">
            <div className="flex w-full justify-center">
          <motion.button type="button" onClick={sayWord} aria-label={L.listen} data-testid="picture"
            key={word.pic}
            initial={reduce ? false : { y: -40, opacity: 0, rotate: -3 }}
            animate={won && !reduce ? { y: [0, -14, 0, -8, 0], rotate: [0, -2, 2, 0, -1], scale: [1, 1.05, 1], opacity: 1 } : { y: 0, opacity: 1, rotate: -1 }}
            transition={won ? { duration: 0.9 } : { type: 'spring', stiffness: 130, damping: 12 }}
            className="relative rounded-[28px] p-3"
            style={{ ...WOOD, border: '5px solid #8a5426', boxShadow: `inset 0 4px 0 rgba(255,255,255,.35), inset 0 -5px 8px rgba(0,0,0,.25), 0 8px 0 #5a3414, 0 16px 22px rgba(0,0,0,.35)${won ? ', 0 0 40px 10px rgba(255,226,90,.9)' : ''}` }}>
            <span className="absolute left-2 top-2 h-3 w-3 rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%,#fff,#b9a27a)', boxShadow: '0 1px 2px rgba(0,0,0,.5)' }} />
            <span className="absolute right-2 top-2 h-3 w-3 rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%,#fff,#b9a27a)', boxShadow: '0 1px 2px rgba(0,0,0,.5)' }} />
            <div className="flex h-[212px] w-[212px] items-center justify-center rounded-[18px]"
              style={{ background: 'radial-gradient(circle at 50% 40%, #fffef6, #f6ead0)', boxShadow: 'inset 0 4px 10px rgba(90,52,20,.35), inset 0 0 0 3px #c49a5a' }}>
              <img src={publicUrl(`/img/games/bw/${word.pic}.webp`)} alt="" draggable={false} className="h-[194px] w-[194px] select-none object-contain" style={{ filter: 'drop-shadow(0 8px 6px rgba(70,40,10,.35))' }} />
            </div>
            <span className="absolute -bottom-4 -right-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%,#fff,#f6e6c4 60%,#d8bd8a)', border: '3px solid #c49a5a', boxShadow: '0 4px 0 #8a5426, 0 6px 10px rgba(0,0,0,.3)' }}>
              <Volume2 className="h-6 w-6" color="#1f5fb8" strokeWidth={2.8} aria-hidden="true" />
            </span>
          </motion.button>
            </div>

        {/* studded baseplate with one slot per letter */}
            <div className="flex w-full justify-center">
          <Baseplate testId="baseplate" className="px-5 pb-5 pt-7" style={{ minWidth: 300 }}>
            <div className="flex items-end justify-center gap-2.5">
              {ctx.target.map((k, i) => {
                const filled = i < ctx.placed
                const active = i === ctx.placed && !won
                return (
                  <div key={i} ref={(el) => { slotRefs.current[i] = el }} data-testid="slot" data-filled={filled ? '1' : '0'}
                    className="relative flex h-[92px] w-[72px] flex-none items-end justify-center rounded-xl"
                    style={filled ? undefined : {
                      background: 'rgba(0,40,0,.28)', border: `3px dashed ${active && miss ? '#ff8a80' : active ? '#fff7a8' : 'rgba(255,255,255,.55)'}`,
                      boxShadow: active && miss ? 'inset 0 3px 6px rgba(0,0,0,.35), 0 0 18px 6px rgba(255,110,90,.8)' : active ? 'inset 0 3px 6px rgba(0,0,0,.35), 0 0 18px 6px rgba(255,240,130,.85)' : 'inset 0 3px 6px rgba(0,0,0,.35)',
                    }}>
                    {filled && (
                      <motion.div data-testid="placed" className="geez relative flex h-[80px] w-[68px] items-center justify-center rounded-lg text-[44px] font-black text-white"
                        initial={reduce ? false : { y: -90, scale: 1.25, opacity: 0.4 }}
                        animate={won && !reduce ? { y: [0, -16, 0], scale: 1, opacity: 1 } : { y: 0, scale: 1, opacity: 1 }}
                        transition={won ? { duration: 0.5, delay: 0.5 + i * 0.15, repeat: 2 } : { type: 'spring', stiffness: 260, damping: 15 }}
                        style={{ ...brickCss(won ? '#f2b324' : placedColors[i], 5), textShadow: `0 2px 0 ${shade(won ? '#f2b324' : placedColors[i], -0.4)}` }}>
                        <span className="absolute left-1/2 -translate-x-1/2" style={{ top: -9, ...studCss(won ? '#f2b324' : placedColors[i], 28) }} />
                        {formOf(k)?.char}
                      </motion.div>
                    )}
                  </div>
                )
              })}
            </div>
          </Baseplate>
            </div>
          </div>
        </FitBox>
      </GameStage>

      <WoodTray>
        <TrayWell className={`flex flex-wrap items-end justify-center px-2 ${short ? 'gap-x-2 gap-y-3 pt-3' : 'gap-x-3 gap-y-4 pt-5'}`}>
          {ctx.tray.map((k, i) => (used.has(i)
            ? <div key={`${roundSeed}-${i}`} className="rounded-lg" style={{ width: TW_, height: TH_, border: '2px dashed rgba(60,30,10,.35)', background: 'rgba(60,30,10,.12)' }} />
            : (
              <DragBrick key={`${roundSeed}-${i}`} char={formOf(k)?.char} dataOrder={k} color={colorOf(i, startRef.current)} reduce={reduce}
                w={TW_} h={TH_} fontSize={short ? (big ? 34 : 28) : big ? 42 : 34} studSize={short ? 18 : big ? 26 : 22} wobble={wobble === i} onDrop={(pt) => tryBrick(i, pt)} />
            )))}
        </TrayWell>
      </WoodTray>

      <WoodBottomBar>
        <RoundButton onClick={sayWord} label={L.listen} testId="listen" color="#f6e6c4" border="#c49a5a">
          <Volume2 className="h-8 w-8" color="#1f5fb8" strokeWidth={2.6} aria-hidden="true" />
        </RoundButton>
        <div className="flex gap-3">
          <RoundButton onClick={again} label={L.again} testId="again" color="#2f86d6">
            <RotateCcw className="h-7 w-7" color="#fff" strokeWidth={3} aria-hidden="true" />
          </RoundButton>
          {won ? (
            <motion.div animate={reduce ? undefined : { scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
              <RoundButton onClick={next} label={L.next} testId="next" color="#43b02e">
                <ArrowRight className="h-8 w-8" color="#fff" strokeWidth={3.6} aria-hidden="true" />
              </RoundButton>
            </motion.div>
          ) : (
            <RoundButton onClick={hint} label={L.hint} testId="hint" color="#43b02e">
              <Check className="h-8 w-8" color="#fff" strokeWidth={3.5} aria-hidden="true" />
            </RoundButton>
          )}
        </div>
      </WoodBottomBar>
    </BrickScreen>
  )
}
