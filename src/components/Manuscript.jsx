/* ============================================================================
   MANUSCRIPT — shared visual primitives for the dark-manuscript design system
   ----------------------------------------------------------------------------
   TibebFrame is mounted ONCE at the app root. It reproduces the approved
   home-mockup's traditional background, faithfully:
     - a 3-stop vellum ground gradient + a soft gold glow behind the top HUD
     - faint manuscript grain (deterministic dots)
     - a subtle Ethiopian geometric LATTICE (diagonal weave + plus-nodes)
     - one big, quiet illuminated Ge'ez letter as a heritage watermark
     - the tibeb woven side borders, a real DIAMOND weave (not stripes) with
       interlocking corner triangles + a thin gold inner frame line.
   The ground/lattice/watermark are painted on a canvas BEHIND the app (z-1,
   theme-aware, repainted on the `fq-theme` event); the two tibeb bands are
   crisp tiled SVG on top (z-45), purely decorative (pointer-events: none).

   LetterTile is the one shared letter object — a gold "chunky" rounded tile
   with a Ge'ez glyph — used on the path, quiz answers, explorer and hunt.
   ========================================================================== */
import { useEffect, useRef, useState } from 'react'
import { Check, Lock } from 'lucide-react'
import { getTheme } from '../platform/theme'

// The tibeb ribbon pigments are constant across both themes (an aged textile
// band reads the same on dark vellum or warm parchment). The band base swaps
// so the weave sits on the right ground.
// Aged gospel-manuscript pigments (madder, ochre, lapis, malachite), a touch
// desaturated so the woven band reads as old textile rather than primary.
const PIG = ['#a8463d', '#c0983f', '#40608c', '#57854e']
// 14px keeps the diamond weave legible while clearing the tightest screen
// gutter (px-4 = 16px), so the band never clips edge content on a phone.
const BAND_W = 14
const BAND_U = 24 // one weave cell; four cells (the pigment cycle) = one tile

// A vertical tibeb band as a tiled SVG: four cells high (one full pigment
// cycle), each a diamond + four interlocking corner triangles, framed by dark
// edge threads. Built once; pigments never change.
function bandDataUri() {
  const w = BAND_W
  const th = BAND_U * 4
  let cells = ''
  for (let k = 0; k < 4; k++) {
    const y = k * BAND_U
    const dia = PIG[k % 4]
    const cor = PIG[(k + 2) % 4]
    cells +=
      `<polygon points="${w / 2},${y + 3} ${w - 3},${y + BAND_U / 2} ${w / 2},${y + BAND_U - 3} 3,${y + BAND_U / 2}" fill="${dia}"/>` +
      `<polygon points="0,${y} 6,${y} 0,${y + 6}" fill="${cor}"/>` +
      `<polygon points="${w},${y} ${w - 6},${y} ${w},${y + 6}" fill="${cor}"/>` +
      `<polygon points="0,${y + BAND_U} 6,${y + BAND_U} 0,${y + BAND_U - 6}" fill="${cor}"/>` +
      `<polygon points="${w},${y + BAND_U} ${w - 6},${y + BAND_U} ${w},${y + BAND_U - 6}" fill="${cor}"/>`
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${th}" viewBox="0 0 ${w} ${th}">` +
    `<rect width="${w}" height="${th}" fill="#2b3350"/>${cells}` +
    `<line x1="1" y1="0" x2="1" y2="${th}" stroke="rgba(60,40,20,0.4)" stroke-width="1"/>` +
    `<line x1="${w - 1}" y1="0" x2="${w - 1}" y2="${th}" stroke="rgba(60,40,20,0.4)" stroke-width="1"/>` +
    `</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
const BAND_URI = bandDataUri()

// Per-theme ground + lattice + glow values, matching the mockup exactly.
const PALETTE = {
  dark: {
    parch: ['#242b40', '#1b2233', '#151a27'],
    glow: 'rgba(226,192,105,0.16)',
    lat: 'rgba(226,192,105,0.12)',
    lat2: 'rgba(226,192,105,0.19)',
    grain: 'rgba(150,110,60,0.05)',
    mark: '#e2c069',
    markAlpha: 0.22,
  },
  light: {
    parch: ['#f7edcf', '#eddfb6', '#e5d2a4'],
    glow: 'rgba(255,238,196,0.5)',
    lat: 'rgba(120,96,54,0.10)',
    lat2: 'rgba(120,96,54,0.15)',
    grain: 'rgba(150,110,60,0.05)',
    mark: '#8a5a1e',
    markAlpha: 0.11,
  },
}
// The heritage watermark glyph — the brand letter of eGeez ("E", sixth order).
const MARK_GLYPH = 'እ'

function paintGround(canvas, theme) {
  const g = canvas.getContext('2d')
  if (!g) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const W = window.innerWidth
  const H = window.innerHeight
  canvas.width = Math.floor(W * dpr)
  canvas.height = Math.floor(H * dpr)
  canvas.style.width = W + 'px'
  canvas.style.height = H + 'px'
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  const P = PALETTE[theme] || PALETTE.dark

  // vellum ground
  const pg = g.createLinearGradient(0, 0, 0, H)
  pg.addColorStop(0, P.parch[0])
  pg.addColorStop(0.5, P.parch[1])
  pg.addColorStop(1, P.parch[2])
  g.fillStyle = pg
  g.fillRect(0, 0, W, H)

  // faint manuscript grain (deterministic — no RNG)
  g.fillStyle = P.grain
  for (let i = 0; i < 90; i++) {
    g.beginPath()
    g.arc((i * 97) % W, (i * 173) % H, 1.1, 0, 7)
    g.fill()
  }

  // warm glow behind the top HUD
  const gl = g.createRadialGradient(W * 0.5, 84, 10, W * 0.5, 84, 280)
  gl.addColorStop(0, P.glow)
  gl.addColorStop(1, 'rgba(255,231,170,0)')
  g.fillStyle = gl
  g.fillRect(0, 0, W, H)

  // subtle geometric lattice: diagonal weave + plus-nodes
  const d = 50
  g.strokeStyle = P.lat
  g.lineWidth = 1.3
  for (let k = -H; k < W + H; k += d) {
    g.beginPath(); g.moveTo(k, 0); g.lineTo(k + H, H); g.stroke()
    g.beginPath(); g.moveTo(k, 0); g.lineTo(k - H, H); g.stroke()
  }
  g.strokeStyle = P.lat2
  g.lineWidth = 1.5
  for (let yy = 0; yy <= H + d; yy += d) {
    for (let xx = (yy / d) % 2 ? d / 2 : 0; xx <= W + d; xx += d) {
      g.beginPath()
      g.moveTo(xx - 4, yy); g.lineTo(xx + 4, yy)
      g.moveTo(xx, yy - 4); g.lineTo(xx, yy + 4)
      g.stroke()
    }
  }

  // one big, quiet illuminated letter — heritage as a graphic, not a texture
  g.save()
  g.globalAlpha = P.markAlpha
  g.fillStyle = P.mark
  g.font = "900 320px 'Noto Sans Ethiopic', system-ui, sans-serif"
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(MARK_GLYPH, W * 0.5, H * 0.52)
  g.restore()
}

/** Woven side borders + the traditional manuscript ground. Mount once. */
export function TibebFrame() {
  const canvasRef = useRef(null)
  const [theme, setTheme] = useState(() => getTheme())

  useEffect(() => {
    const onTheme = (e) => setTheme(e.detail || getTheme())
    window.addEventListener('fq-theme', onTheme)
    return () => window.removeEventListener('fq-theme', onTheme)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    let alive = true
    let timer = 0
    let lastW = -1
    let lastH = -1
    const draw = () => { if (alive) { paintGround(canvas, theme); lastW = window.innerWidth; lastH = window.innerHeight } }
    draw()
    // Repaint once the Ethiopic font is ready so the watermark glyph is real -
    // guarded by `alive` so a late resolve never paints a detached canvas.
    if (document.fonts?.ready) document.fonts.ready.then(() => { if (alive) draw() }).catch(() => {})
    // Trailing debounce: mobile URL-bar show/hide fires a resize STORM (each a
    // full-viewport realloc + gradient/lattice/glyph repaint). Coalesce to one
    // paint after motion settles. Skip pure address-bar SHRINK (width same,
    // viewport not taller than what we painted), but DO repaint when the
    // viewport grows taller than the last paint so the revealed bottom keeps
    // the gradient instead of falling back to the flat body colour.
    const onResize = () => {
      if (window.innerWidth === lastW && window.innerHeight <= lastH) return
      clearTimeout(timer)
      timer = setTimeout(draw, 150)
    }
    window.addEventListener('resize', onResize)
    return () => { alive = false; window.removeEventListener('resize', onResize); clearTimeout(timer) }
  }, [theme])

  const band = (side) => ({
    position: 'fixed',
    top: 0,
    bottom: 0,
    [side]: 0,
    width: BAND_W,
    zIndex: 45,
    pointerEvents: 'none',
    backgroundImage: BAND_URI,
    backgroundRepeat: 'repeat-y',
    backgroundSize: `${BAND_W}px ${BAND_U * 4}px`,
    boxShadow: side === 'left' ? 'inset -2px 0 0 rgba(201,154,51,0.5)' : 'inset 2px 0 0 rgba(201,154,51,0.5)',
  })

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}
      />
      <div aria-hidden="true" style={band('left')} />
      <div aria-hidden="true" style={band('right')} />
    </>
  )
}

/** Harag - the illuminated interlace ornament that heads a Ge'ez manuscript
    chapter. A centered, symmetric motif (woven pigment strands through a gold
    medallion) to sit under a screen title. Decorative; pigments are constant
    so it reads on either ground. `w` sets the drawn width. */
export function Harag({ w = 210, className = '', style = {} }) {
  const GOLD = '#e2c069'
  const [mad, och, lap, mal] = PIG // madder, ochre, lapis, malachite
  const cx = w / 2
  const half = (side) => {
    // three woven humps marching out from the medallion toward an end finial
    const dir = side // +1 right, -1 left
    const x0 = cx + dir * 16
    const seg = 22
    const up = `M ${x0} 13 q ${dir * seg * 0.5} -11 ${dir * seg} 0 t ${dir * seg} 0 t ${dir * seg} 0`
    const dn = `M ${x0} 13 q ${dir * seg * 0.5} 11 ${dir * seg} 0 t ${dir * seg} 0 t ${dir * seg} 0`
    const endX = x0 + dir * seg * 3
    return (
      <g key={side}>
        <path d={up} fill="none" stroke={lap} strokeWidth="2.4" strokeLinecap="round" />
        <path d={dn} fill="none" stroke={mal} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx={endX} cy="13" r="3.4" fill={och} />
        <circle cx={endX} cy="13" r="3.4" fill="none" stroke={GOLD} strokeWidth="1.2" />
      </g>
    )
  }
  return (
    <svg viewBox={`0 0 ${w} 26`} width={w} height={26} className={className} style={{ maxWidth: '100%', ...style }} aria-hidden="true">
      {half(-1)}
      {half(1)}
      {/* central gold medallion with a madder jewel */}
      <circle cx={cx} cy="13" r="8" fill={GOLD} />
      <circle cx={cx} cy="13" r="8" fill="none" stroke="#a9832f" strokeWidth="1.3" />
      <circle cx={cx} cy="13" r="3.6" fill={mad} />
    </svg>
  )
}

/** The shared gold letter object. `state`: done | current | locked. */
export function LetterTile({ glyph, state = 'current', size = 60, className = '', style = {} }) {
  const locked = state === 'locked'
  const face = locked ? 'var(--line)' : 'var(--tile)'
  const edge = locked ? 'var(--card)' : 'var(--tile-deep)'
  const ink = locked ? 'var(--muted)' : 'var(--glyph)'
  return (
    <span
      className={`geez relative inline-flex items-center justify-center font-black ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '26%',
        background: face,
        color: ink,
        border: `2px solid ${edge}`,
        boxShadow: `0 5px 0 ${edge}`,
        fontSize: size * 0.42,
        ...style,
      }}
      aria-hidden="true"
    >
      {locked ? <Lock style={{ width: size * 0.32, height: size * 0.32 }} /> : glyph}
      {state === 'done' && (
        <Check
          className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5"
          style={{ width: size * 0.3, height: size * 0.3, color: 'var(--go)' }}
        />
      )}
    </span>
  )
}
