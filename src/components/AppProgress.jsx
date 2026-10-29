/* App-level progress surfaces, all reading ONE store (platform/appProgress):
     AppProgressChip   the home-screen bar: activities tried out of all
     AppProgressSheet  the kid sheet the chip opens (icons + numbers first)
     AppProgressPanel  the same breakdown, reused inside Grown-Ups
   Text goes through t(key, fallback); no Latin hint is ever printed beside a
   fidel (there are no fidel on these surfaces at all). */
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Check, Clock, Compass, Star, X } from 'lucide-react'
import { t } from '../platform/i18n'
import { useAppProgress } from './useAppProgress'

const FOCUS = 'focus-visible:outline-3 focus-visible:outline-offset-2'

function groupLabels() {
  return {
    learn: t('apGroupLearn', 'Lessons'),
    games: t('apGroupGames', 'Games'),
    read: t('apGroupRead', 'Reading'),
    explore: t('apGroupExplore', 'Explore'),
  }
}

function areaLabels() {
  return {
    stone: t('apAreaStone', 'New letters'),
    lesson: t('apAreaLesson', 'Quiz'),
    findfidel: t('apAreaFind', 'Find the letter'),
    wordbuild: t('apAreaWordBuild', 'Word build'),
    'review-node': t('apAreaReview', 'Review'),
    warmup: t('apAreaWarmup', 'Warm-up'),
    hunt: t('apAreaHunt', 'Daily Hunt'),
    arcade: t('apAreaArcade', 'Arcade'),
    practice: t('apAreaPractice', 'Practice'),
    words: t('wordsShort', 'First Words'),
    workshop: t('workshopShort', 'Build'),
    ladder: t('ladderShort', 'Order'),
    train: t('trainShort', 'Vowel Train'),
    echo: t('echoShort', 'Echo Match'),
    market: t('wordMarketShort', 'Word Market'),
    bingo: t('bingoShort', 'Bingo'),
    twins: t('twinsShort', 'Twins'),
    beats: t('beatsShort', 'Kebero Beats'),
    traffic: t('trShort', 'Traffic'),
    blocks: t('blockChurchShort', 'Block Church'),
    brickwords: t('wordBricksShort', 'Word Bricks'),
    tower: t('towerShort', 'Letter Tower'),
    stories: t('storiesShort', 'Stories'),
    prayer: 'ጸሎት',
    explore: t('explorerShort', 'Explorer'),
    name: t('apAreaName', 'My Name'),
    postcard: t('apAreaPostcard', 'Postcard'),
    family: t('apAreaFamily', 'Family'),
    familyvoice: t('apAreaFamilyVoice', 'Family voices'),
    closet: t('closetShort', 'Closet'),
  }
}

function Bar({ value, total, testId }) {
  const pct = total ? Math.max(0, Math.min(100, Math.round((value / total) * 100))) : 0
  return (
    <span className="relative block h-2.5 min-w-0 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--line)' }} data-testid={testId} data-pct={pct} aria-hidden="true">
      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: 'var(--go)', transition: 'width 500ms ease' }} />
    </span>
  )
}

/** Home screen: one slim bar + "tried/total". Tap opens the sheet. */
export function AppProgressChip({ onClick }) {
  const s = useAppProgress()
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="app-progress"
      aria-label={t('apChipLabel', `App progress: ${s.tried} of ${s.total} activities tried`, { n: s.tried, total: s.total })}
      className={`relative flex min-h-[28px] basis-full items-center gap-2 rounded-full px-1 before:absolute before:-inset-x-1 before:-inset-y-[9px] before:content-[''] ${FOCUS}`}
      style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}
    >
      <Compass className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden="true" />
      <Bar value={s.tried} total={s.total} testId="app-progress-bar" />
      <span className="mono shrink-0 text-xs font-black tabular-nums" data-testid="app-progress-count">{s.tried}/{s.total}</span>
      {s.today.areas > 0 && <Star className="h-3.5 w-3.5 shrink-0" fill="currentColor" style={{ color: 'var(--star)' }} data-testid="app-progress-today" aria-hidden="true" />}
    </button>
  )
}

/** The ጸሎት (Prayer Book) tracker: icons + numbers only, so no Latin sits
    beside the fidel title. Full wording lives in aria-labels via t(). */
function PrayerTracker({ prayer }) {
  if (!prayer) return null
  const minLabel = t('apPrayerMin', '{n} minutes this week', { n: prayer.minutes })
  const pageLabel = t('apPrayerPages', '{n} pages turned', { n: prayer.pages })
  return (
    <div data-testid="ap-prayer" data-tried={prayer.tried || undefined} className="mt-3 flex min-w-0 items-center gap-3 rounded-2xl border-2 px-3 py-2" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
      <span className="geez text-lg font-black" lang="am">ጸሎት</span>
      <span className="mono ml-auto flex items-center gap-1 text-base font-black tabular-nums" role="img" aria-label={minLabel}>
        <Clock className="h-4 w-4" style={{ color: 'var(--accent)' }} aria-hidden="true" /><span data-testid="ap-prayer-min">{prayer.minutes}</span>
      </span>
      <span className="mono flex items-center gap-1 text-base font-black tabular-nums" role="img" aria-label={pageLabel}>
        <BookOpen className="h-4 w-4" style={{ color: 'var(--go)' }} aria-hidden="true" /><span data-testid="ap-prayer-pages">{prayer.pages}</span>
      </span>
    </div>
  )
}

function Stat({ icon, value, label, testId }) {
  return (
    <div className="min-w-0 rounded-2xl border-2 p-2.5 text-center" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
      <p className="mono flex items-center justify-center gap-1 text-lg font-black tabular-nums" data-testid={testId}>{icon}{value}</p>
      <p className="text-[11px] font-black leading-tight" style={{ color: 'var(--muted)' }}>{label}</p>
    </div>
  )
}

/** The full breakdown: totals + every area with its own count. */
export function AppProgressPanel({ summary }) {
  const live = useAppProgress()
  const s = summary || live
  const groups = groupLabels()
  const areas = areaLabels()
  const accuracy = s.answers ? `${Math.round((s.correct / s.answers) * 100)}%` : '—'
  return (
    <div data-testid="app-progress-panel">
      <div className="grid grid-cols-3 gap-2">
        <Stat testId="ap-stat-tried" icon={<Compass className="h-4 w-4" style={{ color: 'var(--accent)' }} aria-hidden="true" />} value={`${s.tried}/${s.total}`} label={t('apTried', 'Tried')} />
        <Stat testId="ap-stat-done" icon={<Check className="h-4 w-4" style={{ color: 'var(--go)' }} aria-hidden="true" />} value={s.done} label={t('apFinished', 'Finished')} />
        <Stat testId="ap-stat-today" icon={<Star className="h-4 w-4" fill="currentColor" style={{ color: 'var(--star)' }} aria-hidden="true" />} value={s.today.answers} label={t('apToday', 'Answers today')} />
      </div>
      <p className="mt-2 text-center text-xs font-bold" style={{ color: 'var(--muted)' }}>
        {t('apAccuracy', `Accuracy ${accuracy}`, { pct: accuracy })}
      </p>
      <PrayerTracker prayer={s.prayer} />
      <div className="mt-3 flex flex-col gap-3">
        {s.groups.map((g) => (
          <section key={g.id} data-testid={`ap-group-${g.id}`}>
            <h3 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{groups[g.id]}</h3>
            <ul className="mt-1 grid grid-cols-2 gap-1.5">
              {g.areas.map((a) => (
                <li key={a.id} data-testid={`ap-area-${a.id}`} data-tried={a.tried || undefined} className="flex min-h-[36px] min-w-0 items-center gap-1.5 rounded-xl px-2 py-1" style={{ background: a.tried ? 'var(--card)' : 'transparent', border: '2px solid var(--line)', opacity: a.tried ? 1 : 0.6 }}>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: a.tried ? 'var(--go)' : 'var(--line)', color: '#fff' }} aria-hidden="true">
                    {a.tried && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className={`min-w-0 flex-1 break-words text-xs leading-tight font-extrabold ${/[ሀ-፼]/.test(areas[a.id]) ? 'geez' : ''}`}>{areas[a.id]}</span>
                  {(a.done > 0 || a.answers > 0) && <span className="mono shrink-0 text-[11px] font-black tabular-nums" style={{ color: 'var(--muted)' }}>{a.done > 0 ? `✓${a.done}` : a.answers}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

/** Kid sheet opened from the home chip. Follows the .fq-modal contract. */
export function AppProgressSheet({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <motion.div className="fq-modal fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'var(--overlay)', overscrollBehavior: 'none', touchAction: 'pan-y' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} data-testid="app-progress-sheet">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t('apTitle', 'My progress')}
        className="w-full max-w-md rounded-3xl p-5"
        style={{ background: 'var(--paper)' }}
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="min-w-0 text-xl font-black leading-tight">{t('apTitle', 'My progress')}</h2>
          <button type="button" onClick={onClose} aria-label={t('apClose', 'Close')} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <AppProgressPanel />
      </motion.div>
    </motion.div>
  )
}
