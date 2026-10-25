/* eslint-disable react-refresh/only-export-components */
/* ============================================================================
   BRICK KIT - the shared toy-brick look (Block Church benchmark)
   ----------------------------------------------------------------------------
   Small reusable pieces so every game can be re-skinned the same way:
     BrickScreen    full-height wooden shell
     WoodButton     round wooden icon button (back / star)
     RoundButton    glossy coloured round button (listen / again / hint / next)
     WoodTopBar     back + pill progress + star
     WoodBottomBar  wooden bar that holds the round buttons
     WoodTray       wooden tray with an inset well for loose bricks
     Baseplate      studded green plate (slots/tower sit on it)
     DragBrick      glossy studded brick: pointer-drag with tap/Enter fallback
     Confetti       a burst of falling bricks
   GUIDE TEXT: short instructions and feedback ("Drag the bricks in order",
   "Nice!", "Try again!") come from the app's i18n (t(key, English fallback)),
   in the child's app-text language, shown on a wooden GuideSign with an icon.
   Amharic and Tigrinya are never app-text languages (English fallback). Fidel,
   words and recordings are content: no Latin transliteration, no "sounds
   like" hints and no English glosses ever appear beside them.
   ========================================================================== */
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Star } from 'lucide-react'
import { t } from '../platform/i18n'
import { shade, brickCss, studCss, WOOD, WOOD_DARK } from './blockArt'

export { shade, brickCss, studCss, WOOD, WOOD_DARK }
export { Brick, Stud } from './blockArt'

export const BRICK_COLORS = ['#e2453c', '#f08a24', '#f2c230', '#4fb04a', '#2f86d6', '#7a4fc9', '#d94f9a']

export const woodBtnCss = { ...WOOD, border: '3px solid #7a4a20', boxShadow: 'inset 0 3px 0 rgba(255,255,255,.35), 0 4px 0 #5a3414, 0 8px 12px rgba(0,0,0,.3)' }
export const roundBtnCss = (bg) => ({ background: `radial-gradient(circle at 35% 30%, ${shade(bg, 0.35)}, ${bg} 60%, ${shade(bg, -0.25)})`, border: '3px solid #fff', boxShadow: `0 4px 0 ${shade(bg, -0.45)}, 0 8px 12px rgba(0,0,0,.3)` })
const BTN = 'flex h-14 w-14 items-center justify-center rounded-full'

export function BrickScreen({ testId, children }) {
  return (
    <div className="mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden" data-testid={testId} style={{ ...WOOD_DARK }}>
      {children}
    </div>
  )
}

export function WoodButton({ onClick, label, children, testId }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} data-testid={testId} className={BTN} style={woodBtnCss}>{children}</button>
  )
}

export function RoundButton({ onClick, label, color, border, children, testId, className = '' }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} data-testid={testId} className={`${BTN} ${className}`}
      style={{ ...roundBtnCss(color), ...(border ? { border: `3px solid ${border}` } : null) }}>{children}</button>
  )
}

export function WoodTopBar({ onBack, value, total, done }) {
  return (
    <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
      <WoodButton onClick={onBack} label={t('back', 'Back')}>
        <ArrowLeft className="h-7 w-7" strokeWidth={3} color="#f6c22c" style={{ filter: 'drop-shadow(0 2px 0 #7a4a20)' }} aria-hidden="true" />
      </WoodButton>
      <div className="flex gap-1 rounded-full p-1.5" data-testid="progress" style={{ background: 'rgba(30,60,110,.35)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,.3)' }}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className="h-4 rounded-full" style={{ width: total > 7 ? 18 : 28, ...(i < value
            ? { background: 'linear-gradient(#9be86a,#43a92e)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,.5), 0 1px 0 #2e7a1e' }
            : { background: 'linear-gradient(#fff,#d8e4ee)', boxShadow: 'inset 0 -2px 0 rgba(0,0,0,.12)' }) }} />
        ))}
      </div>
      <div className={BTN} style={woodBtnCss} aria-hidden="true">
        <Star className="h-7 w-7" fill={done ? '#ffd23a' : '#f6c22c'} color="#c4841c" strokeWidth={2} style={{ filter: done ? 'drop-shadow(0 0 6px #fff59a)' : 'none' }} />
      </div>
    </div>
  )
}

const SIGN_TONES = {
  guide: { bg: 'linear-gradient(180deg,#fff8e2,#f4dfb0)', fg: '#5a3414', ring: '#8a5426', badge: '#2f86d6' },
  ok: { bg: 'linear-gradient(180deg,#a6ec78,#4fb23a)', fg: '#fff', ring: '#2e7a1e', badge: '#2e9a28' },
  try: { bg: 'linear-gradient(180deg,#ffc27a,#f08a24)', fg: '#fff', ring: '#a85410', badge: '#d9701c' },
}

/** Wooden guide sign: a big round icon + one short line of i18n text. */
export function GuideSign({ icon: Icon, text, tone = 'guide', className = '' }) {
  const c = SIGN_TONES[tone] || SIGN_TONES.guide
  return (
    <motion.div key={`${tone}:${text}`} data-testid="guide" data-tone={tone} role="status" aria-live="polite"
      initial={{ scale: 0.9, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}
      className={`flex items-center gap-2.5 rounded-2xl py-1.5 pl-1.5 pr-4 ${className}`}
      style={{ background: c.bg, border: `4px solid ${c.ring}`, boxShadow: `inset 0 3px 0 rgba(255,255,255,.55), 0 5px 0 ${shade(c.ring, -0.35)}, 0 10px 14px rgba(0,0,0,.3)` }}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={roundBtnCss(c.badge)}>
        <Icon className="h-6 w-6" color="#fff" strokeWidth={3} aria-hidden="true" />
      </span>
      <span className="text-[20px] font-black leading-tight" style={{ color: c.fg, textShadow: tone === 'guide' ? '0 1px 0 rgba(255,255,255,.7)' : '0 2px 0 rgba(0,0,0,.35)' }}>{text}</span>
    </motion.div>
  )
}

/** Feedback state for the sign: flash('ok'|'try') shows it for a moment, then
    the instruction returns. `hold` keeps it (e.g. the win "Nice!"). */
export function useGuideFeedback() {
  const [fb, setFb] = useState(null)
  const id = useRef(null)
  useEffect(() => () => clearTimeout(id.current), [])
  const flash = (tone, ms = 1500) => { clearTimeout(id.current); setFb(tone); if (ms) id.current = setTimeout(() => setFb(null), ms) }
  const clear = () => { clearTimeout(id.current); setFb(null) }
  return [fb, flash, clear]
}

/** Dot pips for 1..n: language-free numbers a child can count. */
export function Pips({ n, color = '#fff', size = 5, className = '' }) {
  return (
    <span data-testid="pips" data-n={n} aria-hidden="true" className={`flex flex-wrap items-center justify-center gap-[2px] ${className}`} style={{ width: (size + 2) * 4 }}>
      {Array.from({ length: n }, (_, i) => <span key={i} className="rounded-full" style={{ width: size, height: size, background: color, boxShadow: '0 1px 0 rgba(0,0,0,.35)' }} />)}
    </span>
  )
}

/** Shared accessible names for the round buttons (i18n, English fallback). */
export const brickLabels = () => ({
  listen: t('echoTapHear', 'Tap to hear'),
  again: t('brickAgain', 'Start over'),
  hint: t('brickHint', 'Show me'),
  next: t('brickNext', 'Next'),
  good: t('nice', 'Nice!'),
  retry: t('brickTryAgain', 'Try again!'),
})

export function WoodBottomBar({ children }) {
  return (
    <div className="mx-2 my-2 flex items-center justify-between rounded-full px-3 py-2" style={{ ...WOOD, border: '3px solid #7a4a20', boxShadow: 'inset 0 3px 0 rgba(255,255,255,.3), 0 4px 0 #5a3414' }}>
      {children}
    </div>
  )
}

export function WoodTray({ children, className = '', style }) {
  return (
    <div className={`relative flex flex-col gap-2 rounded-3xl px-3 pb-3 pt-6 ${className}`}
      style={{ ...WOOD, flex: '0 0 auto', marginTop: -18, border: '4px solid #8a5426', boxShadow: 'inset 0 4px 0 rgba(255,255,255,.3), inset 0 -6px 10px rgba(0,0,0,.25), 0 -6px 14px rgba(0,0,0,.25)', ...style }}>
      {children}
    </div>
  )
}

/** The inset well that loose bricks sit in. */
export function TrayWell({ children, className = '' }) {
  return (
    <div className={`rounded-2xl px-1 pb-3 pt-2 ${className}`} style={{ background: 'rgba(90,52,20,.25)', boxShadow: 'inset 0 3px 6px rgba(0,0,0,.3)' }}>{children}</div>
  )
}

/** A studded baseplate: stud pattern is pure CSS so it scales to any size. */
export function Baseplate({ children, color = '#3fae4a', stud = 26, className = '', style, testId }) {
  const hi = shade(color, 0.4), lo = shade(color, -0.35)
  return (
    <div data-testid={testId} className={`relative rounded-2xl ${className}`}
      style={{
        backgroundColor: color,
        backgroundImage: `radial-gradient(ellipse at 50% 38%, #fff8 0 7%, ${hi} 9%, ${shade(color, 0.12)} 30%, ${lo} 36%, transparent 40%), linear-gradient(180deg, ${shade(color, 0.12)}, ${color})`,
        backgroundSize: `${stud}px ${stud * 0.8}px, 100% 100%`,
        border: `2px solid ${shade(color, -0.4)}`,
        boxShadow: `inset 0 3px 0 rgba(255,255,255,.35), 0 10px 0 ${shade(color, -0.45)}, 0 18px 18px rgba(0,0,0,.35)`,
        ...style,
      }}>
      {children}
    </div>
  )
}

/** A glossy studded brick (static). */
export function BrickTile({ color, studs = 1, width, height, depth = 5, children, className = '', style, testId }) {
  const sz = Math.min(26, (width || 60) / (studs + 0.6))
  return (
    <div data-testid={testId} className={`geez relative flex select-none items-center justify-center rounded-lg font-black text-white ${className}`}
      style={{ width, height, ...brickCss(color, depth), textShadow: `0 2px 0 ${shade(color, -0.4)}`, ...style }}>
      {Array.from({ length: studs }, (_, i) => (
        <span key={i} className="absolute" style={{ top: -sz * 0.5, left: `${((i + 0.5) / studs) * 100}%`, transform: 'translateX(-50%)', ...studCss(color, sz) }} />
      ))}
      {children}
    </div>
  )
}

/** Pointer-draggable brick. onDrop(pt|null): pt = release point if it was a
    drag, null for a tap / Enter / Space (the tap fallback). */
export function DragBrick({ char, color, wobble, used, onDrop, reduce, w = 46, h = 60, fontSize = 28, studs = 1, studSize, label, testId = 'piece', dataOrder, className = '', children, noDrag }) {
  const [drag, setDrag] = useState(null)
  const sz = studSize || Math.min(26, w / (studs + 0.6))
  const down = (e) => {
    if (used) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ sx: e.clientX, sy: e.clientY, dx: 0, dy: 0 })
  }
  const move = (e) => { if (drag && !noDrag) setDrag({ ...drag, dx: e.clientX - drag.sx, dy: e.clientY - drag.sy }) }
  const up = (e) => {
    if (!drag) return
    const moved = Math.hypot(drag.dx, drag.dy) > 12
    setDrag(null)
    onDrop(moved ? { x: e.clientX, y: e.clientY } : null)
  }
  return (
    <motion.button
      type="button"
      data-testid={testId}
      data-order={dataOrder}
      aria-label={label ?? char}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => setDrag(null)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDrop(null) } }}
      className={`geez relative flex touch-none select-none items-center justify-center rounded-lg font-black text-white ${className}`}
      style={{
        width: w, height: h, fontSize, ...brickCss(color, 5), opacity: used ? 0.35 : 1, zIndex: drag ? 30 : 1,
        textShadow: `0 2px 0 ${shade(color, -0.4)}`,
        x: drag ? drag.dx : 0, y: drag ? drag.dy : 0, scale: drag ? 1.12 : 1, cursor: used ? 'default' : 'grab',
      }}
      animate={wobble && !reduce ? { rotate: [0, -14, 12, -8, 5, 0], x: [0, -6, 6, -4, 0] } : { rotate: 0 }}
      transition={{ duration: 0.55 }}
    >
      {Array.from({ length: studs }, (_, i) => (
        <span key={i} className="absolute" style={{ top: -sz * 0.5, left: `${((i + 0.5) / studs) * 100}%`, transform: 'translateX(-50%)', ...studCss(color, sz) }} />
      ))}
      {char}
      {children}
    </motion.button>
  )
}

/** Is a client point inside an element's rect (+ a generous pad for small hands)? */
export function overRect(el, pt, pad = 40) {
  const r = el?.getBoundingClientRect()
  if (!r) return false
  return pt.x >= r.left - pad && pt.x <= r.right + pad && pt.y >= r.top - pad && pt.y <= r.bottom + pad
}

/** A burst of falling coloured bricks (win celebration). */
export function Confetti({ count = 24, reduce }) {
  if (reduce) return null
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true" data-testid="confetti">
      {Array.from({ length: count }, (_, i) => {
        const c = BRICK_COLORS[i % 7]
        return (
          <motion.span key={i} className="absolute rounded-[3px]"
            style={{ left: `${(i * 37) % 100}%`, top: -20, width: 18, height: 12, background: c, boxShadow: `0 3px 0 ${shade(c, -0.4)}, inset 0 2px 0 rgba(255,255,255,.5)` }}
            initial={{ y: -20, rotate: 0, opacity: 1 }} animate={{ y: 900, rotate: 540 + i * 30, opacity: [1, 1, 0.9] }}
            transition={{ duration: 2.2 + (i % 5) * 0.25, delay: (i % 8) * 0.07, ease: 'easeIn' }} />
        )
      })}
    </div>
  )
}
