/* ============================================================================
   PICTURES — owned word illustrations, drawn in code
   ----------------------------------------------------------------------------
   System emoji as illustration was the most templated-feeling choice in the
   app (and renders differently on every OS). This is the replacement: flat,
   chunky canvas pictures in the same code-drawn style as the characters,
   keyed by the emoji they replace so NO data changes anywhere - word lists
   and stories keep their .picture emoji, and <WordPicture> renders the
   drawn version when one exists, the emoji otherwise. The library grows
   picture by picture; the fallback contract never breaks.
   ========================================================================== */
import { useEffect, useRef } from 'react'

const P = {
  ink: '#3c3529',
  cream: '#fffdf6',
  gold: '#e0b25a',
}

function circle(g, x, y, r, fill) {
  g.fillStyle = fill
  g.beginPath()
  g.arc(x, y, r, 0, 7)
  g.fill()
}

const DRAWERS = {
  /* lime / lemon */
  '🍋': (g, s) => {
    g.save()
    g.translate(s / 2, s / 2)
    g.rotate(-0.35)
    g.fillStyle = '#ffd23e'
    g.beginPath()
    g.ellipse(0, 0, s * 0.34, s * 0.24, 0, 0, 7)
    g.fill()
    for (const side of [-1, 1]) circle(g, side * s * 0.33, 0, s * 0.045, '#ffd23e')
    g.strokeStyle = '#e0a400'
    g.lineWidth = s * 0.02
    g.beginPath()
    g.ellipse(0, 0, s * 0.34, s * 0.24, 0, 0, 7)
    g.stroke()
    g.fillStyle = '#7fae3f'
    g.beginPath()
    g.ellipse(s * 0.22, -s * 0.26, s * 0.1, s * 0.05, 0.6, 0, 7)
    g.fill()
    g.restore()
  },
  /* cow */
  '🐄': (g, s) => {
    const cx = s / 2
    for (const side of [-1, 1]) {
      circle(g, cx + side * s * 0.26, s * 0.3, s * 0.09, '#e8dccb')
      g.strokeStyle = '#b9a68c'
      g.lineWidth = s * 0.02
      g.beginPath()
      g.arc(cx + side * s * 0.26, s * 0.3, s * 0.09, 0, 7)
      g.stroke()
      circle(g, cx + side * s * 0.33, s * 0.22, s * 0.05, '#d9c3a5') // horn nub
    }
    circle(g, cx, s * 0.45, s * 0.3, '#f2e9da') // head
    g.fillStyle = '#c9b8a0' // patch
    g.beginPath()
    g.ellipse(cx - s * 0.12, s * 0.36, s * 0.1, s * 0.08, -0.4, 0, 7)
    g.fill()
    for (const side of [-1, 1]) circle(g, cx + side * s * 0.11, s * 0.42, s * 0.035, P.ink)
    g.fillStyle = '#e8b7c2' // muzzle
    g.beginPath()
    g.ellipse(cx, s * 0.62, s * 0.16, s * 0.11, 0, 0, 7)
    g.fill()
    for (const side of [-1, 1]) circle(g, cx + side * s * 0.06, s * 0.61, s * 0.02, '#a8798a')
  },
  /* honey */
  '🍯': (g, s) => {
    const cx = s / 2
    g.fillStyle = '#e8a33c'
    g.beginPath()
    g.roundRect(cx - s * 0.24, s * 0.3, s * 0.48, s * 0.42, s * 0.12)
    g.fill()
    g.fillStyle = '#c07f1f'
    g.beginPath()
    g.roundRect(cx - s * 0.27, s * 0.22, s * 0.54, s * 0.12, s * 0.05)
    g.fill()
    g.fillStyle = '#ffd23e' // drip
    g.beginPath()
    g.ellipse(cx, s * 0.4, s * 0.16, s * 0.06, 0, 0, 7)
    g.fill()
    g.beginPath()
    g.arc(cx + s * 0.08, s * 0.5, s * 0.05, 0, 7)
    g.fill()
  },
  /* dog */
  '🐶': (g, s) => {
    const cx = s / 2
    for (const side of [-1, 1]) {
      g.fillStyle = '#a9713f'
      g.beginPath()
      g.ellipse(cx + side * s * 0.24, s * 0.32, s * 0.09, s * 0.16, side * 0.5, 0, 7)
      g.fill()
    }
    circle(g, cx, s * 0.46, s * 0.29, '#c98f56') // head
    g.fillStyle = '#e7c9a4' // muzzle patch
    g.beginPath()
    g.ellipse(cx, s * 0.58, s * 0.15, s * 0.13, 0, 0, 7)
    g.fill()
    for (const side of [-1, 1]) circle(g, cx + side * s * 0.11, s * 0.4, s * 0.035, P.ink)
    circle(g, cx, s * 0.54, s * 0.045, P.ink) // nose
    g.strokeStyle = P.ink
    g.lineWidth = s * 0.02
    g.beginPath()
    g.arc(cx, s * 0.6, s * 0.06, 0.15 * Math.PI, 0.85 * Math.PI)
    g.stroke()
    g.fillStyle = '#e26a6a'
    g.beginPath()
    g.ellipse(cx + s * 0.045, s * 0.66, s * 0.035, s * 0.05, 0.2, 0, 7)
    g.fill() // tongue
  },
  /* water drop */
  '💧': (g, s) => {
    const cx = s / 2
    g.fillStyle = '#4db3ef'
    g.beginPath()
    g.moveTo(cx, s * 0.16)
    g.quadraticCurveTo(cx + s * 0.3, s * 0.5, cx, s * 0.78)
    g.quadraticCurveTo(cx - s * 0.3, s * 0.5, cx, s * 0.16)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.55)'
    g.beginPath()
    g.ellipse(cx - s * 0.08, s * 0.52, s * 0.045, s * 0.09, 0.3, 0, 7)
    g.fill()
  },
  /* sun */
  '☀️': (g, s) => {
    const cx = s / 2
    g.strokeStyle = '#f5a623'
    g.lineWidth = s * 0.05
    g.lineCap = 'round'
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      g.beginPath()
      g.moveTo(cx + Math.cos(a) * s * 0.3, s / 2 + Math.sin(a) * s * 0.3)
      g.lineTo(cx + Math.cos(a) * s * 0.42, s / 2 + Math.sin(a) * s * 0.42)
      g.stroke()
    }
    circle(g, cx, s / 2, s * 0.24, '#ffd23e')
    g.strokeStyle = '#f5a623'
    g.lineWidth = s * 0.025
    g.beginPath()
    g.arc(cx, s / 2, s * 0.24, 0, 7)
    g.stroke()
  },
  /* moon */
  '🌙': (g, s) => {
    const cx = s / 2
    g.fillStyle = '#ffe9a8'
    g.beginPath()
    g.arc(cx, s / 2, s * 0.3, 0, 7)
    g.fill()
    g.fillStyle = 'var(--paper, #fdf8ef)'
    g.fillStyle = '#fdf8ef'
    g.beginPath()
    g.arc(cx + s * 0.16, s * 0.42, s * 0.26, 0, 7)
    g.fill()
    circle(g, cx - s * 0.14, s * 0.55, s * 0.035, '#f0cf7d')
  },
  /* house */
  '🏠': (g, s) => {
    const cx = s / 2
    g.fillStyle = '#c98f56'
    g.beginPath()
    g.moveTo(cx - s * 0.36, s * 0.42)
    g.lineTo(cx, s * 0.16)
    g.lineTo(cx + s * 0.36, s * 0.42)
    g.closePath()
    g.fill()
    g.fillStyle = P.cream
    g.fillRect(cx - s * 0.28, s * 0.42, s * 0.56, s * 0.34)
    g.strokeStyle = P.gold
    g.lineWidth = s * 0.02
    g.strokeRect(cx - s * 0.28, s * 0.42, s * 0.56, s * 0.34)
    g.fillStyle = '#4db3ef'
    g.fillRect(cx + s * 0.05, s * 0.48, s * 0.14, s * 0.12)
    g.fillStyle = '#a9713f'
    g.fillRect(cx - s * 0.19, s * 0.52, s * 0.14, s * 0.24)
  },
  /* milk */
  '🥛': (g, s) => {
    const cx = s / 2
    g.fillStyle = '#eef3f6'
    g.beginPath()
    g.moveTo(cx - s * 0.18, s * 0.24)
    g.lineTo(cx + s * 0.18, s * 0.24)
    g.lineTo(cx + s * 0.14, s * 0.76)
    g.lineTo(cx - s * 0.14, s * 0.76)
    g.closePath()
    g.fill()
    g.strokeStyle = '#c3d2da'
    g.lineWidth = s * 0.02
    g.stroke()
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.moveTo(cx - s * 0.165, s * 0.42)
    g.lineTo(cx + s * 0.165, s * 0.42)
    g.lineTo(cx + s * 0.14, s * 0.76)
    g.lineTo(cx - s * 0.14, s * 0.76)
    g.closePath()
    g.fill()
  },
  /* shiro / stew pot */
  '🍲': (g, s) => {
    const cx = s / 2
    g.fillStyle = '#3d3d3d'
    g.beginPath()
    g.ellipse(cx, s * 0.52, s * 0.34, s * 0.26, 0, 0, Math.PI)
    g.fill()
    g.fillStyle = '#b0651f'
    g.beginPath()
    g.ellipse(cx, s * 0.52, s * 0.34, s * 0.09, 0, 0, 7)
    g.fill()
    g.fillStyle = '#d98836'
    g.beginPath()
    g.ellipse(cx, s * 0.5, s * 0.28, s * 0.06, 0, 0, 7)
    g.fill()
    g.strokeStyle = '#3d3d3d'
    g.lineWidth = s * 0.035
    g.lineCap = 'round'
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(cx + side * s * 0.34, s * 0.5)
      g.lineTo(cx + side * s * 0.44, s * 0.44)
      g.stroke()
    }
    g.strokeStyle = '#bdbdbd' // steam
    g.lineWidth = s * 0.025
    for (const dx of [-0.1, 0.08]) {
      g.beginPath()
      g.moveTo(cx + dx * s, s * 0.36)
      g.quadraticCurveTo(cx + dx * s + s * 0.05, s * 0.28, cx + dx * s, s * 0.2)
      g.stroke()
    }
  },
  /* cat */
  '🐱': (g, s) => {
    const cx = s / 2
    for (const side of [-1, 1]) {
      g.fillStyle = '#a8a29a'
      g.beginPath()
      g.moveTo(cx + side * s * 0.13, s * 0.28)
      g.lineTo(cx + side * s * 0.3, s * 0.12)
      g.lineTo(cx + side * s * 0.31, s * 0.34)
      g.closePath()
      g.fill()
    }
    circle(g, cx, s * 0.48, s * 0.28, '#c2bcb2') // head
    for (const side of [-1, 1]) circle(g, cx + side * s * 0.11, s * 0.44, s * 0.035, P.ink)
    g.fillStyle = '#e8b7c2'
    g.beginPath()
    g.moveTo(cx - s * 0.035, s * 0.53)
    g.lineTo(cx + s * 0.035, s * 0.53)
    g.lineTo(cx, s * 0.575)
    g.closePath()
    g.fill()
    g.strokeStyle = P.ink
    g.lineWidth = s * 0.016
    g.lineCap = 'round'
    for (const side of [-1, 1]) {
      for (const dy of [-0.02, 0.02]) {
        g.beginPath()
        g.moveTo(cx + side * s * 0.14, s * (0.55 + dy))
        g.lineTo(cx + side * s * 0.3, s * (0.53 + dy * 2))
        g.stroke()
      }
    }
  },
  /* bee (honey stories) */
  '🐝': (g, s) => {
    const cx = s / 2
    g.save()
    g.translate(cx, s / 2)
    g.rotate(-0.3)
    g.fillStyle = '#ffd23e'
    g.beginPath()
    g.ellipse(0, 0, s * 0.26, s * 0.18, 0, 0, 7)
    g.fill()
    g.fillStyle = P.ink
    for (const dx of [-0.1, 0.02, 0.14]) {
      g.fillRect(dx * s, -s * 0.17, s * 0.06, s * 0.34)
    }
    g.fillStyle = 'rgba(180,220,255,0.8)'
    g.beginPath()
    g.ellipse(-s * 0.05, -s * 0.2, s * 0.12, s * 0.07, -0.5, 0, 7)
    g.fill()
    circle(g, -s * 0.28, 0, s * 0.09, P.ink) // head
    g.restore()
  },
  /* tree (acacia-flavored) */
  '🌳': (g, s) => {
    const cx = s / 2
    g.fillStyle = '#a9713f'
    g.beginPath()
    g.moveTo(cx - s * 0.05, s * 0.78)
    g.lineTo(cx - s * 0.02, s * 0.42)
    g.lineTo(cx + s * 0.02, s * 0.42)
    g.lineTo(cx + s * 0.05, s * 0.78)
    g.closePath()
    g.fill()
    g.strokeStyle = '#a9713f'
    g.lineWidth = s * 0.03
    g.beginPath()
    g.moveTo(cx, s * 0.55)
    g.lineTo(cx + s * 0.16, s * 0.42)
    g.stroke()
    g.fillStyle = '#6faf58'
    g.beginPath()
    g.ellipse(cx, s * 0.34, s * 0.34, s * 0.14, 0, 0, 7)
    g.fill()
    g.fillStyle = '#84c168'
    g.beginPath()
    g.ellipse(cx - s * 0.08, s * 0.28, s * 0.2, s * 0.09, 0, 0, 7)
    g.fill()
  },
  /* mango */
  '🥭': (g, s) => {
    const cx = s / 2
    g.save()
    g.translate(cx, s / 2)
    g.rotate(0.4)
    const grad = g.createLinearGradient(-s * 0.2, -s * 0.2, s * 0.2, s * 0.2)
    grad.addColorStop(0, '#f5a623')
    grad.addColorStop(1, '#e26a4a')
    g.fillStyle = grad
    g.beginPath()
    g.ellipse(0, 0, s * 0.26, s * 0.33, 0, 0, 7)
    g.fill()
    g.fillStyle = '#7fae3f'
    g.beginPath()
    g.ellipse(-s * 0.06, -s * 0.34, s * 0.09, s * 0.045, 0.7, 0, 7)
    g.fill()
    g.restore()
  },
  /* bird */
  '🐦': (g, s) => {
    const cx = s / 2
    circle(g, cx + s * 0.02, s * 0.5, s * 0.22, '#4db3ef') // body
    circle(g, cx + s * 0.2, s * 0.34, s * 0.13, '#4db3ef') // head
    g.fillStyle = '#2f89bd' // wing
    g.beginPath()
    g.ellipse(cx - s * 0.06, s * 0.5, s * 0.14, s * 0.09, -0.5, 0, 7)
    g.fill()
    g.fillStyle = '#f5a623' // beak
    g.beginPath()
    g.moveTo(cx + s * 0.31, s * 0.32)
    g.lineTo(cx + s * 0.42, s * 0.36)
    g.lineTo(cx + s * 0.3, s * 0.4)
    g.closePath()
    g.fill()
    circle(g, cx + s * 0.22, s * 0.31, s * 0.025, P.ink)
    g.strokeStyle = '#f5a623'
    g.lineWidth = s * 0.03
    g.lineCap = 'round'
    for (const dx of [-0.03, 0.05]) {
      g.beginPath()
      g.moveTo(cx + dx * s, s * 0.71)
      g.lineTo(cx + dx * s, s * 0.8)
      g.stroke()
    }
  },
  /* fish */
  '🐟': (g, s) => {
    const cx = s / 2
    g.fillStyle = '#4db3ef'
    g.beginPath()
    g.ellipse(cx - s * 0.04, s / 2, s * 0.27, s * 0.17, 0, 0, 7)
    g.fill()
    g.beginPath() // tail
    g.moveTo(cx + s * 0.2, s / 2)
    g.lineTo(cx + s * 0.38, s * 0.36)
    g.lineTo(cx + s * 0.38, s * 0.64)
    g.closePath()
    g.fill()
    g.fillStyle = '#2f89bd'
    g.beginPath()
    g.ellipse(cx - s * 0.04, s * 0.44, s * 0.12, s * 0.05, 0.2, 0, 7)
    g.fill()
    circle(g, cx - s * 0.2, s * 0.47, s * 0.028, P.ink)
    g.strokeStyle = 'rgba(255,255,255,0.6)'
    g.lineWidth = s * 0.02
    g.beginPath()
    g.arc(cx - s * 0.02, s * 0.52, s * 0.1, 0.2, 1.2)
    g.stroke()
  },
  /* horse */
  '🐎': (g, s) => {
    const cx = s / 2
    g.fillStyle = '#a9713f'
    g.beginPath() // neck + head silhouette
    g.moveTo(cx - s * 0.18, s * 0.75)
    g.lineTo(cx - s * 0.05, s * 0.3)
    g.quadraticCurveTo(cx, s * 0.2, cx + s * 0.12, s * 0.22)
    g.lineTo(cx + s * 0.3, s * 0.34)
    g.lineTo(cx + s * 0.26, s * 0.42)
    g.lineTo(cx + s * 0.1, s * 0.38)
    g.quadraticCurveTo(cx + s * 0.05, s * 0.6, cx + s * 0.08, s * 0.75)
    g.closePath()
    g.fill()
    g.fillStyle = '#6b4423' // mane
    g.beginPath()
    g.moveTo(cx - s * 0.08, s * 0.28)
    g.quadraticCurveTo(cx - s * 0.16, s * 0.45, cx - s * 0.12, s * 0.7)
    g.lineTo(cx - s * 0.02, s * 0.68)
    g.quadraticCurveTo(cx - s * 0.04, s * 0.45, cx + s * 0.0, s * 0.26)
    g.closePath()
    g.fill()
    // ear + eye
    g.fillStyle = '#a9713f'
    g.beginPath()
    g.moveTo(cx + s * 0.02, s * 0.22)
    g.lineTo(cx + s * 0.06, s * 0.12)
    g.lineTo(cx + s * 0.1, s * 0.22)
    g.closePath()
    g.fill()
    circle(g, cx + s * 0.12, s * 0.28, s * 0.025, P.ink)
  },
  /* camel */
  '🐫': (g, s) => {
    const cx = s / 2
    g.fillStyle = '#d9a95c'
    // body with two humps
    g.beginPath()
    g.moveTo(cx - s * 0.3, s * 0.62)
    g.quadraticCurveTo(cx - s * 0.22, s * 0.36, cx - s * 0.1, s * 0.52)
    g.quadraticCurveTo(cx - s * 0.0, s * 0.34, cx + s * 0.12, s * 0.52)
    g.lineTo(cx + s * 0.28, s * 0.52)
    g.lineTo(cx + s * 0.28, s * 0.62)
    g.closePath()
    g.fill()
    // neck + head
    g.beginPath()
    g.moveTo(cx + s * 0.2, s * 0.56)
    g.lineTo(cx + s * 0.26, s * 0.3)
    g.quadraticCurveTo(cx + s * 0.28, s * 0.24, cx + s * 0.36, s * 0.26)
    g.lineTo(cx + s * 0.4, s * 0.32)
    g.lineTo(cx + s * 0.3, s * 0.36)
    g.lineTo(cx + s * 0.3, s * 0.56)
    g.closePath()
    g.fill()
    // legs
    g.strokeStyle = '#d9a95c'
    g.lineWidth = s * 0.045
    for (const dx of [-0.24, -0.12, 0.1, 0.22]) {
      g.beginPath()
      g.moveTo(cx + dx * s, s * 0.6)
      g.lineTo(cx + dx * s, s * 0.8)
      g.stroke()
    }
    circle(g, cx + s * 0.33, s * 0.28, s * 0.02, P.ink)
  },
  /* mountain */
  '⛰️': (g, s) => {
    const cx = s / 2
    g.fillStyle = '#8a9a6b'
    g.beginPath()
    g.moveTo(cx - s * 0.42, s * 0.74)
    g.lineTo(cx - s * 0.1, s * 0.22)
    g.lineTo(cx + s * 0.16, s * 0.74)
    g.closePath()
    g.fill()
    g.fillStyle = '#a9b789'
    g.beginPath()
    g.moveTo(cx - s * 0.02, s * 0.74)
    g.lineTo(cx + s * 0.24, s * 0.36)
    g.lineTo(cx + s * 0.44, s * 0.74)
    g.closePath()
    g.fill()
    g.fillStyle = P.cream // snow cap
    g.beginPath()
    g.moveTo(cx - s * 0.17, s * 0.34)
    g.lineTo(cx - s * 0.1, s * 0.22)
    g.lineTo(cx - s * 0.03, s * 0.34)
    g.lineTo(cx - s * 0.07, s * 0.38)
    g.lineTo(cx - s * 0.12, s * 0.34)
    g.closePath()
    g.fill()
  },
  /* coffee - drawn as a jebena, because this is an Ethiopian app */
  '☕': (g, s) => {
    const cx = s / 2
    g.fillStyle = '#3d2b1f'
    g.beginPath() // round body
    g.arc(cx, s * 0.56, s * 0.22, 0, 7)
    g.fill()
    g.beginPath() // neck
    g.moveTo(cx - s * 0.07, s * 0.38)
    g.lineTo(cx - s * 0.04, s * 0.22)
    g.lineTo(cx + s * 0.04, s * 0.22)
    g.lineTo(cx + s * 0.07, s * 0.38)
    g.closePath()
    g.fill()
    circle(g, cx, s * 0.2, s * 0.05, '#3d2b1f') // lid knob
    g.strokeStyle = '#3d2b1f' // spout
    g.lineWidth = s * 0.045
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(cx + s * 0.18, s * 0.48)
    g.quadraticCurveTo(cx + s * 0.34, s * 0.42, cx + s * 0.36, s * 0.3)
    g.stroke()
    g.beginPath() // handle
    g.arc(cx - s * 0.24, s * 0.46, s * 0.09, Math.PI * 0.6, Math.PI * 1.7)
    g.stroke()
    g.strokeStyle = '#bdbdbd' // steam
    g.lineWidth = s * 0.02
    g.beginPath()
    g.moveTo(cx + s * 0.36, s * 0.24)
    g.quadraticCurveTo(cx + s * 0.4, s * 0.16, cx + s * 0.36, s * 0.08)
    g.stroke()
  },
  /* red ball */
  '🔴': (g, s) => {
    circle(g, s / 2, s / 2, s * 0.32, '#e05a4e')
    g.fillStyle = 'rgba(255,255,255,0.45)'
    g.beginPath()
    g.ellipse(s * 0.4, s * 0.4, s * 0.09, s * 0.05, -0.6, 0, 7)
    g.fill()
  },
  /* baby */
  '👶': (g, s) => {
    const cx = s / 2
    circle(g, cx, s * 0.5, s * 0.28, '#eab88f') // face
    g.fillStyle = '#6b4423' // curl
    g.beginPath()
    g.arc(cx, s * 0.24, s * 0.06, Math.PI, Math.PI * 2.4)
    g.stroke?.()
    g.strokeStyle = '#6b4423'
    g.lineWidth = s * 0.035
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(cx, s * 0.24)
    g.quadraticCurveTo(cx + s * 0.06, s * 0.16, cx + s * 0.1, s * 0.2)
    g.stroke()
    for (const side of [-1, 1]) circle(g, cx + side * s * 0.1, s * 0.46, s * 0.032, P.ink)
    g.strokeStyle = P.ink
    g.lineWidth = s * 0.02
    g.beginPath()
    g.arc(cx, s * 0.58, s * 0.06, 0.15 * Math.PI, 0.85 * Math.PI)
    g.stroke()
    g.fillStyle = 'rgba(255,120,90,0.4)'
    for (const side of [-1, 1]) circle(g, cx + side * s * 0.17, s * 0.55, s * 0.035, 'rgba(255,120,90,0.4)')
  },
  /* star */
  '⭐': (g, s) => {
    const cx = s / 2
    g.fillStyle = '#ffc800'
    g.beginPath()
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? s * 0.4 : s * 0.18
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      g[i === 0 ? 'moveTo' : 'lineTo'](cx + r * Math.cos(a), s / 2 + r * Math.sin(a))
    }
    g.closePath()
    g.fill()
    g.strokeStyle = '#e0a400'
    g.lineWidth = s * 0.03
    g.stroke()
  },
}

/* Aliases: emoji that share a drawing (dog variants, cat variants, tea). */
DRAWERS['🐕'] = DRAWERS['🐶']
DRAWERS['🐈'] = DRAWERS['🐱']
DRAWERS['🍵'] = DRAWERS['☕']

/** Which emoji have an owned drawing (exported for tests). */
export const DRAWN_PICTURES = Object.freeze(Object.keys(DRAWERS))

/**
 * A word/story picture: the owned drawn version when the library has one,
 * the emoji otherwise. Same box either way, so swapping in a new drawing
 * never moves layout.
 */
export default function WordPicture({ emoji, size = 96, className = '' }) {
  const draw = DRAWERS[emoji]
  const ref = useRef(null)
  useEffect(() => {
    if (!draw) return
    const c = ref.current
    if (!c) return
    c.width = c.height = 256
    const g = c.getContext('2d')
    if (!g) return
    g.clearRect(0, 0, 256, 256)
    draw(g, 256)
  }, [draw, emoji])
  if (!draw) {
    return (
      <span className={className} style={{ fontSize: size * 0.78, lineHeight: 1 }} aria-hidden="true">
        {emoji}
      </span>
    )
  }
  return <canvas ref={ref} className={className} style={{ width: size, height: size }} aria-hidden="true" />
}
