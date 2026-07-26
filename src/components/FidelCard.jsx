/* ============================================================================
   FIDEL CARD — a code-drawn Ethiopian playing card
   ----------------------------------------------------------------------------
   The shared card object for the Fidel card games (Line Up, Match). A portrait
   ivory card with an ornate gold inset frame, mirrored corner glyph indices
   (the "rank" corners of a real playing card), and one big centered Ge'ez
   letter over a soft gold halo. `variant='back'` is the face-down card: a
   deep lapis ground with a gold tibeb lattice and a central Kokeb-star
   medallion. Pure CSS/SVG, no image assets, theme-independent (a physical card
   reads the same on dark vellum or warm parchment; a drop shadow + gold frame
   lift it off either ground).
   ========================================================================== */
import { Check } from 'lucide-react'

const INK = '#6d4501'        // deep amber manuscript ink for the glyph
const GOLD = '#c99a33'       // frame gold
const GOLD_SOFT = '#e2c069'  // brand champagne gold

// Ge'ez numerals 1..9, shown beside the Arabic digit (slots use 1..7, the
// market uses up to 9) so a child picks up the Ethiopian numbers. The glyphs
// now live in one validated place - data/numerals.js - re-exported here so
// existing importers are unchanged.
// eslint-disable-next-line react-refresh/only-export-components
export { GEEZ_DIGITS } from '../data/numerals'

export function FidelCard({ glyph, size = 60, variant = 'face', done = false, className = '', style = {} }) {
  const w = size
  const h = Math.round(size * 1.4)
  const r = Math.round(size * 0.14)

  if (variant === 'back') {
    return (
      <div
        className={className}
        aria-hidden="true"
        style={{
          width: w, height: h, borderRadius: r, position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(155deg,#2c4373,#1a294a)',
          boxShadow: '0 6px 13px rgba(0,0,0,.42), 0 2px 0 rgba(0,0,0,.3)',
          border: `1px solid ${GOLD}`, ...style,
        }}
      >
        <div
          style={{
            position: 'absolute', inset: size * 0.08, borderRadius: r * 0.6, border: `1.5px solid ${GOLD_SOFT}`,
            background:
              'repeating-linear-gradient(45deg, rgba(226,192,105,.12) 0 3px, transparent 3px 9px),' +
              'repeating-linear-gradient(-45deg, rgba(226,192,105,.12) 0 3px, transparent 3px 9px)',
          }}
        />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="#1a294a" stroke={GOLD_SOFT} strokeWidth="1.4" />
            <path d="M12 4.4l1.95 4.15 4.55.5-3.35 3.05.92 4.5L12 18.4 7.93 20.65l.92-4.5-3.35-3.05 4.55-.5z" fill={GOLD_SOFT} />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        width: w, height: h, borderRadius: r, position: 'relative',
        background: 'linear-gradient(160deg,#fffdf4,#f1e2bd)',
        boxShadow: '0 6px 14px rgba(0,0,0,.34), 0 2px 0 #d9c58e',
        border: `1px solid ${done ? '#7bbf4a' : '#e6d5a4'}`, ...style,
      }}
    >
      {/* ornate inset frame */}
      <div
        style={{
          position: 'absolute', inset: size * 0.085, borderRadius: r * 0.55,
          border: `1.5px solid ${done ? '#59a52a' : GOLD}`,
          boxShadow: `inset 0 0 0 1px ${done ? 'rgba(89,165,42,.28)' : 'rgba(201,154,51,.28)'}`,
        }}
      />
      {/* one upright corner index (no inverted copy - an upside-down Ge'ez
         glyph reads as a different letter to a child) */}
      <span className="geez" style={{ position: 'absolute', top: size * 0.05, left: size * 0.12, fontSize: size * 0.25, fontWeight: 900, color: INK, lineHeight: 1 }}>{glyph}</span>
      {/* center figure over a soft gold halo */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', width: size * 0.72, height: size * 0.72, borderRadius: '50%', background: 'radial-gradient(circle, rgba(226,192,105,.38), rgba(226,192,105,0) 70%)' }} />
        <span className="geez" style={{ position: 'relative', fontSize: size * 0.52, fontWeight: 900, color: INK, lineHeight: 1 }}>{glyph}</span>
      </div>
      {done && (
        <Check className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5" style={{ width: size * 0.3, height: size * 0.3, color: 'var(--go)' }} />
      )}
    </div>
  )
}
