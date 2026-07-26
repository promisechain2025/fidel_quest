/* Jibby - authored SVG art. The mischievous (not scary) hyena, the Letter
   Muncher, drawn on-model with the canvas palette (greige fur, dark crest,
   spots). Vector; gradient ids namespaced with useId. `expression` is 'grin'
   (default) or 'agitated' (caught mid-chomp). See docs/art-pipeline.md. */
import { useId } from 'react'

const CX = 100
const SPOTS = [[62, 68, 6], [136, 58, 5], [146, 86, 4.4], [54, 96, 5]]

export function JibbySvg({ size = 160, expression = 'grin', title = 'Jibby', className = '', style = {} }) {
  const raw = useId().replace(/:/g, '')
  const id = (n) => `${n}-${raw}`
  const agit = expression === 'agitated'
  const ear = (s) => (
    <g key={s} transform={`rotate(${s * 14} ${CX + s * 40} 44)`}>
      <ellipse cx={CX + s * 40} cy="44" rx="17" ry="24" fill="#8a7d6a" />
      <ellipse cx={CX + s * 40} cy="48" rx="9.5" ry="15" fill="#57493a" />
    </g>
  )
  const eye = (s) => (
    <g key={s}>
      <ellipse cx={CX + s * 22} cy="80" rx="11" ry="9.5" fill="#fff" />
      <circle cx={CX + s * 18} cy="82" r="4.6" fill="#241c12" />
      <circle cx={CX + s * 16.5} cy="80" r="1.5" fill="#fff" />
    </g>
  )
  return (
    <svg width={size} height={size} viewBox="0 0 200 210" className={className} style={style}
      role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <title>{title}</title>
      <defs>
        <radialGradient id={id('jh')} cx="42%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#b0a189" /><stop offset="100%" stopColor="#8f8069" />
        </radialGradient>
        <radialGradient id={id('jb')} cx="45%" cy="25%" r="80%">
          <stop offset="0%" stopColor="#a89a83" /><stop offset="100%" stopColor="#83745f" />
        </radialGradient>
      </defs>
      {/* body + paws */}
      <ellipse cx={CX} cy="176" rx="42" ry="30" fill={`url(#${id('jb')})`} />
      <ellipse cx={CX - 22} cy="198" rx="13" ry="9" fill="#7a6c58" />
      <ellipse cx={CX + 22} cy="198" rx="13" ry="9" fill="#7a6c58" />
      {[-1, 1].map(ear)}
      {/* scruffy crest */}
      {[-2, -1, 0, 1, 2].map((i) => (
        <path key={i} d={`M${CX + i * 12 - 7},40 L${CX + i * 12},14 L${CX + i * 12 + 7},40 Z`} fill="#57493a" />
      ))}
      {/* head + spots */}
      <circle cx={CX} cy="86" r="56" fill={`url(#${id('jh')})`} />
      {SPOTS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#6e614f" opacity="0.8" />)}
      {/* heavy brow */}
      <path d={`M${CX - 32},60 Q${CX},50 ${CX + 32},60`} stroke="#57493a" strokeWidth="6" fill="none" strokeLinecap="round" />
      {[-1, 1].map(eye)}
      {/* muzzle + nose */}
      <ellipse cx={CX} cy="116" rx="33" ry="25" fill="#c9b99d" />
      <ellipse cx={CX} cy="102" rx="9" ry="6" fill="#3a2d1c" />
      {/* mouth */}
      {agit ? (
        <>
          <ellipse cx={CX} cy="132" rx="24" ry="16" fill="#3a2216" />
          {[0, 1, 2].map((i) => (
            <path key={i} d={`M${CX - 16 + i * 16},118 L${CX - 8 + i * 16},132 L${CX + i * 16},118 Z`} fill="#fff" />
          ))}
        </>
      ) : (
        <>
          <path d={`M${CX - 22},120 q22,20 44,0`} stroke="#3a2d1c" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d={`M${CX - 14},124 l5,8 5,-8 z M${CX + 4},124 l5,8 5,-8 z`} fill="#fff" />
        </>
      )}
    </svg>
  )
}

export default JibbySvg
