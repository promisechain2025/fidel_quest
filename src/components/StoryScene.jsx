/* ============================================================================
   STORY SCENE — full illustrated picture-book panels, drawn in code
   ----------------------------------------------------------------------------
   A story page is not a floating sticker any more: it is a little illustrated
   scene, the way a picture book has a picture. Each page carries a compact
   `scene` descriptor { bg, items } and this renderer paints it: a background
   (day / field / night / indoor / kitchen), then character + prop STAMPS
   placed by fractional coordinates. Stamps reuse the owned Pictures drawings
   where one exists (cat, cow, lemon, honey, ...) and add the people/animals a
   storybook needs (a child, a lion, a leopard, a book, a heart).

   Flat, chunky, offline, no image assets - the same code-drawn style as the
   rest of eGeez. jsdom has no canvas, so getContext is guarded: no scene in
   tests, never a crash. Falls back to the plain emoji when a page has no
   scene, so the contract never breaks.
   ========================================================================== */
import { useEffect, useRef } from 'react'
import { stampPicture } from './Pictures'

/* ── palette ───────────────────────────────────────────────────────────── */
const C = {
  ink: '#2f2a22',
  skinDeep: '#8a5a34',
  skin: '#b87a44',
  skinLight: '#d59a63',
  hair: '#241812',
  cloth1: '#d9642e', // warm orange
  cloth2: '#3f8f7a', // teal
  cloth3: '#c8103e', // red-magenta
  cloth4: '#4b6bb0', // blue
  lionGold: '#e0a94a',
  lionMane: '#b5762a',
  leopard: '#e9c15c',
  cream: '#fff7e6',
  gold: '#e0b25a',
}
function circle(g, x, y, r, fill) {
  g.fillStyle = fill
  g.beginPath()
  g.arc(x, y, r, 0, 7)
  g.fill()
}

/* ── backgrounds ───────────────────────────────────────────────────────── */
function skyGradient(g, W, H, top, bot) {
  const grad = g.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, top)
  grad.addColorStop(1, bot)
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
}
function hills(g, W, H, gy, near, far) {
  g.fillStyle = far
  g.beginPath()
  g.moveTo(0, gy)
  g.quadraticCurveTo(W * 0.28, gy - H * 0.22, W * 0.55, gy - H * 0.02)
  g.quadraticCurveTo(W * 0.8, gy - H * 0.2, W, gy - H * 0.05)
  g.lineTo(W, gy)
  g.closePath()
  g.fill()
  g.fillStyle = near
  g.fillRect(0, gy, W, H - gy)
}
function acacia(g, x, gy, s, leaf) {
  g.strokeStyle = '#8a6a3a'
  g.lineWidth = s * 0.06
  g.beginPath()
  g.moveTo(x, gy)
  g.lineTo(x, gy - s * 0.55)
  g.stroke()
  g.fillStyle = leaf
  g.beginPath()
  g.ellipse(x, gy - s * 0.62, s * 0.42, s * 0.16, 0, 0, 7)
  g.fill()
}
function star(g, x, y, r) {
  g.fillStyle = 'rgba(255,255,255,0.9)'
  g.beginPath()
  g.arc(x, y, r, 0, 7)
  g.fill()
}
const BG = {
  day(g, W, H) {
    skyGradient(g, W, H, '#bfe6ff', '#eaf6ff')
    stampPicture(g, '☀️', W * 0.83, H * 0.2, W * 0.2)
    hills(g, W, H, H * 0.72, '#7fbf63', '#a7d488')
  },
  field(g, W, H) {
    skyGradient(g, W, H, '#bfe6ff', '#edf7ec')
    stampPicture(g, '☀️', W * 0.16, H * 0.2, W * 0.18)
    hills(g, W, H, H * 0.7, '#83c165', '#aad98a')
    acacia(g, W * 0.86, H * 0.72, W * 0.3, '#6faf58')
    acacia(g, W * 0.12, H * 0.74, W * 0.22, '#84c168')
  },
  night(g, W, H) {
    skyGradient(g, W, H, '#1a2350', '#3a3b74')
    for (const [x, y, r] of [[0.2, 0.2, 2.4], [0.35, 0.12, 1.6], [0.6, 0.22, 2], [0.72, 0.1, 1.5], [0.5, 0.3, 1.4], [0.86, 0.28, 2]]) star(g, W * x, H * y, r)
    stampPicture(g, '🌙', W * 0.8, H * 0.22, W * 0.2)
    hills(g, W, H, H * 0.74, '#33507e', '#40608e')
  },
  indoor(g, W, H) {
    skyGradient(g, W, H, '#f3e2c4', '#efd9b4')
    // window with a slice of sky
    const wx = W * 0.1, wy = H * 0.12, ww = W * 0.26, wh = H * 0.34
    g.fillStyle = '#bfe6ff'
    g.fillRect(wx, wy, ww, wh)
    g.strokeStyle = '#a9713f'
    g.lineWidth = W * 0.014
    g.strokeRect(wx, wy, ww, wh)
    g.beginPath()
    g.moveTo(wx + ww / 2, wy)
    g.lineTo(wx + ww / 2, wy + wh)
    g.moveTo(wx, wy + wh / 2)
    g.lineTo(wx + ww, wy + wh / 2)
    g.stroke()
    // floor
    g.fillStyle = '#caa26a'
    g.fillRect(0, H * 0.72, W, H * 0.28)
    g.strokeStyle = 'rgba(120,86,44,0.35)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(0, H * 0.72)
    g.lineTo(W, H * 0.72)
    g.stroke()
  },
  kitchen(g, W, H) {
    skyGradient(g, W, H, '#f6ddba', '#f0cf9f')
    // a shelf
    g.fillStyle = '#b98a4f'
    g.fillRect(W * 0.5, H * 0.24, W * 0.44, H * 0.05)
    stampPicture(g, '🍯', W * 0.62, H * 0.19, W * 0.12)
    stampPicture(g, '☕', W * 0.78, H * 0.18, W * 0.13)
    g.fillStyle = '#c99a5a'
    g.fillRect(0, H * 0.72, W, H * 0.28)
  },
}

/* ── people (parametric) ───────────────────────────────────────────────── */
/* footY is the ground baseline; h is full body height. */
function person(g, cx, footY, h, o = {}) {
  const skin = o.skin || C.skin
  const hair = o.hair || C.hair
  const cloth = o.cloth || C.cloth1
  const headR = h * 0.17
  const headY = footY - h + headR
  const bodyTop = headY + headR * 0.8
  const bodyBot = footY - h * 0.14
  const halfBottom = h * 0.2
  // dress / tunic
  g.fillStyle = cloth
  g.beginPath()
  g.moveTo(cx - h * 0.085, bodyTop)
  g.lineTo(cx + h * 0.085, bodyTop)
  g.lineTo(cx + halfBottom, bodyBot)
  g.lineTo(cx - halfBottom, bodyBot)
  g.closePath()
  g.fill()
  // legs
  g.strokeStyle = skin
  g.lineWidth = h * 0.06
  g.lineCap = 'round'
  for (const dx of [-h * 0.08, h * 0.08]) {
    g.beginPath()
    g.moveTo(cx + dx, bodyBot)
    g.lineTo(cx + dx, footY)
    g.stroke()
  }
  // arms
  g.strokeStyle = cloth
  g.lineWidth = h * 0.052
  const armY = bodyTop + h * 0.04
  const raise = o.wave ? -h * 0.24 : h * 0.16
  g.beginPath()
  g.moveTo(cx - h * 0.075, armY)
  g.lineTo(cx - halfBottom * 0.95, armY + h * 0.18)
  g.stroke()
  g.beginPath()
  g.moveTo(cx + h * 0.075, armY)
  g.lineTo(cx + halfBottom * 0.95, armY + raise)
  g.stroke()
  // head
  circle(g, cx, headY, headR, skin)
  // hair
  g.fillStyle = hair
  if (o.hairStyle === 'short') {
    g.beginPath()
    g.arc(cx, headY, headR * 1.04, Math.PI * 1.02, Math.PI * 2 - 0.02)
    g.fill()
  } else {
    // rounded hair cap + two puffs (child/woman)
    g.beginPath()
    g.arc(cx, headY, headR * 1.05, Math.PI * 0.98, Math.PI * 2.02)
    g.fill()
    for (const side of [-1, 1]) circle(g, cx + side * headR * 1.0, headY + headR * 0.15, headR * 0.42, hair)
  }
  // face
  for (const side of [-1, 1]) circle(g, cx + side * headR * 0.36, headY + headR * 0.1, headR * 0.11, C.ink)
  g.strokeStyle = C.ink
  g.lineWidth = headR * 0.12
  g.lineCap = 'round'
  g.beginPath()
  g.arc(cx, headY + headR * 0.24, headR * 0.36, 0.16 * Math.PI, 0.84 * Math.PI)
  g.stroke()
  if (o.blush) {
    g.fillStyle = 'rgba(230,120,90,0.4)'
    for (const side of [-1, 1]) circle(g, cx + side * headR * 0.6, headY + headR * 0.36, headR * 0.16, 'rgba(230,120,90,0.4)')
  }
}

/* ── lion (Anbessa-flavoured, sitting) ─────────────────────────────────── */
function lion(g, cx, footY, h) {
  const bodyR = h * 0.3
  const by = footY - bodyR
  // body
  circle(g, cx, by, bodyR, C.lionGold)
  // paws
  for (const side of [-1, 1]) circle(g, cx + side * bodyR * 0.5, footY - bodyR * 0.15, bodyR * 0.28, C.lionGold)
  const hy = by - bodyR * 0.9
  const hr = h * 0.2
  // mane
  g.fillStyle = C.lionMane
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    circle(g, cx + Math.cos(a) * hr * 1.15, hy + Math.sin(a) * hr * 1.15, hr * 0.34, C.lionMane)
  }
  circle(g, cx, hy, hr, C.lionGold) // face
  // ears
  for (const side of [-1, 1]) circle(g, cx + side * hr * 0.7, hy - hr * 0.7, hr * 0.22, C.lionGold)
  // eyes + nose + smile
  for (const side of [-1, 1]) circle(g, cx + side * hr * 0.34, hy - hr * 0.05, hr * 0.1, C.ink)
  g.fillStyle = '#7a4a2a'
  g.beginPath()
  g.moveTo(cx - hr * 0.14, hy + hr * 0.28)
  g.lineTo(cx + hr * 0.14, hy + hr * 0.28)
  g.lineTo(cx, hy + hr * 0.44)
  g.closePath()
  g.fill()
  g.strokeStyle = C.ink
  g.lineWidth = hr * 0.08
  g.lineCap = 'round'
  g.beginPath()
  g.arc(cx - hr * 0.18, hy + hr * 0.5, hr * 0.18, 0, Math.PI)
  g.arc(cx + hr * 0.18, hy + hr * 0.5, hr * 0.18, 0, Math.PI)
  g.stroke()
}

/* ── leopard (standing, spotted) ───────────────────────────────────────── */
function leopard(g, cx, footY, h, o = {}) {
  const dir = o.flip ? -1 : 1
  const bw = h * 0.62, bh = h * 0.3
  const by = footY - h * 0.34
  g.save()
  g.translate(cx, 0)
  g.scale(dir, 1)
  // legs
  g.strokeStyle = C.leopard
  g.lineWidth = h * 0.08
  g.lineCap = 'round'
  for (const dx of [-bw * 0.32, -bw * 0.05, bw * 0.2, bw * 0.4]) {
    g.beginPath()
    g.moveTo(dx, by + bh * 0.5)
    g.lineTo(dx, footY)
    g.stroke()
  }
  // body
  g.fillStyle = C.leopard
  g.beginPath()
  g.ellipse(0, by, bw * 0.5, bh, 0, 0, 7)
  g.fill()
  // tail
  g.strokeStyle = C.leopard
  g.lineWidth = h * 0.06
  g.beginPath()
  g.moveTo(-bw * 0.48, by)
  g.quadraticCurveTo(-bw * 0.7, by - bh, -bw * 0.6, by - bh * 1.5)
  g.stroke()
  // head
  const hx = bw * 0.44, hy = by - bh * 0.5, hr = h * 0.16
  circle(g, hx, hy, hr, C.leopard)
  for (const side of [-1, 1]) circle(g, hx + side * hr * 0.6, hy - hr * 0.8, hr * 0.28, C.leopard)
  circle(g, hx + hr * 0.4, hy + hr * 0.1, hr * 0.12, C.ink) // eye
  circle(g, hx + hr * 0.9, hy + hr * 0.3, hr * 0.14, '#7a4a2a') // nose
  // spots
  g.fillStyle = 'rgba(120,80,30,0.75)'
  for (const [sx, sy] of [[-0.2, -0.3], [0.05, 0.1], [-0.35, 0.2], [0.25, -0.2], [-0.05, -0.4]]) {
    g.beginPath()
    g.arc(sx * bw, by + sy * bh, h * 0.03, 0, 7)
    g.fill()
  }
  g.restore()
}

/* ── open book + heart + rug + pond + dust ─────────────────────────────── */
function book(g, cx, cy, s) {
  g.fillStyle = '#8a5a34'
  g.beginPath()
  g.moveTo(cx, cy - s * 0.06)
  g.lineTo(cx, cy + s * 0.42)
  g.stroke?.()
  for (const side of [-1, 1]) {
    g.fillStyle = C.cream
    g.beginPath()
    g.moveTo(cx, cy - s * 0.05)
    g.lineTo(cx + side * s * 0.5, cy - s * 0.16)
    g.lineTo(cx + side * s * 0.5, cy + s * 0.32)
    g.lineTo(cx, cy + s * 0.4)
    g.closePath()
    g.fill()
    g.strokeStyle = '#caa26a'
    g.lineWidth = s * 0.02
    g.stroke()
    g.strokeStyle = 'rgba(120,86,44,0.4)'
    g.lineWidth = s * 0.014
    for (let i = 1; i <= 3; i++) {
      g.beginPath()
      g.moveTo(cx + side * s * 0.1, cy - s * 0.04 + i * s * 0.09)
      g.lineTo(cx + side * s * 0.42, cy - s * 0.09 + i * s * 0.09)
      g.stroke()
    }
  }
}
function heart(g, cx, cy, s) {
  g.fillStyle = C.cloth3
  g.beginPath()
  g.moveTo(cx, cy + s * 0.32)
  g.bezierCurveTo(cx - s * 0.55, cy - s * 0.1, cx - s * 0.2, cy - s * 0.42, cx, cy - s * 0.16)
  g.bezierCurveTo(cx + s * 0.2, cy - s * 0.42, cx + s * 0.55, cy - s * 0.1, cx, cy + s * 0.32)
  g.fill()
}
function rug(g, cx, cy, w) {
  g.fillStyle = '#c98a5a'
  g.beginPath()
  g.ellipse(cx, cy, w * 0.5, w * 0.16, 0, 0, 7)
  g.fill()
  g.strokeStyle = '#a9713f'
  g.lineWidth = w * 0.02
  g.beginPath()
  g.ellipse(cx, cy, w * 0.42, w * 0.13, 0, 0, 7)
  g.stroke()
}
function pond(g, cx, cy, w) {
  g.fillStyle = '#4db3ef'
  g.beginPath()
  g.ellipse(cx, cy, w * 0.5, w * 0.2, 0, 0, 7)
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,0.55)'
  g.lineWidth = w * 0.02
  g.beginPath()
  g.arc(cx - w * 0.1, cy, w * 0.12, 0.2, 1.2)
  g.stroke()
}
function dust(g, cx, cy, s) {
  g.strokeStyle = 'rgba(120,90,50,0.5)'
  g.lineWidth = s * 0.08
  g.lineCap = 'round'
  for (const dx of [0, 0.2, 0.4]) {
    g.beginPath()
    g.arc(cx + dx * s, cy, s * 0.18, Math.PI * 0.1, Math.PI * 0.9)
    g.stroke()
  }
}
function sleepZ(g, cx, cy, s) {
  g.fillStyle = C.ink
  g.font = `bold ${s}px sans-serif`
  g.globalAlpha = 0.6
  g.fillText('z', cx, cy)
  g.fillText('Z', cx + s * 0.7, cy - s * 0.7)
  g.globalAlpha = 1
}
function note(g, cx, cy, s) {
  g.fillStyle = C.ink
  g.font = `bold ${s}px sans-serif`
  g.globalAlpha = 0.7
  g.fillText('♪', cx, cy)
  g.globalAlpha = 1
}

/* ── stamp dispatch ────────────────────────────────────────────────────── */
// Reused owned pictures (Pictures.jsx) by semantic key.
const EMOJI = {
  cat: '🐱', cow: '🐄', dog: '🐶', bird: '🐦', lemon: '🍋', honey: '🍯',
  milk: '🥛', pot: '🍲', water: '💧', tree: '🌳', star: '⭐', house: '🏠', ball: '🔴', sun: '☀️', moon: '🌙',
}
function drawItem(g, W, H, it) {
  const cx = it.x * W
  const cy = it.y * H
  const s = (it.s || 0.3) * W
  const foot = it.foot != null ? it.foot * H : cy
  switch (it.k) {
    case 'person': return person(g, cx, foot, s, it)
    case 'lion': return lion(g, cx, foot, s)
    case 'leopard': return leopard(g, cx, foot, s, it)
    case 'book': return book(g, cx, cy, s)
    case 'heart': return heart(g, cx, cy, s)
    case 'rug': return rug(g, cx, cy, s)
    case 'pond': return pond(g, cx, cy, s)
    case 'dust': return dust(g, cx, cy, s)
    case 'zzz': return sleepZ(g, cx, cy, s)
    case 'note': return note(g, cx, cy, s)
    default: {
      const emoji = EMOJI[it.k] || it.k
      return stampPicture(g, emoji, cx, cy, s)
    }
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function paintScene(g, W, H, scene) {
  ;(BG[scene?.bg] || BG.day)(g, W, H)
  for (const it of scene?.items || []) {
    if (it.flip && it.k !== 'leopard') {
      g.save()
      g.translate(it.x * W * 2, 0)
      g.scale(-1, 1)
      drawItem(g, W, H, it)
      g.restore()
    } else {
      drawItem(g, W, H, it)
    }
  }
}

/**
 * A full illustrated page panel. Renders the `scene` if the page has one; the
 * caller keeps a plain-emoji fallback for pages/scenes without art.
 */
export default function StoryScene({ scene, width = 320, height = 208, className = '', rounded = 22 }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const W = 800, Hh = 520
    c.width = W
    c.height = Hh
    const g = c.getContext('2d')
    if (!g) return
    g.clearRect(0, 0, W, Hh)
    g.save()
    // clip to rounded rect so the scene sits in a page-window
    const r = (rounded / width) * W
    g.beginPath()
    g.moveTo(r, 0)
    g.arcTo(W, 0, W, Hh, r)
    g.arcTo(W, Hh, 0, Hh, r)
    g.arcTo(0, Hh, 0, 0, r)
    g.arcTo(0, 0, W, 0, r)
    g.closePath()
    g.clip()
    paintScene(g, W, Hh, scene)
    g.restore()
  }, [scene, width, rounded])
  return <canvas ref={ref} className={className} style={{ width, height, borderRadius: rounded }} aria-hidden="true" />
}
