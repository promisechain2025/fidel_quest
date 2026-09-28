/* Authored scenery for Letter Steps and the 2D runner lane.
   Highland miniatures. A single quiet edge, no corner jewels — the sky,
   river, and lawn carry the mood. Local SVG only. Static on purpose:
   no looping motion, so reduced-motion stays quiet.
   The step machine and the runner machine are not involved. */
import { useId } from 'react'

function Frame({ w, h, rx = 22 }) {
  return (
    <rect x="7" y="7" width={w - 14} height={h - 14} rx={rx} fill="none" stroke="#c4b08a" strokeWidth="1.25" opacity="0.5" />
  )
}

/** MEET: a short highland sky behind the wandering bubble.
    Clouds stay sky-tinted. The glyph on the bubble is white, so a solid
    white shape here would read as part of a letter. */
export function BubbleSky({ className = '' }) {
  const raw = useId().replace(/:/g, '')
  const id = (n) => `bub-${n}-${raw}`
  return (
    <svg data-scene="bubble" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} viewBox="0 0 400 256" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0b85a" />
          <stop offset="22%" stopColor="#f7e2c0" />
          <stop offset="58%" stopColor="#b9d8f4" />
          <stop offset="100%" stopColor="#e8f6ff" />
        </linearGradient>
        <radialGradient id={id('sun')} cx="38%" cy="36%" r="55%">
          <stop offset="0%" stopColor="#fffce8" />
          <stop offset="48%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#f0a030" />
        </radialGradient>
        <linearGradient id={id('far')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a8b4d4" />
          <stop offset="100%" stopColor="#6e7ea4" />
        </linearGradient>
        <linearGradient id={id('grass')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d5e68a" />
          <stop offset="100%" stopColor="#3d7a34" />
        </linearGradient>
      </defs>
      <rect width="400" height="256" fill={`url(#${id('sky')})`} />
      <circle cx="338" cy="46" r="40" fill="#ffe08a" opacity="0.28" />
      <circle cx="338" cy="44" r="16" fill={`url(#${id('sun')})`} />
      <g stroke="#fff3c4" strokeWidth="1.2" strokeLinecap="round" opacity="0.55">
        <path d="M338 18 v-10" />
        <path d="M360 28 l7 -6" />
        <path d="M366 46 h10" />
      </g>
      <g>
        <ellipse cx="58" cy="38" rx="28" ry="12" fill="#d3e7f6" />
        <ellipse cx="82" cy="32" rx="20" ry="13" fill="#e6f3fb" />
        <ellipse cx="40" cy="36" rx="14" ry="8" fill="#c5dced" />
        <ellipse cx="156" cy="24" rx="18" ry="7" fill="#dceef8" />
        <ellipse cx="174" cy="22" rx="12" ry="6" fill="#eef6fc" />
      </g>
      <path d="M0 206 L36 178 L74 198 L118 166 L164 192 L208 160 L252 188 L300 164 L346 184 L400 162 L400 224 L0 224 Z" fill={`url(#${id('far')})`} opacity="0.9" />
      <ellipse cx="200" cy="214" rx="180" ry="9" fill="#fff" opacity="0.22" />
      <path d="M0 222 C70 206 130 230 210 212 C290 196 340 220 400 204 L400 256 L0 256 Z" fill={`url(#${id('grass')})`} />
      <g stroke="#245c28" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.8">
        <path d="M14 252 q2 -14 0 -26" />
        <path d="M24 254 q3 -12 0 -22" />
        <path d="M376 254 q-2 -12 1 -22" />
        <path d="M386 252 q2 -10 0 -18" />
      </g>
      <g>
        <circle cx="16" cy="236" r="3" fill="#ffd34d" />
        <circle cx="16" cy="236" r="1.1" fill="#b4560a" />
        <circle cx="384" cy="234" r="2.5" fill="#e24b6a" />
        <circle cx="370" cy="244" r="2" fill="#ffd34d" />
      </g>
      <Frame w={400} h={256} />
    </svg>
  )
}

/** FORWARD / BACKWARD: the river the stones already sit on, drawn as a
    highland crossing. Stones, Anbessa, and the tray stay in the DOM. */
export function RiverCrossing({ className = '' }) {
  const raw = useId().replace(/:/g, '')
  const id = (n) => `riv-${n}-${raw}`
  return (
    <svg data-scene="river" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} viewBox="0 0 400 256" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3c56e" />
          <stop offset="55%" stopColor="#d7ecfb" />
          <stop offset="100%" stopColor="#9fd0f2" />
        </linearGradient>
        <linearGradient id={id('water')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7ec8ef" />
          <stop offset="18%" stopColor="#2f9edc" />
          <stop offset="100%" stopColor="#0e6eae" />
        </linearGradient>
        <linearGradient id={id('bank')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c6de78" />
          <stop offset="40%" stopColor="#5aa344" />
          <stop offset="100%" stopColor="#2f6e28" />
        </linearGradient>
        <linearGradient id={id('far')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4b0bc" />
          <stop offset="100%" stopColor="#7a6878" />
        </linearGradient>
        <radialGradient id={id('sun')} cx="40%" cy="36%" r="55%">
          <stop offset="0%" stopColor="#fffce8" />
          <stop offset="55%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#f0a030" />
        </radialGradient>
      </defs>
      <rect width="400" height="256" fill={`url(#${id('water')})`} />
      <rect width="400" height="86" fill={`url(#${id('sky')})`} />
      <circle cx="312" cy="28" r="22" fill="#ffe08a" opacity="0.32" />
      <circle cx="312" cy="26" r="11" fill={`url(#${id('sun')})`} />
      <ellipse cx="48" cy="22" rx="18" ry="7" fill="#e7f3fb" />
      <ellipse cx="66" cy="18" rx="12" ry="6" fill="#f4fbff" />
      <path d="M0 78 L28 52 L62 68 L104 40 L146 64 L188 36 L232 60 L276 38 L320 58 L362 42 L400 56 L400 92 L0 92 Z" fill={`url(#${id('far')})`} />
      <path d="M104 40 H146 M188 36 H230 M276 38 H318" stroke="#efe4d4" strokeWidth="1.3" opacity="0.55" />
      <ellipse cx="200" cy="84" rx="170" ry="7" fill="#fff" opacity="0.35" />
      <g fill="#eaf6ff" opacity="0.45">
        <ellipse cx="78" cy="128" rx="22" ry="3.2" />
        <ellipse cx="150" cy="168" rx="26" ry="3" />
        <ellipse cx="230" cy="118" rx="18" ry="2.6" />
        <ellipse cx="300" cy="188" rx="24" ry="3" />
        <ellipse cx="196" cy="214" rx="20" ry="2.6" />
      </g>
      {/* Earth lip, then grass, so the banks read as a real shore. */}
      <path d="M0 86 C14 98 22 120 26 256 L0 256 Z" fill="#3a4e28" />
      <path d="M400 86 C386 98 378 120 374 256 L400 256 Z" fill="#3a4e28" />
      <path d="M0 68 C20 82 30 108 40 256 L0 256 Z" fill={`url(#${id('bank')})`} />
      <path d="M400 68 C380 82 370 108 360 256 L400 256 Z" fill={`url(#${id('bank')})`} />
      <path d="M8 100 C18 130 16 180 14 240" fill="none" stroke="#6a8a3a" strokeWidth="3" opacity="0.35" />
      <path d="M392 100 C382 130 384 180 386 240" fill="none" stroke="#6a8a3a" strokeWidth="3" opacity="0.35" />
      <g strokeLinecap="round" fill="none">
        <path d="M10 248 q2 -28 -1 -52" stroke="#1c4a22" strokeWidth="2.2" />
        <path d="M18 252 q4 -34 0 -64" stroke="#2f6a30" strokeWidth="2.4" />
        <path d="M26 246 q-2 -22 2 -46" stroke="#3d7a34" strokeWidth="1.8" />
        <path d="M32 250 q3 -18 1 -36" stroke="#245c28" strokeWidth="1.6" />
        <path d="M14 200 q6 -8 2 -2" stroke="#8fbe58" strokeWidth="1.4" />
        <path d="M22 168 q5 -6 1 -1" stroke="#c6de78" strokeWidth="1.3" />
        <path d="M390 248 q-2 -26 1 -48" stroke="#1c4a22" strokeWidth="2.2" />
        <path d="M382 252 q-4 -32 0 -60" stroke="#2f6a30" strokeWidth="2.4" />
        <path d="M374 244 q2 -20 -2 -42" stroke="#3d7a34" strokeWidth="1.8" />
        <path d="M368 250 q-3 -16 -1 -34" stroke="#245c28" strokeWidth="1.6" />
        <path d="M386 196 q-6 -8 -2 -2" stroke="#8fbe58" strokeWidth="1.4" />
        <ellipse cx="20" cy="188" rx="2.2" ry="4" fill="#6a8f40" stroke="none" opacity="0.7" />
        <ellipse cx="380" cy="192" rx="2.2" ry="4" fill="#6a8f40" stroke="none" opacity="0.7" />
      </g>
      <g>
        <path d="M332 58 L340 46 L348 58 Z" fill="#c45a32" />
        <rect x="336" y="58" width="8" height="7" fill="#8a6848" />
      </g>
      <Frame w={400} h={256} rx={24} />
    </svg>
  )
}

/** ECHO / SHUFFLE: highland lawn under the letter cards. Sky, escarpment,
    and grass carry the depth. The middle stays open so the cards stay
    readable. One quiet edge — no corner jewels. */
export function FeedMeadow({ className = '' }) {
  const raw = useId().replace(/:/g, '')
  const id = (n) => `fed-${n}-${raw}`
  return (
    <svg data-scene="feed" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8923a" />
          <stop offset="16%" stopColor="#f6c56a" />
          <stop offset="36%" stopColor="#f7e2c0" />
          <stop offset="58%" stopColor="#9ec4ea" />
          <stop offset="100%" stopColor="#e7f4ff" />
        </linearGradient>
        <radialGradient id={id('sun')} cx="42%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#fffce8" />
          <stop offset="50%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#f0a030" />
        </radialGradient>
        <linearGradient id={id('wash')} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe7a8" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#ffe7a8" stopOpacity="0" />
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
          <stop offset="50%" stopColor="#a88898" />
          <stop offset="100%" stopColor="#6e586c" />
        </linearGradient>
        <linearGradient id={id('hill')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c6d86a" />
          <stop offset="100%" stopColor="#5a9440" />
        </linearGradient>
        <linearGradient id={id('grass')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e4e892" />
          <stop offset="30%" stopColor="#8fbe58" />
          <stop offset="68%" stopColor="#4e8a38" />
          <stop offset="100%" stopColor="#2a5c24" />
        </linearGradient>
        <linearGradient id={id('mist')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={id('soft')} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
      </defs>
      <rect width="400" height="320" fill={`url(#${id('sky')})`} />
      <rect width="400" height="150" fill={`url(#${id('wash')})`} />
      <circle cx="328" cy="36" r="28" fill="#ffe08a" opacity="0.22" />
      <circle cx="328" cy="34" r="13" fill={`url(#${id('sun')})`} />
      <g>
        <ellipse cx="58" cy="32" rx="22" ry="9" fill="#e7f1fa" />
        <ellipse cx="78" cy="26" rx="16" ry="10" fill="#f4fbff" />
        <ellipse cx="42" cy="30" rx="12" ry="7" fill="#d5e4f2" />
        <ellipse cx="168" cy="22" rx="16" ry="6" fill="#eef6fc" />
      </g>
      <path d="M0 118 L26 92 L58 108 L96 84 L136 106 L174 80 L214 104 L254 78 L294 100 L334 82 L372 98 L400 88 L400 136 L0 136 Z" fill={`url(#${id('far')})`} />
      <ellipse cx="200" cy="128" rx="180" ry="8" fill={`url(#${id('mist')})`} />
      <path d="M0 148 L0 124 L40 118 L78 134 L114 112 L152 132 L188 108 L226 128 L266 106 L308 126 L348 110 L400 122 L400 162 L0 162 Z" fill={`url(#${id('mid')})`} />
      <path d="M0 168 L0 142 L32 136 L70 152 L108 128 L146 148 L182 122 L220 146 L260 118 L304 142 L346 124 L400 136 L400 186 L0 186 Z" fill={`url(#${id('esc')})`} />
      <path d="M108 128 H146 M182 122 H220 M260 118 H304" stroke="#efe4d4" strokeWidth="1.3" opacity="0.5" />
      <g filter={`url(#${id('soft')})`}>
        <ellipse cx="236" cy="146" rx="14" ry="4" fill="#5c4a62" opacity="0.3" />
        <path d="M226 144 Q236 130 246 144 Z" fill="#c45a32" />
        <rect x="232" y="144" width="8" height="7" fill="#8a6848" />
      </g>
      <path d="M0 188 C70 168 120 196 180 174 C240 154 280 188 340 168 C370 158 386 176 400 166 L400 214 L0 214 Z" fill={`url(#${id('hill')})`} />
      <path d="M0 198 C90 184 150 206 400 176" fill="none" stroke="#f4f8d4" strokeWidth="2" opacity="0.35" />
      <path d="M0 206 C50 192 100 214 170 198 C240 182 290 210 400 192 L400 320 L0 320 Z" fill={`url(#${id('grass')})`} />
      <path d="M0 236 C80 220 140 248 220 228 C290 214 340 244 400 226" fill="none" stroke="#d7e86a" strokeWidth="7" opacity="0.28" strokeLinecap="round" />
      <path d="M0 278 C100 262 160 292 260 270 C320 256 360 286 400 272" fill="none" stroke="#1e4a22" strokeWidth="9" opacity="0.14" strokeLinecap="round" />
      <g>
        <rect x="16" y="168" width="5" height="24" rx="2" fill="#6b4428" />
        <ellipse cx="18" cy="162" rx="16" ry="8" fill="#245c28" />
        <ellipse cx="8" cy="168" rx="9" ry="6" fill="#3f8a3c" />
        <ellipse cx="30" cy="166" rx="9" ry="6" fill="#67b255" />
      </g>
      <g stroke="#245c28" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.7">
        <path d="M14 312 q3 -16 0 -30" />
        <path d="M26 316 q4 -14 0 -26" />
        <path d="M374 314 q-3 -14 1 -26" />
        <path d="M386 310 q2 -12 0 -22" />
      </g>
      <g>
        <circle cx="20" cy="292" r="2.6" fill="#ffd34d" />
        <circle cx="20" cy="292" r="1" fill="#b4560a" />
        <circle cx="372" cy="296" r="2.4" fill="#e24b6a" />
        <circle cx="384" cy="308" r="2" fill="#ffd34d" />
      </g>
      <Frame w={400} h={320} rx={26} />
    </svg>
  )
}

/** 2D runner backdrop: a golden-hour highland road. The middle of the lane
    stays open so the letter gates in front stay the thing you tap.
    One quiet edge — no corner jewels. */
export function LaneVista({ className = '' }) {
  const raw = useId().replace(/:/g, '')
  const id = (n) => `lane-${n}-${raw}`
  return (
    <svg data-scene="lane" className={`h-full w-full ${className}`} viewBox="0 0 400 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5d86bc" />
          <stop offset="28%" stopColor="#9ec0dc" />
          <stop offset="52%" stopColor="#f3d09a" />
          <stop offset="70%" stopColor="#fbe6c4" />
          <stop offset="100%" stopColor="#f6edd4" />
        </linearGradient>
        <radialGradient id={id('sun')} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fffce8" />
          <stop offset="40%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#f0a040" />
        </radialGradient>
        <linearGradient id={id('far')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c5d4e6" />
          <stop offset="100%" stopColor="#7e92b0" />
        </linearGradient>
        <linearGradient id={id('esc')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e4d2c4" />
          <stop offset="42%" stopColor="#b48978" />
          <stop offset="100%" stopColor="#6e534c" />
        </linearGradient>
        <linearGradient id={id('hill')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c6d96a" />
          <stop offset="100%" stopColor="#4e8a38" />
        </linearGradient>
        <linearGradient id={id('grass')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d7e888" />
          <stop offset="40%" stopColor="#6aaa44" />
          <stop offset="100%" stopColor="#2c6424" />
        </linearGradient>
        <linearGradient id={id('road')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3e2bc" />
          <stop offset="45%" stopColor="#d7b57a" />
          <stop offset="100%" stopColor="#a87844" />
        </linearGradient>
        <linearGradient id={id('verge')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8a5a32" />
          <stop offset="50%" stopColor="#e7d3a4" />
          <stop offset="100%" stopColor="#8a5a32" />
        </linearGradient>
      </defs>
      <rect width="400" height="640" fill={`url(#${id('sky')})`} />
      <circle cx="308" cy="168" r="54" fill="#ffe08a" opacity="0.28" />
      <circle cx="308" cy="168" r="22" fill={`url(#${id('sun')})`} />
      <g>
        <ellipse cx="58" cy="78" rx="32" ry="12" fill="#fff6ea" opacity="0.85" />
        <ellipse cx="84" cy="72" rx="20" ry="13" fill="#fff" opacity="0.8" />
        <ellipse cx="40" cy="82" rx="14" ry="8" fill="#f0e4d4" opacity="0.7" />
        <ellipse cx="168" cy="96" rx="22" ry="8" fill="#fff8ee" opacity="0.55" />
        <ellipse cx="188" cy="92" rx="14" ry="7" fill="#fff" opacity="0.6" />
      </g>
      {/* Far blue ridge, flat amba tops, a valley notch over the road. */}
      <path d="M0 248 L0 196 L28 188 L58 198 L58 176 L108 176 L108 194 L150 186 L186 200 L214 188 L214 174 L268 174 L268 192 L314 184 L352 198 L400 186 L400 248 Z" fill={`url(#${id('far')})`} />
      <path d="M58 176 H108 M214 174 H268" stroke="#f4f7fb" strokeWidth="1.4" opacity="0.55" />
      <ellipse cx="200" cy="236" rx="190" ry="14" fill="#fff" opacity="0.28" />
      {/* Warm escarpment in front of the blue, still flat-topped. */}
      <path d="M0 292 L0 228 L46 220 L78 236 L78 208 L132 208 L132 230 L178 218 L220 236 L258 214 L258 200 L320 200 L320 224 L366 214 L400 228 L400 300 Z" fill={`url(#${id('esc')})`} />
      <path d="M78 208 H132 M258 200 H320" stroke="#f6efe4" strokeWidth="1.6" opacity="0.5" />
      <path d="M96 230 L104 258 M286 226 L294 252" stroke="#5c463c" strokeWidth="1.2" opacity="0.28" />
      <ellipse cx="200" cy="286" rx="180" ry="12" fill="#fff6ea" opacity="0.35" />
      <path d="M0 318 C90 286 150 324 400 292 L400 360 L0 360 Z" fill={`url(#${id('hill')})`} />
      <path d="M0 348 C70 328 130 360 210 338 C290 316 340 352 400 332 L400 640 L0 640 Z" fill={`url(#${id('grass')})`} />
      <path d="M0 420 C100 400 160 440 260 414 C330 396 360 430 400 416" fill="none" stroke="#e4ee9a" strokeWidth="10" opacity="0.22" strokeLinecap="round" />
      <path d="M0 500 C120 478 180 520 280 492 C340 474 370 510 400 496" fill="none" stroke="#245c28" strokeWidth="12" opacity="0.12" strokeLinecap="round" />
      {/* Packed-earth road, lighter in the distance, darker at the feet. */}
      <path d="M168 332 L70 640 L330 640 L232 332 Z" fill={`url(#${id('road')})`} />
      <path d="M168 332 L70 640 L92 640 L178 332 Z" fill={`url(#${id('verge')})`} opacity="0.35" />
      <path d="M232 332 L330 640 L308 640 L222 332 Z" fill={`url(#${id('verge')})`} opacity="0.35" />
      <path d="M200 348 L200 628" stroke="#f7f0dc" strokeWidth="3" strokeDasharray="16 22" opacity="0.55" />
      <path d="M186 360 L112 630" stroke="rgba(255,248,230,0.35)" strokeWidth="2" />
      <path d="M214 360 L288 630" stroke="rgba(255,248,230,0.35)" strokeWidth="2" />
      {/* Edge acacia and a tukul, clear of the lane. */}
      <g>
        <rect x="28" y="300" width="6" height="34" rx="2" fill="#6b4428" />
        <ellipse cx="31" cy="292" rx="26" ry="9" fill="#2f6a32" />
        <ellipse cx="16" cy="300" rx="14" ry="7" fill="#3f8a3c" />
        <ellipse cx="48" cy="298" rx="14" ry="7" fill="#67b255" />
        <ellipse cx="26" cy="286" rx="10" ry="4" fill="#c6e6a4" opacity="0.55" />
      </g>
      <g>
        <ellipse cx="352" cy="318" rx="18" ry="4" fill="#5c4a38" opacity="0.25" />
        <path d="M336 314 Q352 286 368 314 Z" fill="#c45a32" />
        <path d="M342 302 Q352 286 362 302" fill="none" stroke="#e8c07a" strokeWidth="1.2" opacity="0.75" />
        <rect x="346" y="312" width="12" height="12" fill="#8a6848" />
      </g>
      <g stroke="#245c28" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8">
        <path d="M18 620 q3 -22 -1 -40" />
        <path d="M28 624 q4 -20 0 -36" />
        <path d="M372 618 q-3 -18 1 -34" />
        <path d="M384 622 q2 -16 -1 -30" />
      </g>
      <g>
        <circle cx="36" cy="560" r="3.4" fill="#ffd34d" />
        <circle cx="36" cy="560" r="1.3" fill="#b4560a" />
        <circle cx="48" cy="578" r="2.4" fill="#fff" />
        <circle cx="358" cy="552" r="3" fill="#e24b6a" />
        <circle cx="372" cy="570" r="2.4" fill="#ffd34d" />
      </g>
      <Frame w={400} h={640} rx={28} />
    </svg>
  )
}

/** A hairline on the trace vellum. No corner jewels — the letter is the focus. */
export function TraceChrome() {
  return (
    <span data-scene="trace" aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span
        className="absolute inset-2 rounded-[1.25rem]"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(140, 112, 72, 0.28)' }}
      />
    </span>
  )
}
