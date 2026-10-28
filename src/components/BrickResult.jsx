/* eslint-disable react-refresh/only-export-components */
/* Shared result / "what next" screens for the quiz family (level complete,
   fix-it gate / ready / cap) in the toy-brick look: the sunrise brick world
   behind a cream wooden sign, big glossy buttons below. All text stays
   i18n at the call sites; this file only draws. */
import { motion } from 'framer-motion'
import { BrickScreen, Baseplate, roundBtnCss } from './brickKit'
import { sceneStyle } from './brickRoundKit'
import { shade, brickCss, studCss } from './blockArt'

const TONES = { go: '#43b02e', sky: '#2f86d6', wood: '#a8672f' }
export const RESULT_INK = '#5a3414'
export const RESULT_MUTED = '#8a6a44'

export function BrickResultScreen({ testId, above, children, actions, rays = false }) {
  return (
    <BrickScreen testId={testId}>
      <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden" style={sceneStyle}>
        <div className="mx-auto flex min-h-full w-full max-w-sm flex-col items-center justify-center gap-4 px-5 py-6">
          <div className="relative mb-6 flex flex-col items-center">
            {rays && <BrickRays />}
            {above}
          </div>
          <div className="relative w-full rounded-3xl px-5 pb-5 pt-9 text-center"
            style={{ background: 'linear-gradient(180deg,#fff8e2,#f4dfb0)', border: '5px solid #8a5426', color: RESULT_INK,
              boxShadow: 'inset 0 4px 0 rgba(255,255,255,.6), 0 7px 0 #5a3414, 0 14px 20px rgba(0,0,0,.35)' }}>
            {children}
          </div>
          {actions && <div className="flex w-full flex-col gap-3">{actions}</div>}
        </div>
      </div>
    </BrickScreen>
  )
}

/** Slowly turning gold rays behind the win hero (decorative). */
export function BrickRays() {
  return (
    <motion.div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px]" style={{ x: '-50%', y: '-50%' }} animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}>
      <div className="h-full w-full rounded-full" style={{
        background: 'repeating-conic-gradient(from 0deg, rgba(255,226,120,.55) 0deg 9deg, rgba(255,226,120,0) 9deg 22deg)',
        WebkitMaskImage: 'radial-gradient(circle, #000 0 22%, transparent 62%)', maskImage: 'radial-gradient(circle, #000 0 22%, transparent 62%)',
      }} />
    </motion.div>
  )
}

/** The hero stands on a green studded baseplate. */
export function BrickStage({ children, color = '#3fae4a', width = 200 }) {
  return (
    <div className="relative flex flex-col items-center">
      <div className="relative z-10">{children}</div>
      <Baseplate color={color} stud={22} className="-mt-5 h-[40px]" style={{ width, borderRadius: 18 }} />
    </div>
  )
}

/** Title ribbon: a glossy studded brick that overlaps the top edge of the sign. */
export function BrickBanner({ color = '#43b02e', as: Tag = 'h2', children, className = '' }) {
  return (
    <div className="relative -mt-14 mb-3 flex justify-center">
      <Tag className={`relative mx-auto inline-block max-w-full rounded-2xl px-6 py-2 text-[26px] font-black leading-tight text-white ${className}`}
        style={{ ...brickCss(color, 6), textShadow: `0 3px 0 ${shade(color, -0.5)}` }}>
        <span aria-hidden="true" className="pointer-events-none absolute -top-[9px] left-0 right-0 flex justify-around px-4">
          {[0, 1, 2, 3].map((i) => <span key={i} style={studCss(color, 24)} />)}
        </span>
        {children}
      </Tag>
    </div>
  )
}

/** Wide glossy button (same gloss as the round kit buttons). */
export function BrickCta({ tone = 'go', onClick, children, testId, ...rest }) {
  const base = TONES[tone] || TONES.go
  return (
    <button type="button" onClick={onClick} data-testid={testId} {...rest}
      className="chunk flex min-h-[56px] w-full items-center justify-center rounded-2xl px-6 py-3 text-base font-black uppercase tracking-wide text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white"
      style={{ ...roundBtnCss(base), textShadow: `0 2px 0 ${shade(base, -0.45)}`, '--chunk-depth': '4px' }}>
      {children}
    </button>
  )
}

/** A glossy brick stat tile (label + value, white on the brick colour). */
export function BrickStat({ label, color = '#2f86d6', children }) {
  return (
    <div className="relative flex min-h-[84px] flex-col items-center justify-center rounded-2xl px-2 pt-2 text-white" style={{ ...brickCss(color, 5), textShadow: `0 2px 0 ${shade(color, -0.45)}` }}>
      <span aria-hidden="true" className="pointer-events-none absolute -top-[8px] left-0 right-0 flex justify-around px-3">
        {[0, 1].map((i) => <span key={i} style={studCss(color, 22)} />)}
      </span>
      <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,.88)' }}>{label}</p>
      {children}
    </div>
  )
}
