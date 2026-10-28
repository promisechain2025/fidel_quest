/* The rendered progress report - shared by /progress (a decoded card) and
   /family (a saved snapshot). Pure presentation. */
import { Flame, CalendarDays } from 'lucide-react'
import { Card } from '../components.jsx'
import { FAMILIES } from '../fidelData.js'
import { APP_GROUP_SIZES, QHE_AFTER, QHE_CHARS } from '../progressCard.js'
import { t } from '../i18n.js'

export default function ProgressReport({ snap }) {
  // A Tigrinya card has one more family (ቐ, right after Qe); Family snapshots are Amharic-length.
  const tiles = FAMILIES.map((f) => ({ key: f.name, ch: f.chars[0] }))
  if (snap.mask.length === tiles.length + 1) tiles.splice(QHE_AFTER + 1, 0, { key: 'Qhe', ch: QHE_CHARS[0] })
  const totalLetters = tiles.length * 7
  const pct = Math.round((snap.letters / totalLetters) * 100)
  return (
    <Card className="text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="display-3">{snap.name ? t('prpFor', '{n}’s fidel journey', { n: snap.name }).replace('{n}', snap.name) : t('prpTitle', 'Fidel journey progress')}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--muted)' }}>
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {t('prpAsOf', 'as of')} {snap.day}
          </p>
        </div>
        {snap.streak > 0 && (
          <span className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-black"
            style={{ background: 'var(--go-soft)', color: 'var(--go-ink)', border: '2px solid var(--go)' }}>
            <Flame className="h-4 w-4" aria-hidden="true" /> {snap.streak} {t('prpStreak', 'day streak')}
          </span>
        )}
      </div>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="display-2" style={{ color: 'var(--accent)' }}>{snap.letters}</span>
        <span className="font-black">/ {totalLetters} {t('prpLetters', 'letters learned')}</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--tile))' }} />
      </div>
      <p className="mt-1 text-xs font-bold" style={{ color: 'var(--muted)' }}>
        {snap.nodesDone} / {snap.nodesTotal} {t('prpSteps', 'journey steps complete')} · {pct}%
      </p>

      <h3 className="mt-6 text-xs font-black uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
        {t('prpFamilies', 'Letter families')}
      </h3>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {tiles.map((f, i) => {
          const done = snap.mask[i] === '1'
          return (
            <span key={f.key} data-done={done ? '1' : '0'}
              className="lt geez"
              style={{
                width: 34, height: 34, fontSize: 17,
                ...(done ? {} : { background: 'var(--card)', color: 'var(--muted)', borderColor: 'var(--line)', boxShadow: 'none', opacity: 0.55 }),
              }}>
              {f.ch}
            </span>
          )
        })}
      </div>
      <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
        {t('prpLegend', 'Gold tiles are learned families; each one is 7 letters mastered through play.')}
      </p>
      {snap.apps && <AppLevel snap={snap} />}
    </Card>
  )
}

const GROUP_LABELS = () => [
  t('prpGLearn', 'Learn'), t('prpGGames', 'Games'), t('prpGRead', 'Read'), t('prpGExplore', 'Explore'),
]

/* The app-level tracker (everything the child has tried across the app) and
   the ጸሎት tracker. Counts only - a card never carries answers or times. */
function AppLevel({ snap }) {
  const total = snap.apps.length
  const tried = [...snap.apps].filter((c) => c === '1').length
  const pct = Math.round((tried / total) * 100)
  const labels = GROUP_LABELS()
  let at = 0
  const groups = APP_GROUP_SIZES.map((n, i) => {
    const part = snap.apps.slice(at, at + n)
    at += n
    return { label: labels[i], n, tried: [...part].filter((c) => c === '1').length }
  })
  return (
    <div data-testid="prp-app-level">
      <h3 className="mt-6 text-xs font-black uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
        {t('prpAppTitle', 'Across the whole app')}
      </h3>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="display-2" style={{ color: 'var(--accent)' }} data-testid="prp-app-tried">{tried}</span>
        <span className="font-black">/ {total} {t('prpAppTried', 'places explored')}</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--tile))' }} />
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {groups.map((g) => (
          <li key={g.label} className="rounded-xl px-3 py-2 text-sm font-black" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
            <span className="block text-xs font-bold" style={{ color: 'var(--muted)' }}>{g.label}</span>
            <span className="tabular-nums">{g.tried} / {g.n}</span>
          </li>
        ))}
      </ul>
      <div data-testid="prp-prayer" className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl px-3 py-2.5"
        style={{ background: 'var(--card)', border: '2px solid var(--line)' }}>
        <span className="geez text-xl font-black" lang="am">ጸሎት</span>
        <span className="text-sm font-bold" data-testid="prp-prayer-min">{snap.prayerMin} {t('prpPrayerMin', 'minutes this week')}</span>
        <span className="text-sm font-bold" data-testid="prp-prayer-pages">{snap.prayerPages} {t('prpPrayerPages', 'pages turned')}</span>
      </div>
    </div>
  )
}
