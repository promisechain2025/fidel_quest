/* Authored specialty icons for the Backpack and home emblems.
   Jeweled, soft-3D, kid-friendly marks in the manuscript palette
   (champagne gold, lapis, malachite, madder, ochre). Drawn in code so
   the PWA stays offline and the art is ours to ship. See
   docs/art-pipeline.md. Gradient ids are namespaced with useId. */
import { useId } from 'react'

export const SPECIALTY_NAMES = [
  'closet', 'words', 'build', 'ladder', 'lineup', 'match', 'traffic',
  'market', 'bingo', 'stories', 'twins', 'explorer', 'classic', 'practice',
  'family', 'voice', 'name', 'postcard', 'backpack', 'hunt',
]

const PLATE_STOPS = {
  closet: ['#7f9ed8', '#314e86'],
  words: ['#8ed06a', '#3d8a28'],
  build: ['#f3d078', '#c4922a'],
  ladder: ['#8eb0ea', '#2c4c86'],
  lineup: ['#7eaaea', '#2a568f'],
  match: ['#f3c05e', '#c4841c'],
  traffic: ['#8eaeE6', '#2e508c'],
  market: ['#f6d078', '#d08a28'],
  bingo: ['#9ebeee', '#345894'],
  stories: ['#e08a80', '#8a3830'],
  twins: ['#9ab6e6', '#35548e'],
  explorer: ['#7ecf86', '#2f7a40'],
  classic: ['#efd09a', '#a87430'],
  practice: ['#f6e08a', '#c9962a'],
  family: ['#a0c0ec', '#3a5c96'],
  voice: ['#8ed67a', '#3c8e32'],
  name: ['#9ebeea', '#345892'],
  postcard: ['#f6c46e', '#cc7a28'],
  backpack: ['#e0b46e', '#8a5a2c'],
  hunt: ['#b7def8', '#5ea24a'],
}

function Plate({ gid, name }) {
  const [from, to] = PLATE_STOPS[name] || PLATE_STOPS.hunt
  const gems = [[9, 9, '#c0453a'], [55, 9, '#3f63a0'], [9, 55, '#3f8f4a'], [55, 55, '#ffe08a']]
  return (
    <>
      <defs>
        <linearGradient id={gid('plate')} x1="0" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
        <linearGradient id={gid('gloss')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.62" />
          <stop offset="32%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#1b140c" stopOpacity="0.22" />
        </linearGradient>
        <radialGradient id={gid('gem')} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#1b140c" stopOpacity="0.35" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="60" rx="24" ry="3.2" fill="#1b140c" opacity="0.28" />
      <rect x="1.2" y="1.2" width="61.6" height="61.6" rx="16" fill={`url(#${gid('plate')})`} />
      <rect x="1.2" y="1.2" width="61.6" height="61.6" rx="16" fill={`url(#${gid('gloss')})`} />
      <rect x="2" y="2" width="60" height="60" rx="15" fill="none" stroke="#e2c069" strokeWidth="2.3" />
      <rect x="4.6" y="4.6" width="54.8" height="54.8" rx="13" fill="none" stroke="#fff8e4" strokeOpacity="0.75" strokeWidth="1.15" />
      <path d="M14 7.2 Q32 3.4 50 7.2" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2.4" strokeLinecap="round" />
      {gems.map(([x, y, fill]) => (
        <g key={`${x}${y}`}>
          <circle cx={x} cy={y} r="3.1" fill={fill} stroke="#e2c069" strokeWidth="0.9" />
          <circle cx={x - 0.7} cy={y - 0.8} r="1.1" fill={`url(#${gid('gem')})`} />
        </g>
      ))}
    </>
  )
}

function Shadow() {
  return <ellipse cx="32" cy="53.5" rx="14" ry="2.4" fill="#1b140c" opacity="0.2" />
}

function star(cx, cy, r, fill) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 ? r * 0.42 : r
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`)
  }
  return <polygon points={pts.join(' ')} fill={fill} />
}

const OBJECTS = {
  closet: (gid) => (
    <g>
      <Shadow />
      <defs>
        <linearGradient id={gid('wood')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff3d4" /><stop offset="100%" stopColor="#e2c48a" />
        </linearGradient>
      </defs>
      <rect x="15" y="16" width="34" height="34" rx="3.5" fill={`url(#${gid('wood')})`} stroke="#a9832f" strokeWidth="1.4" />
      <rect x="17" y="18" width="14" height="30" rx="1.5" fill="#243056" />
      <path d="M20 22 h8 v12 h-8 z" fill="#3f8f4a" />
      <path d="M20 22 h8 l-1.5 3 h-5 z" fill="#8fd18a" opacity="0.7" />
      <circle cx="29.5" cy="33" r="1.5" fill="#e2c069" />
      <circle cx="43" cy="33" r="1.5" fill="#e2c069" />
      <ellipse cx="42" cy="24" rx="5" ry="3.2" fill="#e67e18" />
      <ellipse cx="42" cy="22.2" rx="3.2" ry="2.2" fill="#f4a83c" />
    </g>
  ),
  words: () => (
    <g>
      <Shadow />
      <path d="M14 40 L32 34 L32 18 L14 24 Z" fill="#fffaf0" stroke="#a9832f" strokeWidth="1.1" />
      <path d="M50 40 L32 34 L32 18 L50 24 Z" fill="#fff6e4" stroke="#a9832f" strokeWidth="1.1" />
      <path d="M32 18 v16" stroke="#c68d12" strokeWidth="1.2" />
      <circle cx="23" cy="28" r="3.2" fill="#ffcb33" />
      <path d="M38 26 h8 M38 29.5 h7 M38 33 h5" stroke="#7c4f00" strokeWidth="1.1" strokeLinecap="round" />
    </g>
  ),
  build: () => (
    <g>
      <Shadow />
      <rect x="16" y="36" width="16" height="14" rx="2.5" fill="#c0453a" stroke="#7c2a24" strokeWidth="0.8" />
      <rect x="34" y="36" width="15" height="14" rx="2.5" fill="#3f63a0" stroke="#243e70" strokeWidth="0.8" />
      <rect x="24" y="22" width="16" height="14" rx="2.5" fill="#e2c069" stroke="#8a6420" strokeWidth="0.8" />
      <path d="M26 24 h12 v3 h-12 z" fill="#fff6d4" opacity="0.45" />
    </g>
  ),
  ladder: () => (
    <g>
      <Shadow />
      {star(32, 12, 6.5, '#fff6c8')}
      <path d="M21 50 L25.5 18" stroke="#8a6420" strokeWidth="5" strokeLinecap="round" />
      <path d="M21 50 L25.5 18" stroke="#f8e7b0" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M43 50 L38.5 18" stroke="#6b4414" strokeWidth="5" strokeLinecap="round" />
      <path d="M43 50 L38.5 18" stroke="#e2c069" strokeWidth="2.6" strokeLinecap="round" />
      {[26, 34, 42].map((y) => (
        <g key={y}>
          <path d={`M${23.5 + (y - 26) * 0.1} ${y + 1.2} H${41 - (y - 26) * 0.1}`} stroke="#8a6420" strokeWidth="3.2" strokeLinecap="round" />
          <path d={`M${23.5 + (y - 26) * 0.1} ${y} H${41 - (y - 26) * 0.1}`} stroke="#fffaf0" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
    </g>
  ),
  lineup: () => (
    <g>
      <Shadow />
      <rect x="12" y="34" width="12" height="14" rx="2.5" fill="#ffe08a" stroke="#a9832f" strokeWidth="1" />
      <rect x="26" y="26" width="12" height="22" rx="2.5" fill="#ffd24a" stroke="#a9832f" strokeWidth="1" />
      <rect x="40" y="16" width="12" height="32" rx="2.5" fill="#ffcb33" stroke="#8a6420" strokeWidth="1" />
      <path d="M43 22 h6 M43 26 h6" stroke="#7c4f00" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M15 40 h6 M29 34 h6" stroke="#7c4f00" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    </g>
  ),
  match: () => (
    <g>
      <Shadow />
      <g transform="rotate(-12 24 34)">
        <rect x="14" y="18" width="20" height="28" rx="3" fill="#fffaf0" stroke="#a9832f" strokeWidth="1.2" />
        <path d="M24 28 c-3 0-5 2.4-5 4.6 0 3.4 5 6.4 5 6.4 s5-3 5-6.4 c0-2.2-2-4.6-5-4.6z" fill="#c0453a" />
      </g>
      <g transform="rotate(10 40 32)">
        <rect x="30" y="16" width="20" height="28" rx="3" fill="#3f63a0" stroke="#e2c069" strokeWidth="1.3" />
        {star(40, 30, 6, '#ffe9a0')}
      </g>
    </g>
  ),
  traffic: (gid) => (
    <g>
      <Shadow />
      <defs>
        <linearGradient id={gid('car')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9ebaf0" /><stop offset="100%" stopColor="#3f63a0" />
        </linearGradient>
      </defs>
      <path d="M12 38 c0-2 2-6 6-8 l7-8 h14 l7 8 c4 2 6 6 6 8 v6 h-40 z" fill={`url(#${gid('car')})`} stroke="#243e70" strokeWidth="1" />
      <path d="M26 24 h12 l4 7 h-20 z" fill="#d7ecff" />
      <circle cx="20" cy="45" r="4.2" fill="#2a241c" />
      <circle cx="44" cy="45" r="4.2" fill="#2a241c" />
      <circle cx="20" cy="45" r="1.7" fill="#e2c069" />
      <circle cx="44" cy="45" r="1.7" fill="#e2c069" />
      <rect x="27" y="36" width="10" height="5" rx="1" fill="#fff6d4" stroke="#7c4f00" strokeWidth="0.6" />
    </g>
  ),
  market: () => (
    <g>
      <Shadow />
      <path d="M12 30 h40 v14 h-40 z" fill="#a56b38" />
      <path d="M12 30 h40 v3 h-40 z" fill="#fff3d4" opacity="0.35" />
      <path d="M10 30 h44 v3.5 h-44 z" fill="#6b4424" />
      <path d="M8 16 h48 v8 c-8 6 -16 6 -24 0 c-8 6 -16 6 -24 0 z" fill="#c0453a" />
      <path d="M8 16 h16 v8 c-5 4 -11 4 -16 0 z" fill="#e2c069" />
      <path d="M24 16 h16 v8 c-5 4 -11 4 -16 0 z" fill="#fff6d4" />
      <path d="M40 16 h16 v8 c-5 4 -11 4 -16 0 z" fill="#3f8f4a" />
      <path d="M14 18 h8 M30 18 h8" stroke="#fff" strokeWidth="1" opacity="0.45" />
      <ellipse cx="22" cy="40" rx="5.2" ry="3.4" fill="#ffcb33" />
      <ellipse cx="21" cy="39" rx="2" ry="1" fill="#fff6c8" opacity="0.7" />
      <ellipse cx="34" cy="41" rx="4.2" ry="3" fill="#59a52a" />
      <circle cx="43" cy="38" r="2.6" fill="#c0453a" />
      <circle cx="42.2" cy="37.2" r="0.8" fill="#fff" opacity="0.7" />
    </g>
  ),
  bingo: () => (
    <g>
      <Shadow />
      <rect x="16" y="12" width="32" height="38" rx="3" fill="#fffaf0" stroke="#a9832f" strokeWidth="1.3" />
      {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
        <rect key={`${r}${c}`} x={20 + c * 9} y={18 + r * 9} width="7" height="7" rx="1.2" fill="#f3e6c4" stroke="#e2c069" strokeWidth="0.6" />
      )))}
      <circle cx="23.5" cy="21.5" r="2.8" fill="#e2c069" stroke="#fff6d4" strokeWidth="0.6" />
      <circle cx="32.5" cy="30.5" r="2.8" fill="#c0453a" stroke="#fff" strokeWidth="0.5" />
      <circle cx="41.5" cy="39.5" r="2.8" fill="#3f8f4a" />
      <circle cx="22.6" cy="20.6" r="0.8" fill="#fff" opacity="0.8" />
      <rect x="40" y="14" width="7" height="12" rx="3.5" fill="#3f63a0" stroke="#e2c069" strokeWidth="0.7" />
      <circle cx="43.5" cy="22" r="2.2" fill="#c0453a" />
    </g>
  ),
  stories: () => (
    <g>
      <Shadow />
      <path d="M16 16 h28 c4 0 6 2 6 5 v26 h-28 c-4 0-6-2-6-5 z" fill="#6b2e2a" stroke="#e2c069" strokeWidth="1.3" />
      <path d="M16 16 v26 c0 3 2 5 6 5" fill="none" stroke="#e2c069" strokeWidth="1.2" />
      <rect x="24" y="22" width="16" height="12" rx="1.5" fill="#e2c069" />
      <path d="M32 22 v12 M24 28 h16" stroke="#8a3830" strokeWidth="1" />
      <circle cx="32" cy="40" r="2" fill="#e2c069" />
    </g>
  ),
  twins: () => (
    <g>
      <Shadow />
      <circle cx="24" cy="32" r="12" fill="#ffcb33" stroke="#a9832f" strokeWidth="1.6" />
      <circle cx="24" cy="32" r="9" fill="none" stroke="#fff6d4" strokeWidth="1" opacity="0.8" />
      <circle cx="42" cy="34" r="12" fill="#ffe08a" stroke="#a9832f" strokeWidth="1.6" />
      <circle cx="42" cy="34" r="9" fill="none" stroke="#fff6d4" strokeWidth="1" opacity="0.7" />
      <text x="24" y="37" textAnchor="middle" fontFamily="Noto Sans Ethiopic, serif" fontSize="13" fontWeight="700" fill="#7c4f00">ሀ</text>
      <text x="42" y="39" textAnchor="middle" fontFamily="Noto Sans Ethiopic, serif" fontSize="13" fontWeight="700" fill="#7c4f00">ሐ</text>
    </g>
  ),
  explorer: () => (
    <g>
      <Shadow />
      <circle cx="32" cy="32" r="16" fill="#f8f2e2" stroke="#e2c069" strokeWidth="2.2" />
      <circle cx="32" cy="32" r="12" fill="none" stroke="#3f63a0" strokeWidth="1" opacity="0.45" />
      <path d="M32 18 L35.2 32 L32 30 L28.8 32 Z" fill="#c0453a" />
      <path d="M32 46 L35.2 32 L32 34 L28.8 32 Z" fill="#2f4d80" />
      <circle cx="32" cy="32" r="2.2" fill="#e2c069" />
    </g>
  ),
  classic: () => (
    <g>
      <Shadow />
      <path d="M14 20 h28 c6 2 8 8 6 16 l-2 10 H18 c-4-6-6-12-4-26 z" fill="#fff6e0" stroke="#a9832f" strokeWidth="1.2" />
      <path d="M20 28 h16 M20 33 h12 M20 38 h8" stroke="#7c4f00" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M40 18 c8 2 12 10 8 20" fill="none" stroke="#3f63a0" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M46 16 l4 2 -6 4 z" fill="#e2c069" />
    </g>
  ),
  practice: () => (
    <g>
      <Shadow />
      {star(32, 30, 16, '#fff3c0')}
      {star(32, 30, 9, '#e2c069')}
      <circle cx="32" cy="30" r="3.2" fill="#c0453a" />
      <circle cx="30.6" cy="28.6" r="1.1" fill="#fff" />
    </g>
  ),
  family: () => (
    <g>
      <Shadow />
      <circle cx="22" cy="24" r="6" fill="#f4c08a" />
      <path d="M14 46 c0-8 4-12 8-12 s8 4 8 12 z" fill="#3f63a0" />
      <circle cx="42" cy="24" r="6" fill="#e8b07a" />
      <path d="M34 46 c0-8 4-12 8-12 s8 4 8 12 z" fill="#c0453a" />
      <circle cx="32" cy="28" r="5" fill="#f8d0a4" />
      <path d="M25 48 c0-7 3.2-10 7-10 s7 3 7 10 z" fill="#e2c069" />
    </g>
  ),
  voice: () => (
    <g>
      <Shadow />
      <rect x="24" y="14" width="14" height="22" rx="7" fill="#f8f2e2" stroke="#e2c069" strokeWidth="1.4" />
      <path d="M22 28 c0 8 4 12 10 12 s10-4 10-12" fill="none" stroke="#fff6d4" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 40 v6 M26 48 h12" stroke="#fff6d4" strokeWidth="2" strokeLinecap="round" />
      <path d="M44 20 c3 3 3 8 0 11" fill="none" stroke="#fff6d4" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M47 17 c4 4 4 12 0 16" fill="none" stroke="#fff6d4" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
    </g>
  ),
  name: () => (
    <g>
      <Shadow />
      <path d="M10 26 h40 l4 8 -4 8 h-40 l4-8 z" fill="#fff6d4" stroke="#a9832f" strokeWidth="1.3" />
      {star(18, 34, 4.5, '#e2c069')}
      <path d="M26 32 h16 M26 36 h12" stroke="#7c4f00" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  ),
  postcard: () => (
    <g>
      <Shadow />
      <g transform="rotate(-8 32 34)">
        <rect x="12" y="20" width="40" height="26" rx="2.5" fill="#fffaf0" stroke="#a9832f" strokeWidth="1.2" />
        <rect x="40" y="24" width="8" height="8" rx="1" fill="#c0453a" />
        <path d="M18 30 h14 M18 34 h10 M18 38 h8" stroke="#7c4f00" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
        <path d="M44 36 c-2 0-3.2 1.6-3.2 2.8 0 2 3.2 4 3.2 4 s3.2-2 3.2-4 c0-1.2-1.2-2.8-3.2-2.8z" fill="#e2c069" />
      </g>
    </g>
  ),
  backpack: (gid) => (
    <g>
      <defs>
        <linearGradient id={gid('bag')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8c48a" /><stop offset="100%" stopColor="#a56b32" />
        </linearGradient>
      </defs>
      <path d="M22 24 c0-8 4-12 10-12 s10 4 10 12" fill="none" stroke="#6b4424" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="16" y="22" width="32" height="28" rx="8" fill={`url(#${gid('bag')})`} stroke="#6b4424" strokeWidth="1.2" />
      <path d="M16 32 h32" stroke="#6b4424" strokeWidth="2" />
      <rect x="27" y="28" width="10" height="8" rx="2" fill="#e2c069" stroke="#7c4f00" strokeWidth="0.7" />
      <circle cx="32" cy="32" r="1.3" fill="#7c4f00" />
      {star(46, 18, 4.2, '#ffcb33')}
    </g>
  ),
  hunt: () => (
    <g>
      <path d="M8 46 c10-10 18-8 28-14 c8 6 16 4 24 8 v12 H8 z" fill="#3f8a36" />
      <path d="M8 48 c12-6 20-2 30-8 c6 4 14 2 18 6 v8 H8 z" fill="#67b255" />
      <ellipse cx="40" cy="40" rx="8" ry="5" fill="#2f7a32" />
      <ellipse cx="34" cy="42" rx="5" ry="3.5" fill="#4ea044" />
      <circle cx="30" cy="38" r="5" fill="#ffcb33" stroke="#a9832f" strokeWidth="1" />
      {star(46, 18, 5, '#fff3c0')}
    </g>
  ),
}

export function SpecialtyIcon({ name = 'hunt', size = 48, bare = false, className = '' }) {
  const raw = useId().replace(/:/g, '')
  const gid = (n) => `${name}-${n}-${raw}`
  const draw = OBJECTS[name] || OBJECTS.hunt
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {!bare && <Plate gid={gid} name={OBJECTS[name] ? name : 'hunt'} />}
      {draw(gid)}
    </svg>
  )
}

/* Filled emblems for path nodes. They inherit currentColor so a cream
   glyph on lapis and a brown glyph on gold both stay legible. */
export function NodeEmblem({ kind = 'boss', size = 28 }) {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 32 32',
    'aria-hidden': true,
    focusable: 'false',
  }
  if (kind === 'runner') {
    return (
      <svg {...p}>
        <path d="M16 2c1.6 3.4 1.4 5.6-.4 7.6 3.6-.6 6.4 1 7.4 3.6 1.8 5.2-1.6 11-7 13-5.4-2-8.8-7.8-7-13 1-2.6 3.8-4.2 7.4-3.6C14.6 7.6 14.4 5.4 16 2z" fill="currentColor" />
        <path d="M16 11c.8 1.6.6 2.6-.2 3.6 1.8.1 3 1.2 3.2 2.4.5 2-1 4.6-3 5.4-2-.8-3.5-3.4-3-5.4.2-1.2 1.4-2.3 3.2-2.4-.8-1-1-2 0-3.6z" fill="#fff6d0" opacity="0.9" />
      </svg>
    )
  }
  if (kind === 'catch') {
    return (
      <svg {...p}>
        <path d="M16 2l2.2 8.2L26 12l-6.2 3.2L18 24l-2-8.8L8 12l7.8-1.8z" fill="currentColor" />
        <path d="M24 18l1.2 3.6L29 23l-3.2 1.4L24 28l-.8-3.6L20 23l3.8-1.4z" fill="currentColor" opacity="0.85" />
        <circle cx="16" cy="13" r="1.6" fill="#fff6d0" />
      </svg>
    )
  }
  if (kind === 'story') {
    return (
      <svg {...p}>
        <path d="M7 6h14c3 0 4 1.4 4 3.2V26H11c-2.4 0-4-1.2-4-3.2z" fill="currentColor" />
        <path d="M11 8h8v8h-8z" fill="#e2c069" />
        <path d="M15 8v8M11 12h8" stroke="currentColor" strokeWidth="1" />
      </svg>
    )
  }
  if (kind === 'review') {
    return (
      <svg {...p}>
        <path d="M16 5a11 11 0 0 1 9.2 5H22l4.2 1.2L24 6.2V8A13 13 0 1 0 28 18h-2.2A11 11 0 1 1 16 5z" fill="currentColor" />
        <path d="M14 16.5l2.2 2.2 4.4-5" fill="none" stroke="#fff6d0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg {...p}>
      <path d="M16 3l3.2 7.4L27 12l-5.6 4.6L23 25l-7-4.2L9 25l1.6-8.4L5 12l7.8-1.6z" fill="currentColor" />
      <path d="M16 8l1.6 3.8 4 .8-3 2.6.8 4.2L16 17.2 12.6 19.4l.8-4.2-3-2.6 4-.8z" fill="#fff6d0" opacity="0.85" />
    </svg>
  )
}

export default SpecialtyIcon
