/* Anbessa - authored SVG art (the first "drawn, not procedural" character).
   A painted lion cub for DOM surfaces where wearable compositing is not
   needed: uneven mane, muzzle, and a chest star, on the canvas palette
   (golden fur, orange mane). See docs/art-pipeline.md.

   Drop-in for the canvas sprite: accepts the same `mood`/`pose` names, so a
   `<Sprite2D draw={drawAnbessa} mood pose>` becomes `<AnbessaSvg mood pose>`.
   Expressions: happy (default), cheer (open smile + raised paws), sad
   (frown + tear), worried, eat (open mouth for Feed Anbessa). */
import { useId } from 'react'

const CX = 100
const HEAD_Y = 92

function toExpression({ expression, mood, pose }) {
  if (pose === 'cheer') return 'cheer'
  const e = expression || mood || 'happy'
  if (e === 'cheer') return 'cheer'
  if (e === 'eating' || e === 'hungry' || e === 'eat') return 'eat'
  if (e === 'sad') return 'sad'
  if (e === 'worried') return 'worried'
  return 'happy'
}

/* A few big overlapping lobes, so the mane is fur and not a bead ring. */
const MANE = [
  [-0.4, 0.9, 22, 26],
  [0.6, 0.2, 26, 20],
  [1.6, 0.85, 24, 22],
  [2.5, 0.15, 22, 26],
  [3.4, 0.8, 24, 20],
  [4.4, 0.2, 20, 24],
  [-1.4, 0.15, 20, 22],
  [5.2, 0.75, 18, 16],
].map(([a, wobble, rx, ry]) => ({
  x: +(CX + Math.cos(a) * (38 + wobble * 8)).toFixed(1),
  y: +(HEAD_Y + Math.sin(a) * 34).toFixed(1),
  rx,
  ry,
  rot: +(a * 20).toFixed(1),
  lit: wobble > 0.5,
}))

export function AnbessaSvg({ size = 160, expression, mood, pose, title = 'Anbessa', className = '', style = {} }) {
  const raw = useId().replace(/:/g, '')
  const id = (n) => `${n}-${raw}`
  const exp = toExpression({ expression, mood, pose })
  const cheer = exp === 'cheer'
  const droop = exp === 'sad' || exp === 'worried'
  const eye = (sx) => {
    const ey = HEAD_Y - 2 + (droop ? 3 : 0)
    return (
      <g key={sx}>
        <ellipse cx={CX + sx * 18} cy={ey + 1} rx="12" ry={droop ? 11 : 13} fill="#fff" />
        <circle cx={CX + sx * 18 + sx * 0.6} cy={ey + 3} r={droop ? 6.4 : 7.2} fill="#3a2a14" />
        <circle cx={CX + sx * 18 - 2.4} cy={ey - 0.5} r="2.6" fill="#fff" />
        <path d={`M${CX + sx * 18 - 11},${ey - 2} Q${CX + sx * 18},${ey - 8} ${CX + sx * 18 + 11},${ey - 1}`} stroke="#c06a14" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </g>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 200 210" className={className} style={style}
      role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <title>{title}</title>
      <defs>
        <radialGradient id={id('head')} cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffe0a8" /><stop offset="55%" stopColor="#f4a83c" /><stop offset="100%" stopColor="#e08a28" />
        </radialGradient>
        <radialGradient id={id('body')} cx="40%" cy="22%" r="80%">
          <stop offset="0%" stopColor="#ffd08a" /><stop offset="100%" stopColor="#e9922c" />
        </radialGradient>
        <linearGradient id={id('mane')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0942c" /><stop offset="100%" stopColor="#b85a0c" />
        </linearGradient>
        <linearGradient id={id('mane2')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffb25a" /><stop offset="100%" stopColor="#e07a16" />
        </linearGradient>
        <radialGradient id={id('muz')} cx="50%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#fff8ee" /><stop offset="100%" stopColor="#ffd7a8" />
        </radialGradient>
      </defs>

      <ellipse cx={CX} cy="198" rx="46" ry="7" fill="#1b140c" opacity="0.16" />
      <path d="M146,168 Q186,160 178,124 Q174,146 154,154" fill="#e9922c" />
      <ellipse cx="180" cy="120" rx="11" ry="12" fill="#5c3010" />
      <ellipse cx="176" cy="116" rx="4" ry="3" fill="#f0b060" opacity="0.7" />

      <ellipse cx={CX} cy="168" rx="48" ry="34" fill={`url(#${id('body')})`} />
      <ellipse cx={CX} cy="176" rx="22" ry="16" fill="#ffe0b4" opacity="0.85" />
      <ellipse cx={CX - 28} cy="190" rx="16" ry="11" fill="#e9922c" />
      <ellipse cx={CX + 28} cy="190" rx="16" ry="11" fill="#e9922c" />
      <ellipse cx={CX - 16} cy="198" rx="13" ry="9" fill="#f7b04a" />
      <ellipse cx={CX + 16} cy="198" rx="13" ry="9" fill="#f7b04a" />
      <ellipse cx={CX - 30} cy="194" rx="6" ry="3.5" fill="#c86a10" opacity="0.45" />
      <ellipse cx={CX + 30} cy="194" rx="6" ry="3.5" fill="#c86a10" opacity="0.45" />
      <path d={`M${CX},152 l4.2,8.6 9.2,1 -7,6.2 2,9.2 -8.4,-4.8 -8.4,4.8 2,-9.2 -7,-6.2 9.2,-1 z`} fill="#ffc800" stroke="#e0a400" strokeWidth="1.4" />

      <g>
        {MANE.map((p, i) => (
          <ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} transform={`rotate(${p.rot} ${p.x} ${p.y})`} fill={`url(#${id(p.lit ? 'mane2' : 'mane')})`} />
        ))}
        <circle cx={CX} cy={HEAD_Y} r="44" fill="#e07a16" opacity="0.35" />
      </g>

      {cheer && [-1, 1].map((s) => (
        <g key={s}>
          <path d={`M${CX + s * 34},${HEAD_Y + 42} Q${CX + s * 64},${HEAD_Y + 8} ${CX + s * 52},${HEAD_Y - 28}`} stroke="#f4a83c" strokeWidth="15" fill="none" strokeLinecap="round" />
          <circle cx={CX + s * 52} cy={HEAD_Y - 30} r="10" fill="#f7b04a" />
          <circle cx={CX + s * 52} cy={HEAD_Y - 28} r="4" fill="#e07a28" opacity="0.45" />
        </g>
      ))}

      {[-1, 1].map((s) => (
        <g key={s}>
          <path d={`M${CX + s * 18},${HEAD_Y - 28} Q${CX + s * 30},${HEAD_Y - 64} ${CX + s * 42},${HEAD_Y - 30} Q${CX + s * 30},${HEAD_Y - 24} ${CX + s * 18},${HEAD_Y - 28} Z`} fill={`url(#${id('head')})`} />
          <path d={`M${CX + s * 24},${HEAD_Y - 32} Q${CX + s * 30},${HEAD_Y - 52} ${CX + s * 36},${HEAD_Y - 32} Q${CX + s * 30},${HEAD_Y - 30} ${CX + s * 24},${HEAD_Y - 32} Z`} fill="#ffd8b0" />
        </g>
      ))}

      <circle cx={CX} cy={HEAD_Y} r="46" fill={`url(#${id('head')})`} />
      <ellipse cx={CX - 12} cy={HEAD_Y - 16} rx="16" ry="8" fill="#fff" opacity="0.28" transform={`rotate(-22 ${CX - 12} ${HEAD_Y - 16})`} />
      <ellipse cx={CX} cy={HEAD_Y + 16} rx="24" ry="18" fill={`url(#${id('muz')})`} />
      <ellipse cx={CX - 8} cy={HEAD_Y + 8} rx="8" ry="4" fill="#fff" opacity="0.4" />
      <ellipse cx={CX - 28} cy={HEAD_Y + 14} rx="8" ry="5" fill="#ff8a6a" opacity="0.38" />
      <ellipse cx={CX + 28} cy={HEAD_Y + 14} rx="8" ry="5" fill="#ff8a6a" opacity="0.38" />
      <path d={`M${CX - 7},${HEAD_Y + 6} q7,-6 14,0 q-2,8 -7,10 q-5,-2 -7,-10 z`} fill="#6e4520" />
      <ellipse cx={CX - 3} cy={HEAD_Y + 8} rx="2" ry="1.2" fill="#a87848" opacity="0.7" />

      {exp === 'cheer' && (
        <>
          <path d={`M${CX - 12},${HEAD_Y + 16} q12,16 24,0 q-12,6 -24,0 z`} fill="#7a3b2e" />
          <ellipse cx={CX} cy={HEAD_Y + 22} rx="6" ry="3.2" fill="#ef8fa0" />
        </>
      )}
      {exp === 'eat' && (
        <>
          <ellipse cx={CX} cy={HEAD_Y + 18} rx="13" ry="11" fill="#7a3b2e" />
          <ellipse cx={CX} cy={HEAD_Y + 24} rx="8" ry="4" fill="#ef8fa0" />
          <path d={`M${CX - 9},${HEAD_Y + 8} l3,5 3,-5 z M${CX + 3},${HEAD_Y + 8} l3,5 3,-5 z`} fill="#fff" />
        </>
      )}
      {exp === 'sad' && (
        <path d={`M${CX - 11},${HEAD_Y + 24} Q${CX},${HEAD_Y + 16} ${CX + 11},${HEAD_Y + 24}`} stroke="#6e4520" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      )}
      {exp === 'worried' && (
        <ellipse cx={CX} cy={HEAD_Y + 20} rx="4.2" ry="5" fill="#6e4520" />
      )}
      {exp === 'happy' && (
        <path d={`M${CX},${HEAD_Y + 18} q-8,9 -14,3 M${CX},${HEAD_Y + 18} q8,9 14,3`} stroke="#6e4520" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      )}

      {[-1, 1].map((s) => (
        <g key={`w${s}`} opacity="0.65">
          <path d={`M${CX + s * 16},${HEAD_Y + 16} q${s * 24},-4 ${s * 36},-8`} stroke="#c98a3a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d={`M${CX + s * 16},${HEAD_Y + 20} q${s * 24},2 ${s * 36},3`} stroke="#c98a3a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </g>
      ))}
      {[-1, 1].map(eye)}
      {exp === 'sad' && <path d={`M${CX + 22},${HEAD_Y + 6} q-3,7 0,12 q3.5,-5 0,-12 z`} fill="#8fd0f0" />}
      {droop ? (
        exp === 'sad' ? (
          <>
            <path d={`M${CX - 28},${HEAD_Y - 16} L${CX - 10},${HEAD_Y - 24}`} stroke="#c06a14" strokeWidth="2.8" fill="none" strokeLinecap="round" />
            <path d={`M${CX + 28},${HEAD_Y - 16} L${CX + 10},${HEAD_Y - 24}`} stroke="#c06a14" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d={`M${CX - 28},${HEAD_Y - 16} Q${CX - 18},${HEAD_Y - 24} ${CX - 8},${HEAD_Y - 18}`} stroke="#c06a14" strokeWidth="2.8" fill="none" strokeLinecap="round" />
            <path d={`M${CX + 28},${HEAD_Y - 16} Q${CX + 18},${HEAD_Y - 24} ${CX + 8},${HEAD_Y - 18}`} stroke="#c06a14" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          </>
        )
      ) : (
        <>
          <path d={`M${CX - 26},${HEAD_Y - 22} q10,-6 18,0`} stroke="#c06a14" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d={`M${CX + 26},${HEAD_Y - 22} q-10,-6 -18,0`} stroke="#c06a14" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

export default AnbessaSvg
