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
/* A soft rounded cloud. */
function cloud(g, cx, cy, w) {
  g.fillStyle = 'rgba(255,255,255,0.9)'
  for (const [ox, oy, r] of [[-0.5, 0.1, 0.34], [-0.1, -0.1, 0.42], [0.35, 0.05, 0.34], [0.05, 0.2, 0.3]]) {
    g.beginPath()
    g.arc(cx + ox * w, cy + oy * w, r * w, 0, 7)
    g.fill()
  }
}
/* Little foreground grass/straw tufts along a ground line. */
function tufts(g, W, y, color, count = 22, hgt = 16) {
  g.strokeStyle = color
  g.lineWidth = 3
  g.lineCap = 'round'
  for (let i = 0; i < count; i++) {
    const x = ((i + (i % 3) * 0.3) / count) * W
    const hh = hgt * (0.6 + (i % 4) * 0.16)
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x - hh * 0.28, y - hh)
    g.moveTo(x, y)
    g.lineTo(x, y - hh * 1.15)
    g.moveTo(x, y)
    g.lineTo(x + hh * 0.28, y - hh)
    g.stroke()
  }
}
const BG = {
  day(g, W, H) {
    skyGradient(g, W, H, '#bfe6ff', '#eaf6ff')
    cloud(g, W * 0.24, H * 0.2, W * 0.14)
    stampPicture(g, '☀️', W * 0.83, H * 0.18, W * 0.2)
    hills(g, W, H, H * 0.72, '#7fbf63', '#a7d488')
    tufts(g, W, H * 0.96, '#6bae53')
  },
  field(g, W, H) {
    skyGradient(g, W, H, '#bfe6ff', '#edf7ec')
    cloud(g, W * 0.62, H * 0.16, W * 0.12)
    stampPicture(g, '☀️', W * 0.16, H * 0.18, W * 0.18)
    hills(g, W, H, H * 0.7, '#83c165', '#aad98a')
    acacia(g, W * 0.86, H * 0.72, W * 0.3, '#6faf58')
    acacia(g, W * 0.12, H * 0.74, W * 0.22, '#84c168')
    tufts(g, W, H * 0.97, '#72b356')
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
  stable(g, W, H) {
    // warm wooden barn wall with plank lines and a dark beam
    skyGradient(g, W, H, '#7c5330', '#8a5c34')
    g.strokeStyle = 'rgba(60,38,20,0.35)'
    g.lineWidth = 2
    for (let y = H * 0.12; y < H * 0.7; y += H * 0.11) {
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(W, y)
      g.stroke()
    }
    g.fillStyle = '#5b3c22'
    g.fillRect(0, H * 0.06, W, H * 0.04) // top beam
    // hay floor
    g.fillStyle = '#d9b45c'
    g.fillRect(0, H * 0.72, W, H * 0.28)
    g.strokeStyle = 'rgba(150,110,50,0.5)'
    g.lineWidth = 3
    for (let i = 0; i < 14; i++) {
      const x = (i / 14) * W
      g.beginPath()
      g.moveTo(x, H * 0.74)
      g.lineTo(x + W * 0.03, H * 0.78)
      g.stroke()
    }
    tufts(g, W, H * 0.99, '#c79a3f', 20, 14)
    // warm lantern glow so the stable feels cosy (sits behind the figures)
    const glow = g.createRadialGradient(W * 0.5, H * 0.5, H * 0.04, W * 0.5, H * 0.55, H * 0.62)
    glow.addColorStop(0, 'rgba(255,206,120,0.4)')
    glow.addColorStop(1, 'rgba(255,206,120,0)')
    g.fillStyle = glow
    g.fillRect(0, 0, W, H)
  },
  sea(g, W, H) {
    skyGradient(g, W, H, '#bfe6ff', '#dff1ff')
    cloud(g, W * 0.2, H * 0.16, W * 0.13)
    cloud(g, W * 0.72, H * 0.12, W * 0.11)
    // water
    const wy = H * 0.56
    const water = g.createLinearGradient(0, wy, 0, H)
    water.addColorStop(0, '#3f9fd6')
    water.addColorStop(1, '#2b6fa8')
    g.fillStyle = water
    g.fillRect(0, wy, W, H - wy)
    g.strokeStyle = 'rgba(255,255,255,0.4)' // wave crests
    g.lineWidth = 3
    for (let r = 0; r < 5; r++) {
      const y = wy + H * 0.08 + r * H * 0.09
      g.beginPath()
      for (let x = 0; x <= W; x += W * 0.1) g.quadraticCurveTo(x + W * 0.025, y - 6, x + W * 0.05, y)
      g.stroke()
    }
  },
  garden(g, W, H) {
    skyGradient(g, W, H, '#c3ebff', '#eaffe4')
    stampPicture(g, '☀️', W * 0.85, H * 0.16, W * 0.17)
    cloud(g, W * 0.2, H * 0.15, W * 0.12)
    hills(g, W, H, H * 0.68, '#72bb52', '#9ad47c')
    // extra shrubs
    for (const [x, s] of [[0.08, 0.16], [0.93, 0.2], [0.5, 0.13]]) {
      g.fillStyle = '#6fae55'
      g.beginPath()
      g.ellipse(W * x, H * 0.7, W * s * 0.5, H * 0.07, 0, 0, 7)
      g.fill()
    }
    // little flowers
    for (const [x, y, c] of [[0.16, 0.8, '#e86a8e'], [0.3, 0.86, '#f2b840'], [0.7, 0.84, '#e86a8e'], [0.84, 0.8, '#f2b840']]) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        circle(g, W * x + Math.cos(a) * 7, H * y + Math.sin(a) * 7, 5, c)
      }
      circle(g, W * x, H * y, 5, '#fff2b0')
    }
    tufts(g, W, H * 0.98, '#6bae53')
  },
  den(g, W, H) {
    // a stone cave: dark rocky walls, a lit floor, a shaft of light from a gap
    skyGradient(g, W, H, '#2a241f', '#3b332a')
    g.fillStyle = '#241d17'
    g.beginPath() // cave mouth arch (dark) framing the top corners
    g.moveTo(0, 0)
    g.lineTo(W, 0)
    g.lineTo(W, H * 0.2)
    g.quadraticCurveTo(W * 0.5, H * 0.42, 0, H * 0.2)
    g.closePath()
    g.fill()
    // shaft of light from a gap up top
    const beam = g.createLinearGradient(W * 0.5, 0, W * 0.5, H * 0.85)
    beam.addColorStop(0, 'rgba(255,240,190,0.28)')
    beam.addColorStop(1, 'rgba(255,240,190,0)')
    g.fillStyle = beam
    g.beginPath()
    g.moveTo(W * 0.42, 0)
    g.lineTo(W * 0.58, 0)
    g.lineTo(W * 0.72, H * 0.85)
    g.lineTo(W * 0.28, H * 0.85)
    g.closePath()
    g.fill()
    // stone floor
    g.fillStyle = '#5a4c3c'
    g.fillRect(0, H * 0.74, W, H * 0.26)
    g.strokeStyle = 'rgba(0,0,0,0.3)'
    g.lineWidth = 3
    for (const [x, y] of [[0.2, 0.82], [0.55, 0.86], [0.8, 0.8]]) {
      g.beginPath()
      g.ellipse(W * x, H * y, W * 0.08, H * 0.02, 0, 0, 7)
      g.stroke()
    }
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
  const robe = !!o.robe
  const bottomHalf = robe ? h * 0.24 : halfBottom
  const bottomY = robe ? footY : bodyBot
  // robe / dress / tunic
  g.fillStyle = cloth
  g.beginPath()
  g.moveTo(cx - h * 0.085, bodyTop)
  g.lineTo(cx + h * 0.085, bodyTop)
  g.lineTo(cx + bottomHalf, bottomY)
  g.lineTo(cx - bottomHalf, bottomY)
  g.closePath()
  g.fill()
  // soft shading on the right half + a neckline, for depth
  g.save()
  g.globalAlpha = 0.13
  g.fillStyle = '#000'
  g.beginPath()
  g.moveTo(cx, bodyTop)
  g.lineTo(cx + h * 0.085, bodyTop)
  g.lineTo(cx + bottomHalf, bottomY)
  g.lineTo(cx, bottomY)
  g.closePath()
  g.fill()
  g.restore()
  g.strokeStyle = 'rgba(0,0,0,0.18)'
  g.lineWidth = h * 0.018
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(cx - h * 0.05, bodyTop + h * 0.005)
  g.lineTo(cx, bodyTop + h * 0.055)
  g.lineTo(cx + h * 0.05, bodyTop + h * 0.005)
  g.stroke()
  if (robe) {
    g.strokeStyle = o.sash || 'rgba(0,0,0,0.16)' // sash
    g.lineWidth = h * 0.03
    g.beginPath()
    g.moveTo(cx - h * 0.085, bodyTop + h * 0.17)
    g.lineTo(cx + h * 0.085, bodyTop + h * 0.17)
    g.stroke()
    g.fillStyle = skin // feet peek
    for (const dx of [-h * 0.09, h * 0.09]) {
      g.beginPath()
      g.ellipse(cx + dx, footY, h * 0.055, h * 0.03, 0, 0, 7)
      g.fill()
    }
  } else {
    g.strokeStyle = skin // bare legs
    g.lineWidth = h * 0.06
    g.lineCap = 'round'
    for (const dx of [-h * 0.08, h * 0.08]) {
      g.beginPath()
      g.moveTo(cx + dx, bodyBot)
      g.lineTo(cx + dx, footY)
      g.stroke()
    }
  }
  // arms (softly curved) ending in little hands
  const armY = bodyTop + h * 0.04
  const raise = o.wave ? -h * 0.24 : h * 0.16
  const lHand = { x: cx - bottomHalf * 0.92, y: armY + (o.hold ? h * 0.1 : h * 0.2) }
  const rHand = { x: cx + bottomHalf * 0.92, y: armY + raise }
  g.strokeStyle = cloth
  g.lineWidth = robe ? h * 0.062 : h * 0.052
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(cx - h * 0.075, armY)
  g.quadraticCurveTo(cx - bottomHalf * 0.72, armY + h * 0.03, lHand.x, lHand.y)
  g.stroke()
  g.beginPath()
  g.moveTo(cx + h * 0.075, armY)
  g.quadraticCurveTo(cx + bottomHalf * 0.72, armY + h * 0.03, rHand.x, rHand.y)
  g.stroke()
  circle(g, lHand.x, lHand.y, h * 0.045, skin)
  circle(g, rHand.x, rHand.y, h * 0.045, skin)
  // shepherd's / traveller's staff, right hand
  if (o.staff) {
    const sx = cx + bottomHalf * 0.9
    g.strokeStyle = '#8a5a34'
    g.lineWidth = h * 0.035
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(sx, footY + h * 0.02)
    g.lineTo(sx, headY - h * 0.16)
    g.stroke()
    g.beginPath()
    g.arc(sx - h * 0.055, headY - h * 0.16, h * 0.055, -0.1 * Math.PI, Math.PI, true)
    g.stroke()
  }
  // a spear (Goliath)
  if (o.spear) {
    const px = cx + bottomHalf * 0.92
    g.strokeStyle = '#8a5a34'
    g.lineWidth = h * 0.03
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(px, footY + h * 0.03)
    g.lineTo(px, headY - h * 0.34)
    g.stroke()
    g.fillStyle = '#aab0b8'
    g.beginPath()
    g.moveTo(px, headY - h * 0.46)
    g.lineTo(px - h * 0.035, headY - h * 0.34)
    g.lineTo(px + h * 0.035, headY - h * 0.34)
    g.closePath()
    g.fill()
  }
  // ── head: covering (back mantle) -> skin -> hair/beard -> hood rim -> face ──
  const covered = o.head === 'scarf' || o.head === 'cloth'
  const headCol = o.headColor || (o.head === 'scarf' ? '#4f6bbf' : '#e6d5aa')
  const headShade = o.head === 'scarf' ? '#3c53a0' : '#c9b184'
  if (covered) {
    // a soft mantle from the crown down over the shoulders (drawn behind head)
    g.fillStyle = headShade
    g.beginPath()
    g.moveTo(cx - headR * 1.16, headY - headR * 0.05)
    g.quadraticCurveTo(cx - headR * 1.5, headY + headR * 1.35, cx - headR * 0.85, headY + headR * 2.1)
    g.quadraticCurveTo(cx, headY + headR * 2.4, cx + headR * 0.85, headY + headR * 2.1)
    g.quadraticCurveTo(cx + headR * 1.5, headY + headR * 1.35, cx + headR * 1.16, headY - headR * 0.05)
    g.quadraticCurveTo(cx, headY - headR * 1.5, cx - headR * 1.16, headY - headR * 0.05)
    g.closePath()
    g.fill()
  }
  // halo (behind the head)
  if (o.halo) {
    g.strokeStyle = 'rgba(255,214,110,0.95)'
    g.lineWidth = headR * 0.13
    g.beginPath()
    g.ellipse(cx, headY - headR * 0.92, headR * 0.72, headR * 0.24, 0, 0, 7)
    g.stroke()
  }
  // flowing hair behind the head (long style: draped to the shoulders)
  if (!covered && o.hairStyle === 'long') {
    g.fillStyle = hair
    g.beginPath()
    g.moveTo(cx - headR * 1.08, headY - headR * 0.1)
    g.quadraticCurveTo(cx - headR * 1.26, headY + headR * 1.7, cx - headR * 0.52, headY + headR * 2.05)
    g.quadraticCurveTo(cx, headY + headR * 2.2, cx + headR * 0.52, headY + headR * 2.05)
    g.quadraticCurveTo(cx + headR * 1.26, headY + headR * 1.7, cx + headR * 1.08, headY - headR * 0.1)
    g.quadraticCurveTo(cx, headY - headR * 1.55, cx - headR * 1.08, headY - headR * 0.1)
    g.closePath()
    g.fill()
  }
  // head skin
  circle(g, cx, headY, headR, skin)
  // hair (only when uncovered)
  if (!covered) {
    g.fillStyle = hair
    if (o.hairStyle === 'short') {
      g.beginPath()
      g.arc(cx, headY, headR * 1.04, Math.PI * 1.02, Math.PI * 2 - 0.02)
      g.fill()
    } else if (o.hairStyle === 'long') {
      g.beginPath() // a soft fringe over the brow; the face stays open
      g.arc(cx, headY, headR * 1.03, Math.PI * 1.06, Math.PI * 1.94)
      g.fill()
    } else {
      g.beginPath()
      g.arc(cx, headY, headR * 1.05, Math.PI * 0.98, Math.PI * 2.02)
      g.fill()
      for (const side of [-1, 1]) circle(g, cx + side * headR * 1.0, headY + headR * 0.15, headR * 0.42, hair)
    }
  }
  // groomed beard: follows the jaw to a soft chin, leaving the mouth open
  if (o.beard) {
    g.fillStyle = o.beardColor || '#4a3526'
    g.beginPath()
    g.moveTo(cx - headR * 0.6, headY + headR * 0.12)
    g.quadraticCurveTo(cx - headR * 0.64, headY + headR * 0.72, cx - headR * 0.26, headY + headR * 0.98)
    g.quadraticCurveTo(cx, headY + headR * 1.08, cx + headR * 0.26, headY + headR * 0.98)
    g.quadraticCurveTo(cx + headR * 0.64, headY + headR * 0.72, cx + headR * 0.6, headY + headR * 0.12)
    g.quadraticCurveTo(cx + headR * 0.4, headY + headR * 0.5, cx + headR * 0.24, headY + headR * 0.54)
    g.quadraticCurveTo(cx, headY + headR * 0.66, cx - headR * 0.24, headY + headR * 0.54)
    g.quadraticCurveTo(cx - headR * 0.4, headY + headR * 0.5, cx - headR * 0.6, headY + headR * 0.12)
    g.closePath()
    g.fill()
    for (const side of [-1, 1]) { // moustache wings with a gap for the mouth
      g.beginPath()
      g.moveTo(cx + side * headR * 0.04, headY + headR * 0.31)
      g.quadraticCurveTo(cx + side * headR * 0.32, headY + headR * 0.27, cx + side * headR * 0.4, headY + headR * 0.44)
      g.quadraticCurveTo(cx + side * headR * 0.26, headY + headR * 0.35, cx + side * headR * 0.04, headY + headR * 0.41)
      g.closePath()
      g.fill()
    }
  }
  if (covered) {
    // front hood rim: a band over crown + temples, face open at the chin
    g.fillStyle = headCol
    g.beginPath()
    g.arc(cx, headY, headR * 1.16, Math.PI * 0.74, Math.PI * 2.26)
    g.arc(cx, headY, headR * 0.9, Math.PI * 2.26, Math.PI * 0.74, true)
    g.closePath()
    g.fill()
    g.strokeStyle = headShade // soft inner fold
    g.lineWidth = headR * 0.05
    g.beginPath()
    g.arc(cx, headY, headR * 0.95, Math.PI * 0.8, Math.PI * 2.2)
    g.stroke()
    if (o.head === 'cloth') {
      g.strokeStyle = o.band || '#b0763a' // head band
      g.lineWidth = headR * 0.16
      g.beginPath()
      g.arc(cx, headY, headR * 1.04, Math.PI * 1.06, Math.PI * 1.94)
      g.stroke()
    }
  }
  // soldier's helmet (Goliath) over the head
  if (o.helmet) {
    g.fillStyle = '#8a9099'
    g.beginPath()
    g.arc(cx, headY, headR * 1.1, Math.PI, Math.PI * 2)
    g.fill()
    g.fillRect(cx - headR * 1.1, headY, headR * 2.2, headR * 0.16)
    g.fillStyle = '#787f88'
    g.fillRect(cx - headR * 0.09, headY, headR * 0.18, headR * 0.85)
    g.fillStyle = '#c0533f'
    g.beginPath()
    g.ellipse(cx, headY - headR * 1.12, headR * 0.2, headR * 0.42, 0, 0, 7)
    g.fill()
  }
  // rosy cheeks
  const cheek = o.blush ? 'rgba(232,120,95,0.42)' : 'rgba(232,120,95,0.2)'
  for (const side of [-1, 1]) circle(g, cx + side * headR * 0.54, headY + headR * 0.26, headR * 0.15, cheek)
  // eyes with a little highlight
  for (const side of [-1, 1]) {
    circle(g, cx + side * headR * 0.32, headY - headR * 0.02, headR * 0.11, C.ink)
    circle(g, cx + side * headR * 0.32 + headR * 0.045, headY - headR * 0.06, headR * 0.035, '#fff')
  }
  // soft nose
  g.strokeStyle = 'rgba(60,40,25,0.28)'
  g.lineWidth = headR * 0.06
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(cx, headY + headR * 0.06)
  g.lineTo(cx - headR * 0.05, headY + headR * 0.16)
  g.stroke()
  // gentle smile (a small warm mouth tucked in the beard gap when bearded)
  g.strokeStyle = o.beard ? '#9a5346' : C.ink
  g.lineWidth = headR * (o.beard ? 0.08 : 0.1)
  g.lineCap = 'round'
  g.beginPath()
  g.arc(cx, headY + headR * (o.beard ? 0.46 : 0.24), headR * (o.beard ? 0.15 : 0.28), 0.2 * Math.PI, 0.8 * Math.PI)
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

/* ── Bible-story stamps ────────────────────────────────────────────────── */
/* A big shining star (the Nativity star), with a soft glow and long rays. */
function bigStar(g, cx, cy, s, o = {}) {
  const glow = g.createRadialGradient(cx, cy, 0, cx, cy, s * 0.9)
  glow.addColorStop(0, 'rgba(255,244,190,0.9)')
  glow.addColorStop(1, 'rgba(255,244,190,0)')
  g.fillStyle = glow
  g.beginPath()
  g.arc(cx, cy, s * 0.9, 0, 7)
  g.fill()
  g.fillStyle = '#fff2b0'
  g.beginPath()
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? s * 0.5 : s * 0.16
    const a = -Math.PI / 2 + (i * Math.PI) / 4
    g[i === 0 ? 'moveTo' : 'lineTo'](cx + r * Math.cos(a), cy + r * Math.sin(a))
  }
  g.closePath()
  g.fill()
  // a beam of light pointing down at the manger - only where asked for
  if (o.tail) {
    const beam = g.createLinearGradient(cx, cy + s * 0.4, cx, cy + s * 1.7)
    beam.addColorStop(0, 'rgba(255,244,190,0.55)')
    beam.addColorStop(1, 'rgba(255,244,190,0)')
    g.fillStyle = beam
    g.beginPath()
    g.moveTo(cx - s * 0.16, cy + s * 0.4)
    g.lineTo(cx + s * 0.16, cy + s * 0.4)
    g.lineTo(cx + s * 0.5, cy + s * 1.7)
    g.lineTo(cx - s * 0.5, cy + s * 1.7)
    g.closePath()
    g.fill()
  }
}
/* Baby wrapped in a manger of hay. */
function babyManger(g, cx, cy, s) {
  // hay pile
  g.fillStyle = '#e6c15a'
  g.beginPath()
  g.ellipse(cx, cy + s * 0.28, s * 0.6, s * 0.2, 0, 0, 7)
  g.fill()
  // wooden manger (X trestle + trough)
  g.strokeStyle = '#8a5a34'
  g.lineWidth = s * 0.06
  g.lineCap = 'round'
  for (const side of [-1, 1]) {
    g.beginPath()
    g.moveTo(cx + side * s * 0.5, cy + s * 0.05)
    g.lineTo(cx + side * s * 0.28, cy + s * 0.62)
    g.moveTo(cx + side * s * 0.5, cy + s * 0.05)
    g.lineTo(cx - side * s * 0.12, cy + s * 0.62)
    g.stroke()
  }
  g.strokeStyle = '#a9713f'
  g.lineWidth = s * 0.1
  g.beginPath()
  g.moveTo(cx - s * 0.55, cy + s * 0.12)
  g.quadraticCurveTo(cx, cy + s * 0.42, cx + s * 0.55, cy + s * 0.12)
  g.stroke()
  // swaddled baby
  g.fillStyle = '#fbf3e2'
  g.beginPath()
  g.ellipse(cx, cy + s * 0.02, s * 0.34, s * 0.17, 0, 0, 7)
  g.fill()
  circle(g, cx - s * 0.24, cy - s * 0.02, s * 0.12, '#e8b98a') // head
  // tiny halo
  g.strokeStyle = 'rgba(255,220,120,0.9)'
  g.lineWidth = s * 0.03
  g.beginPath()
  g.arc(cx - s * 0.24, cy - s * 0.02, s * 0.17, 0, 7)
  g.stroke()
}
/* Full-body woolly sheep (footY baseline, h full height). */
function sheep(g, cx, footY, h, o = {}) {
  const dir = o.flip ? -1 : 1
  const bw = h * 0.7, by = footY - h * 0.42
  // legs
  g.strokeStyle = '#5b4636'
  g.lineWidth = h * 0.07
  g.lineCap = 'round'
  for (const dx of [-bw * 0.24, -bw * 0.02, bw * 0.16]) {
    g.beginPath()
    g.moveTo(cx + dx, by + h * 0.18)
    g.lineTo(cx + dx, footY)
    g.stroke()
  }
  // woolly body: a cluster of bumps
  g.fillStyle = '#f3efe6'
  for (const [ox, oy, r] of [[-0.28, 0, 0.26], [-0.05, -0.08, 0.3], [0.2, 0, 0.26], [0.05, 0.12, 0.24], [-0.2, 0.14, 0.2]]) {
    circle(g, cx + ox * bw, by + oy * bw, r * bw, '#f3efe6')
  }
  // head
  const hx = cx + dir * bw * 0.42, hy = by - bw * 0.05
  g.fillStyle = '#4a4038'
  g.beginPath()
  g.ellipse(hx, hy, h * 0.13, h * 0.16, dir * 0.2, 0, 7)
  g.fill()
  for (const side of [-1, 1]) { // ears
    g.beginPath()
    g.ellipse(hx + side * h * 0.1, hy - h * 0.08, h * 0.06, h * 0.03, side * 0.6, 0, 7)
    g.fillStyle = '#4a4038'
    g.fill()
  }
  circle(g, hx + dir * h * 0.04, hy - h * 0.02, h * 0.022, '#fff') // eye
  circle(g, hx + dir * h * 0.04, hy - h * 0.02, h * 0.011, C.ink)
  // woolly forehead tuft
  circle(g, hx, hy - h * 0.14, h * 0.07, '#f3efe6')
}
/* Simple grey donkey (footY baseline). */
function donkey(g, cx, footY, h, o = {}) {
  const dir = o.flip ? -1 : 1
  const bw = h * 0.66, by = footY - h * 0.36
  g.strokeStyle = '#9a9088'
  g.lineWidth = h * 0.08
  g.lineCap = 'round'
  for (const dx of [-bw * 0.3, -bw * 0.05, bw * 0.18, bw * 0.36]) {
    g.beginPath()
    g.moveTo(cx + dx, by + h * 0.12)
    g.lineTo(cx + dx, footY)
    g.stroke()
  }
  g.fillStyle = '#a49a90'
  g.beginPath()
  g.ellipse(cx, by, bw * 0.5, h * 0.22, 0, 0, 7)
  g.fill()
  // neck + head
  const hx = cx + dir * bw * 0.46
  g.beginPath()
  g.moveTo(cx + dir * bw * 0.28, by - h * 0.1)
  g.lineTo(hx, by - h * 0.4)
  g.lineTo(hx + dir * h * 0.16, by - h * 0.36)
  g.lineTo(hx + dir * h * 0.12, by - h * 0.08)
  g.closePath()
  g.fill()
  for (const side of [0, 1]) { // ears
    g.beginPath()
    g.ellipse(hx + dir * side * h * 0.06, by - h * 0.44, h * 0.03, h * 0.08, dir * 0.2, 0, 7)
    g.fillStyle = '#8f857c'
    g.fill()
  }
  circle(g, hx + dir * h * 0.06, by - h * 0.3, h * 0.02, C.ink) // eye
  g.strokeStyle = '#5b4636' // mane
  g.lineWidth = h * 0.03
  g.beginPath()
  g.moveTo(cx + dir * bw * 0.28, by - h * 0.12)
  g.lineTo(hx - dir * h * 0.02, by - h * 0.38)
  g.stroke()
}

/* Noah's ark: a wooden hull with a little cabin. */
function ark(g, cx, cy, s) {
  g.fillStyle = '#8a5a34'
  g.beginPath()
  g.moveTo(cx - s * 0.55, cy)
  g.quadraticCurveTo(cx - s * 0.6, cy + s * 0.34, cx - s * 0.3, cy + s * 0.38)
  g.lineTo(cx + s * 0.3, cy + s * 0.38)
  g.quadraticCurveTo(cx + s * 0.6, cy + s * 0.34, cx + s * 0.55, cy)
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(0,0,0,0.18)'
  g.lineWidth = s * 0.02
  for (const dy of [0.12, 0.22, 0.32]) {
    g.beginPath()
    g.moveTo(cx - s * 0.5, cy + s * dy)
    g.lineTo(cx + s * 0.5, cy + s * dy)
    g.stroke()
  }
  g.fillStyle = '#d5a06a'
  g.fillRect(cx - s * 0.34, cy - s * 0.28, s * 0.68, s * 0.3)
  g.fillStyle = '#a9713f'
  g.beginPath()
  g.moveTo(cx - s * 0.42, cy - s * 0.28)
  g.lineTo(cx, cy - s * 0.52)
  g.lineTo(cx + s * 0.42, cy - s * 0.28)
  g.closePath()
  g.fill()
  g.fillStyle = '#5b3c22'
  for (const dx of [-0.2, 0.08]) g.fillRect(cx + s * dx, cy - s * 0.2, s * 0.12, s * 0.14)
}
/* A rainbow arc. */
function rainbow(g, cx, cy, w) {
  const cols = ['#e0555a', '#e8913c', '#f2c94c', '#5fae5f', '#4d8fd6', '#7a5fd6']
  g.lineWidth = w * 0.05
  cols.forEach((c, i) => {
    g.strokeStyle = c
    g.beginPath()
    g.arc(cx, cy, w * 0.5 - i * w * 0.05, Math.PI, Math.PI * 2)
    g.stroke()
  })
}
/* Baby Moses' basket floating with a little blanket. */
function basket(g, cx, cy, s) {
  g.fillStyle = '#c79a4f'
  g.beginPath()
  g.ellipse(cx, cy + s * 0.1, s * 0.44, s * 0.22, 0, 0, Math.PI)
  g.fill()
  g.fillStyle = '#b98a3f'
  g.fillRect(cx - s * 0.44, cy - s * 0.02, s * 0.88, s * 0.14)
  g.strokeStyle = 'rgba(90,60,20,0.5)'
  g.lineWidth = s * 0.02
  for (const dx of [-0.3, -0.1, 0.1, 0.3]) {
    g.beginPath()
    g.moveTo(cx + s * dx, cy - s * 0.02)
    g.lineTo(cx + s * dx, cy + s * 0.12)
    g.stroke()
  }
  g.fillStyle = '#fbf3e2'
  g.beginPath()
  g.ellipse(cx, cy - s * 0.04, s * 0.3, s * 0.1, 0, 0, 7)
  g.fill()
  circle(g, cx - s * 0.14, cy - s * 0.06, s * 0.08, '#e8b98a')
}
/* A big friendly fish/whale (Jonah). */
function bigFish(g, cx, cy, s, o = {}) {
  const dir = o.flip ? -1 : 1
  g.save()
  g.translate(cx, 0)
  g.scale(dir, 1)
  g.fillStyle = '#4a7fb5'
  g.beginPath()
  g.ellipse(0, cy, s * 0.5, s * 0.3, 0, 0, 7)
  g.fill()
  g.beginPath()
  g.moveTo(-s * 0.42, cy)
  g.lineTo(-s * 0.64, cy - s * 0.24)
  g.lineTo(-s * 0.6, cy)
  g.lineTo(-s * 0.64, cy + s * 0.24)
  g.closePath()
  g.fill()
  g.fillStyle = '#bfe0ef'
  g.beginPath()
  g.ellipse(s * 0.05, cy + s * 0.12, s * 0.36, s * 0.14, 0, 0, 7)
  g.fill()
  g.fillStyle = '#3f6ea0'
  g.beginPath()
  g.ellipse(s * 0.06, cy + s * 0.16, s * 0.12, s * 0.06, 0.4, 0, 7)
  g.fill()
  circle(g, s * 0.28, cy - s * 0.06, s * 0.05, '#fff')
  circle(g, s * 0.29, cy - s * 0.06, s * 0.026, C.ink)
  g.strokeStyle = C.ink
  g.lineWidth = s * 0.03
  g.lineCap = 'round'
  g.beginPath()
  g.arc(s * 0.3, cy + s * 0.04, s * 0.1, 0.1 * Math.PI, 0.7 * Math.PI)
  g.stroke()
  g.strokeStyle = 'rgba(180,220,255,0.9)'
  g.lineWidth = s * 0.03
  for (const dx of [-0.04, 0.04]) {
    g.beginPath()
    g.moveTo(s * 0.14, cy - s * 0.28)
    g.quadraticCurveTo(s * (0.14 + dx), cy - s * 0.44, s * (0.14 + dx * 2), cy - s * 0.52)
    g.stroke()
  }
  g.restore()
}
/* A leafy fruit tree (Eden). */
function fruitTree(g, cx, footY, h) {
  g.fillStyle = '#8a5a34'
  g.fillRect(cx - h * 0.06, footY - h * 0.52, h * 0.12, h * 0.52)
  circle(g, cx, footY - h * 0.64, h * 0.34, '#5fae5a')
  circle(g, cx - h * 0.26, footY - h * 0.52, h * 0.22, '#6fbf68')
  circle(g, cx + h * 0.26, footY - h * 0.52, h * 0.22, '#6fbf68')
  for (const [dx, dy] of [[-0.14, -0.68], [0.1, -0.74], [0.22, -0.56], [-0.24, -0.52], [0.0, -0.56]]) {
    circle(g, cx + h * dx, footY + h * dy, h * 0.05, '#e0555a')
  }
}
/* A small friendly coiled snake. */
function snake(g, cx, cy, s) {
  g.strokeStyle = '#6fae55'
  g.lineWidth = s * 0.14
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(cx - s * 0.4, cy + s * 0.22)
  g.quadraticCurveTo(cx, cy - s * 0.3, cx + s * 0.28, cy + s * 0.1)
  g.quadraticCurveTo(cx + s * 0.5, cy + s * 0.3, cx + s * 0.3, cy - s * 0.2)
  g.stroke()
  circle(g, cx + s * 0.3, cy - s * 0.24, s * 0.1, '#6fae55')
  circle(g, cx + s * 0.34, cy - s * 0.27, s * 0.02, C.ink)
  g.strokeStyle = '#e0555a'
  g.lineWidth = s * 0.03
  g.beginPath()
  g.moveTo(cx + s * 0.4, cy - s * 0.24)
  g.lineTo(cx + s * 0.48, cy - s * 0.26)
  g.stroke()
}
/* A burst of light (Creation). */
function rays(g, cx, cy, s) {
  const glow = g.createRadialGradient(cx, cy, 0, cx, cy, s)
  glow.addColorStop(0, 'rgba(255,250,210,0.95)')
  glow.addColorStop(0.5, 'rgba(255,245,180,0.35)')
  glow.addColorStop(1, 'rgba(255,245,180,0)')
  g.fillStyle = glow
  g.beginPath()
  g.arc(cx, cy, s, 0, 7)
  g.fill()
  g.strokeStyle = 'rgba(255,240,170,0.6)'
  g.lineWidth = s * 0.04
  g.lineCap = 'round'
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    g.beginPath()
    g.moveTo(cx + Math.cos(a) * s * 0.5, cy + Math.sin(a) * s * 0.5)
    g.lineTo(cx + Math.cos(a) * s * 0.98, cy + Math.sin(a) * s * 0.98)
    g.stroke()
  }
}

/* ── stamp dispatch ────────────────────────────────────────────────────── */
// Reused owned pictures (Pictures.jsx) by semantic key.
const EMOJI = {
  cat: '🐱', cow: '🐄', dog: '🐶', bird: '🐦', lemon: '🍋', honey: '🍯',
  milk: '🥛', pot: '🍲', water: '💧', tree: '🌳', star: '⭐', house: '🏠', ball: '🔴', sun: '☀️', moon: '🌙',
}
const GROUNDED = new Set(['person', 'lion', 'leopard', 'sheep', 'donkey', 'fruitTree'])
/** A soft contact shadow so a figure sits ON the ground, not above it. */
function groundShadow(g, cx, gy, w) {
  g.save()
  g.fillStyle = 'rgba(30,20,10,0.18)'
  g.beginPath()
  g.ellipse(cx, gy, w * 0.42, w * 0.1, 0, 0, 7)
  g.fill()
  g.restore()
}
function drawItem(g, W, H, it) {
  const cx = it.x * W
  const cy = it.y * H
  const s = (it.s || 0.3) * W
  const foot = it.foot != null ? it.foot * H : cy
  if (GROUNDED.has(it.k)) groundShadow(g, cx, foot - s * 0.01, s * 0.9)
  else if (it.ground) groundShadow(g, cx, cy + s * 0.42, s * 0.85)
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
    case 'bigStar': return bigStar(g, cx, cy, s, it)
    case 'manger': return babyManger(g, cx, cy, s)
    case 'sheep': return sheep(g, cx, foot, s, it)
    case 'donkey': return donkey(g, cx, foot, s, it)
    case 'ark': return ark(g, cx, cy, s)
    case 'rainbow': return rainbow(g, cx, cy, s)
    case 'basket': return basket(g, cx, cy, s)
    case 'bigFish': return bigFish(g, cx, cy, s, it)
    case 'fruitTree': return fruitTree(g, cx, foot, s)
    case 'snake': return snake(g, cx, cy, s)
    case 'rays': return rays(g, cx, cy, s)
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
  // scene lighting: a gentle top light + soft vignette give the page depth
  const light = g.createRadialGradient(W * 0.5, H * 0.14, H * 0.08, W * 0.5, H * 0.5, H * 0.95)
  light.addColorStop(0, 'rgba(255,255,248,0.13)')
  light.addColorStop(0.55, 'rgba(255,255,248,0)')
  g.fillStyle = light
  g.fillRect(0, 0, W, H)
  const vig = g.createRadialGradient(W * 0.5, H * 0.5, H * 0.32, W * 0.5, H * 0.55, H * 0.92)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(20,12,6,0.22)')
  g.fillStyle = vig
  g.fillRect(0, 0, W, H)
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
