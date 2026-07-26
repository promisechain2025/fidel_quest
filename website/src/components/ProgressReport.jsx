/* The rendered progress report - shared by /progress (a decoded card) and
   /family (a saved snapshot). Pure presentation. */
import { Flame, CalendarDays } from 'lucide-react'
import { Card } from '../components.jsx'
import { FAMILIES } from '../fidelData.js'
import { TOTAL_LETTERS } from '../progressCard.js'
import { t } from '../i18n.js'

export default function ProgressReport({ snap }) {
  const pct = Math.round((snap.letters / TOTAL_LETTERS) * 100)
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
        <span className="font-black">/ {TOTAL_LETTERS} {t('prpLetters', 'letters learned')}</span>
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
        {FAMILIES.map((f, i) => {
          const done = snap.mask[i] === '1'
          return (
            <span key={f.name} title={`${f.name}${done ? '' : ' - not yet'}`}
              className="lt geez"
              style={{
                width: 34, height: 34, fontSize: 17,
                ...(done ? {} : { background: 'var(--card)', color: 'var(--muted)', borderColor: 'var(--line)', boxShadow: 'none', opacity: 0.55 }),
              }}>
              {f.chars[0]}
            </span>
          )
        })}
      </div>
      <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
        {t('prpLegend', 'Gold tiles are learned families; each one is 7 letters mastered through play.')}
      </p>
    </Card>
  )
}
