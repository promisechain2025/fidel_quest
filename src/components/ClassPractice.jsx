/* ============================================================================
   CLASS PRACTICE — teacher side of verified practice tracking
   ----------------------------------------------------------------------------
   - GoalPicker: the daily practice goal that rides in class links.
   - ClassPracticeCard: the class-view dashboard. Signs in with the existing
     eGeez teacher account (api/ JWT, verified email), creates a class with a
     server join code, shares it as a #class= link (+ QR) that also switches
     on sync on the child's profile, and lists every student's verified
     minutes vs goal, practice count, accuracy and flags per day or week.
   - ReportViewer: opens a parent's #report= link and checks its signature.
   Grown-up area: follows Teacher Mode conventions (t() with fallbacks).
   ========================================================================== */
import { useCallback, useEffect, useState } from 'react'
import { BookOpen, BarChart3, ShieldCheck, ShieldAlert, Flag, LogOut, Plus, RefreshCw } from 'lucide-react'
import { t } from '../platform/i18n'
import { apiBase } from '../platform/practiceSync'
import { classUrl } from '../platform/classroom'
import { appLinkUrl } from '../platform/appLink'
import { verifyReport } from '../platform/practiceReport'
import { prevDay, dayStamp } from '../platform/streak'
import { QrPanel } from './TeacherMode'

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'
const AUTH_KEY = 'fq.teacherAuth.v1'
export const GOAL_CHOICES = [15, 20, 30, 45, 60, 90]

const btn = (tone = 'go') => ({
  background: `var(--${tone})`, boxShadow: `0 3px 0 var(--${tone}-deep)`, '--chunk-depth': '3px', outlineColor: 'var(--sky)',
})
const input = 'min-h-[44px] w-full rounded-xl border-2 px-3 py-2 font-bold'
const inputStyle = { background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)' }

export function GoalPicker({ value, onChange }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{t('ptGoalLabel', 'Daily practice goal (minutes)')}</p>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup">
        {GOAL_CHOICES.map((g) => (
          <button key={g} type="button" role="radio" aria-checked={value === g} onClick={() => onChange(value === g ? null : g)}
            className={`min-h-[44px] min-w-[52px] rounded-xl border-2 px-3 text-sm font-black tabular-nums ${FOCUS}`}
            style={value === g ? { background: 'var(--go-soft)', borderColor: 'var(--go)', color: 'var(--go-ink)', outlineColor: 'var(--sky)' } : { background: 'var(--paper)', borderColor: 'var(--line)', outlineColor: 'var(--sky)' }}>
            {g}
          </button>
        ))}
      </div>
    </div>
  )
}

function loadAuth() {
  try { const a = JSON.parse(localStorage.getItem(AUTH_KEY)); return a?.token ? a : null } catch { return null }
}
function saveAuth(a) {
  try { if (a) localStorage.setItem(AUTH_KEY, JSON.stringify(a)); else localStorage.removeItem(AUTH_KEY) } catch { /* ignore */ }
}

export async function api(path, { token, method = 'GET', body, base = apiBase(), fetchImpl = globalThis.fetch } = {}) {
  const res = await fetchImpl(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) { const e = new Error(data.error || `HTTP ${res.status}`); e.status = res.status; e.code = data.code; throw e }
  return data
}

function SignIn({ onIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const go = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const r = await api('/api/auth/login', { method: 'POST', body: { email, password } })
      if (r.user?.role !== 'teacher') throw new Error(t('ptNotTeacher', 'This account is not a teacher account.'))
      saveAuth({ token: r.token, name: r.user.name, email: r.user.email })
      onIn()
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={go} className="mt-3 flex flex-col gap-2">
      <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>{t('ptSignInHint', 'Sign in with your eGeez teacher account to see every student\'s practice in one place.')}</p>
      <input className={input} style={inputStyle} type="email" autoComplete="email" placeholder={t('ptEmail', 'Email')} value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className={input} style={inputStyle} type="password" autoComplete="current-password" placeholder={t('ptPassword', 'Password')} value={password} onChange={(e) => setPassword(e.target.value)} />
      {err && <p className="text-sm font-bold" style={{ color: 'var(--bad-ink)' }} role="alert">{err}</p>}
      <button type="submit" disabled={busy} className={`chunk min-h-[44px] rounded-2xl px-4 py-2.5 font-black text-white ${FOCUS}`} style={btn('go')}>{t('ptSignIn', 'Sign in')}</button>
    </form>
  )
}

const cellTone = (min, goal) => (min >= goal ? { background: 'var(--go-soft)', color: 'var(--go-ink)' } : min > 0 ? { background: 'var(--paper-2)', color: 'var(--ink)' } : { color: 'var(--muted)' })
const flagsOf = (d) => (d ? d.flags.rapidTap + d.flags.randomTap + d.flags.audioLoop : 0)

/** Rows for the dashboard table: week view = 7 day cells + totals; day view =
    that day's numbers. Pure, exported for tests. */
export function dashboardRows(report, view, day) {
  const days = []
  let d = report.to
  for (let i = 0; i < 7; i++) { days.unshift(d); d = prevDay(d) }
  return {
    days,
    rows: report.students.map((s) => {
      const by = Object.fromEntries(s.days.map((r) => [r.day, r]))
      if (view === 'day') {
        const r = by[day]
        return { id: s.id, name: s.name, minutes: r?.activeMin || 0, prayer: r?.prayerMin || 0, sessions: r?.sessions || 0, items: r?.items || 0, accuracy: r?.answered ? Math.round((100 * r.correct) / r.answered) : null, flags: flagsOf(r) }
      }
      return { id: s.id, name: s.name, cells: days.map((x) => by[x]?.activeMin || 0), minutes: s.total.activeMin, prayer: s.total.prayerMin || 0, items: s.total.items, accuracy: s.total.accuracy, flags: s.total.flags, met: s.total.daysMetGoal }
    }),
  }
}

function Dashboard({ cls, auth, onGoal, preset = null }) {
  const [report, setReport] = useState(preset)
  const [view, setView] = useState('week')
  const [err, setErr] = useState('')
  const today = dayStamp()
  const [day, setDay] = useState(today)
  const load = useCallback(async () => {
    if (preset) return
    setErr('')
    try { setReport(await api(`/api/practice/classes/${cls.code}/report?to=${today}`, { token: auth.token })) } catch (x) { setErr(x.message) }
  }, [cls.code, auth?.token, today, preset])
  useEffect(() => { load() }, [load])
  const invite = classUrl({ code: cls.code, teacher: auth?.name || 'Teacher', goalMin: cls.goalMin, sync: true }, appLinkUrl())
  const table = report ? dashboardRows(report, view, day) : null
  const goal = report?.class.goalMin || cls.goalMin
  return (
    <div className="mt-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 rounded-2xl border-2 p-3" style={{ borderColor: 'var(--line)', background: 'var(--paper)' }}>
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{t('ptJoinCode', 'Join code')}</p>
          <p className="text-2xl font-black tracking-[0.2em]" data-testid="join-code">{cls.code}</p>
        </div>
        <QrPanel url={invite} size={96} />
      </div>
      <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>{t('ptJoinHint', 'Students open this link or scan it, or a grown-up types the code in Parents > Practice report. Only the child\'s first name and the class code are shared.')}</p>
      <GoalPicker value={goal} onChange={(g) => g && onGoal(g)} />
      <div className="flex items-center gap-2">
        {['week', 'day'].map((v) => (
          <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} className={`min-h-[40px] rounded-xl border-2 px-3 text-sm font-black ${FOCUS}`}
            style={view === v ? { background: 'var(--sky)', borderColor: 'var(--sky-deep)', color: '#fff', outlineColor: 'var(--accent)' } : { background: 'var(--paper)', borderColor: 'var(--line)', outlineColor: 'var(--sky)' }}>
            {v === 'week' ? t('ptWeek', 'Week') : t('ptDay', 'Day')}
          </button>
        ))}
        {view === 'day' && table && (
          <select value={day} onChange={(e) => setDay(e.target.value)} className="min-h-[40px] rounded-xl border-2 px-2 text-sm font-bold" style={inputStyle}>
            {table.days.slice().reverse().map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        <button type="button" onClick={load} aria-label={t('ptRefresh', 'Refresh')} className={`ml-auto flex h-11 w-11 items-center justify-center rounded-xl border-2 ${FOCUS}`} style={{ borderColor: 'var(--line)', outlineColor: 'var(--sky)' }}><RefreshCw className="h-4 w-4" /></button>
      </div>
      {err && <p className="text-sm font-bold" style={{ color: 'var(--bad-ink)' }} role="alert">{err}</p>}
      {table && !table.rows.length && <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>{t('ptNoStudents', 'No students yet. Share the join code.')}</p>}
      {table && table.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-separate text-sm" style={{ borderSpacing: '0 4px' }} data-testid="class-table">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                <th className="text-left">{t('ptStudent', 'Student')}</th>
                {view === 'week'
                  ? table.days.map((d) => <th key={d} className="px-1 text-center tabular-nums">{d.slice(8)}</th>)
                  : <><th className="text-center">{t('ptMinutes', 'Minutes')}</th><th className="text-center">{t('ptSessions', 'Sessions')}</th></>}
                <th className="px-1 text-center"><BookOpen className="mx-auto h-3.5 w-3.5" aria-label={t('ptPrayer', 'Prayer minutes')} /></th>
                <th className="px-1 text-center">{view === 'week' ? t('ptTotal', 'Total') : t('ptPractice', 'Practice')}</th>
                <th className="px-1 text-center">{t('ptAccuracy', 'Accuracy')}</th>
                <th className="px-1 text-center"><Flag className="mx-auto h-3.5 w-3.5" aria-label={t('ptFlags', 'Flags')} /></th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r) => (
                <tr key={r.id}>
                  <td className="pr-2 font-black">{r.name}</td>
                  {view === 'week'
                    ? r.cells.map((m, i) => <td key={i} className="rounded-lg px-1 py-1 text-center font-black tabular-nums" style={cellTone(m, goal)}>{m || '·'}</td>)
                    : <><td className="rounded-lg px-1 py-1 text-center font-black tabular-nums" style={cellTone(r.minutes, goal)}>{r.minutes}/{goal}</td><td className="text-center tabular-nums">{r.sessions}</td></>}
                  <td className="px-1 text-center font-bold tabular-nums" data-testid="prayer-cell" style={{ color: 'var(--sky)' }}>{r.prayer ? `${r.prayer}′` : '·'}</td>
                  <td className="whitespace-nowrap px-1 text-center font-bold tabular-nums">{view === 'week' ? `${r.minutes}′ · ${r.met}/7` : r.items}</td>
                  <td className="px-1 text-center tabular-nums">{r.accuracy == null ? '–' : `${r.accuracy}%`}</td>
                  <td className="px-1 text-center font-black tabular-nums" style={{ color: r.flags ? 'var(--bad-ink)' : 'var(--muted)' }}>{r.flags || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>
            {t('ptLegend', 'Minutes are active time only: the clock stops after 30 seconds without a tap or answer, and when the app is hidden or the screen is locked. Prayer-page time (book icon) counts without taps while the page is open or a recording plays, pausing after 10 minutes with no page turn, tap or audio; it is included in the total. Green = goal met. Flags mark rapid same-spot tapping, random fast guessing, or audio looping with no input - worth a gentle check, never a punishment.')}
          </p>
        </div>
      )}
    </div>
  )
}

export default function ClassPracticeCard({ teacherName = '', preset = null }) {
  const [auth, setAuth] = useState(() => (preset ? { token: 'preset', name: teacherName || 'Teacher' } : loadAuth()))
  const [classes, setClasses] = useState(preset ? [preset.class] : null)
  const [sel, setSel] = useState(preset ? preset.class.code : null)
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const base = apiBase()
  const refresh = useCallback(async () => {
    if (!auth || preset) return
    try {
      const r = await api('/api/practice/classes', { token: auth.token })
      setClasses(r.classes)
      setSel((s) => s || r.classes[0]?.code || null)
    } catch (x) {
      if (x.status === 401) { saveAuth(null); setAuth(null) }
      setErr(x.code === 'EMAIL_UNVERIFIED' ? t('ptVerify', 'Confirm your email first (check your inbox), then come back.') : x.message)
    }
  }, [auth, preset])
  useEffect(() => { refresh() }, [refresh])
  const create = async () => {
    setErr('')
    try {
      const r = await api('/api/practice/classes', { token: auth.token, method: 'POST', body: { name: name || teacherName || 'Class', goalMin: 60 } })
      setName(''); setSel(r.class.code); refresh()
    } catch (x) { setErr(x.message) }
  }
  const setGoal = async (g) => {
    if (preset) return
    try { await api(`/api/practice/classes/${sel}`, { token: auth.token, method: 'PATCH', body: { goalMin: g } }); refresh() } catch (x) { setErr(x.message) }
  }
  const cls = classes?.find((c) => c.code === sel)
  return (
    <section className="rounded-3xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }} data-testid="class-practice">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          <BarChart3 className="h-4 w-4" aria-hidden="true" /> {t('ptClassView', 'Class practice (live)')}
        </h2>
        {auth && !preset && (
          <button type="button" onClick={() => { saveAuth(null); setAuth(null); setClasses(null) }} className={`flex items-center gap-1 text-xs font-extrabold ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
            <LogOut className="h-3.5 w-3.5" /> {t('ptSignOut', 'Sign out')}
          </button>
        )}
      </div>
      {!base && !preset ? (
        <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--muted)' }}>{t('ptNoServer', 'The class view needs the eGeez server, which this build is not connected to. Share-links from Parents > Practice report still work.')}</p>
      ) : !auth ? (
        <SignIn onIn={() => setAuth(loadAuth())} />
      ) : (
        <>
          {classes && classes.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {classes.map((c) => (
                <button key={c.code} type="button" onClick={() => setSel(c.code)} aria-pressed={sel === c.code} className={`min-h-[40px] rounded-xl border-2 px-3 text-sm font-black ${FOCUS}`}
                  style={sel === c.code ? { background: 'var(--go-soft)', borderColor: 'var(--go)', outlineColor: 'var(--sky)' } : { borderColor: 'var(--line)', outlineColor: 'var(--sky)' }}>{c.name}</button>
              ))}
            </div>
          )}
          {cls && <Dashboard key={cls.code} cls={cls} auth={auth} onGoal={setGoal} preset={preset} />}
          {!preset && (
            <div className="mt-3 flex gap-2">
              <input className={input} style={inputStyle} placeholder={t('ptClassName', 'New class name')} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
              <button type="button" onClick={create} className={`chunk flex min-h-[44px] shrink-0 items-center gap-1 rounded-2xl px-3 font-black text-white ${FOCUS}`} style={btn('sky')}><Plus className="h-4 w-4" />{t('ptCreate', 'Create')}</button>
            </div>
          )}
          {err && <p className="mt-2 text-sm font-bold" style={{ color: 'var(--bad-ink)' }} role="alert">{err}</p>}
        </>
      )}
    </section>
  )
}

/** A parent's #report= link opened on the teacher's device. */
export function ReportViewer({ token, onBack }) {
  const [v, setV] = useState(undefined)
  useEffect(() => { let alive = true; verifyReport(token).then((r) => alive && setV(r)); return () => { alive = false } }, [token])
  return (
    <div className="mx-auto min-h-dvh max-w-xl md:max-w-2xl px-5 pb-12 pt-6 fq-safe">
      <button type="button" onClick={onBack} className={`chunk rounded-2xl px-4 py-2 font-black ${FOCUS}`} style={{ background: 'var(--card)', border: '2px solid var(--line)', outlineColor: 'var(--sky)' }}>{t('back', 'Back')}</button>
      {v === null && <p className="mt-6 font-bold" style={{ color: 'var(--bad-ink)' }}>{t('ptReportBad', 'This report link is damaged or incomplete.')}</p>}
      {v && (
        <div className="mt-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-2xl border-2 p-3 font-black" role="status" data-testid="report-verdict"
            style={v.verified ? { background: 'var(--go-soft)', borderColor: 'var(--go)', color: 'var(--go-ink)' } : { background: 'var(--bad-soft)', borderColor: 'var(--bad)', color: 'var(--bad-ink)' }}>
            {v.verified ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            {v.verified ? t('ptVerified', 'Verified - numbers unchanged since the app made this report') : t('ptTampered', 'Not verified - this report was edited after it was made')}
          </div>
          <h1 className="text-xl font-black">{v.report.name}{v.report.code ? ` · ${v.report.code}` : ''}</h1>
          <p className="text-xs font-bold" style={{ color: 'var(--muted)' }}>{t('ptCheckCode', 'Check code')}: <span className="tabular-nums">{v.check}</span>{v.report.goal ? ` · ${t('ptGoal', 'Goal')} ${v.report.goal}′` : ''}</p>
          <ReportTable days={v.report.days} goal={v.report.goal} />
        </div>
      )}
    </div>
  )
}

/** Shared 7-day table: day, minutes vs goal, sessions, items, accuracy, finished, flags. */
export function ReportTable({ days, goal }) {
  return (
    <table className="w-full border-separate text-sm" style={{ borderSpacing: '0 4px' }} data-testid="report-table">
      <thead>
        <tr className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          <th className="text-left">{t('ptDate', 'Date')}</th><th>{t('ptMinutes', 'Minutes')}</th><th><BookOpen className="mx-auto h-3.5 w-3.5" aria-label={t('ptPrayer', 'Prayer minutes')} /></th><th>{t('ptSessions', 'Sessions')}</th>
          <th>{t('ptPractice', 'Practice')}</th><th>{t('ptAccuracy', 'Accuracy')}</th><th>{t('ptDone', 'Finished')}</th><th><Flag className="mx-auto h-3.5 w-3.5" aria-label={t('ptFlags', 'Flags')} /></th>
        </tr>
      </thead>
      <tbody>
        {days.slice().reverse().map((d) => (
          <tr key={d.day} className="text-center tabular-nums">
            <td className="text-left font-bold">{d.day.slice(5)}</td>
            <td className="rounded-lg py-1 font-black" style={goal ? cellTone(d.minutes, goal) : {}}>{d.minutes}{goal ? `/${goal}` : ''}</td>
            <td className="font-bold" style={{ color: 'var(--sky)' }}>{d.prayer ? `${d.prayer}′` : '·'}</td>
            <td>{d.sessions}</td><td>{d.items}</td>
            <td>{d.answered ? `${Math.round((100 * d.correct) / d.answered)}%` : '–'}</td>
            <td>{d.lessons + d.games}</td>
            <td className="font-black" style={{ color: d.flags ? 'var(--bad-ink)' : 'var(--muted)' }}>{d.flags || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
