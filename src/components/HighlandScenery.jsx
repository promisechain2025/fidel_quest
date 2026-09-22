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
          <stop offset="0%" stopColor="#e8923a" />
          <stop offset="18%" stopColor="#f6c56a" />
          <stop offset="40%" stopColor="#f7e2c0" />
          <stop offset="62%" stopColor="#9ec4ea" />
          <stop offset="100%" stopColor="#e7f4ff" />
        </linearGradient>
        <radialGradient id={id('sun')} cx="42%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#fffce8" />
          <stop offset="45%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#f0a030" />
        </radialGradient>
        <linearGradient id={id('wash')} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe7a8" stopOpacity="0.45" />
          <stop offset="55%" stopColor="#ffe7a8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('far')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b7c6e4" />
          <stop offset="100%" stopColor="#7f93b8" />
        </linearGradient>
        <linearGradient id={id('mid')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9aa6c8" />
          <stop offset="100%" stopColor="#6a789c" />
        </linearGradient>
        <linearGradient id={id('esc')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d2b8c4" />
          <stop offset="45%" stopColor="#a88898" />
          <stop offset="100%" stopColor="#6e586c" />
        </linearGradient>
        <linearGradient id={id('hill')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c6d86a" />
          <stop offset="100%" stopColor="#5a9440" />
        </linearGradient>
        <linearGradient id={id('grass')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e4e892" />
          <stop offset="28%" stopColor="#8fbe58" />
          <stop offset="70%" stopColor="#4e8a38" />
          <stop offset="100%" stopColor="#2f6428" />
        </linearGradient>
        <linearGradient id={id('mist')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={id('blur')} x="-12%" y="-12%" width="124%" height="124%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id={id('soft')} x="-8%" y="-8%" width="116%" height="116%">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
        <filter id={id('grain')}>
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="4" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.055" />
          </feComponentTransfer>
        </filter>
      </defs>

      <rect width="400" height="560" fill={`url(#${id('sky')})`} />
      <rect width="400" height="280" fill={`url(#${id('wash')})`} />
      <circle cx="318" cy="78" r="78" fill="#ffe08a" opacity="0.28" />
      <circle cx="318" cy="74" r="34" fill={`url(#${id('sun')})`} />
      <g stroke="#fff3c4" strokeWidth="1.4" strokeLinecap="round" opacity="0.45">
        <path d="M318 28 v-14" />
        <path d="M354 46 l10 -8" />
        <path d="M364 78 h14" />
        <path d="M348 108 l10 8" />
      </g>

      <g>
        <ellipse cx="72" cy="78" rx="30" ry="13" fill="#f4efe6" />
        <ellipse cx="96" cy="70" rx="24" ry="15" fill="#fff" />
        <ellipse cx="52" cy="74" rx="16" ry="10" fill="#e4eaf2" />
        <ellipse cx="86" cy="64" rx="14" ry="7" fill="#fff" opacity="0.8" />
        <ellipse cx="188" cy="46" rx="20" ry="9" fill="#fff" opacity="0.9" />
        <ellipse cx="206" cy="42" rx="14" ry="8" fill="#f7fbff" />
      </g>

      <g filter={`url(#${id('blur')})`} opacity="0.92">
        <path d="M0 228 L28 186 L62 208 L98 162 L140 198 L176 154 L214 190 L252 148 L292 186 L334 156 L372 184 L400 168 L400 250 L0 250 Z" fill={`url(#${id('far')})`} />
      </g>
      <ellipse cx="200" cy="236" rx="210" ry="16" fill={`url(#${id('mist')})`} />

      <path d="M0 268 L0 236 L48 228 L86 246 L124 214 L164 236 L198 206 L236 232 L274 200 L318 228 L360 208 L400 222 L400 292 L0 292 Z" fill={`url(#${id('mid')})`} />
      <ellipse cx="210" cy="278" rx="200" ry="14" fill={`url(#${id('mist')})`} opacity="0.85" />

      {/* Flat-topped highland escarpment, the Entoto / plateau read. */}
      <path d="M0 300 L0 252 L34 246 L72 262 L108 228 L148 250 L184 216 L226 244 L266 208 L312 238 L354 216 L400 234 L400 318 L0 318 Z" fill={`url(#${id('esc')})`} />
      <path d="M108 228 H148 M184 216 H226 M266 208 H314" stroke="#efe4d4" strokeWidth="1.4" opacity="0.5" />
      <path d="M118 250 L126 268 M200 240 L208 262 M290 236 L298 258" stroke="#5c4a62" strokeWidth="1.1" opacity="0.28" />
      {/* A round tukul on the far plateau, clear of the letter spots. */}
      <g filter={`url(#${id('soft')})`}>
        <ellipse cx="246" cy="248" rx="16" ry="5" fill="#5c4a62" opacity="0.35" />
        <path d="M234 246 Q246 228 258 246 Z" fill="#c45a32" />
        <path d="M238 238 Q246 226 254 238" fill="none" stroke="#e8c07a" strokeWidth="1" opacity="0.7" />
        <rect x="242" y="244" width="8" height="8" fill="#8a6848" />
      </g>

      <path d="M0 340 C70 286 110 310 160 286 C210 262 240 300 300 274 C340 256 370 292 400 268 L400 380 L0 380 Z" fill={`url(#${id('hill')})`} />
      <path d="M0 328 C90 304 140 322 400 286" fill="none" stroke="#f4f8d4" strokeWidth="2.2" opacity="0.4" />

      <path d="M0 352 C60 330 100 358 160 338 C230 316 270 352 330 334 C370 322 386 340 400 332 L400 560 L0 560 Z" fill={`url(#${id('grass')})`} />
      <path d="M0 390 C80 370 140 400 220 376 C280 360 330 392 400 368" fill="none" stroke="#d7e86a" strokeWidth="8" opacity="0.28" strokeLinecap="round" />
      <path d="M0 450 C100 430 160 468 260 440 C320 424 360 456 400 438" fill="none" stroke="#2f6a28" strokeWidth="10" opacity="0.12" strokeLinecap="round" />

      {/* Edge junipers and a fringe of grass. The open middle stays quiet
          so the hiding letters stay readable. */}
      <g>
        <rect x="18" y="318" width="6" height="28" rx="2" fill="#6b4428" />
        <ellipse cx="21" cy="312" rx="22" ry="10" fill="#245c28" />
        <ellipse cx="10" cy="320" rx="12" ry="8" fill="#3f8a3c" />
        <ellipse cx="34" cy="318" rx="12" ry="7" fill="#67b255" />
        <ellipse cx="16" cy="304" rx="8" ry="4" fill="#c6e6a4" opacity="0.55" />
      </g>
      <g stroke="#245c28" strokeWidth="2.1" strokeLinecap="round" fill="none" opacity="0.75">
        <path d="M16 548 q3 -22 -2 -40" />
        <path d="M26 552 q6 -24 0 -44" />
        <path d="M36 546 q-2 -18 3 -34" />
        <path d="M364 550 q4 -20 0 -38" />
        <path d="M376 546 q-4 -18 2 -36" />
        <path d="M386 552 q3 -16 -1 -30" />
      </g>
      <g opacity="0.9">
        <circle cx="22" cy="520" r="3.2" fill="#ffd34d" />
        <circle cx="22" cy="520" r="1.2" fill="#b4560a" />
        <circle cx="34" cy="534" r="2.4" fill="#fff" />
        <circle cx="370" cy="524" r="2.8" fill="#e24b6a" />
        <circle cx="382" cy="538" r="2.2" fill="#ffd34d" />
        <circle cx="358" cy="540" r="2" fill="#fff" opacity="0.85" />
      </g>

      <ellipse cx="200" cy="300" rx="170" ry="18" fill="#fff" opacity="0.16" />
      <rect width="400" height="560" filter={`url(#${id('grain')})`} opacity="0.4" />

      <rect x="8" y="8" width="384" height="544" rx="26" fill="none" stroke="#e2c069" strokeWidth="3.2" />
      <rect x="14" y="14" width="372" height="532" rx="22" fill="none" stroke="#a9832f" strokeWidth="1.2" opacity="0.85" />
      <circle cx="28" cy="28" r="4.2" fill="#c0453a" stroke="#e2c069" strokeWidth="1.3" />
      <circle cx="372" cy="28" r="4.2" fill="#3f63a0" stroke="#e2c069" strokeWidth="1.3" />
      <circle cx="28" cy="532" r="4.2" fill="#3f8f4a" stroke="#e2c069" strokeWidth="1.3" />
      <circle cx="372" cy="532" r="4.2" fill="#e2c069" stroke="#a9832f" strokeWidth="1.3" />
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
  const raw = useId().replace(/:/g, '')
  const v = VISTA[chapter] || VISTA[1]
  const sky = `vista-sky-${raw}`
  return (
    <svg aria-hidden="true" focusable="false" className="h-20 w-full" viewBox="0 0 360 80" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={v.sky} />
          <stop offset="100%" stopColor="#f7fbff" />
        </linearGradient>
      </defs>
      <rect width="360" height="80" fill={`url(#${sky})`} />
      <circle cx="312" cy="18" r="22" fill="#ffe08a" opacity="0.35" />
      <circle cx="312" cy="18" r="11" fill="#fff6c8" />
      <ellipse cx="46" cy="16" rx="20" ry="8" fill="#fff" opacity="0.9" />
      <ellipse cx="64" cy="13" rx="14" ry="7" fill="#fff" />
      <ellipse cx="34" cy="18" rx="10" ry="5" fill="#e7eef6" />
      <path d="M0 36 L24 22 L48 32 L86 16 L122 30 L158 14 L198 28 L238 18 L278 30 L318 16 L360 26 L360 46 L0 46 Z" fill={v.far} opacity="0.75" />
      <ellipse cx="180" cy="42" rx="170" ry="7" fill="#fff" opacity="0.45" />
      <path d="M0 48 L30 36 L62 46 L100 32 L140 46 L180 34 L220 46 L264 32 L310 44 L360 34 L360 58 L0 58 Z" fill={v.far} />
      <path d="M0 56 C50 46 90 54 140 48 C200 40 240 56 300 46 C330 42 348 50 360 46 L360 80 L0 80 Z" fill={v.hill} />
      <path d="M0 64 C90 56 150 68 230 58 C290 52 330 64 360 56 L360 80 L0 80 Z" fill={v.grass} />
      <path d="M248 62 L248 46" stroke="#6b4428" strokeWidth="2" />
      <path d="M240 50 Q248 40 256 50 Z" fill="#c45a32" />
      <rect x="245" y="58" width="6" height="6" fill="#8a6848" />
      <path d="M52 68 L52 46" stroke="#6b4428" strokeWidth="2.4" />
      <ellipse cx="52" cy="44" rx="16" ry="7" fill={v.tree} />
      <ellipse cx="40" cy="50" rx="9" ry="5" fill={v.tree} opacity="0.85" />
      <ellipse cx="64" cy="50" rx="9" ry="4" fill={v.tree} opacity="0.8" />
      <ellipse cx="46" cy="40" rx="7" ry="3" fill="#c6e6a4" opacity="0.5" />
      <g stroke={v.tree} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7">
        <path d="M300 76 q2 -8 0 -14" />
        <path d="M308 78 q3 -8 1 -16" />
        <path d="M316 76 q-1 -7 2 -12" />
      </g>
      <rect x="2" y="2" width="356" height="76" rx="12" fill="none" stroke="#e2c069" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.2" fill="#c0453a" />
      <circle cx="348" cy="12" r="2.2" fill="#3f63a0" />
      <circle cx="12" cy="68" r="2.2" fill="#3f8f4a" />
      <circle cx="348" cy="68" r="2.2" fill="#e2c069" />
    </svg>
  )
}
