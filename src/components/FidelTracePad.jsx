/* eslint-disable react-refresh/only-export-components --
   computeTraceResult is the pad's pure scoring core, exported for direct
   unit testing; it has no other natural home. */
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Eraser, Check, ArrowDown, ArrowRight } from 'lucide-react'

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

/* ── Directional tracing (Pillar 6) ──────────────────────────────────────
   Pure coverage rewards scrubbing; real handwriting needs a start point and
   a direction. Ge'ez has no public canonical stroke-order dataset, so the
   day-one engine DERIVES an expected origin and dominant axis from the
   glyph's own pixel mask (topmost-then-leftmost inked point is the
   conventional pen start for a top-to-bottom, left-to-right script). A
   per-family STROKE_HINTS override map is scaffolded for a later authored
   pass; when present it wins over the heuristic. Direction is ALWAYS a soft
   cue - it guides the finger back, it never fails the child.                */

// Authored overrides, keyed by family id -> { origin:[x,y] in 0..CANVAS_SIZE,
// dir:'TB'|'LR' }. Intentionally empty for day one (heuristic-only).
export const STROKE_HINTS = {}

// Tolerance widens the target early and tightens it by chapter (1..4).
// origin: max px from the expected start; needDir: whether the direction
// cue is armed at all (advisory only until the later chapters).
// Widened for little fingers: a chunky trace covers the mask more readily, so
// a genuine attempt registers instead of feeling fussy. Still tightens by
// chapter, and stray tolerance keeps scribbling from counting.
export const TRACE_TOLERANCE = {
  1: { cover: 27, stray: 50, origin: 112, needDir: false },
  2: { cover: 23, stray: 42, origin: 90, needDir: false },
  3: { cover: 19, stray: 34, origin: 70, needDir: true },
  4: { cover: 16, stray: 28, origin: 56, needDir: true },
}

/** Expected start point + primary axis, from override or glyph mask. Pure. */
export function strokeSpec(familyId, maskPoints) {
  const hint = STROKE_HINTS[familyId]
  if (hint) return hint
  if (!maskPoints || maskPoints.length === 0) return { origin: [CANVAS_SIZE / 2, CANVAS_SIZE / 2], dir: 'TB' }
  let top = maskPoints[0]
  let minX = maskPoints[0][0], maxX = maskPoints[0][0], minY = maskPoints[0][1], maxY = maskPoints[0][1]
  for (const [x, y] of maskPoints) {
    if (y < top[1] || (y === top[1] && x < top[0])) top = [x, y]
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  return { origin: top, dir: maxY - minY >= maxX - minX ? 'TB' : 'LR' }
}

/* Directional, chapter-scaled scoring. Extends computeTraceResult with an
   origin check and a net-direction check. `cue` tells the UI what to nudge
   ('origin' -> pulse a dot at the start; 'direction' -> ghost arrow); `pass`
   is a suggestion the caller may combine with plain coverage so a fully
   covered letter is never rejected. Pure and deterministic.                 */
export function computeTraceResultV2(maskPoints, drawnPoints, chapter = 1, familyId = null) {
  const tol = TRACE_TOLERANCE[chapter] ?? TRACE_TOLERANCE[1]
  const base = computeTraceResult(maskPoints, drawnPoints, { coverRadius: tol.cover, strayRadius: tol.stray })
  if (drawnPoints.length < 2) {
    return { ...base, originOk: false, dirOk: false, cue: 'origin', pass: false }
  }
  const spec = strokeSpec(familyId, maskPoints)
  const start = drawnPoints[0]
  const end = drawnPoints[drawnPoints.length - 1]
  const originErr = Math.hypot(start[0] - spec.origin[0], start[1] - spec.origin[1])
  const originOk = originErr <= tol.origin
  const dirOk = spec.dir === 'TB' ? end[1] - start[1] >= 0 : end[0] - start[0] >= 0
  let cue = null
  if (!originOk) cue = 'origin'
  else if (tol.needDir && !dirOk) cue = 'direction'
  const pass = base.coverage >= 0.5 && originOk && (!tol.needDir || dirOk || base.stars >= 2)
  return { ...base, originOk, dirOk, originPoint: spec.origin, dir: spec.dir, cue, pass }
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

export default function FidelTracePad({ char, labels, onScored, chapter = null, familyId = null }) {
  const canvasRef = useRef(null)
  const maskRef = useRef([])
  const drawnRef = useRef([])
  const drawingRef = useRef(false)
  const strokeCountRef = useRef(0)
  const [supported, setSupported] = useState(true)
  const [hasInk, setHasInk] = useState(false)
  const [hint, setHint] = useState(null) // { x, y, dir } in 0..1 of the pad
  const [cue, setCue] = useState(null) // 'origin' | 'direction' after a check

  const reset = useCallback(() => {
    const ctx = get2d(canvasRef.current)
    if (!ctx) return
    drawnRef.current = []
    strokeCountRef.current = 0
    setHasInk(false)
    setCue(null)
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
    // Directional mode only: derive where to start and which way to go.
    if (chapter) {
      const spec = strokeSpec(familyId, maskRef.current)
      setHint({ x: spec.origin[0] / CANVAS_SIZE, y: spec.origin[1] / CANVAS_SIZE, dir: spec.dir })
    } else {
      setHint(null)
    }
    reset()
  }, [char, chapter, familyId, reset])

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
    ctx.lineWidth = 26
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
    if (chapter) {
      const r = computeTraceResultV2(maskRef.current, drawnRef.current, chapter, familyId)
      setCue(r.cue ?? null)
      onScored(r)
    } else {
      onScored(computeTraceResult(maskRef.current, drawnRef.current))
    }
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
      <div className="relative w-full max-w-xs">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          role="img"
          aria-label={labels.instruction}
          className="w-full touch-none rounded-3xl border-4 border-dashed border-amber-300 bg-white shadow-inner dark:border-amber-700 dark:bg-gray-100"
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        {/* Start-here dot: always shown in directional mode, pulsing harder
            when the last check said the child began in the wrong place. */}
        {hint && (
          <motion.span
            className="pointer-events-none absolute block rounded-full"
            style={{
              left: `${hint.x * 100}%`,
              top: `${hint.y * 100}%`,
              width: cue === 'origin' ? 22 : 14,
              height: cue === 'origin' ? 22 : 14,
              marginLeft: cue === 'origin' ? -11 : -7,
              marginTop: cue === 'origin' ? -11 : -7,
              background: cue === 'origin' ? 'rgba(16,185,129,0.9)' : 'rgba(16,185,129,0.55)',
              boxShadow: '0 0 0 3px rgba(16,185,129,0.25)',
            }}
            animate={{ scale: cue === 'origin' ? [1, 1.5, 1] : [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: cue === 'origin' ? 0.7 : 1.4, repeat: Infinity }}
            aria-hidden="true"
          />
        )}
        {/* Ghost arrow: shows which way to go when direction is armed + wrong. */}
        {hint && cue === 'direction' && (
          <motion.span
            className="pointer-events-none absolute text-emerald-500"
            style={{ left: `${hint.x * 100}%`, top: `${hint.y * 100}%` }}
            animate={hint.dir === 'TB' ? { y: [0, 26, 0] } : { x: [0, 26, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            aria-hidden="true"
          >
            {hint.dir === 'TB' ? <ArrowDown className="h-7 w-7" /> : <ArrowRight className="h-7 w-7" />}
          </motion.span>
        )}
      </div>
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
