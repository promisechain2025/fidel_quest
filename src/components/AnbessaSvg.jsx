/* Anbessa - authored SVG art (the first "drawn, not procedural" character).
   A higher-fidelity vector Anbessa than the code-drawn canvas sprite, for
   DOM surfaces where wearable compositing is not needed. On-model with the
   canvas palette (golden fur, orange mane, chest star). See
   docs/art-pipeline.md.

   Drop-in for the canvas sprite: accepts the same `mood`/`pose` names, so a
   `<Sprite2D draw={drawAnbessa} mood pose>` becomes `<AnbessaSvg mood pose>`.
   Expressions: happy (default), cheer (open smile + raised paws), sad
   (frown + tear), worried, eat (open mouth for Feed Anbessa). */
import { useId } from 'react'

const CX = 100
const HEAD_Y = 94
const MANE_R = 54
const N = 14
const petalRing = (r, radius) => Array.from({ length: N }, (_, i) => {
  const a = ((i + (r < MANE_R ? 0.5 : 0)) / N) * Math.PI * 2 - Math.PI / 2
  return { x: +(CX + Math.cos(a) * r).toFixed(1), y: +(HEAD_Y + Math.sin(a) * r).toFixed(1), radius }
})

// Map the canvas sprite's mood/pose vocabulary onto our expression set.
function toExpression({ expression, mood, pose }) {
  if (pose === 'cheer') return 'cheer'
  const e = expression || mood || 'happy'
  if (e === 'cheer') return 'cheer'
  if (e === 'eating' || e === 'hungry' || e === 'eat') return 'eat'
  if (e === 'sad') return 'sad'
  if (e === 'worried') return 'worried'
  return 'happy'
}

export function AnbessaSvg({ size = 160, expression, mood, pose, title = 'Anbessa', className = '', style = {} }) {
  const raw = useId().replace(/:/g, '')
  const id = (n) => `${n}-${raw}`
  const exp = toExpression({ expression, mood, pose })
  const cheer = exp === 'cheer'
  const droop = exp === 'sad' || exp === 'worried'
  const outer = petalRing(MANE_R, 17)
  const inner = petalRing(MANE_R - 6, 12)
  const eye = (sx) => {
    const ey = HEAD_Y - 4 + (droop ? 2 : 0)
    return (
      <g key={sx}>
        <ellipse cx={CX + sx * 20} cy={ey} rx="11" ry={droop ? 11 : 13} fill="#fff" />
        <circle cx={CX + sx * 20 + sx} cy={ey + 3} r={droop ? 7.5 : 8.5} fill="#3a2a14" />
        <circle cx={CX + sx * 20 - 2.5} cy={ey - 1} r="3.2" fill="#fff" />
      </g>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 200 210" className={className} style={style}
      role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <title>{title}</title>
      <defs>
        <radialGradient id={id('head')} cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffce85" /><stop offset="60%" stopColor="#f4a83c" /><stop offset="100%" stopColor="#e8912f" />
        </radialGradient>
        <radialGradient id={id('body')} cx="40%" cy="25%" r="80%">
          <stop offset="0%" stopColor="#ffc978" /><stop offset="100%" stopColor="#ef9a34" />
        </radialGradient>
        <linearGradient id={id('mane')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e67e18" /><stop offset="100%" stopColor="#c85f0e" />
        </linearGradient>
        <linearGradient id={id('mane2')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3922a" /><stop offset="100%" stopColor="#db6f14" />
        </linearGradient>
        <radialGradient id={id('muz')} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fff4e2" /><stop offset="100%" stopColor="#ffe2ba" />
        </radialGradient>
      </defs>

      {/* tail */}
      <path d="M143,176 Q182,168 176,132 Q174,150 156,158" fill="#f0a23a" />
      <ellipse cx="176" cy="128" rx="12" ry="13" fill="#d97706" />
      {/* body + paws */}
      <ellipse cx={CX} cy="170" rx="46" ry="34" fill={`url(#${id('body')})`} />
      <ellipse cx={CX - 30} cy="192" rx="16" ry="11" fill="#f0a23a" />
      <ellipse cx={CX + 30} cy="192" rx="16" ry="11" fill="#f0a23a" />
      <ellipse cx={CX - 16} cy="198" rx="13" ry="10" fill="#f7b04a" />
      <ellipse cx={CX + 16} cy="198" rx="13" ry="10" fill="#f7b04a" />
      {/* chest star (Kokeb's little brother) */}
      <path d={`M${CX},156 l4.4,9 9.6,1 -7.2,6.5 2.1,9.5 -8.9,-5 -8.9,5 2.1,-9.5 -7.2,-6.5 9.6,-1 z`} fill="#ffc800" stroke="#e0a400" strokeWidth="1.6" />

      {/* mane */}
      <g>
        {outer.map((p, i) => <circle key={`o${i}`} cx={p.x} cy={p.y} r={p.radius} fill={`url(#${id('mane')})`} />)}
        {inner.map((p, i) => <circle key={`i${i}`} cx={p.x} cy={p.y} r={p.radius} fill={`url(#${id('mane2')})`} />)}
        <circle cx={CX} cy={HEAD_Y} r="46" fill="#e88a2a" />
      </g>

      {/* raised paws (cheer), over the mane */}
      {cheer && [-1, 1].map((s) => (
        <g key={s}>
          <path d={`M${CX + s * 36},${HEAD_Y + 40} Q${CX + s * 66},${HEAD_Y + 6} ${CX + s * 54},${HEAD_Y - 30}`} stroke="#f4a83c" strokeWidth="15" fill="none" strokeLinecap="round" />
          <circle cx={CX + s * 54} cy={HEAD_Y - 32} r="10" fill="#f7b04a" />
        </g>
      ))}

      {/* ears */}
      {[-1, 1].map((s) => (
        <g key={s}>
          <circle cx={CX + s * 30} cy={HEAD_Y - 34} r="15" fill={`url(#${id('head')})`} />
          <circle cx={CX + s * 30} cy={HEAD_Y - 32} r="8" fill="#ffdcae" />
        </g>
      ))}
      {/* head + muzzle */}
      <circle cx={CX} cy={HEAD_Y} r="48" fill={`url(#${id('head')})`} />
      <ellipse cx={CX} cy={HEAD_Y + 18} rx="26" ry="20" fill={`url(#${id('muz')})`} />
      <ellipse cx={CX - 30} cy={HEAD_Y + 16} rx="8" ry="5.5" fill="#ff8a6a" opacity="0.4" />
      <ellipse cx={CX + 30} cy={HEAD_Y + 16} rx="8" ry="5.5" fill="#ff8a6a" opacity="0.4" />
      {/* nose */}
      <path d={`M${CX - 6},${HEAD_Y + 8} q6,-4 12,0 q-2,7 -6,9 q-4,-2 -6,-9 z`} fill="#6e4520" />

      {/* mouth (per expression) */}
      {exp === 'cheer' && (
        <>
          <path d={`M${CX - 11},${HEAD_Y + 14} q11,14 22,0 q-11,5 -22,0 z`} fill="#7a3b2e" />
          <ellipse cx={CX} cy={HEAD_Y + 19} rx="6" ry="3.4" fill="#ef8fa0" />
        </>
      )}
      {exp === 'eat' && (
        <>
          <ellipse cx={CX} cy={HEAD_Y + 18} rx="13" ry="12" fill="#7a3b2e" />
          <ellipse cx={CX} cy={HEAD_Y + 24} rx="8" ry="4.5" fill="#ef8fa0" />
          <path d={`M${CX - 9},${HEAD_Y + 7} l3,4 3,-4 z M${CX + 3},${HEAD_Y + 7} l3,4 3,-4 z`} fill="#fff" />
        </>
      )}
      {exp === 'sad' && (
        <path d={`M${CX - 11},${HEAD_Y + 22} Q${CX},${HEAD_Y + 15} ${CX + 11},${HEAD_Y + 22}`} stroke="#6e4520" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      )}
      {exp === 'worried' && (
        <ellipse cx={CX} cy={HEAD_Y + 19} rx="4.5" ry="5.5" fill="#6e4520" />
      )}
      {exp === 'happy' && (
        <path d={`M${CX},${HEAD_Y + 17} q-7,8 -13,3 M${CX},${HEAD_Y + 17} q7,8 13,3`} stroke="#6e4520" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      )}

      {/* whiskers */}
      {[-1, 1].map((s) => (
        <g key={s} opacity="0.7">
          <path d={`M${CX + s * 20},${HEAD_Y + 18} q${s * 22},-3 ${s * 34},-6`} stroke="#c98a3a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d={`M${CX + s * 20},${HEAD_Y + 22} q${s * 22},1 ${s * 34},2`} stroke="#c98a3a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      ))}
      {/* eyes */}
      {[-1, 1].map(eye)}
      {/* tear (sad only) */}
      {exp === 'sad' && <path d={`M${CX + 24},${HEAD_Y + 2} q-3.5,6 0,10 q3.5,-4 0,-10 z`} fill="#8fd0f0" />}
      {/* brows (per expression) */}
      {droop ? (
        exp === 'sad' ? (
          <>
            <path d={`M${CX - 27},${HEAD_Y - 13} L${CX - 9},${HEAD_Y - 20}`} stroke="#c06a14" strokeWidth="2.8" fill="none" strokeLinecap="round" />
            <path d={`M${CX + 27},${HEAD_Y - 13} L${CX + 9},${HEAD_Y - 20}`} stroke="#c06a14" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d={`M${CX - 27},${HEAD_Y - 14} Q${CX - 18},${HEAD_Y - 21} ${CX - 8},${HEAD_Y - 18}`} stroke="#c06a14" strokeWidth="2.8" fill="none" strokeLinecap="round" />
            <path d={`M${CX + 27},${HEAD_Y - 14} Q${CX + 18},${HEAD_Y - 21} ${CX + 8},${HEAD_Y - 18}`} stroke="#c06a14" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          </>
        )
      ) : (
        <>
          <path d={`M${CX - 28},${HEAD_Y - 20} q8,-6 16,-2`} stroke="#c06a14" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d={`M${CX + 28},${HEAD_Y - 20} q-8,-6 -16,-2`} stroke="#c06a14" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

export default AnbessaSvg
