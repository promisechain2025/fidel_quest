/* ============================================================================
   MANUSCRIPT — shared visual primitives for the dark-manuscript design system
   ----------------------------------------------------------------------------
   TibebFrame is mounted ONCE at the app root: fixed woven side borders + a
   faint gold lattice behind the whole app, so every screen inherits the
   Ethiopian-manuscript identity without per-screen wiring. It is purely
   decorative (pointer-events: none) and sits in the ~14px edge gutter that
   the app's px-5 content padding already clears, so nothing needs to move.

   LetterTile is the one shared letter object — a gold "chunky" rounded tile
   with a Ge'ez glyph — used on the path, quiz answers, explorer and hunt.
   Colors come from the design tokens so both themes resolve automatically.
   ========================================================================== */
import { Check, Lock } from 'lucide-react'

// The tibeb ribbon pigments are constant across both themes (an aged-textile
// band reads the same on dark vellum or warm parchment). Kept as literals so
// the weave stays exact regardless of token remaps.
const TIBEB = { base: '#2b3350', a: '#c0453a', b: '#d5a53a', c: '#3f63a0', d: '#5a9150' }

function Band({ side }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        [side]: 0,
        width: 14,
        zIndex: 45,
        pointerEvents: 'none',
        backgroundColor: TIBEB.base,
        backgroundImage: [
          // woven ribbon: four pigment segments repeating down the band
          `repeating-linear-gradient(180deg, ${TIBEB.a} 0 6px, ${TIBEB.b} 6px 12px, ${TIBEB.c} 12px 18px, ${TIBEB.d} 18px 24px)`,
          // diagonal thread texture so it reads as weave, not flat stripes
          'repeating-linear-gradient(45deg, rgba(0,0,0,0.16) 0 2px, rgba(255,255,255,0.05) 2px 4px)',
        ].join(','),
        // champagne-gold hairline on the inner edge frames the content
        boxShadow:
          side === 'left'
            ? 'inset -2px 0 0 rgba(226,192,105,0.55)'
            : 'inset 2px 0 0 rgba(226,192,105,0.55)',
      }}
    />
  )
}

/** Woven side borders + faint gold lattice. Mount once at the app root. */
export function TibebFrame() {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          backgroundImage: [
            'repeating-linear-gradient(45deg, rgba(226,192,105,0.045) 0 1px, transparent 1px 46px)',
            'repeating-linear-gradient(-45deg, rgba(226,192,105,0.045) 0 1px, transparent 1px 46px)',
          ].join(','),
        }}
      />
      <Band side="left" />
      <Band side="right" />
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
