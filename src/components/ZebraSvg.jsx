/* Zebra friend - authored SVG for DOM celebration surfaces. On-model
   with the canvas sprite (cream coat, black stripes and mane). Gradient
   ids namespaced with useId. See docs/art-pipeline.md. */
import { useId } from 'react'

export function ZebraSvg({ size = 120, title = 'Zebra', className = '', style = {} }) {
  const raw = useId().replace(/:/g, '')
  const id = (n) => `${n}-${raw}`
  return (
    <svg width={size} height={size} viewBox="0 0 200 210" className={className} style={style} role="img" aria-label={title}>
      <title>{title}</title>
      <defs>
        <radialGradient id={id('coat')} cx="40%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fffdf8" />
          <stop offset="100%" stopColor="#f0ebe2" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="176" rx="46" ry="28" fill={`url(#${id('coat')})`} stroke="#2b2b2b" strokeWidth="3" />
      <path d="M70 168 q8 10 16 0 M100 164 q8 12 16 0 M118 172 q6 8 12 0" fill="none" stroke="#2b2b2b" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="78" cy="196" rx="14" ry="8" fill="#2b2b2b" />
      <ellipse cx="122" cy="196" rx="14" ry="8" fill="#2b2b2b" />
      {[-1, 1].map((s) => (
        <g key={s}>
          <ellipse cx={100 + s * 32} cy="62" rx="12" ry="22" fill="#f6f3ec" transform={`rotate(${s * 12} ${100 + s * 32} 62)`} />
          <ellipse cx={100 + s * 32} cy="58" rx="6" ry="12" fill="#2b2b2b" transform={`rotate(${s * 12} ${100 + s * 32} 58)`} />
        </g>
      ))}
      {[-2, -1, 0, 1, 2].map((i) => (
        <circle key={i} cx={100 + i * 10} cy="78" r="7" fill="#2b2b2b" />
      ))}
      <ellipse cx="100" cy="108" rx="46" ry="40" fill={`url(#${id('coat')})`} />
      {[-1, 1].map((s) => (
        <g key={`st${s}`}>
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${100 + s * 44},${78 + i * 16} Q${100 + s * 24},${84 + i * 16} ${100 + s * 18},${96 + i * 14} Q${100 + s * 30},${100 + i * 14} ${100 + s * 44},${90 + i * 16} Z`} fill="#2b2b2b" />
          ))}
        </g>
      ))}
      <ellipse cx="100" cy="124" rx="16" ry="12" fill="#f6f3ec" />
      <ellipse cx="92" cy="122" rx="3" ry="2" fill="#2b2b2b" />
      <ellipse cx="108" cy="122" rx="3" ry="2" fill="#2b2b2b" />
      {[-1, 1].map((s) => (
        <g key={`e${s}`}>
          <ellipse cx={100 + s * 16} cy="104" rx="8" ry="10" fill="#fff" />
          <circle cx={100 + s * 16} cy="106" r="5" fill="#2b2b2b" />
          <circle cx={100 + s * 14} cy="104" r="1.8" fill="#fff" />
        </g>
      ))}
      <path d="M90 132 q10 8 20 0" stroke="#2b2b2b" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export default ZebraSvg
