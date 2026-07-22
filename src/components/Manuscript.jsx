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
const PIG = ['#c0453a', '#d5a53a', '#3f63a0', '#5a9150']
const BAND_W = 18
const BAND_U = 26 // one weave cell; four cells (the pigment cycle) = one tile

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
    glow: 'rgba(226,192,105,0.15)',
    lat: 'rgba(226,192,105,0.07)',
    lat2: 'rgba(226,192,105,0.11)',
    grain: 'rgba(150,110,60,0.05)',
    mark: '#e2c069',
    markAlpha: 0.08,
  },
  light: {
    parch: ['#f7edcf', '#eddfb6', '#e5d2a4'],
    glow: 'rgba(255,238,196,0.5)',
    lat: 'rgba(120,96,54,0.06)',
    lat2: 'rgba(120,96,54,0.10)',
    grain: 'rgba(150,110,60,0.05)',
    mark: '#8a5a1e',
    markAlpha: 0.05,
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
    let raf = 0
    const draw = () => paintGround(canvas, theme)
    draw()
    // Repaint once the Ethiopic font is ready so the watermark glyph is real.
    if (document.fonts?.ready) document.fonts.ready.then(draw).catch(() => {})
    const onResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw) }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(raf) }
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
