/* ============================================================================
   GAME KIT — shared UI for the learning games (Echo Match, Vowel Train,
   Word Market, Kebero Beats)
   ----------------------------------------------------------------------------
   One look and one contract for every round, so the games stay small and
   consistent: a header, level pills (stars per level, locked levels show a
   padlock), a first-try streak row, an "example" moment (letter + word +
   picture) and the end-of-round summary (stars, % right first time, best
   streak, items known / to practise - tap any to hear it - unlock notice,
   Next / Again / Done). No reading is required: every state has an icon.
   All targets are >= 44px; reduced motion drops springs and loops.
   ========================================================================== */
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronLeft, Volume2, Lock, LockOpen, Star, RotateCcw, ArrowRight, Check, Flame, Timer } from 'lucide-react'
import { t } from '../platform/i18n'
import { FOCUS } from '../FidelQuestApp'
import AnbessaSvg from './AnbessaSvg'
import WordPicture from './Pictures'
import { UNLOCK_ACCURACY } from '../platform/roundProgress'
import { GO_BTN, PLAIN_BTN } from '../platform/gameUi'

export function GameHeader({ title, onBack }) {
  return (
    <header className="flex items-center gap-2">
      <button type="button" onClick={onBack} aria-label={t('back', 'Back')} className={`flex h-11 w-11 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
        <ChevronLeft className="h-6 w-6" aria-hidden="true" />
      </button>
      <h1 className="flex-1 text-center text-lg font-black">{title}</h1>
      <div className="w-11" />
    </header>
  )
}

/** Level 1..max pills. `timed` marks the expert level with a clock. */
export function LevelPills({ max, current, unlocked, playable = max, best = {}, timed = [], onPick }) {
  return (
    <div className="flex items-center justify-center gap-2" role="group" aria-label={t('echoLevels', 'Levels')}>
      {Array.from({ length: max }, (_, i) => i + 1).map((lv) => {
        const open = lv <= unlocked && lv <= playable
        const on = lv === current
        return (
          <button
            key={lv}
            type="button"
            disabled={!open}
            aria-pressed={on}
            aria-label={`${t('echoLevel', 'Level')} ${lv}${open ? '' : ` (${t('echoLocked', 'locked')})`}`}
            onClick={() => onPick(lv)}
            className={`flex h-11 min-w-[52px] flex-col items-center justify-center rounded-xl px-2 leading-none ${FOCUS}`}
            style={{ background: on ? 'var(--sky)' : 'var(--card)', color: on ? '#fff' : 'var(--muted)', border: `2px solid ${on ? 'var(--sky)' : 'var(--line)'}`, opacity: open ? 1 : 0.5, outlineColor: 'var(--sky)' }}
          >
            {open ? (
              <>
                <span className="flex items-center gap-0.5 text-base font-black">{timed.includes(lv) ? <Timer className="h-4 w-4" aria-hidden="true" /> : null}{lv}</span>
                <span className="mt-0.5 flex" aria-hidden="true">
                  {[0, 1, 2].map((i) => <Star key={i} className="h-2.5 w-2.5" fill={i < (best[lv] || 0) ? 'currentColor' : 'none'} />)}
                </span>
              </>
            ) : <Lock className="h-4 w-4" aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}

/** First-try streak: a star per answer in a row, a flame badge from 3. */
export function StreakStars({ streak }) {
  const reduce = useReducedMotion()
  return (
    <div className="flex h-8 items-center justify-center gap-1" aria-label={`${t('echoStreak', 'Streak')} ${streak}`} role="status">
      {Array.from({ length: Math.min(streak, 8) }, (_, i) => (
        <motion.span key={i} initial={reduce ? false : { scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }}>
          <Star className="h-6 w-6" style={{ color: 'var(--accent)' }} fill="currentColor" aria-hidden="true" />
        </motion.span>
      ))}
      {streak >= 3 && (
        <motion.span key={`combo-${streak}`} initial={reduce ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="ml-1 flex items-center rounded-full px-2 text-sm font-black text-white" style={{ background: 'var(--accent)' }}>
          <Flame className="h-4 w-4" aria-hidden="true" />×{streak}
        </motion.span>
      )}
    </div>
  )
}

/** A tappable item chip for the summary (a letter or a short word). */
export function ItemChip({ label, good, onHear, picture = null }) {
  const big = Array.from(label).length <= 1
  return (
    <button
      type="button"
      onClick={onHear}
      aria-label={`${label}. ${t('echoTapHear', 'Tap to hear')}`}
      className={`geez relative flex h-14 min-w-[56px] items-center justify-center gap-1 rounded-2xl px-2 font-black ${big ? 'text-3xl' : 'text-xl'} ${FOCUS}`}
      style={{ background: 'var(--card)', border: `3px solid ${good ? 'var(--go)' : 'var(--accent)'}`, outlineColor: 'var(--sky)' }}
    >
      {picture ? <WordPicture emoji={picture} size={30} /> : null}
      {label}
      <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ background: good ? 'var(--go)' : 'var(--accent)' }} aria-hidden="true">
        {good ? <Check className="h-3.5 w-3.5" /> : <Volume2 className="h-3 w-3" />}
      </span>
    </button>
  )
}

/** The after-answer moment: the item, an example word and its picture.
    Tapping it hears them again. Reserve its slot so the board never jumps. */
export function ExampleSlot({ example, onTap, wide }) {
  const reduce = useReducedMotion()
  return (
    <div className="flex min-h-[64px] items-center justify-center md:min-h-[80px]">
      <AnimatePresence>
        {example && (
          <motion.button
            type="button"
            key={example.id}
            onClick={onTap}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            aria-label={`${example.glyph}${example.word ? ` - ${example.word.geez}` : ''}`}
            data-testid="game-example"
            className={`flex min-h-[44px] items-center gap-3 rounded-3xl px-4 py-1.5 ${FOCUS}`}
            style={{ background: 'var(--card)', border: '3px solid var(--go)', outlineColor: 'var(--sky)' }}
          >
            <span className="geez text-4xl font-black" style={{ color: 'var(--go)' }}>{example.glyph}</span>
            {example.word && (
              <>
                <WordPicture emoji={example.word.picture} size={wide ? 64 : 48} />
                <span className="geez text-2xl font-black">{example.word.geez}</span>
              </>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * End-of-round summary.
 *  summary: { accuracy, stars, passed, bestStreak, mastered, practice }
 *  item(id) -> { label, picture? } ; onHear(id)
 */
export function RoundSummary({ summary, unlockedNew, canNext, atMax, belowUnlock, timeUp = false, item, onHear, onNext, onAgain, onDone, wide, testId = 'game-summary' }) {
  const reduce = useReducedMotion()
  const pct = Math.round(summary.accuracy * 100)
  return (
    <div className="flex w-full flex-col items-center gap-4" data-testid={testId}>
      <AnbessaSvg size={wide ? 130 : 96} mood="happy" pose={summary.passed ? 'cheer' : undefined} />
      <div className="flex gap-1" aria-label={`${summary.stars} / 3`} role="img">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} initial={reduce ? false : { scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ delay: reduce ? 0 : 0.2 + i * 0.18, type: 'spring', stiffness: 300, damping: 12 }}>
            <Star className="h-12 w-12 md:h-16 md:w-16" style={{ color: i < summary.stars ? 'var(--accent)' : 'var(--line)' }} fill="currentColor" aria-hidden="true" />
          </motion.span>
        ))}
      </div>
      <p className="text-center text-sm font-extrabold" style={{ color: 'var(--muted)' }}>
        {timeUp ? `${t('echoTimeUp', 'Time!')} · ` : ''}{pct}% {t('echoFirstTry', 'right first time')} · <Flame className="inline h-4 w-4" aria-hidden="true" /> {summary.bestStreak}
      </p>
      {summary.mastered.length > 0 && (
        <section className="flex w-full flex-col items-center gap-2">
          <h2 className="flex items-center gap-1 text-sm font-black" style={{ color: 'var(--go)' }}><Check className="h-4 w-4" aria-hidden="true" />{t('echoMastered', 'You know these')}</h2>
          <div className="flex flex-wrap justify-center gap-3">{summary.mastered.map((id) => <ItemChip key={id} {...item(id)} good onHear={() => onHear(id)} />)}</div>
        </section>
      )}
      {summary.practice.length > 0 && (
        <section className="flex w-full flex-col items-center gap-2">
          <h2 className="flex items-center gap-1 text-sm font-black" style={{ color: 'var(--accent)' }}><RotateCcw className="h-4 w-4" aria-hidden="true" />{t('echoPractice', 'Practise these - they come back next round')}</h2>
          <div className="flex flex-wrap justify-center gap-3">{summary.practice.map((id) => <ItemChip key={id} {...item(id)} good={false} onHear={() => onHear(id)} />)}</div>
        </section>
      )}
      {unlockedNew ? (
        <motion.p initial={reduce ? false : { scale: 0.6 }} animate={{ scale: 1 }} className="flex items-center gap-2 text-base font-black" style={{ color: 'var(--go)' }}>
          <LockOpen className="h-6 w-6" aria-hidden="true" />{t('echoUnlocked', 'New level unlocked!')}
        </motion.p>
      ) : !summary.passed && !atMax && belowUnlock ? (
        <p className="flex max-w-xs items-center gap-2 text-center text-sm font-extrabold" style={{ color: 'var(--muted)' }}>
          <Lock className="h-5 w-5 shrink-0" aria-hidden="true" />{t('echoNeed', 'Get {pct}% right first time to open the next level').replace('{pct}', String(Math.round(UNLOCK_ACCURACY * 100)))}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-3">
        {canNext && (
          <button type="button" onClick={onNext} className={`chunk flex min-h-[48px] items-center gap-2 rounded-2xl px-5 py-3 font-black ${FOCUS}`} style={GO_BTN}>
            <ArrowRight className="h-5 w-5" aria-hidden="true" />{t('echoNext', 'Next level')}
          </button>
        )}
        <button type="button" onClick={onAgain} className={`chunk flex min-h-[48px] items-center gap-2 rounded-2xl px-5 py-3 font-black ${FOCUS}`} style={canNext ? PLAIN_BTN : GO_BTN}>
          <RotateCcw className="h-5 w-5" aria-hidden="true" />{t('matchAgain', 'Again!')}
        </button>
        <button type="button" onClick={onDone} className={`chunk flex min-h-[48px] items-center gap-2 rounded-2xl px-5 py-3 font-black ${FOCUS}`} style={PLAIN_BTN}>
          <Check className="h-5 w-5" aria-hidden="true" />{t('orderDone', 'Done')}
        </button>
      </div>
    </div>
  )
}

/** Shown when the child's letter pool is too small for a board. */
export function NeedMore({ onBack, children }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {children}
      <p className="max-w-xs text-base font-black" style={{ color: 'var(--muted)' }}>
        {t('gameNeedMore', 'Learn a few more letters, then come back and play!')}
      </p>
      <button type="button" onClick={onBack} className={`chunk min-h-[48px] rounded-2xl px-5 py-3 font-black ${FOCUS}`} style={GO_BTN}>
        {t('orderDone', 'Done')}
      </button>
    </div>
  )
}
