/* Jibby - authored SVG art. The mischievous (not scary) spotted hyena, the
   Letter Muncher. Redrawn to read as a hyena and not a cub: hunched high
   shoulders with a sloping back, a wedge head with a sloping forehead, an
   elongated spotted snout, big rounded ears, a coarse dark mane running up
   the crown and down the neck, and narrow scheming side-glance eyes.
   On-model sandy-tan palette. Vector; gradient ids namespaced with useId.
   `expression` is 'grin' (default) or 'agitated' (caught mid-chomp). */
import { useId } from 'react'

const CX = 100
// spots on the coat + cheeks (x, y, r)
const SPOTS = [[66, 152, 5], [134, 156, 4.6], [56, 182, 4], [144, 184, 4], [73, 92, 3.4], [127, 92, 3.4]]
// coarse crown mane: center spikes tallest, leaning back for a bristly look
const MANE = [-3, -2, -1, 0, 1, 2, 3]

export function JibbySvg({ size = 160, expression = 'grin', title = 'Jibby', className = '', style = {} }) {
  const raw = useId().replace(/:/g, '')
  const id = (n) => `${n}-${raw}`
  const agit = expression === 'agitated'
  const ear = (s) => (
    <g key={s} transform={`rotate(${s * 24} ${CX + s * 40} 52)`}>
      <ellipse cx={CX + s * 40} cy="50" rx="16" ry="20" fill={`url(#${id('jh')})`} />
      <ellipse cx={CX + s * 40} cy="54" rx="8.5" ry="12" fill="#6a5940" />
    </g>
  )
  // narrow half-lidded almond, both pupils cut to one side => a sly glance
  const eye = (s) => (
    <g key={s}>
      <ellipse cx={CX + s * 20} cy="84" rx="11" ry="6" fill="#fff" transform={`rotate(${s * -6} ${CX + s * 20} 84)`} />
      {/* heavy upper lid drops the eye to a scheming slit */}
      <path d={`M${CX + s * 20 - 12},83 Q${CX + s * 20},77 ${CX + s * 20 + 12},83 Z`} fill={`url(#${id('jh')})`} />
      <circle cx={CX + s * 20 + 3} cy="86" r="4.3" fill="#241c12" />
      <circle cx={CX + s * 20 + 1.6} cy="84.5" r="1.4" fill="#fff" />
    </g>
  )
  return (
    <svg width={size} height={size} viewBox="0 0 200 210" className={className} style={style}
      role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <title>{title}</title>
      <defs>
        <radialGradient id={id('jh')} cx="42%" cy="26%" r="80%">
          <stop offset="0%" stopColor="#cbb789" /><stop offset="100%" stopColor="#a8946a" />
        </radialGradient>
        <radialGradient id={id('jb')} cx="45%" cy="20%" r="85%">
          <stop offset="0%" stopColor="#c2ad7d" /><stop offset="100%" stopColor="#9a875f" />
        </radialGradient>
        <radialGradient id={id('jm')} cx="50%" cy="30%" r="74%">
          <stop offset="0%" stopColor="#eaddbe" /><stop offset="100%" stopColor="#d3c096" />
        </radialGradient>
      </defs>

      {/* body: hunched, high shoulders sloping down to the rump. Drawn first so
          the head sits over the shoulders with no floating gap. */}
      <path d={`M52,201 Q40,150 64,126 Q100,113 136,126 Q160,150 148,201 Q100,217 52,201 Z`} fill={`url(#${id('jb')})`} />
      {/* raised shoulder humps flanking the neck - the hyena hunch */}
      <ellipse cx={CX - 34} cy="126" rx="20" ry="16" fill={`url(#${id('jb')})`} />
      <ellipse cx={CX + 34} cy="126" rx="20" ry="16" fill={`url(#${id('jb')})`} />
      {/* neck mane running down the spine into the shoulders (behind the head) */}
      {[-1, 1].map((s) => (
        <g key={s}>
          {[0, 1, 2, 3].map((k) => (
            <path key={k} d={`M${CX + s * (26 + k * 4)},${104 + k * 8} l${s * 11},4 l${-s * 9},7 z`} fill="#5a4b34" />
          ))}
        </g>
      ))}
      <ellipse cx={CX} cy="170" rx="26" ry="30" fill="#d8c69a" opacity="0.42" />
      <ellipse cx={CX - 22} cy="203" rx="14" ry="9" fill="#8a7752" />
      <ellipse cx={CX + 22} cy="203" rx="14" ry="9" fill="#8a7752" />

      {[-1, 1].map(ear)}
      {/* coarse crown mane: tall bristles leaning back */}
      {MANE.map((i) => {
        const x = CX + i * 9
        const h = 30 - Math.abs(i) * 4
        return <path key={i} d={`M${x - 6},50 L${x - 3},${50 - h} L${x + 6},48 Z`} fill="#5a4b34" />
      })}

      {/* head: a wedge, broad cranium sloping to a lower brow (not a round cub head) */}
      <path d={`M60,68 Q56,44 100,42 Q144,44 140,68 Q147,98 118,106 Q100,111 82,106 Q53,98 60,68 Z`} fill={`url(#${id('jh')})`} />
      {/* elongated projecting snout */}
      <path d={`M84,92 Q80,122 100,132 Q120,122 116,92 Q100,86 84,92 Z`} fill={`url(#${id('jm')})`} />
      {/* nose + nostril highlight */}
      <ellipse cx={CX} cy="118" rx="9" ry="6" fill="#2f2415" />
      <ellipse cx={CX - 3} cy="116" rx="2.3" ry="1.4" fill="#5a4a30" />
      {SPOTS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#7c6a4a" opacity="0.7" />)}

      {/* heavy sloping brows angled inward-down => sly menace */}
      <path d={`M64,64 Q78,60 92,70`} stroke="#5a4b34" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d={`M136,64 Q122,60 108,70`} stroke="#5a4b34" strokeWidth="5" fill="none" strokeLinecap="round" />
      {[-1, 1].map(eye)}

      {/* mouth */}
      {agit ? (
        <>
          <path d={`M80,120 Q100,112 120,120 Q114,150 100,153 Q86,150 80,120 Z`} fill="#3a2216" />
          {[-1, 1].map((s) => <path key={s} d={`M${CX + s * 14},120 L${CX + s * 9},132 L${CX + s * 4},120 Z`} fill="#fff" />)}
          <ellipse cx={CX} cy="146" rx="8" ry="5" fill="#e58aa0" />
        </>
      ) : (
        <>
          {/* sly asymmetric smirk + one bared fang */}
          <path d={`M84,126 Q100,135 118,123`} stroke="#3a2d1c" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          <path d={`M108,126 L112,135 L116,123 Z`} fill="#fff" />
        </>
      )}
    </svg>
  )
}

export default JibbySvg
