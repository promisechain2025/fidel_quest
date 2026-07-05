/* ============================================================================
   GHOST HAND — the non-verbal tutor
   ----------------------------------------------------------------------------
   A canvas-drawn hand (same zero-asset art pipeline as the characters) that
   springs to a target's screen position and taps in a loop. Rendered inside
   a full-screen overlay that swallows the child's input while the demo owns
   the machine; tapping anywhere skips. Purely presentational — the mode
   shells decide where it points and when the demo ends.
   ========================================================================== */

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function drawHand(g, s) {
  g.lineWidth = s * 0.045
  g.strokeStyle = '#3c3529'
  g.fillStyle = '#ffffff'
  // palm
  g.beginPath()
  g.ellipse(s * 0.5, s * 0.62, s * 0.2, s * 0.24, -0.25, 0, 7)
  g.fill()
  g.stroke()
  // pointing index finger
  g.beginPath()
  g.roundRect(s * 0.42, s * 0.08, s * 0.16, s * 0.42, s * 0.08)
  g.fill()
  g.stroke()
  // knuckle hints
  g.beginPath()
  g.moveTo(s * 0.62, s * 0.52)
  g.quadraticCurveTo(s * 0.7, s * 0.56, s * 0.66, s * 0.66)
  g.stroke()
  // cuff
  g.fillStyle = '#1cb0f6'
  g.beginPath()
  g.roundRect(s * 0.34, s * 0.82, s * 0.32, s * 0.16, s * 0.06)
  g.fill()
}

export default function GhostHand({ x, y, visible = true, blocking = true, onSkip }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    c.width = c.height = 128
    const g = c.getContext('2d')
    if (!g) return
    g.clearRect(0, 0, 128, 128)
    drawHand(g, 128)
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={blocking ? onSkip : undefined}
          role={blocking ? 'button' : 'presentation'}
          aria-label={blocking ? 'Watch how to play, or tap to skip' : undefined}
          style={{ cursor: blocking ? 'pointer' : 'default', background: 'transparent', pointerEvents: blocking ? 'auto' : 'none' }}
        >
          {x !== null && y !== null && (
            <motion.div
              className="pointer-events-none absolute"
              animate={{ left: x - 8, top: y - 10 }}
              transition={{ type: 'spring', stiffness: 170, damping: 22 }}
              style={{ left: x - 8, top: y - 10 }}
            >
              {/* tap ring */}
              <motion.span
                className="absolute -left-5 -top-5 block h-10 w-10 rounded-full"
                style={{ border: '3px solid var(--sky)' }}
                animate={{ scale: [0.4, 1.5], opacity: [0.9, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'easeOut' }}
                aria-hidden="true"
              />
              <motion.canvas
                ref={canvasRef}
                className="block"
                style={{ width: 72, height: 72 }}
                animate={{ y: [0, 7, 0], scale: [1, 0.92, 1] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden="true"
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
