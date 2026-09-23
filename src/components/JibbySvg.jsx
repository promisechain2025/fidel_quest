/* Jibby - authored SVG art. The mischievous (not scary) spotted hyena.
   Hunched shoulders, a sloping forehead, a long spotted muzzle, round ears,
   and a coarse mane. Sandy highland palette. Vector; gradient ids are
   namespaced with useId. `expression` is 'grin' (default) or 'agitated'
   (caught mid-chomp). */
import { useId } from 'react'
import { HYENA_NAME } from '../platform/brand'

const CX = 100
const SPOTS = [[52, 144, 9, 6], [146, 148, 8, 5.4], [44, 174, 7, 4.8], [156, 172, 6.6, 4.6], [68, 92, 4.8, 3.4], [136, 94, 4.6, 3.2], [82, 164, 5.4, 3.6], [124, 182, 5.6, 3.8], [100, 156, 6.2, 4]]
const MANE = [-3, -2, -1, 0, 1, 2, 3]

export function JibbySvg({ size = 160, expression = 'grin', title = HYENA_NAME, className = '', style = {} }) {
  const raw = useId().replace(/:/g, '')
  const id = (n) => `${n}-${raw}`
  const agit = expression === 'agitated'
  return (
    <svg width={size} height={size} viewBox="0 0 200 210" className={className} style={style}
      role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <title>{title}</title>
      <defs>
        <radialGradient id={id('jh')} cx="40%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#f0d7a4" /><stop offset="48%" stopColor="#d7b57a" /><stop offset="100%" stopColor="#b48a52" />
        </radialGradient>
        <radialGradient id={id('jb')} cx="45%" cy="18%" r="85%">
          <stop offset="0%" stopColor="#e4c48a" /><stop offset="100%" stopColor="#a8844e" />
        </radialGradient>
        <radialGradient id={id('jm')} cx="50%" cy="30%" r="74%">
          <stop offset="0%" stopColor="#fff4dc" /><stop offset="100%" stopColor="#e6c98e" />
        </radialGradient>
      </defs>

      <ellipse cx={CX} cy="202" rx="54" ry="7" fill="#1b140c" opacity="0.16" />
      {/* Hunched body: high shoulders, low rump. */}
      <path d="M46,200 Q34,148 62,118 Q100,104 138,118 Q166,148 154,200 Q100,214 46,200 Z" fill={`url(#${id('jb')})`} />
      <ellipse cx={CX - 36} cy="124" rx="22" ry="16" fill={`url(#${id('jb')})`} />
      <ellipse cx={CX + 36} cy="124" rx="22" ry="16" fill={`url(#${id('jb')})`} />
      <ellipse cx={CX} cy="168" rx="28" ry="26" fill="#f3e0b4" opacity="0.45" />
      <ellipse cx={CX - 24} cy="200" rx="15" ry="8" fill="#8d6a40" />
      <ellipse cx={CX + 24} cy="200" rx="15" ry="8" fill="#8d6a40" />
      {[-1, 1].map((s) => (
        <g key={s}>
          {[0, 1, 2, 3].map((k) => (
            <path key={k} d={`M${CX + s * (24 + k * 5)},${100 + k * 9} l${s * 12},3 l${-s * 8},8 z`} fill="#5c4632" />
          ))}
        </g>
      ))}

      {[-1, 1].map((s) => (
        <g key={`ear${s}`} transform={`rotate(${s * 18} ${CX + s * 42} 48)`}>
          <ellipse cx={CX + s * 42} cy="46" rx="18" ry="24" fill={`url(#${id('jh')})`} />
          <ellipse cx={CX + s * 42} cy="52" rx="9" ry="14" fill="#6a5344" />
        </g>
      ))}
      {MANE.map((i) => {
        const x = CX + i * 10
        const h = 34 - Math.abs(i) * 4
        return <path key={i} d={`M${x - 7},48 L${x - 2},${48 - h} L${x + 7},46 Z`} fill="#4a3a2c" />
      })}

      <path d="M58,70 Q52,40 100,36 Q148,40 142,70 Q152,102 116,112 Q100,118 84,112 Q48,102 58,70 Z" fill={`url(#${id('jh')})`} />
      <path d="M86,100 Q78,128 100,142 Q122,128 114,100 Q100,90 86,100 Z" fill={`url(#${id('jm')})`} />
      <ellipse cx={CX} cy="128" rx="11" ry="6.5" fill="#1c140e" />
      <ellipse cx={CX - 4} cy="126" rx="2.4" ry="1.5" fill="#6a5840" />
      <ellipse cx={CX + 4} cy="127" rx="1.6" ry="1.1" fill="#6a5840" />
      {SPOTS.map(([x, y, rx, ry], i) => (
        <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill="#2a2118" opacity="0.9" />
      ))}
      <ellipse cx={CX - 10} cy="54" rx="16" ry="6" fill="#fff" opacity="0.22" transform={`rotate(-16 ${CX - 10} 54)`} />

      <path d="M62,66 Q78,58 94,72" stroke="#4a3a2c" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M138,66 Q122,58 106,72" stroke="#4a3a2c" strokeWidth="5" fill="none" strokeLinecap="round" />
      {[-1, 1].map((s) => (
        <g key={`eye${s}`}>
          <ellipse cx={CX + s * 20} cy="86" rx="12" ry="7" fill="#fff" transform={`rotate(${s * -8} ${CX + s * 20} 86)`} />
          <path d={`M${CX + s * 20 - 13},84 Q${CX + s * 20},76 ${CX + s * 20 + 13},84 Z`} fill={`url(#${id('jh')})`} />
          <circle cx={CX + s * 20 + 3.2} cy="88" r="4.2" fill="#241c12" />
          <circle cx={CX + s * 20 + 1.4} cy="86.2" r="1.5" fill="#fff" />
        </g>
      ))}

      {agit ? (
        <>
          <path d="M80,126 Q100,116 120,126 Q112,156 100,160 Q88,156 80,126 Z" fill="#3a2216" />
          {[-1, 1].map((s) => <path key={s} d={`M${CX + s * 14},126 L${CX + s * 8},140 L${CX + s * 2},126 Z`} fill="#fff" />)}
          <ellipse cx={CX} cy="150" rx="8" ry="5" fill="#e58aa0" />
        </>
      ) : (
        <>
          <path d="M84,134 Q100,146 118,132" stroke="#3a2d1c" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d="M106,132 L111,144 L116,128 Z" fill="#fff" />
        </>
      )}
    </svg>
  )
}

export default JibbySvg
