/* eslint-disable react-refresh/only-export-components --
   computeTraceResult is the pad's pure scoring core, exported for direct
   unit testing; it has no other natural home. */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Eraser, Check } from 'lucide-react'

/* Letter-tracing pad for Fidel Quest. The child draws over a faint guide
   glyph; scoring compares the drawn points against a pixel mask of the
   glyph. There is no public stroke-order dataset for Ge'ez, so coverage +
   stray-ink scoring is the honest, robust approach: it rewards tracing the
   whole letter shape and penalizes scribbling outside it.                    */

const CANVAS_SIZE = 320
const GLYPH_FONT = "260px 'Noto Sans Ethiopic', 'Abyssinica SIL', 'Nyala', sans-serif"
// Mask sampling stride: 6px keeps the mask ~300-600 points for a typical
// glyph, small enough for the O(mask x drawn) score to stay instant.
const MASK_STEP = 6
const STROKE_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6']

/* Pure scoring, exported for tests.
   coverage: fraction of glyph-mask points with drawn ink within coverRadius.
   stray:    fraction of drawn points with no glyph within strayRadius.
   Kid-lenient star bands — the goal is encouragement, not calligraphy.      */
export function computeTraceResult(maskPoints, drawnPoints, { coverRadius = 18, strayRadius = 34 } = {}) {
  if (maskPoints.length === 0 || drawnPoints.length === 0) {
    return { coverage: 0, stray: drawnPoints.length ? 1 : 0, stars: 0 }
  }
  const coverR2 = coverRadius * coverRadius
  const strayR2 = strayRadius * strayRadius
  let covered = 0
  for (const [mx, my] of maskPoints) {
    for (const [dx, dy] of drawnPoints) {
      const ddx = mx - dx
      const ddy = my - dy
      if (ddx * ddx + ddy * ddy <= coverR2) {
        covered++
        break
      }
    }
  }
  let strays = 0
  for (const [dx, dy] of drawnPoints) {
    let near = false
    for (const [mx, my] of maskPoints) {
      const ddx = mx - dx
      const ddy = my - dy
      if (ddx * ddx + ddy * ddy <= strayR2) {
        near = true
        break
      }
    }
    if (!near) strays++
  }
  const coverage = covered / maskPoints.length
  const stray = strays / drawnPoints.length
  let stars = 0
  if (coverage >= 0.85 && stray <= 0.2) stars = 3
  else if (coverage >= 0.6 && stray <= 0.35) stars = 2
  else if (coverage >= 0.35) stars = 1
  return { coverage, stray, stars }
}

// jsdom (and some embeds) either return null or throw from getContext —
// treat both as "unsupported" so the pad degrades to its fallback note.
function get2d(canvas) {
  if (!canvas) return null
  try {
    return canvas.getContext('2d')
  } catch {
    return null
  }
}

function drawGuide(ctx, char) {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  ctx.font = GLYPH_FONT
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(148, 163, 184, 0.45)'
  ctx.fillText(char, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 14)
}

function buildMask(char) {
  const off = document.createElement('canvas')
  off.width = CANVAS_SIZE
  off.height = CANVAS_SIZE
  const ctx = get2d(off)
  if (!ctx) return []
  ctx.font = GLYPH_FONT
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#000'
  ctx.fillText(char, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 14)
  const { data } = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  const mask = []
  for (let y = 0; y < CANVAS_SIZE; y += MASK_STEP) {
    for (let x = 0; x < CANVAS_SIZE; x += MASK_STEP) {
      if (data[(y * CANVAS_SIZE + x) * 4 + 3] > 60) mask.push([x, y])
    }
  }
  return mask
}

export default function FidelTracePad({ char, labels, onScored }) {
  const canvasRef = useRef(null)
  const maskRef = useRef([])
  const drawnRef = useRef([])
  const drawingRef = useRef(false)
  const strokeCountRef = useRef(0)
  const [supported, setSupported] = useState(true)
  const [hasInk, setHasInk] = useState(false)

  const reset = useCallback(() => {
    const ctx = get2d(canvasRef.current)
    if (!ctx) return
    drawnRef.current = []
    strokeCountRef.current = 0
    setHasInk(false)
    drawGuide(ctx, char)
  }, [char])

  useEffect(() => {
    const ctx = get2d(canvasRef.current)
    if (!ctx) {
      setSupported(false)
      return
    }
    setSupported(true)
    maskRef.current = buildMask(char)
    reset()
  }, [char, reset])

  const toCanvasPoint = (event) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return [
      ((event.clientX - rect.left) / rect.width) * CANVAS_SIZE,
      ((event.clientY - rect.top) / rect.height) * CANVAS_SIZE,
    ]
  }

  const handlePointerDown = (event) => {
    if (!supported) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    drawingRef.current = true
    strokeCountRef.current += 1
    const point = toCanvasPoint(event)
    drawnRef.current.push(point)
    const ctx = get2d(canvasRef.current)
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(point[0], point[1])
    ctx.strokeStyle = STROKE_COLORS[(strokeCountRef.current - 1) % STROKE_COLORS.length]
    ctx.lineWidth = 18
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    setHasInk(true)
  }

  const handlePointerMove = (event) => {
    if (!drawingRef.current || !supported) return
    const point = toCanvasPoint(event)
    drawnRef.current.push(point)
    const ctx = get2d(canvasRef.current)
    if (!ctx) return
    ctx.lineTo(point[0], point[1])
    ctx.stroke()
  }

  const handlePointerUp = () => {
    drawingRef.current = false
  }

  const handleCheck = () => {
    onScored(computeTraceResult(maskRef.current, drawnRef.current))
  }

  if (!supported) {
    return (
      <p className="rounded-2xl bg-white/80 px-6 py-8 text-center font-semibold text-gray-500 dark:bg-gray-800/80 dark:text-gray-400">
        {labels.unsupported}
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        role="img"
        aria-label={labels.instruction}
        className="w-full max-w-xs touch-none rounded-3xl border-4 border-dashed border-amber-300 bg-white shadow-inner dark:border-amber-700 dark:bg-gray-100"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 font-extrabold text-gray-600 shadow-md transition-all hover:shadow-lg active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/70 dark:bg-gray-700 dark:text-gray-200"
        >
          <Eraser className="h-5 w-5" /> {labels.clear}
        </button>
        <button
          type="button"
          onClick={handleCheck}
          disabled={!hasInk}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-2.5 font-extrabold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/70"
        >
          <Check className="h-5 w-5" /> {labels.check}
        </button>
      </div>
    </div>
  )
}
