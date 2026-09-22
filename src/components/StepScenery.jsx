/* Authored scenery for Letter Steps and the 2D runner lane.
   Highland miniatures in the manuscript palette (champagne gold frame,
   madder / lapis / malachite jewels, ochre sun). Local SVG only.
   Static on purpose: no looping motion, so reduced-motion stays quiet.
   The step machine and the runner machine are not involved. */
import { useId } from 'react'

function Frame({ w, h, rx = 22 }) {
  const gems = [
    [18, 18, '#c0453a'],
    [w - 18, 18, '#3f63a0'],
    [18, h - 18, '#3f8f4a'],
    [w - 18, h - 18, '#e2c069'],
  ]
  return (
    <g>
      <rect x="6" y="6" width={w - 12} height={h - 12} rx={rx} fill="none" stroke="#e2c069" strokeWidth="2.8" />
      <rect x="11" y="11" width={w - 22} height={h - 22} rx={Math.max(8, rx - 5)} fill="none" stroke="#a9832f" strokeWidth="1.1" opacity="0.85" />
      {gems.map(([x, y, fill]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="4.2" fill={fill} stroke="#e2c069" strokeWidth="1.15" />
          <circle cx={x - 1.1} cy={y - 1.1} r="1.25" fill="#fff8dc" opacity="0.85" />
        </g>
      ))}
    </g>
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
      <path d="M0 70 C18 78 28 92 34 256 L0 256 Z" fill={`url(#${id('bank')})`} />
      <path d="M400 70 C382 78 372 92 366 256 L400 256 Z" fill={`url(#${id('bank')})`} />
      <path d="M0 86 C16 96 24 110 22 140" fill="none" stroke="#e4f0a4" strokeWidth="2" opacity="0.45" />
      <path d="M400 86 C384 96 376 110 378 140" fill="none" stroke="#e4f0a4" strokeWidth="2" opacity="0.45" />
      <g stroke="#1f5c28" strokeWidth="1.7" fill="none" strokeLinecap="round">
        <path d="M18 150 q3 -16 0 -28" />
        <path d="M26 168 q4 -18 1 -32" />
        <path d="M374 156 q-3 -14 0 -26" />
        <path d="M382 174 q-4 -16 -1 -30" />
      </g>
      <g>
        <path d="M332 58 L340 46 L348 58 Z" fill="#c45a32" />
        <rect x="336" y="58" width="8" height="7" fill="#8a6848" />
      </g>
      <Frame w={400} h={256} rx={24} />
    </svg>
  )
}

/** ECHO / SHUFFLE: a quiet lawn the letter cards and Anbessa sit on.
    The middle stays open so the gold tiles keep their contrast. */
export function FeedMeadow({ className = '' }) {
  const raw = useId().replace(/:/g, '')
  const id = (n) => `fed-${n}-${raw}`
  return (
    <svg data-scene="feed" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0c56a" />
          <stop offset="70%" stopColor="#f7e7c8" />
          <stop offset="100%" stopColor="#d5e8f8" />
        </linearGradient>
        <linearGradient id={id('grass')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d7e86e" />
          <stop offset="35%" stopColor="#7eb84e" />
          <stop offset="100%" stopColor="#3a7a32" />
        </linearGradient>
        <radialGradient id={id('lawn')} cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor="#e7f0a4" stopOpacity="0.55" />
          <stop offset="70%" stopColor="#e7f0a4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('hill')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9aa6c8" />
          <stop offset="100%" stopColor="#6a789c" />
        </linearGradient>
      </defs>
      <rect width="400" height="320" fill={`url(#${id('grass')})`} />
      <rect width="400" height="78" fill={`url(#${id('sky')})`} />
      <circle cx="330" cy="28" r="14" fill="#ffe9a0" />
      <ellipse cx="54" cy="24" rx="20" ry="8" fill="#eef6fc" />
      <ellipse cx="74" cy="20" rx="14" ry="7" fill="#fff" opacity="0.85" />
      <path d="M0 70 L24 46 L58 62 L98 40 L140 58 L184 36 L228 56 L274 38 L318 54 L360 40 L400 52 L400 86 L0 86 Z" fill={`url(#${id('hill')})`} opacity="0.9" />
      <ellipse cx="200" cy="78" rx="160" ry="8" fill="#fff" opacity="0.28" />
      <path d="M0 96 C80 78 140 104 220 86 C300 70 350 98 400 82 L400 120 L0 120 Z" fill="#8fbe58" />
      <ellipse cx="200" cy="150" rx="150" ry="70" fill={`url(#${id('lawn')})`} />
      <path d="M0 250 C90 230 150 268 240 244 C310 226 350 260 400 242" fill="none" stroke="#2f6a28" strokeWidth="8" opacity="0.12" strokeLinecap="round" />
      <g>
        <rect x="22" y="58" width="5" height="22" rx="2" fill="#6b4428" />
        <ellipse cx="24" cy="54" rx="16" ry="8" fill="#2f6a32" />
        <ellipse cx="14" cy="60" rx="9" ry="6" fill="#4e9a48" />
        <ellipse cx="34" cy="58" rx="8" ry="5" fill="#67b255" />
      </g>
      <g>
        <path d="M348 62 L360 46 L372 62 Z" fill="#c45a32" />
        <rect x="354" y="62" width="12" height="10" fill="#8a6848" />
      </g>
      <g stroke="#245c28" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.75">
        <path d="M16 310 q3 -18 0 -34" />
        <path d="M28 314 q4 -16 0 -30" />
        <path d="M372 312 q-3 -16 1 -30" />
        <path d="M384 308 q2 -14 0 -26" />
      </g>
      <g>
        <circle cx="22" cy="286" r="3.2" fill="#ffd34d" />
        <circle cx="22" cy="286" r="1.2" fill="#b4560a" />
        <circle cx="36" cy="300" r="2.2" fill="#fff" opacity="0.8" />
        <circle cx="368" cy="292" r="2.8" fill="#e24b6a" />
        <circle cx="382" cy="304" r="2.2" fill="#ffd34d" />
      </g>
      <Frame w={400} h={320} rx={26} />
    </svg>
  )
}

/** 2D runner backdrop: the same highland road, quiet enough that the
    gold gates in front stay the thing you tap. */
export function LaneVista({ className = '' }) {
  const raw = useId().replace(/:/g, '')
  const id = (n) => `lane-${n}-${raw}`
  return (
    <svg data-scene="lane" className={`h-full w-full ${className}`} viewBox="0 0 400 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8923a" />
          <stop offset="16%" stopColor="#f6c56a" />
          <stop offset="42%" stopColor="#f4e0bc" />
          <stop offset="70%" stopColor="#9ec4ea" />
          <stop offset="100%" stopColor="#e7f4ff" />
        </linearGradient>
        <linearGradient id={id('far')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b7c6e4" />
          <stop offset="100%" stopColor="#7f93b8" />
        </linearGradient>
        <linearGradient id={id('esc')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d2b8c4" />
          <stop offset="100%" stopColor="#6e586c" />
        </linearGradient>
        <linearGradient id={id('grass')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c6de78" />
          <stop offset="100%" stopColor="#2f6a28" />
        </linearGradient>
        <linearGradient id={id('road')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0e0b8" />
          <stop offset="100%" stopColor="#c4a36a" />
        </linearGradient>
      </defs>
      <rect width="400" height="640" fill={`url(#${id('sky')})`} />
      <circle cx="318" cy="78" r="28" fill="#ffe08a" />
      <circle cx="318" cy="78" r="46" fill="#ffe08a" opacity="0.25" />
      <ellipse cx="70" cy="64" rx="26" ry="11" fill="#fff" opacity="0.9" />
      <ellipse cx="94" cy="58" rx="16" ry="9" fill="#f7fbff" />
      <path d="M0 210 L40 160 L84 190 L130 148 L176 186 L224 140 L274 178 L324 146 L370 176 L400 158 L400 240 L0 240 Z" fill={`url(#${id('far')})`} />
      <path d="M0 248 L36 214 L80 240 L128 200 L176 236 L230 196 L286 234 L340 202 L400 228 L400 280 L0 280 Z" fill={`url(#${id('esc')})`} />
      <path d="M128 200 H176 M230 196 H286" stroke="#efe4d4" strokeWidth="1.5" opacity="0.5" />
      <ellipse cx="200" cy="268" rx="180" ry="12" fill="#fff" opacity="0.28" />
      <path d="M0 300 C80 270 140 310 400 268 L400 640 L0 640 Z" fill={`url(#${id('grass')})`} />
      <path d="M118 300 L92 640 L308 640 L282 300 Z" fill={`url(#${id('road')})`} />
      <path d="M200 320 V620" stroke="#e2c069" strokeWidth="4" strokeDasharray="16 18" opacity="0.85" />
      <path d="M148 340 L132 630" stroke="#fff8dc" strokeWidth="2" opacity="0.35" />
      <path d="M252 340 L268 630" stroke="#fff8dc" strokeWidth="2" opacity="0.35" />
      <g>
        <rect x="36" y="286" width="7" height="36" rx="2" fill="#6b4428" />
        <ellipse cx="40" cy="278" rx="22" ry="10" fill="#245c28" />
        <ellipse cx="26" cy="288" rx="12" ry="7" fill="#3f8a3c" />
        <ellipse cx="54" cy="286" rx="12" ry="7" fill="#67b255" />
      </g>
      <g>
        <path d="M330 292 L346 270 L362 292 Z" fill="#c45a32" />
        <rect x="338" y="292" width="16" height="14" fill="#8a6848" />
      </g>
      <g>
        <circle cx="48" cy="560" r="4" fill="#ffd34d" />
        <circle cx="48" cy="560" r="1.5" fill="#b4560a" />
        <circle cx="352" cy="548" r="3.4" fill="#e24b6a" />
        <circle cx="366" cy="572" r="2.6" fill="#ffd34d" />
      </g>
      <Frame w={400} h={640} rx={28} />
    </svg>
  )
}

/** Corner jewels and a gold fillet over the trace vellum. Sits in the
    pad's margin so the letter and the finger path stay clear. */
export function TraceChrome() {
  const gems = [
    ['left-1.5 top-1.5', '#c0453a'],
    ['right-1.5 top-1.5', '#3f63a0'],
    ['left-1.5 bottom-1.5', '#3f8f4a'],
    ['right-1.5 bottom-1.5', '#e2c069'],
  ]
  return (
    <span data-scene="trace" aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span
        className="absolute inset-1.5 rounded-[1.35rem]"
        style={{ boxShadow: 'inset 0 0 0 2px rgba(226,192,105,0.95), inset 0 0 0 4px rgba(169,131,47,0.35)' }}
      />
      {gems.map(([pos, fill]) => (
        <span
          key={pos}
          className={`absolute h-3 w-3 rounded-full ${pos}`}
          style={{
            background: `radial-gradient(circle at 35% 32%, #fff8dc, ${fill} 58%, #5c3a08)`,
            boxShadow: '0 0 0 1.5px #e2c069',
          }}
        />
      ))}
    </span>
  )
}
