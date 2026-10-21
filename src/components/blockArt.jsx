/* Toy-brick art for Block Church: glossy studded bricks drawn in code (SVG +
   CSS gradients) so the game stays offline, crisp at any size, and free of
   any baked-in text. Ge'ez letters are always rendered with the app font. */

/** Lighten (amt > 0) or darken (amt < 0) a #rrggbb colour. */
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v) => Math.max(0, Math.min(255, Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt))))
  const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

/** One glossy SVG stud. */
export function Stud({ cx, cy, r, color }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy + r * 0.45} rx={r} ry={r * 0.55} fill={shade(color, -0.35)} />
      <rect x={cx - r} y={cy - r * 0.2} width={r * 2} height={r * 0.65} fill={shade(color, -0.15)} />
      <ellipse cx={cx} cy={cy - r * 0.2} rx={r} ry={r * 0.55} fill={shade(color, 0.18)} />
      <ellipse cx={cx - r * 0.35} cy={cy - r * 0.35} rx={r * 0.35} ry={r * 0.18} fill="#fff" opacity=".55" />
    </g>
  )
}

/** One glossy SVG brick with bevels, highlight and studs. */
export function Brick({ x, y, w, h, color, studs = 2, shadow = true }) {
  const r = Math.min(w / (studs * 3.2), h * 0.28)
  return (
    <g>
      {shadow && <rect x={x + 1.5} y={y + 2.5} width={w} height={h} rx={h * 0.12} fill="#000" opacity=".18" />}
      <rect x={x} y={y} width={w} height={h} rx={h * 0.12} fill={shade(color, -0.12)} />
      <rect x={x} y={y} width={w} height={h * 0.78} rx={h * 0.12} fill={color} />
      <rect x={x + 1.5} y={y + 1.2} width={w - 3} height={h * 0.16} rx={h * 0.08} fill="#fff" opacity=".35" />
      <rect x={x} y={y} width={w} height={h} rx={h * 0.12} fill="none" stroke={shade(color, -0.35)} strokeWidth=".8" />
      {studs > 0 && Array.from({ length: studs }, (_, i) => (
        <Stud key={i} cx={x + (w / studs) * (i + 0.5)} cy={y - r * 0.25} r={r} color={color} />
      ))}
    </g>
  )
}

/** CSS for an HTML glossy brick (tray block and pieces). */
export function brickCss(color, depth = 6) {
  return {
    background: `linear-gradient(180deg, ${shade(color, 0.25)} 0%, ${color} 35%, ${shade(color, -0.1)} 100%)`,
    boxShadow: `inset 0 3px 0 rgba(255,255,255,.45), inset 0 -${Math.round(depth * 0.6)}px 0 ${shade(color, -0.2)}, 0 ${depth}px 0 ${shade(color, -0.4)}, 0 ${depth + 6}px 12px rgba(0,0,0,.35)`,
    border: `1px solid ${shade(color, -0.3)}`,
  }
}

/** CSS for an HTML stud on top of a brick. */
export function studCss(color, size) {
  return {
    width: size, height: size * 0.62, borderRadius: '50%',
    background: `radial-gradient(ellipse at 35% 30%, #fff9 0 18%, ${shade(color, 0.2)} 22%, ${color} 60%, ${shade(color, -0.25)} 100%)`,
    boxShadow: `0 ${size * 0.16}px 0 ${shade(color, -0.35)}`,
  }
}

/* Procedural wood grain (feTurbulence stretched along the plank). */
const GRAIN = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='200'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.008 0.22' numOctaves='3' seed='4'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.2  0 0 0 0 0.08  1.5 0 0 0 -0.45'/></filter><rect width='400' height='200' filter='url(#g)'/></svg>`,
)
export const WOOD = {
  backgroundColor: '#c88a4c',
  backgroundImage: `url("data:image/svg+xml,${GRAIN}"), linear-gradient(180deg, #d9a064, #b87838)`,
  backgroundSize: '400px 200px, 100% 100%',
}
export const WOOD_DARK = { ...WOOD, backgroundColor: '#9a6232', backgroundImage: `url("data:image/svg+xml,${GRAIN}"), linear-gradient(180deg, #b0743c, #8a5426)` }
