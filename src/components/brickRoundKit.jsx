/* eslint-disable react-refresh/only-export-components */
/* ============================================================================
   BRICK ROUND KIT - the round-based pieces (levels, streak, end-of-round
   summary) in the brick look, shared by Word Market, Mix and the quiz.
   Guide text is i18n (t(key, English)); numbers are dots, not words; fidel
   chips never carry a Latin label or a gloss.
   ========================================================================== */
import { motion, useReducedMotion } from 'framer-motion'
import { Star, Lock, Flame, Unlock, ArrowRight, RotateCcw, Check, Volume2 } from 'lucide-react'
import { t } from '../platform/i18n'
import { publicUrl } from '../platform/publicUrl'
import AnbessaSvg from './AnbessaSvg'
import { BrickPicture, GuideSign, RoundButton, Pips, roundBtnCss, woodBtnCss, BRICK_COLORS } from './brickKit'
import { shade } from './blockArt'

export const SCENE = publicUrl('/img/games/brick-sunrise.webp')
export const sceneStyle = { background: `#f7c9a0 url(${SCENE}) center bottom / cover no-repeat` }

/** Level buttons: n dots per level (language-free), stars below, padlock when locked. */
export function BrickLevels({ max, current, unlocked, playable = max, best = {}, onPick }) {
  return (
    <div className="flex items-center justify-center gap-2.5" role="group" aria-label={t('echoLevels', 'Levels')}>
      {Array.from({ length: max }, (_, i) => i + 1).map((lv) => {
        const open = lv <= unlocked && lv <= playable
        const on = lv === current
        const bg = on ? '#2f86d6' : open ? '#f2c230' : '#9aa3ad'
        return (
          <button key={lv} type="button" disabled={!open} aria-pressed={on}
            aria-label={`${t('echoLevel', 'Level')} ${lv}${open ? '' : ` (${t('echoLocked', 'locked')})`}`}
            onClick={() => onPick(lv)} data-testid={`level-${lv}`}
            className="flex h-[54px] w-[54px] flex-col items-center justify-center gap-0.5 rounded-full"
            style={{ ...roundBtnCss(bg), opacity: open ? 1 : 0.75, transform: on ? 'translateY(-2px) scale(1.08)' : 'none' }}>
            {open
              ? (<><Pips n={lv} size={6} color={on ? '#fff' : '#7a4a10'} />
                <span className="flex gap-px" aria-hidden="true">{[0, 1, 2].map((i) => <Star key={i} className="h-2.5 w-2.5" strokeWidth={2} color="#c4841c" fill={i < (best[lv] || 0) ? '#ffd23a' : 'rgba(255,255,255,.45)'} />)}</span></>)
              : <Lock className="h-5 w-5" color="#fff" strokeWidth={3} aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}

/** First-try streak: gold stars in a wooden pill (flame badge from 3). */
export function BrickStreak({ streak }) {
  const reduce = useReducedMotion()
  return (
    <div className="flex h-9 min-w-[40px] items-center justify-center gap-1 rounded-full px-3" role="status" aria-label={`${t('echoStreak', 'Streak')} ${streak}`}
      style={{ background: 'rgba(30,60,110,.35)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,.3)', opacity: streak ? 1 : 0.55 }}>
      {streak === 0 && <Star className="h-5 w-5" color="#fff" strokeWidth={2.5} fill="rgba(255,255,255,.25)" aria-hidden="true" />}
      {Array.from({ length: Math.min(streak, 6) }, (_, i) => (
        <motion.span key={i} initial={reduce ? false : { scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
          <Star className="h-6 w-6" fill="#ffd23a" color="#e0971c" strokeWidth={2} aria-hidden="true" />
        </motion.span>
      ))}
      {streak >= 3 && <span className="ml-1 flex items-center text-sm font-black text-white"><Flame className="h-4 w-4" color="#ff8a24" fill="#ffb347" aria-hidden="true" />{streak}</span>}
    </div>
  )
}

/** A word/letter chip in the summary: a studded brick you can tap to hear. */
export function BrickChip({ label, geez, picture, good, onHear, i = 0 }) {
  const color = good ? '#4fb04a' : BRICK_COLORS[(i + 1) % 2 ? 1 : 0]
  const big = Array.from(label).length <= 1
  return (
    <button type="button" onClick={onHear} aria-label={`${label}. ${t('echoTapHear', 'Tap to hear')}`} data-testid="chip" data-good={good ? '1' : '0'}
      className="geez relative flex min-h-[64px] min-w-[64px] items-center justify-center gap-1 rounded-xl px-2.5 font-black text-white"
      style={{ background: `linear-gradient(180deg, ${shade(color, 0.14)}, ${color})`, border: `2px solid ${shade(color, -0.4)}`, boxShadow: `inset 0 3px 0 rgba(255,255,255,.35), 0 5px 0 ${shade(color, -0.45)}, 0 8px 10px rgba(0,0,0,.25)`, fontSize: big ? 32 : 22, textShadow: `0 2px 0 ${shade(color, -0.4)}` }}>
      {(picture || geez) ? <BrickPicture geez={geez} emoji={picture} size={34} /> : null}
      {label}
      <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full" style={roundBtnCss(good ? '#2e9a28' : '#2f86d6')} aria-hidden="true">
        {good ? <Check className="h-3.5 w-3.5" color="#fff" strokeWidth={4} /> : <Volume2 className="h-3.5 w-3.5" color="#fff" strokeWidth={3} />}
      </span>
    </button>
  )
}

/** End-of-round summary on a wooden board over the scene. Icons carry most of the meaning. */
export function BrickSummary({ summary, unlockedNew, canNext, atMax, belowUnlock, item, onHear, onNext, onAgain, onDone, testId = 'game-summary' }) {
  const reduce = useReducedMotion()
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-3 px-4" data-testid={testId}>
      <div className="flex w-full flex-col items-center gap-3 rounded-[28px] px-3 pb-5 pt-3" style={{ ...woodBtnCss, border: '5px solid #8a5426', boxShadow: 'inset 0 4px 0 rgba(255,255,255,.35), inset 0 -5px 8px rgba(0,0,0,.25), 0 8px 0 #5a3414, 0 16px 22px rgba(0,0,0,.35)' }}>
        <AnbessaSvg size={104} mood="happy" pose={summary.passed ? 'cheer' : undefined} />
        <div className="flex gap-1.5" aria-label={`${summary.stars} / 3`} role="img">
          {[0, 1, 2].map((i) => (
            <motion.span key={i} initial={reduce ? false : { scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ delay: reduce ? 0 : 0.2 + i * 0.18, type: 'spring', stiffness: 300, damping: 12 }}>
              <Star className="h-14 w-14" fill={i < summary.stars ? '#ffd23a' : 'rgba(255,255,255,.4)'} color={i < summary.stars ? '#e0971c' : '#c9a56a'} strokeWidth={2} style={{ filter: i < summary.stars ? 'drop-shadow(0 0 6px #fff59a)' : 'none' }} aria-hidden="true" />
            </motion.span>
          ))}
        </div>
        <span className="flex items-center gap-1 rounded-full px-3 py-1 text-lg font-black text-white" style={{ background: 'rgba(30,60,110,.45)' }} aria-label={`${t('echoStreak', 'Streak')} ${summary.bestStreak}`}>
          <Flame className="h-5 w-5" color="#ff8a24" fill="#ffb347" aria-hidden="true" />{summary.bestStreak}
        </span>
        {summary.mastered.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3" aria-label={t('echoMastered', 'You know these')}>{summary.mastered.map((id, i) => <BrickChip key={id} {...item(id)} i={i} good onHear={() => onHear(id)} />)}</div>
        )}
        {summary.practice.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 rounded-2xl px-3 py-2" style={{ background: 'rgba(90,52,20,.25)', boxShadow: 'inset 0 3px 6px rgba(0,0,0,.3)' }} aria-label={t('brickPractice', 'Practise these')}>
            {summary.practice.map((id, i) => <BrickChip key={id} {...item(id)} i={i} good={false} onHear={() => onHear(id)} />)}
          </div>
        )}
      </div>
      {unlockedNew ? <GuideSign icon={Unlock} tone="ok" text={t('echoUnlocked', 'New level unlocked!')} />
        : !summary.passed && !atMax && belowUnlock ? <GuideSign icon={Lock} tone="try" text={t('brickKeepGoing', 'Try again to open the next level')} /> : null}
      <div className="flex items-center justify-center gap-4 rounded-full px-4 py-2" style={{ ...woodBtnCss, borderRadius: 999 }}>
        <RoundButton onClick={onDone} label={t('orderDone', 'Done')} testId="done" color="#f6e6c4" border="#c49a5a"><Check className="h-8 w-8" color="#2e7a1e" strokeWidth={3.6} aria-hidden="true" /></RoundButton>
        <RoundButton onClick={onAgain} label={t('matchAgain', 'Again!')} testId="again" color="#2f86d6"><RotateCcw className="h-7 w-7" color="#fff" strokeWidth={3} aria-hidden="true" /></RoundButton>
        {canNext && <RoundButton onClick={onNext} label={t('echoNext', 'Next level')} testId="next" color="#43b02e"><ArrowRight className="h-8 w-8" color="#fff" strokeWidth={3.6} aria-hidden="true" /></RoundButton>}
      </div>
    </div>
  )
}
