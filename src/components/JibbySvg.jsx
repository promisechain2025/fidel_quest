/* Jibby - authored SVG art. The mischievous (not scary) hyena, the Letter
   Muncher. Redrawn for character: a projecting spotted snout, tall bristly
   mohawk, sly side-glance eyes with a cocked brow, and a fanged smirk.
   On-model sandy-tan palette. Vector; gradient ids namespaced with useId.
   `expression` is 'grin' (default) or 'agitated' (caught mid-chomp). */
import { useId } from 'react'

const CX = 100
const SPOTS = [[62, 60, 5], [134, 54, 4.5], [144, 80, 3.6], [58, 86, 4], [126, 150, 4.6], [76, 158, 4.2]]
const CREST = [-3, -2, -1, 0, 1, 2, 3]

export function JibbySvg({ size = 160, expression = 'grin', title = 'Jibby', className = '', style = {} }) {
  const raw = useId().replace(/:/g, '')
  const id = (n) => `${n}-${raw}`
  const agit = expression === 'agitated'
  const ear = (s) => (
    <g key={s} transform={`rotate(${s * 18} ${CX + s * 43} 48)`}>
      <ellipse cx={CX + s * 43} cy="48" rx="18" ry="22" fill="#b09668" />
      <ellipse cx={CX + s * 43} cy="52" rx="10" ry="13.5" fill="#5a4b34" />
    </g>
  )
  const eye = (s) => (
    <g key={s}>
      <ellipse cx={CX + s * 21} cy="80" rx="11" ry="7.5" fill="#fff" transform={`rotate(${s * -8} ${CX + s * 21} 80)`} />
      <circle cx={CX + s * 21 + 4} cy="82" r="4.6" fill="#241c12" />
      <circle cx={CX + s * 21 + 2.5} cy="80.5" r="1.5" fill="#fff" />
      <path d={`M${CX + s * 10},78 Q${CX + s * 21},72 ${CX + s * 32},80`} stroke="#4a3c28" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </g>
  )
  return (
    <svg width={size} height={size} viewBox="0 0 200 210" className={className} style={style}
      role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <title>{title}</title>
      <defs>
        <radialGradient id={id('jh')} cx="42%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#cbb789" /><stop offset="100%" stopColor="#a8946a" />
        </radialGradient>
        <radialGradient id={id('jb')} cx="45%" cy="22%" r="82%">
          <stop offset="0%" stopColor="#c2ad7d" /><stop offset="100%" stopColor="#9a875f" />
        </radialGradient>
        <radialGradient id={id('jm')} cx="50%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#eaddbe" /><stop offset="100%" stopColor="#d3c096" />
        </radialGradient>
      </defs>
      {/* body: its top tucks BEHIND the head (drawn first, head over it) so the
          head sits on the shoulders with no floating gap */}
      <path d={`M${CX - 47},196 Q${CX - 54},150 ${CX - 32},124 Q${CX},112 ${CX + 32},124 Q${CX + 54},150 ${CX + 47},196 Q${CX},214 ${CX - 47},196 Z`} fill={`url(#${id('jb')})`} />
      <ellipse cx={CX - 22} cy="202" rx="14" ry="9" fill="#8a7752" />
      <ellipse cx={CX + 22} cy="202" rx="14" ry="9" fill="#8a7752" />
      <ellipse cx={CX} cy="165" rx="26" ry="30" fill="#d8c69a" opacity="0.45" />
      {[-1, 1].map(ear)}
      {/* bristly mohawk */}
      {CREST.map((i) => {
        const h = 24 - Math.abs(i) * 3
        return <path key={i} d={`M${CX + i * 10 - 6},46 L${CX + i * 10 - 1},${46 - h} L${CX + i * 10 + 6},46 Z`} fill="#5a4b34" />
      })}
      {/* cranium + spots */}
      <circle cx={CX} cy="82" r="50" fill={`url(#${id('jh')})`} />
      {SPOTS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#7c6a4a" opacity="0.7" />)}
      {/* rounded projecting snout + bridge */}
      <ellipse cx={CX} cy="112" rx="27" ry="23" fill={`url(#${id('jm')})`} />
      <path d={`M${CX - 6},72 Q${CX},68 ${CX + 6},72 L${CX + 7},100 Q${CX},104 ${CX - 7},100 Z`} fill="#dccaa0" opacity="0.6" />
      {/* nose */}
      <ellipse cx={CX} cy="103" rx="9.5" ry="6.5" fill="#2f2415" />
      <ellipse cx={CX - 3} cy="101" rx="2.4" ry="1.5" fill="#5a4a30" />
      {/* sly cocked brows */}
      <path d={`M${CX - 31},63 Q${CX - 19},58 ${CX - 7},64`} stroke="#5a4b34" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d={`M${CX + 9},58 Q${CX + 21},54 ${CX + 31},62`} stroke="#5a4b34" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      {[-1, 1].map(eye)}
      {/* mouth */}
      {agit ? (
        <>
          <path d={`M${CX - 20},124 Q${CX},116 ${CX + 20},124 Q${CX + 14},150 ${CX},152 Q${CX - 14},150 ${CX - 20},124 Z`} fill="#3a2216" />
          {[-1, 1].map((s) => <path key={s} d={`M${CX + s * 13},124 L${CX + s * 8},134 L${CX + s * 4},124 Z`} fill="#fff" />)}
          <ellipse cx={CX} cy="146" rx="8" ry="5" fill="#e58aa0" />
        </>
      ) : (
        <>
          <path d={`M${CX - 17},121 Q${CX - 2},127 ${CX + 18},118`} stroke="#3a2d1c" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d={`M${CX + 7},121 L${CX + 11},130 L${CX + 15},120 Z`} fill="#fff" />
        </>
      )}
    </svg>
  )
}

export default JibbySvg
