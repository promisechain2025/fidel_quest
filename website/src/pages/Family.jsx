import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, Plus, Trash2, TrendingUp, Star, GraduationCap } from 'lucide-react'
import { Card, CtaButton, Field, inputCls, inputStyle, Reveal } from '../components.jsx'
import ProgressReport from '../components/ProgressReport.jsx'
import { signedIn, login, register, signOut, apiFetch } from '../auth.js'
import { API_URL } from '../config.js'
import { TOTAL_LETTERS } from '../progressCard.js'
import { t } from '../i18n.js'
import Seo from '../Seo.jsx'

/* Link a teacher the child learns with, then rate them. A child can only be
   linked to a teacher the family has an ACCEPTED introduction with - the
   same gate the API enforces - so the link reflects a real relationship and
   the rating/progress it unlocks is trustworthy. */
function TeacherPanel({ child, onChanged }) {
  const [teachers, setTeachers] = useState([])
  const [accepted, setAccepted] = useState(null) // teacherIds with an accepted intro; null = loading
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [state, setState] = useState({ msg: '', error: '' })

  useEffect(() => {
    apiFetch('/api/teachers').then((j) => setTeachers(j.teachers || [])).catch(() => {})
    apiFetch('/api/my/intros')
      .then((j) => setAccepted(new Set((j.intros || []).filter((i) => i.status === 'accepted').map((i) => i.teacherId))))
      .catch(() => setAccepted(new Set()))
  }, [])

  const link = async (teacherId) => {
    setState({ msg: '', error: '' })
    try {
      await apiFetch(`/api/children/${child.id}/teacher`, { method: 'PUT', body: { teacherId } })
      onChanged()
    } catch (err) { setState({ msg: '', error: err.message }) }
  }
  const rate = async () => {
    if (!stars) return
    setState({ msg: '', error: '' })
    try {
      await apiFetch(`/api/teachers/${child.teacherId}/reviews`, { method: 'POST', body: { stars, comment } })
      setState({ msg: comment ? t('faRatedMod', 'Thank you! Your stars are live; the written review appears after a quick check.') : t('faRated', 'Thank you! Your rating is live.'), error: '' })
      setComment('')
    } catch (err) { setState({ msg: '', error: err.message }) }
  }

  if (teachers.length === 0) return null
  const current = teachers.find((te) => te.id === child.teacherId)

  return (
    <Card className="mt-5">
      <h3 className="flex items-center gap-2 font-black">
        <GraduationCap className="h-4 w-4" style={{ color: 'var(--accent)' }} aria-hidden="true" />
        {t('faTeacherT', 'Teacher')}
      </h3>
      {current ? (
        <>
          <p className="mt-1.5 text-sm" style={{ color: 'var(--muted)' }}>
            {t('faLearnsWith', '{c} learns with {t2}.').replace('{c}', child.name).replace('{t2}', current.name)}{' '}
            <button type="button" onClick={() => link('')} className="font-bold underline">{t('faUnlink', 'Unlink')}</button>
          </p>
          <div className="mt-3 flex items-center gap-1" role="radiogroup" aria-label={t('faRateLabel', 'Rate this teacher')}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} type="button" onClick={() => setStars(i)} role="radio" aria-checked={stars === i} aria-label={`${i} stars`} className="p-1">
                <Star className="h-7 w-7" aria-hidden="true"
                  style={{ color: 'var(--star)', fill: i <= stars ? 'var(--star)' : 'transparent' }} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0, 600))}
            placeholder={t('faCommentPh', 'A few words for other families (optional - reviewed before publishing)')}
            aria-label={t('faCommentL', 'A few words about this teacher (optional)')}
            rows={2} className={`${inputCls} mt-2`} style={inputStyle} />
          <div className="mt-2">
            <CtaButton onClick={rate} tone="gold" disabled={!stars} className="!px-4 !py-2 text-sm">{t('faRateBtn', 'Submit rating')}</CtaButton>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1.5 text-sm" style={{ color: 'var(--muted)' }}>
            {t('faPickTeacher', 'Does {c} learn with one of our teachers? Linking them lets you rate the teacher and counts {c}’s progress toward their family-reported record.').replaceAll('{c}', child.name)}
          </p>
          {(() => {
            const linkable = teachers.filter((te) => accepted?.has(te.id))
            if (accepted === null) return null // still loading intros
            if (linkable.length === 0) {
              return (
                <p className="mt-3 rounded-xl p-3 text-sm" style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
                  {t('faNeedIntro', 'To link a teacher, first request an introduction and wait for them to accept.')}{' '}
                  <Link to="/teachers" className="font-bold underline" style={{ color: 'var(--accent)' }}>{t('faBrowseTeachers', 'Browse teachers')}</Link>
                </p>
              )
            }
            return (
              <div className="mt-3 flex flex-wrap gap-2">
                {linkable.map((te) => (
                  <button key={te.id} type="button" onClick={() => link(te.id)} className="chunk px-3.5 py-2 text-sm"
                    style={{ background: 'var(--card)', color: 'var(--ink)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)' }}>
                    {te.name}
                  </button>
                ))}
              </div>
            )
          })()}
        </>
      )}
      {state.msg && <p className="mt-2 text-sm font-bold" style={{ color: 'var(--go-ink)' }}>{state.msg}</p>}
      {state.error && <p className="mt-2 text-sm font-bold" role="alert" style={{ color: 'var(--danger)' }}>{state.error}</p>}
    </Card>
  )
}

/* The family dashboard: parent account + child profiles + saved progress
   snapshots over time. The app itself stays account-free; snapshots arrive
   only when a parent saves a Progress Card on /progress. */

function AuthForm({ onDone }) {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [state, setState] = useState({ busy: false, error: '' })
  const submit = async (e) => {
    e.preventDefault()
    setState({ busy: true, error: '' })
    try {
      if (mode === 'signup') await register(form.name, form.email, form.password)
      else await login(form.email, form.password)
      onDone()
    } catch (err) {
      setState({ busy: false, error: err.message })
      return
    }
    setState({ busy: false, error: '' })
  }
  return (
    <Card className="mx-auto max-w-md">
      <div className="flex gap-2">
        {[['signin', t('faSignIn', 'Sign in')], ['signup', t('faSignUp', 'Create account')]].map(([m, label]) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className="flex-1 rounded-xl px-3 py-2 text-sm font-black"
            style={mode === m ? { background: 'var(--accent)', color: '#241a05' } : { background: 'var(--paper)', color: 'var(--muted)', border: '2px solid var(--line)' }}>
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
        {mode === 'signup' && (
          <Field label={t('fName2', 'Full name')}>
            <input className={inputCls} style={inputStyle} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
          </Field>
        )}
        <Field label={t('fEmail', 'Email')}>
          <input className={inputCls} style={inputStyle} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
        </Field>
        <Field label={t('faPassword', 'Password (8+ characters)')}>
          <input className={inputCls} style={inputStyle} type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
        </Field>
        {state.error && <p className="text-sm font-bold" role="alert" style={{ color: 'var(--danger)' }}>{state.error}</p>}
        <CtaButton type="submit" tone="green" className="justify-center" disabled={state.busy}>
          {state.busy ? t('fSending', 'Sending…') : mode === 'signup' ? t('faSignUp', 'Create account') : t('faSignIn', 'Sign in')}
        </CtaButton>
      </form>
      <p className="mt-4 text-xs" style={{ color: 'var(--muted)' }}>
        {t('faPrivacy', 'We store only what the dashboard shows: your email, the first names you choose, and the learning counts you save. The app itself never uploads anything.')}
      </p>
    </Card>
  )
}

function Sparkline({ snapshots }) {
  if (snapshots.length < 2) return null
  const w = 560; const h = 90; const pad = 8
  const xs = snapshots.map((_, i) => pad + (i * (w - 2 * pad)) / (snapshots.length - 1))
  const ys = snapshots.map((s) => h - pad - (s.letters / TOTAL_LETTERS) * (h - 2 * pad))
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 w-full" role="img"
      aria-label={t('faChartLabel', 'Letters learned over time')}>
      <path d={d} fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" />
      {xs.map((x, i) => <circle key={i} cx={x} cy={ys[i]} r="5" fill="var(--tile)" stroke="var(--tile-deep)" strokeWidth="2" />)}
    </svg>
  )
}

const INTRO_STATUS_STYLE = {
  new: { color: 'var(--accent)', border: '1px solid var(--accent)' },
  accepted: { background: 'var(--go-soft)', color: 'var(--go-ink)', border: '1px solid var(--go)' },
  declined: { color: 'var(--muted)', border: '1px solid var(--line)' },
}

/* The parent's view of brokered introductions (created on /teachers). */
function MyIntros() {
  const [intros, setIntros] = useState([])
  useEffect(() => { apiFetch('/api/my/intros').then((j) => setIntros(j.intros || [])).catch(() => {}) }, [])
  if (intros.length === 0) return null
  return (
    <Card className="mt-7">
      <h2 className="font-black">{t('faIntrosT', 'Your introduction requests')}</h2>
      <ul className="mt-3 space-y-2">
        {intros.map((i) => (
          <li key={i.id} className="flex items-center justify-between rounded-xl p-2.5 text-sm" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
            <span>{i.teacherName}{i.childName ? ` · ${i.childName}` : ''}</span>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-black" style={INTRO_STATUS_STYLE[i.status] || {}}>
              {i.status === 'accepted' ? t('faInAccepted', 'accepted - check your email') : i.status}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Dashboard({ onSignOut }) {
  const [children, setChildren] = useState([])
  const [selected, setSelected] = useState(null) // { child, snapshots }
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')

  const refresh = () => apiFetch('/api/children').then((j) => setChildren(j.children)).catch((e) => setError(e.message))
  useEffect(() => { refresh() }, [])

  const addChild = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    try { await apiFetch('/api/children', { method: 'POST', body: { name: newName.trim() } }); setNewName(''); refresh() } catch (err) { setError(err.message) }
  }
  const open = async (c) => {
    try {
      const data = await apiFetch(`/api/children/${c.id}/snapshots`)
      setSelected(data)
    } catch (err) { setError(err.message) }
  }
  const reopen = async () => {
    if (!selected) return
    await refresh()
    try { setSelected(await apiFetch(`/api/children/${selected.child.id}/snapshots`)) } catch { /* keep view */ }
  }
  const remove = async (c) => {
    if (!window.confirm(t('faDeleteConfirm', `Delete ${c.name}'s profile and all saved snapshots?`))) return
    try { await apiFetch(`/api/children/${c.id}`, { method: 'DELETE' }); setSelected(null); refresh() } catch (err) { setError(err.message) }
  }

  const latest = selected?.snapshots[selected.snapshots.length - 1]

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="display-2">{t('faTitle', 'Your family')}</h1>
        <button type="button" onClick={onSignOut} className="flex items-center gap-1.5 text-sm font-bold" style={{ color: 'var(--muted)' }}>
          <LogOut className="h-4 w-4" aria-hidden="true" /> {t('faSignOut', 'Sign out')}
        </button>
      </div>
      {error && <p className="mt-2 text-sm font-bold" role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {children.map((c) => (
          <button key={c.id} type="button" onClick={() => open(c)}
            className="chunk px-4 py-2.5 text-sm"
            style={selected?.child?.id === c.id
              ? { background: 'var(--accent)', color: '#241a05', boxShadow: '0 3px 0 var(--accent-deep)' }
              : { background: 'var(--card)', color: 'var(--ink)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)' }}>
            {c.name}
          </button>
        ))}
        <form onSubmit={addChild} className="flex items-stretch gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value.slice(0, 40))}
            placeholder={t('faAddPlaceholder', 'Add a child - first name')}
            aria-label={t('faAddLabel', 'Child first name')}
            className="w-44 rounded-xl px-3 py-2 text-[16px] font-bold"
            style={{ background: 'var(--card)', border: '2px solid var(--line)', color: 'var(--ink)' }} />
          <button type="submit" className="chunk px-3" aria-label={t('faAdd', 'Add child')}
            style={{ background: 'var(--go)', color: '#fff', boxShadow: '0 3px 0 var(--go-deep)', minHeight: 44 }}>
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        </form>
      </div>

      {selected && (
        <div className="mt-7">
          {latest ? (
            <>
              <ProgressReport snap={{ ...latest, name: selected.child.name }} />
              {selected.snapshots.length >= 2 && (
                <Card className="mt-5">
                  <h3 className="flex items-center gap-2 font-black">
                    <TrendingUp className="h-4 w-4" style={{ color: 'var(--accent)' }} aria-hidden="true" />
                    {t('faOverTime', 'Letters learned over time')}
                  </h3>
                  <Sparkline snapshots={selected.snapshots} />
                  <div className="mt-1 flex justify-between text-xs font-bold" style={{ color: 'var(--muted)' }}>
                    <span>{selected.snapshots[0].day}</span><span>{latest.day}</span>
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card className="text-center">
              <p className="font-black">{t('faNoSnaps', 'No snapshots yet for {n}.').replace('{n}', selected.child.name)}</p>
              <p className="mt-1.5 text-sm" style={{ color: 'var(--muted)' }}>
                {t('faNoSnapsB', 'In the app: Grown-ups corner, then "Share progress report" - open that link here and save it to this profile.')}
              </p>
            </Card>
          )}
          <TeacherPanel child={selected.child} onChanged={reopen} />
          <p className="mt-4 text-right">
            <button type="button" onClick={() => remove(selected.child)} className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--muted)' }}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> {t('faDelete', 'Delete this profile')}
            </button>
          </p>
        </div>
      )}
      {/* brokered introductions live at dashboard level - visible with or
          without child profiles */}
      <MyIntros />
    </div>
  )
}

export default function Family() {
  const [authed, setAuthed] = useState(signedIn())

  if (!API_URL) {
    return (
      <div className="mx-auto max-w-xl px-5 pt-14 text-center sm:px-6">
        <Seo title="Family dashboard - eGeez" description="Save child profiles and review fidel progress over time." path="/family" />
        <h1 className="display-2">{t('faSoonT', 'The family dashboard opens with launch')}</h1>
        <p className="lede mt-3" style={{ color: 'var(--muted)' }}>{t('faSoonB', 'Save child profiles and watch progress over time - coming online with the rest of the platform.')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pb-10 pt-12 sm:px-6">
      <Seo title="Family dashboard - eGeez" description="Save child profiles and review fidel progress over time." path="/family" />
      {authed ? (
        <Reveal><Dashboard onSignOut={() => { signOut(); setAuthed(false) }} /></Reveal>
      ) : (
        <Reveal>
          <div className="mb-6 text-center">
            <h1 className="display-2">{t('faWelcomeT', 'Review your child’s progress')}</h1>
            <p className="lede mx-auto mt-2 max-w-md" style={{ color: 'var(--muted)' }}>
              {t('faWelcomeB', 'A free parent account keeps dated snapshots of each child’s fidel journey - saved only when you choose to share them from the app.')}
            </p>
          </div>
          <AuthForm onDone={() => setAuthed(true)} />
        </Reveal>
      )}
    </div>
  )
}
