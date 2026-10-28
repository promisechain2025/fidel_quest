/* ============================================================================
   PRACTICE REPORT — Parents area screen
   ----------------------------------------------------------------------------
   Today's verified minutes vs the goal, a 7-day chart and table, the streak,
   a tamper-evident share link (+ QR) for the teacher, and the class-view
   join (class code + the child's first name only). Grown-up area: t() with
   English fallbacks, same as Grown-Ups / Teacher Mode.
   ========================================================================== */
import { useEffect, useState } from 'react'
import { ChevronLeft, Share2, Users, Flame } from 'lucide-react'
import { t } from '../platform/i18n'
import { lastDays, activeMinutes, prayerMinutes, practiceStreak, loadPractice, setPracticeGoal, flagCount } from '../platform/practice'
import { currentPracticeDays, subscribePractice } from '../platform/practiceTracker'
import { reportPayload, reportUrl, checkCode } from '../platform/practiceReport'
import { loadSync, joinClassSync, leaveSync, flushSync, apiBase } from '../platform/practiceSync'
import { appLinkUrl } from '../platform/appLink'
import { dayStamp } from '../platform/streak'
import { RingSvg } from './PracticeRing'
import { GoalPicker, ReportTable } from './ClassPractice'
import { QrPanel, shareUrl } from './TeacherMode'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const card = { background: 'var(--card)', borderColor: 'var(--line)' }
const H2 = ({ children }) => <h2 className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{children}</h2>
const nickname = () => { try { return (localStorage.getItem('fq.nickname') || '').trim() } catch { return '' } }

export function WeekChart({ rows, goal, width = 320, height = 140 }) {
  const max = Math.max(goal || 0, ...rows.map((r) => activeMinutes(r)), 10)
  const bw = width / rows.length
  const y = (m) => height - 18 - (m / max) * (height - 30)
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={t('prChart', 'Active minutes, last 7 days')} data-testid="week-chart">
      {goal ? <line x1="0" x2={width} y1={y(goal)} y2={y(goal)} stroke="var(--go)" strokeDasharray="4 4" strokeWidth="2" /> : null}
      {rows.map((r, i) => {
        const m = activeMinutes(r)
        const top = y(m)
        return (
          <g key={r.day}>
            <rect x={i * bw + bw * 0.2} y={top} width={bw * 0.6} height={Math.max(0, height - 18 - top)} rx="5" fill={goal && m >= goal ? 'var(--go)' : 'var(--accent)'} />
            <text x={i * bw + bw / 2} y={top - 3} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--ink)">{m || ''}</text>
            <text x={i * bw + bw / 2} y={height - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--muted)">{r.day.slice(8)}</text>
          </g>
        )
      })}
    </svg>
  )
}

function ClassJoin() {
  const [sync, setSync] = useState(loadSync())
  const [code, setCode] = useState('')
  const [name, setName] = useState(nickname())
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  if (!apiBase()) return null
  const join = async () => {
    setBusy(true); setMsg('')
    const r = await joinClassSync(code, name)
    setBusy(false)
    if (r.ok) { setSync(loadSync()); flushSync() } else setMsg(r.error === 'unknown-class' ? t('prUnknownClass', 'No class with that code. Check it with the teacher.') : r.error === 'offline' ? t('prOffline', 'No connection. Try again when online.') : t('prJoinFail', 'Could not join. Check the code and name.'))
  }
  return (
    <section className="rounded-3xl border-2 p-4" style={card}>
      <H2><Users className="mr-1 inline h-4 w-4" />{t('prClassTitle', 'Teacher\'s class view')}</H2>
      {sync ? (
        <div className="mt-2 text-sm font-semibold">
          <p>{t('prJoinedAs', 'Sharing daily practice as {name} with class {code}.', { name: sync.name, code: sync.code })}</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{sync.lastSyncAt ? t('prLastSync', 'Last sent: {when}', { when: new Date(sync.lastSyncAt).toLocaleString() }) : t('prNotYet', 'Waiting to send (works offline; sends when online).')}</p>
          <button type="button" onClick={() => { leaveSync(); setSync(null) }} className={`mt-2 text-xs font-extrabold ${FOCUS}`} style={{ color: 'var(--bad-ink)', outlineColor: 'var(--sky)' }}>{t('prLeave', 'Stop sharing with this class')}</button>
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>{t('prClassHint', 'Type the teacher\'s join code. Only the first name below and the class code are shared, plus daily practice numbers.')}</p>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={12} placeholder={t('prCode', 'Class code')} className="min-h-[44px] rounded-xl border-2 px-3 font-black tracking-widest" style={{ background: 'var(--paper)', borderColor: 'var(--line)' }} />
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={16} placeholder={t('prFirstName', 'First name or nickname')} className="min-h-[44px] rounded-xl border-2 px-3 font-bold" style={{ background: 'var(--paper)', borderColor: 'var(--line)' }} />
          {msg && <p className="text-sm font-bold" style={{ color: 'var(--bad-ink)' }} role="alert">{msg}</p>}
          <button type="button" disabled={busy} onClick={join} className={`chunk min-h-[44px] rounded-2xl px-4 font-black text-white ${FOCUS}`} style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px', outlineColor: 'var(--accent)' }}>{t('prJoin', 'Join class')}</button>
        </div>
      )}
    </section>
  )
}

export default function PracticeReport({ onBack, today: todayProp }) {
  const today = todayProp || dayStamp()
  const [, setRev] = useState(0)
  useEffect(() => subscribePractice(() => setRev((n) => (n + 1) % 1e6)), [])
  const [goal, setGoal] = useState(loadPractice().goal)
  const [share, setShare] = useState(null)
  const [copied, setCopied] = useState(false)
  const days = currentPracticeDays()
  const rows = lastDays(days, today, 7)
  const todayRow = rows[6]
  const sync = loadSync()
  const makeShare = async () => {
    const url = await reportUrl(reportPayload({ name: nickname() || sync?.name || '?', code: sync?.code || '', goal, days, today }), appLinkUrl())
    setShare({ url, check: checkCode(url.split('#report=')[1]) })
  }
  const tableDays = rows.map((r) => ({ day: r.day, minutes: activeMinutes(r), prayer: prayerMinutes(r), sessions: r.sessions, items: r.items, answered: r.answered, correct: r.correct, lessons: r.lessons, games: r.games, flags: flagCount(r) }))
  return (
    <div className="mx-auto min-h-dvh max-w-xl md:max-w-2xl px-5 pb-12 pt-6 fq-safe" data-testid="practice-report">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label={t('back', 'Back')} className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </button>
        <div>
          <h1 className="text-xl font-black leading-tight">{t('prTitle', 'Practice report')}</h1>
          <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>{t('prSub', 'Active time only - idle, hidden or locked time is not counted')}</p>
        </div>
      </header>
      <div className="mt-6 flex flex-col gap-5">
        <section className="flex items-center gap-4 rounded-3xl border-2 p-4" style={card}>
          <div className="relative">
            <RingSvg minutes={activeMinutes(todayRow)} goal={goal || 0} size={92} stroke={10} />
            <span className="absolute inset-0 flex items-center justify-center text-xl font-black tabular-nums">{activeMinutes(todayRow)}′</span>
          </div>
          <div className="text-sm font-bold">
            <p className="text-lg font-black">{goal ? t('prToday', 'Today: {m} of {g} min', { m: activeMinutes(todayRow), g: goal }) : t('prTodayNoGoal', 'Today: {m} min', { m: activeMinutes(todayRow) })}</p>
            <p style={{ color: 'var(--sky)' }} data-testid="prayer-today">{t('prPrayerToday', 'incl. {p} min on prayer pages', { p: prayerMinutes(todayRow) })}</p>
            <p style={{ color: 'var(--muted)' }}>{t('prTodayDetail', '{s} sessions · {i} practiced', { s: todayRow.sessions, i: todayRow.items })}</p>
            <p className="mt-1 flex items-center gap-1" style={{ color: 'var(--accent)' }}><Flame className="h-4 w-4" fill="currentColor" />{t('prStreak', '{n}-day practice streak', { n: practiceStreak(days, today) })}</p>
          </div>
        </section>
        <section className="rounded-3xl border-2 p-4" style={card}>
          <H2>{t('prWeek', 'Last 7 days')}</H2>
          <div className="mt-2"><WeekChart rows={rows} goal={goal} /></div>
          <div className="mt-2 overflow-x-auto"><ReportTable days={tableDays} goal={goal} /></div>
        </section>
        <section className="rounded-3xl border-2 p-4" style={card}>
          <H2>{t('prGoalTitle', 'Daily goal')}</H2>
          <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--muted)' }}>{sync ? t('prGoalTeacher', 'Set by the teacher\'s class; it updates on the next sync.') : t('prGoalHint', 'Usually comes from the teacher\'s class link. The child sees a ring on the home screen.')}</p>
          <GoalPicker value={goal} onChange={(g) => setGoal(setPracticeGoal(g))} />
        </section>
        <section className="rounded-3xl border-2 p-4" style={card}>
          <H2>{t('prShareTitle', 'Send to the teacher')}</H2>
          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>{t('prShareHint', 'Makes a signed link of the last 7 days. If anyone edits the numbers, the teacher\'s app shows it as not verified.')}</p>
          {!share ? (
            <button type="button" onClick={makeShare} className={`chunk mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--go)', boxShadow: '0 3px 0 var(--go-deep)', '--chunk-depth': '3px', outlineColor: 'var(--sky)' }}>
              <Share2 className="h-5 w-5" />{t('prMakeShare', 'Make report link')}
            </button>
          ) : (
            <div className="mt-3 flex flex-col items-center gap-2">
              <QrPanel url={share.url} size={180} />
              <p className="text-sm font-black tabular-nums" data-testid="check-code">{t('ptCheckCode', 'Check code')}: {share.check}</p>
              <button type="button" onClick={() => shareUrl(share.url, t('prShareText', 'eGeez practice report:'), () => { setCopied(true); setTimeout(() => setCopied(false), 2000) })} className={`chunk flex items-center gap-2 rounded-2xl px-4 py-3 font-black text-white ${FOCUS}`} style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px', outlineColor: 'var(--accent)' }}>
                <Share2 className="h-5 w-5" />{copied ? t('linkCopied', 'Link copied!') : t('prShareBtn', 'Share link')}
              </button>
            </div>
          )}
        </section>
        <ClassJoin />
      </div>
    </div>
  )
}
