/* End-of-run summary shared by the 3D runner and its 2D fallback. A run now
   has a fixed length (RUNNER_LEVELS), so it ends either FINISHED (every boss
   beaten) or DESTROYED (Jibby won a boss) - both land here with the score. */
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { RUNNER_LEVELS, RunnerState, loadRunnerBest, runnerAccuracy } from '../FidelQuestApp'
import { RUNNER_CAST } from './runnerCast'
import { t } from '../platform/i18n'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'

function Stat({ label, value, color }) {
  return (
    <div className="rounded-2xl border-2 p-3" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
      <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      <p className="mono flex items-center justify-center gap-1 text-2xl font-black" style={{ color }}>
        {value}
      </p>
    </div>
  )
}

export default function RunnerSummary({ ctx, onRetry, onExit, placeName }) {
  const finished = ctx.status === RunnerState.FINISHED
  const best = loadRunnerBest()
  const isBest = ctx.fed >= best.fed && ctx.fed > 0
  const levelsBeaten = finished ? RUNNER_LEVELS : ctx.level - 1
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-5 py-10 text-center" data-testid="runner-summary">
      <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 14 }}>
        <img src={finished ? RUNNER_CAST.anbessaFront : RUNNER_CAST.jibbyFront} alt="" draggable={false} style={{ height: 120, width: 'auto' }} />
      </motion.div>
      <h1 className="mt-5 text-3xl font-black uppercase tracking-wide" style={{ color: finished ? 'var(--go-ink)' : 'var(--bad-ink)' }}>
        {finished ? t('runFinished', 'Run complete!') : t('munched', 'Munched!')}
      </h1>
      <p className="mt-2 max-w-xs font-bold" style={{ color: 'var(--muted)' }}>
        {finished
          ? t('runFinishedBody', `Anbessa outran Jibby through all ${RUNNER_LEVELS} levels!`, { n: RUNNER_LEVELS })
          : t('runDestroyedBody', `Jibby the hyena caught Anbessa${placeName ? ` in ${placeName}` : ''} (level ${ctx.level}). Feed him more correct letters to keep him strong!`, { level: ctx.level, place: placeName || '' })}
      </p>

      <div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-3">
        <Stat
          label={t('runLettersFed', 'Letters fed')}
          color="var(--go-ink)"
          value={
            <>
              <Sparkles className="h-5 w-5" style={{ color: 'var(--star)' }} aria-hidden="true" />
              {ctx.fed}
            </>
          }
        />
        <Stat label={t('accuracy', 'Accuracy')} color="var(--sky)" value={`${runnerAccuracy(ctx)}%`} />
        <Stat label={t('runLevels', 'Levels')} color="var(--accent)" value={`${levelsBeaten}/${RUNNER_LEVELS}`} />
        <Stat label={isBest ? t('runNewBest', 'New best!') : t('runBest', 'Best')} color="var(--accent)" value={Math.max(best.fed, ctx.fed)} />
      </div>

      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
        <button type="button" onClick={onRetry} className={`chunk min-h-[52px] w-full rounded-2xl py-4 text-base font-black uppercase text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 4px 0 var(--go-deep, var(--go))', '--chunk-depth': '4px' }}>
          {t('runAgain', 'Run again')}
        </button>
        <button type="button" onClick={() => onExit({ level: ctx.level, survivedBoss: ctx.survivedBoss, finished })} className={`chunk min-h-[52px] w-full rounded-2xl border-2 py-4 text-base font-black uppercase ${FOCUS}`} style={{ background: 'var(--card)', borderColor: 'var(--line)', boxShadow: '0 4px 0 var(--line)', '--chunk-depth': '4px' }}>
          {t('home', 'Home')}
        </button>
      </div>
    </div>
  )
}
