/* Kokeb - authored SVG art. The star companion who calls the letters, drawn
   on-model with the canvas palette (#ffc800 gold, #e0a400 edge). Vector, so it
   scales cleanly; gradient id namespaced with useId. See docs/art-pipeline.md. */
import { useId } from 'react'

const CX = 100
const CY = 98
const OUTER = 80
const INNER = 36

const starPath = (outer, inner) => {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    pts.push(`${(CX + Math.cos(a) * r).toFixed(1)},${(CY + Math.sin(a) * r).toFixed(1)}`)
  }
  return `M${pts.join(' L')} Z`
}

export function KokebSvg({ size = 160, title = 'Kokeb', className = '', style = {} }) {
  const raw = useId().replace(/:/g, '')
  const gid = `star-${raw}`
  const d = starPath(OUTER, INNER)
  const facet = starPath(48, 22)
  const eye = (sx) => (
    <g key={sx}>
      <ellipse cx={CX + sx * 17} cy={CY - 4} rx="6.5" ry="8.5" fill="#3a2a15" />
      <circle cx={CX + sx * 17 - 2} cy={CY - 7} r="2.4" fill="#fff" />
    </g>
  )
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={className} style={style}
      role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <title>{title}</title>
      <defs>
        <radialGradient id={gid} cx="42%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#fff2b8" /><stop offset="55%" stopColor="#ffc927" /><stop offset="100%" stopColor="#f0a500" />
        </radialGradient>
      </defs>
      <ellipse cx={CX} cy={CY} rx="74" ry="70" fill="#ffe27a" opacity="0.22" />
      <path d="M172,44 l3,9 9,3 -9,3 -3,9 -3,-9 -9,-3 9,-3 z" fill="#ffe27a" opacity="0.9" />
      <path d="M36,150 l2,6 6,2 -6,2 -2,6 -2,-6 -6,-2 6,-2 z" fill="#fff6c8" opacity="0.85" />
      <path d={d} fill={`url(#${gid})`} stroke="#e0a400" strokeWidth="7" strokeLinejoin="round" />
      <path d={facet} fill="#fff6c4" opacity="0.34" />
      <ellipse cx={CX - 16} cy={CY - 28} rx="16" ry="9" fill="#fff" opacity="0.38" transform={`rotate(-28 ${CX - 16} ${CY - 28})`} />
      <path d="M148,78 l2,5 5,2 -5,2 -2,5 -2,-5 -5,-2 5,-2 z" fill="#fff" opacity="0.85" />
      <path d={`M${CX - 22},${CY - 16} q8,-5 16,-1`} stroke="#c98412" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d={`M${CX + 6},${CY - 16} q8,-5 16,-1`} stroke="#c98412" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {[-1, 1].map(eye)}
      <path d={`M${CX - 11},${CY + 8} q11,12 22,0`} stroke="#3a2a15" strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx={CX - 27} cy={CY + 9} rx="7" ry="4.5" fill="#ff785a" opacity="0.5" />
      <ellipse cx={CX + 27} cy={CY + 9} rx="7" ry="4.5" fill="#ff785a" opacity="0.5" />
    </svg>
  )
}

export default KokebSvg
