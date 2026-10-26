/* Quiz play view in the shared toy-brick look (Quiz levels, School Path unit
   quizzes, Warm-up, Star Practice, fix-it drills and challenges all play
   through it). Pure presentation: the Lesson owns the state machine and the
   audio, so game logic and recordings are untouched.
   The child HEARS a letter and taps its fidel brick. Guide text is i18n
   (English fallback); there is never a Latin sound label or gloss next to a
   fidel - the speaker button replays the existing recording instead. */
import { motion, useReducedMotion } from 'framer-motion'
import { Ear, Hand, Check, X, Volume2, ArrowRight, Sparkles } from 'lucide-react'
import { t } from '../platform/i18n'
import AnbessaSvg from './AnbessaSvg'
import { KokebSvg } from './KokebSvg'
import { BrickScreen, WoodTopBar, WoodBottomBar, RoundButton, GuideSign } from './brickKit'
import { BrickStreak, sceneStyle } from './brickRoundKit'
import { brickCss, studCss, shade } from './blockArt'

// Resting bricks avoid red/green: those two colours are reserved for answers.
const QUIZ_COLORS = ['#2f86d6', '#f2c230', '#7a4fc9', '#f08a24', '#d94f9a', '#16a4b8']

function OptionBrick({ ch, index, state, disabled, onPick, tut }) {
  const reduce = useReducedMotion()
  const base = state === 'correct' ? '#43b02e' : state === 'wrong' ? '#e2453c' : state === 'dim' ? '#a9b4be' : QUIZ_COLORS[index % QUIZ_COLORS.length]
  const sz = 22
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onPick}
      data-tut={tut}
      data-state={state}
      aria-label={ch}
      animate={reduce ? {} : state === 'wrong' ? { x: [0, -9, 9, -6, 6, 0] } : state === 'correct' ? { scale: [1, 1.08, 1] } : {}}
      transition={{ duration: 0.4 }}
      whileTap={disabled || reduce ? undefined : { y: 4 }}
      className="geez relative flex h-[122px] select-none items-center justify-center rounded-2xl text-[70px] font-black leading-none text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white"
      style={{
        ...brickCss(base, 7),
        opacity: state === 'dim' ? 0.8 : 1,
        textShadow: `0 3px 0 ${shade(base, -0.4)}`,
        ...(state === 'wrong' ? { border: '4px solid #fff', outline: '3px solid #e2453c' } : null),
        marginTop: sz * 0.5,
      }}
    >
      {[0.28, 0.72].map((x) => (
        <span key={x} className="absolute" style={{ top: -sz * 0.5, left: `${x * 100}%`, transform: 'translateX(-50%)', ...studCss(base, sz) }} />
      ))}
      {ch}
      {state === 'correct' && <Check className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full bg-white p-0.5" style={{ color: '#2e7a1e' }} strokeWidth={4} aria-hidden="true" />}
      {state === 'wrong' && <X className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full bg-white p-0.5" style={{ color: '#c4281f' }} strokeWidth={4} aria-hidden="true" />}
    </motion.button>
  )
}

export default function BrickQuizPlay({ ctx, status, question, progress, formOf, presenting, feedback, onQuit, onPick, onHear, onContinue, children }) {
  const success = status === 'success'
  const error = status === 'error'
  const lastWrong = ctx.wrongPicks[ctx.wrongPicks.length - 1]
  const tone = success ? 'ok' : error ? 'try' : 'guide'
  const text = success ? (ctx.streak >= 3 ? t('amazing', `Amazing! ${ctx.streak} in a row!`, { n: ctx.streak }) : t('nice', 'Nice!'))
    : error ? t('notQuite', 'Not quite!')
      : presenting ? t('listen', 'Listen…') : t('brickQuizGuide', 'Tap the letter you hear')
  const icon = success ? Check : error ? Hand : presenting ? Ear : Sparkles
  return (
    <BrickScreen testId="brick-quiz">
      <div className="relative min-h-0 overflow-hidden" style={{ flex: '1 1 auto', ...sceneStyle }}>
        <WoodTopBar onBack={onQuit} value={progress.answered} total={progress.total} done={false} />
        <div className="pointer-events-none absolute inset-x-0 top-[62px] z-30 flex justify-center">
          <GuideSign icon={icon} tone={tone} text={text} />
        </div>
        <div className="absolute inset-x-0 bottom-0 top-[124px] flex flex-col items-center gap-3 px-4 pb-6">
          <div className="flex w-full items-end justify-center gap-5 pt-1">
            <motion.span animate={presenting ? { rotate: [0, -6, 0, 6, 0] } : {}} transition={{ duration: 1.6, repeat: presenting ? Infinity : 0 }} aria-hidden="true">
              <KokebSvg size={78} />
            </motion.span>
            <RoundButton onClick={onHear} label={t('hearIt', 'Hear it again')} color="#2f86d6" testId="quiz-hear" className="!h-[84px] !w-[84px]">
              <Volume2 className="h-11 w-11" color="#fff" strokeWidth={3} aria-hidden="true" />
            </RoundButton>
            <AnbessaSvg size={86} mood={error ? 'worried' : 'happy'} />
          </div>
          <div className="flex w-full flex-1 items-center justify-center pb-2">
          <div className="grid w-full max-w-[352px] grid-cols-2 gap-x-5 gap-y-7" role="group" aria-label={t('whichLetter', 'Which letter says')} data-testid="quiz-options">
            {question?.options.map((key, i) => {
              const isTarget = key === question.target
              const isWrongPick = ctx.wrongPicks.includes(key)
              const state = success && isTarget ? 'correct' : error && key === lastWrong ? 'wrong' : isWrongPick ? 'dim' : 'rest'
              return (
                <OptionBrick key={`${ctx.cursor}-${key}`} ch={formOf(key).char} index={i} state={state}
                  disabled={presenting || feedback || isWrongPick} onPick={() => onPick(key)} tut={`opt-${key}`} />
              )
            })}
          </div>
          </div>
        </div>
        {children}
      </div>
      <WoodBottomBar>
        <span className="flex w-16 justify-start"><BrickStreak streak={ctx.streak} /></span>
        <span className="flex h-14 items-center justify-center" aria-hidden="true">
          <span className="text-sm font-black text-[#fff3d6]" style={{ textShadow: '0 2px 0 #5a3414' }}>{progress.answered}/{progress.total}</span>
        </span>
        <span className="flex w-16 justify-end">
          {feedback ? (
            <RoundButton onClick={onContinue} label={success ? t('continue', 'Continue') : t('gotIt', 'Got it')} color="#43b02e" testId="quiz-continue" className="!h-14 !w-14">
              <span data-tut="continue" className="flex"><ArrowRight className="h-8 w-8" color="#fff" strokeWidth={3.5} aria-hidden="true" /></span>
            </RoundButton>
          ) : <span className="h-14 w-14" aria-hidden="true" />}
        </span>
      </WoodBottomBar>
    </BrickScreen>
  )
}
