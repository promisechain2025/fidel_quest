/* Authored highland scenery: a manuscript-framed Ethiopian highland
   miniature for the Daily Hunt, hiding-place props that replace flat CSS
   blobs, and a quiet ridge under each Journey chapter. All local SVG.
   No remote images. See docs/art-pipeline.md. */
import { useId } from 'react'

export function HighlandMeadow({ className = '' }) {
  const raw = useId().replace(/:/g, '')
  const id = (n) => `mead-${n}-${raw}`
  return (
    <svg className={className} viewBox="0 0 400 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6c56a" />
          <stop offset="28%" stopColor="#f3d7a2" />
          <stop offset="52%" stopColor="#9ec4ea" />
          <stop offset="78%" stopColor="#d5ecff" />
        </linearGradient>
        <radialGradient id={id('sun')} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff6c8" />
          <stop offset="55%" stopColor="#ffd15a" />
          <stop offset="100%" stopColor="#f0a030" />
        </radialGradient>
        <linearGradient id={id('far')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8ea4cc" />
          <stop offset="100%" stopColor="#6d82ad" />
        </linearGradient>
        <linearGradient id={id('esc')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b7a0b8" />
          <stop offset="100%" stopColor="#7d6a86" />
        </linearGradient>
        <linearGradient id={id('hill')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8fba62" />
          <stop offset="100%" stopColor="#4f8a3c" />
        </linearGradient>
        <linearGradient id={id('grass')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c6d56a" />
          <stop offset="35%" stopColor="#7fb84e" />
          <stop offset="100%" stopColor="#3e7a32" />
        </linearGradient>
        <filter id={id('blur')} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id={id('grain')}>
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="4" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.07" />
          </feComponentTransfer>
        </filter>
      </defs>

      <rect width="400" height="560" fill={`url(#${id('sky')})`} />
      <circle cx="330" cy="86" r="64" fill="#ffe08a" opacity="0.35" />
      <circle cx="330" cy="78" r="28" fill={`url(#${id('sun')})`} />

      <g fill="#fff" opacity="0.92">
        <ellipse cx="78" cy="70" rx="28" ry="12" />
        <ellipse cx="98" cy="64" rx="22" ry="14" />
        <ellipse cx="58" cy="66" rx="16" ry="10" />
        <ellipse cx="210" cy="48" rx="22" ry="10" />
        <ellipse cx="228" cy="44" rx="16" ry="11" />
      </g>

      <g filter={`url(#${id('blur')})`}>
        <path d="M0 210 L40 168 L78 196 L120 150 L168 188 L210 142 L258 184 L310 136 L352 176 L400 158 L400 240 L0 240 Z" fill={`url(#${id('far')})`} />
      </g>

      {/* Flat-topped highland escarpment, the Entoto / plateau read. */}
      <path d="M0 248 L0 214 L36 208 L70 222 L108 190 L150 210 L186 176 L230 204 L268 168 L320 198 L360 178 L400 196 L400 268 L0 268 Z" fill={`url(#${id('esc')})`} />
      <path d="M108 190 H150 M186 176 H230 M268 168 H318" stroke="#efe4d4" strokeWidth="1.2" opacity="0.45" />
      <path d="M40 230 H90 M160 236 H220 M280 228 H350" stroke="#5c4a62" strokeWidth="1" opacity="0.25" />

      <path d="M0 300 C60 250 90 270 140 246 C190 222 220 260 280 236 C330 216 360 250 400 230 L400 340 L0 340 Z" fill={`url(#${id('hill')})`} />
      <path d="M0 292 C80 270 120 286 400 250" fill="none" stroke="#e7f2c4" strokeWidth="2" opacity="0.35" />

      <path d="M0 318 C50 300 90 324 150 308 C220 290 260 320 320 304 C360 292 380 310 400 300 L400 560 L0 560 Z" fill={`url(#${id('grass')})`} />

      {/* Foreground tufts and a juniper off the hiding spots. */}
      <g fill="#2f6a2c">
        <ellipse cx="70" cy="300" rx="26" ry="8" />
        <ellipse cx="86" cy="294" rx="16" ry="10" />
        <rect x="78" y="294" width="5" height="22" rx="2" fill="#6b4428" />
      </g>
      <g stroke="#2f6e28" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7">
        <path d="M24 470 q4 -16 0 -28" />
        <path d="M32 476 q6 -18 2 -32" />
        <path d="M40 472 q-2 -14 2 -26" />
        <path d="M188 500 q3 -14 0 -24" />
        <path d="M198 506 q5 -16 1 -28" />
        <path d="M300 490 q4 -16 0 -26" />
        <path d="M310 496 q-3 -14 1 -24" />
      </g>
      <g>
        <circle cx="196" cy="478" r="3.2" fill="#ffd34d" />
        <circle cx="196" cy="478" r="1.3" fill="#b4560a" />
        <circle cx="36" cy="450" r="2.6" fill="#fff" opacity="0.8" />
      </g>

      <rect width="400" height="560" filter={`url(#${id('grain')})`} opacity="0.35" />

      <rect x="8" y="8" width="384" height="544" rx="26" fill="none" stroke="#e2c069" strokeWidth="3" />
      <rect x="14" y="14" width="372" height="532" rx="22" fill="none" stroke="#a9832f" strokeWidth="1.2" opacity="0.8" />
      <circle cx="28" cy="28" r="4" fill="#c0453a" stroke="#e2c069" strokeWidth="1.2" />
      <circle cx="372" cy="28" r="4" fill="#3f63a0" stroke="#e2c069" strokeWidth="1.2" />
      <circle cx="28" cy="532" r="4" fill="#3f8f4a" stroke="#e2c069" strokeWidth="1.2" />
      <circle cx="372" cy="532" r="4" fill="#e2c069" stroke="#a9832f" strokeWidth="1.2" />
    </svg>
  )
}

function CloudCover() {
  return (
    <svg width="88" height="48" viewBox="0 0 88 48" aria-hidden="true" focusable="false">
      <ellipse cx="44" cy="40" rx="30" ry="4" fill="#1b140c" opacity="0.12" />
      <ellipse cx="30" cy="28" rx="18" ry="12" fill="#e7eef6" />
      <ellipse cx="50" cy="24" rx="22" ry="15" fill="#f7fbff" />
      <ellipse cx="66" cy="30" rx="14" ry="10" fill="#d5e2f0" />
      <ellipse cx="46" cy="20" rx="12" ry="7" fill="#fff" opacity="0.85" />
    </svg>
  )
}

function TreeCover() {
  return (
    <svg width="76" height="84" viewBox="0 0 76 84" aria-hidden="true" focusable="false">
      <ellipse cx="38" cy="78" rx="16" ry="3.5" fill="#1b140c" opacity="0.15" />
      <path d="M34 78 L36 46 H42 L40 78 Z" fill="#6b4428" />
      <path d="M38 46 L40 62" stroke="#8a5a32" strokeWidth="2" />
      <ellipse cx="38" cy="40" rx="24" ry="16" fill="#2f6a32" />
      <ellipse cx="26" cy="44" rx="14" ry="11" fill="#3f8a3c" />
      <ellipse cx="50" cy="42" rx="16" ry="12" fill="#4e9a48" />
      <ellipse cx="38" cy="30" rx="16" ry="12" fill="#67b255" />
      <ellipse cx="32" cy="26" rx="8" ry="5" fill="#c6e6a4" opacity="0.55" />
    </svg>
  )
}

function BushCover() {
  return (
    <svg width="86" height="46" viewBox="0 0 86 46" aria-hidden="true" focusable="false">
      <ellipse cx="43" cy="40" rx="28" ry="3.5" fill="#1b140c" opacity="0.14" />
      <ellipse cx="24" cy="28" rx="16" ry="12" fill="#3f8a3c" />
      <ellipse cx="46" cy="24" rx="20" ry="14" fill="#2f6e30" />
      <ellipse cx="64" cy="28" rx="14" ry="11" fill="#58a24c" />
      <ellipse cx="40" cy="20" rx="10" ry="6" fill="#8fd07a" opacity="0.55" />
      <circle cx="30" cy="26" r="2.2" fill="#ffd34d" />
      <circle cx="52" cy="22" r="1.8" fill="#e24b6a" />
      <circle cx="60" cy="30" r="1.6" fill="#ffd34d" />
    </svg>
  )
}

function RockCover() {
  return (
    <svg width="64" height="40" viewBox="0 0 64 40" aria-hidden="true" focusable="false">
      <ellipse cx="32" cy="34" rx="20" ry="3" fill="#1b140c" opacity="0.16" />
      <path d="M8 30 C10 16 18 12 28 14 C34 8 46 10 52 18 C60 20 60 30 54 34 C40 38 16 36 8 30 Z" fill="#b7b3bc" />
      <path d="M14 28 C18 18 28 16 36 20 C30 22 22 24 16 30 Z" fill="#dedbe2" />
      <path d="M36 32 C44 28 52 26 54 32 C46 34 38 35 36 32 Z" fill="#6f9a58" opacity="0.85" />
    </svg>
  )
}

function GrassCover() {
  return (
    <svg width="52" height="36" viewBox="0 0 52 36" aria-hidden="true" focusable="false">
      <path d="M8 34 Q10 16 6 8" stroke="#2f6e28" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M16 34 Q18 12 14 4" stroke="#3f8a34" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M26 34 Q24 14 28 6" stroke="#67b255" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M34 34 Q38 16 34 8" stroke="#2f6e28" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M42 34 Q44 18 48 10" stroke="#4e9a40" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="14" cy="6" r="2.4" fill="#ffd34d" />
      <circle cx="14" cy="6" r="1" fill="#b4560a" />
    </svg>
  )
}

export function CoverArt({ kind }) {
  if (kind === 'cloud') return <CloudCover />
  if (kind === 'tree') return <TreeCover />
  if (kind === 'rock') return <RockCover />
  if (kind === 'grass') return <GrassCover />
  return <BushCover />
}

/* One manuscript-framed highland miniature per journey chapter. A short
   strip under the place name, so the letters themselves stay on a quiet
   band and the scene still reads on dark vellum and warm parchment. */
const VISTA = {
  1: { sky: '#f3c56a', far: '#8ea0c4', hill: '#c4a15a', grass: '#7eae4e', tree: '#3f7a34' },
  2: { sky: '#f0d090', far: '#7f94b8', hill: '#6eaa58', grass: '#4f8a38', tree: '#2f6a2c' },
  3: { sky: '#d5e4f8', far: '#6d86b4', hill: '#5d84c4', grass: '#6a9a58', tree: '#2f6840' },
  4: { sky: '#f6d0e0', far: '#a888a8', hill: '#c46a98', grass: '#7aaa58', tree: '#3d7040' },
  5: { sky: '#e4d8f8', far: '#9080b8', hill: '#8c78d2', grass: '#6a9860', tree: '#3a6844' },
}

export function ChapterVista({ chapter = 1 }) {
  const v = VISTA[chapter] || VISTA[1]
  return (
    <svg aria-hidden="true" focusable="false" className="h-14 w-full" viewBox="0 0 360 56" preserveAspectRatio="xMidYMid slice">
      <rect width="360" height="56" fill={v.sky} />
      <circle cx="312" cy="16" r="10" fill="#ffe08a" />
      <circle cx="312" cy="16" r="16" fill="#ffe08a" opacity="0.35" />
      <ellipse cx="48" cy="14" rx="18" ry="7" fill="#fff" opacity="0.85" />
      <ellipse cx="62" cy="12" rx="12" ry="6" fill="#fff" />
      <path d="M0 30 L28 18 L52 28 L90 14 L124 26 L160 12 L200 24 L240 16 L280 26 L320 14 L360 22 L360 36 L0 36 Z" fill={v.far} />
      <path d="M0 40 C40 30 70 36 110 32 C160 26 200 38 250 30 C300 24 330 34 360 28 L360 56 L0 56 Z" fill={v.hill} />
      <path d="M0 46 C80 40 140 48 220 42 C280 38 320 46 360 40 L360 56 L0 56 Z" fill={v.grass} />
      <path d="M46 48 L46 30" stroke="#6b4428" strokeWidth="2" />
      <ellipse cx="46" cy="28" rx="14" ry="6" fill={v.tree} />
      <ellipse cx="36" cy="32" rx="8" ry="4" fill={v.tree} opacity="0.85" />
      <ellipse cx="56" cy="32" rx="8" ry="3.5" fill={v.tree} opacity="0.8" />
      <rect x="2" y="2" width="356" height="52" rx="10" fill="none" stroke="#e2c069" strokeWidth="1.6" />
    </svg>
  )
}
