/* eslint-disable react-refresh/only-export-components */
/* Shared result / "what next" screens for the quiz family (level complete,
   fix-it gate / ready / cap) in the toy-brick look: the sunrise brick world
   behind a cream wooden sign, big glossy buttons below. All text stays
   i18n at the call sites; this file only draws. */
import { BrickScreen, roundBtnCss } from './brickKit'
import { sceneStyle } from './brickRoundKit'
import { shade } from './blockArt'

const TONES = { go: '#43b02e', sky: '#2f86d6', wood: '#a8672f' }
export const RESULT_INK = '#5a3414'
export const RESULT_MUTED = '#8a6a44'

export function BrickResultScreen({ testId, above, children, actions }) {
  return (
    <BrickScreen testId={testId}>
      <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden" style={sceneStyle}>
        <div className="mx-auto flex min-h-full w-full max-w-sm flex-col items-center justify-center gap-4 px-5 py-6">
          {above}
          <div className="relative w-full rounded-3xl px-5 py-5 text-center"
            style={{ background: 'linear-gradient(180deg,#fff8e2,#f4dfb0)', border: '5px solid #8a5426', color: RESULT_INK,
              boxShadow: 'inset 0 4px 0 rgba(255,255,255,.6), 0 7px 0 #5a3414, 0 14px 20px rgba(0,0,0,.35)' }}>
            {children}
          </div>
          {actions && <div className="flex w-full flex-col gap-3">{actions}</div>}
        </div>
      </div>
    </BrickScreen>
  )
}

/** Wide glossy button (same gloss as the round kit buttons). */
export function BrickCta({ tone = 'go', onClick, children, testId, ...rest }) {
  const base = TONES[tone] || TONES.go
  return (
    <button type="button" onClick={onClick} data-testid={testId} {...rest}
      className="chunk flex min-h-[56px] w-full items-center justify-center rounded-2xl px-6 py-3 text-base font-black uppercase tracking-wide text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white"
      style={{ ...roundBtnCss(base), textShadow: `0 2px 0 ${shade(base, -0.45)}`, '--chunk-depth': '4px' }}>
      {children}
    </button>
  )
}

/** A small cream stat tile (label + value). */
export function BrickStat({ label, children }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: 'rgba(138,84,38,.12)', border: '3px solid #c9a36a', boxShadow: 'inset 0 2px 0 rgba(255,255,255,.5)' }}>
      <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: RESULT_MUTED }}>{label}</p>
      {children}
    </div>
  )
}
