import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, Inbox, Check, X, TrendingUp, Users } from 'lucide-react'
import { Card, CtaButton, Field, inputCls, inputStyle, Reveal } from '../components.jsx'
import { Stars } from './Teachers.jsx'
import { signedIn, login, register, signOut, apiFetch } from '../auth.js'
import { API_URL } from '../config.js'
import { t } from '../i18n.js'
import Seo from '../Seo.jsx'

/* The teacher's side of the marketplace: sign in with the SAME email your
   application used and (once approved) this page is your board standing +
   introduction inbox. Accepting a request is the only moment contact
   details are exchanged - both sides get an email. */

function TeacherAuth({ onDone }) {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [state, setState] = useState({ busy: false, error: '' })
  const submit = async (e) => {
    e.preventDefault()
    setState({ busy: true, error: '' })
    try {
      if (mode === 'signup') await register(form.name, form.email, form.password, 'teacher')
      else await login(form.email, form.password)
      onDone()
    } catch (err) { setState({ busy: false, error: err.message }); return }
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
        <Field label={t('thEmail', 'Email (the one on your application)')}>
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
    </Card>
  )
}

const STATUS_STYLE = {
  new: { background: 'var(--card)', color: 'var(--accent)', border: '1px solid var(--accent)' },
  accepted: { background: 'var(--go-soft)', color: 'var(--go-ink)', border: '1px solid var(--go)' },
  declined: { background: 'var(--paper)', color: 'var(--muted)', border: '1px solid var(--line)' },
}

function TeacherDashboard({ onSignOut }) {
  const [me, setMe] = useState(null)
  const [notTeacher, setNotTeacher] = useState(false)
  const [unverified, setUnverified] = useState(false)
  const [resent, setResent] = useState('')
  const [error, setError] = useState('')

  const refresh = () => apiFetch('/api/teacher/me')
    .then((d) => { setMe(d); setUnverified(false) })
    .catch((e) => {
      if (e.code === 'EMAIL_UNVERIFIED') setUnverified(true)
      else if (String(e.message).includes('No approved teacher')) setNotTeacher(true)
      else setError(e.message)
    })
  useEffect(() => { refresh() }, [])

  const resend = async () => {
    setResent(''); setError('')
    try { await apiFetch('/api/auth/resend-verification', { method: 'POST' }); setResent(t('thResent', 'Sent! Check your inbox for the confirmation link.')) }
    catch (e) { setError(e.message) }
  }

  const answer = async (id, action) => {
    setError('')
    try { await apiFetch(`/api/teacher/intros/${id}`, { method: 'POST', body: { action } }); refresh() } catch (e) { setError(e.message) }
  }

  if (unverified) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <h2 className="font-black">{t('thVerifyT', 'Confirm your email to continue')}</h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
          {t('thVerifyB', 'We sent a confirmation link when you registered. Click it to unlock your teacher dashboard - this proves you own the email your board profile uses.')}
        </p>
        <div className="mt-4"><CtaButton onClick={resend} tone="gold">{t('thResend', 'Resend confirmation email')}</CtaButton></div>
        {resent && <p className="mt-3 text-sm font-bold" style={{ color: 'var(--go-ink)' }}>{resent}</p>}
        {error && <p className="mt-3 text-sm font-bold" role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
        <p className="mt-4"><button type="button" onClick={onSignOut} className="text-sm font-bold underline" style={{ color: 'var(--muted)' }}>{t('faSignOut', 'Sign out')}</button></p>
      </Card>
    )
  }

  if (notTeacher) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <h2 className="font-black">{t('thNotYetT', 'This account is not on the board yet')}</h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
          {t('thNotYetB', 'Make sure you signed in with the same email you applied with, and that your application has been approved. Have not applied yet?')}
        </p>
        <div className="mt-4"><CtaButton to="/teachers" tone="gold">{t('thApply', 'Apply to teach')}</CtaButton></div>
        <p className="mt-4"><button type="button" onClick={onSignOut} className="text-sm font-bold underline" style={{ color: 'var(--muted)' }}>{t('faSignOut', 'Sign out')}</button></p>
      </Card>
    )
  }
  if (!me) return <p className="text-center font-bold" style={{ color: 'var(--muted)' }}>{error || t('thLoading', 'Loading your board…')}</p>

  const open = me.intros.filter((i) => i.status === 'new')
  const answered = me.intros.filter((i) => i.status !== 'new')

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="display-2">{me.teacher.name}</h1>
        <button type="button" onClick={onSignOut} className="flex items-center gap-1.5 text-sm font-bold" style={{ color: 'var(--muted)' }}>
          <LogOut className="h-4 w-4" aria-hidden="true" /> {t('faSignOut', 'Sign out')}
        </button>
      </div>

      <Card className="mt-5">
        <h2 className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>{t('thStanding', 'Your board standing')}</h2>
        <div className="mt-2"><Stars avg={me.board?.rating?.avg} count={me.board?.rating?.count} /></div>
        {me.board?.progress?.families > 0 && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: 'var(--muted)' }}>
            <Users className="h-4 w-4" aria-hidden="true" />
            {(me.board.progress.families === 1
              ? t('thFamilies1', 'Working with {k} family')
              : t('thFamiliesN', 'Working with {k} families')).replace('{k}', me.board.progress.families)}
          </p>
        )}
        {me.board?.progress?.teachesLiteracy && (
          me.board?.progress?.show ? (
            <>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black"
                style={{ background: 'var(--go-soft)', color: 'var(--go-ink)', border: '1px solid var(--go)' }}>
                <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                {t('thVerified', '+{n} letters/child, reported by {s} families')
                  .replace('{n}', me.board.progress.avgLettersGained).replace('{s}', me.board.progress.verified)}
              </p>
              <p className="mt-1.5 text-xs" style={{ color: 'var(--muted)' }}>{t('thVerifiedNote', 'This badge is public on your board card.')}</p>
            </>
          ) : me.board?.progress?.verified > 0 ? (
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              {t('thAlmost', 'So far {s} family has recorded gains for a linked child. Your public letters badge appears once at least two families have measurable gains.').replace('{s}', me.board.progress.verified)}
            </p>
          ) : (
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              {t('thNoVerified', 'Your fidel-letters badge appears when two or more linked families save progress reports. Encourage them to share reports from the app.')}
            </p>
          )
        )}
        {me.reviews.length > 0 && (
          <ul className="mt-3 space-y-2">
            {me.reviews.map((r, i) => (
              <li key={i} className="rounded-xl p-2.5 text-xs leading-relaxed" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
                <Stars avg={r.stars} count={1} /> <span style={{ color: 'var(--muted)' }}>{r.comment}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-5">
        <h2 className="flex items-center gap-2 font-black">
          <Inbox className="h-4 w-4" style={{ color: 'var(--accent)' }} aria-hidden="true" />
          {t('thInbox', 'Introduction requests')}
          {open.length > 0 && <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: 'var(--accent)', color: '#241a05' }}>{open.length}</span>}
        </h2>
        {me.intros.length === 0 && (
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>{t('thNoIntros', 'No requests yet. Families find you on the board - your rating and verified progress do the talking.')}</p>
        )}
        <ul className="mt-3 space-y-3">
          {open.map((i) => (
            <li key={i.id} className="rounded-2xl p-3.5" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
              {i.childName && <p className="text-sm font-black">{t('thForChild', 'For {c}').replace('{c}', i.childName)}</p>}
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>"{i.message}"</p>
              <div className="mt-3 flex gap-2">
                <CtaButton onClick={() => answer(i.id, 'accept')} tone="green" className="!px-4 !py-2 text-sm">
                  <Check className="h-4 w-4" aria-hidden="true" /> {t('thAccept', 'Accept - share contacts')}
                </CtaButton>
                <CtaButton onClick={() => answer(i.id, 'decline')} tone="ghost" className="!px-4 !py-2 text-sm">
                  <X className="h-4 w-4" aria-hidden="true" /> {t('thDecline', 'Decline')}
                </CtaButton>
              </div>
            </li>
          ))}
          {answered.map((i) => (
            <li key={i.id} className="flex items-center justify-between rounded-2xl p-3 text-sm" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--muted)' }}>{i.childName || t('thAFamily', 'A family')}</span>
              <span className="rounded-full px-2.5 py-0.5 text-xs font-black" style={STATUS_STYLE[i.status]}>{i.status}</span>
            </li>
          ))}
        </ul>
        {error && <p className="mt-2 text-sm font-bold" role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
        <p className="mt-3 text-[11px]" style={{ color: 'var(--muted)' }}>
          {t('thPrivacy', 'Accepting shares your email with the family and theirs with you - both by email. Declining shares nothing.')}
        </p>
      </Card>
    </div>
  )
}

export default function Teach() {
  const [authed, setAuthed] = useState(signedIn())

  if (!API_URL) {
    return (
      <div className="mx-auto max-w-xl px-5 pt-14 text-center sm:px-6">
        <Seo title="Teacher dashboard - eGeez" description="Your board standing and introduction requests." path="/teach" />
        <h1 className="display-2">{t('thSoonT', 'The teacher dashboard opens with launch')}</h1>
        <p className="lede mt-3" style={{ color: 'var(--muted)' }}>{t('thSoonB', 'Apply on the For-teachers page - approved teachers get their dashboard here.')}</p>
        <div className="mt-5"><CtaButton to="/teachers" tone="gold">{t('thApply', 'Apply to teach')}</CtaButton></div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pb-10 pt-12 sm:px-6">
      <Seo title="Teacher dashboard - eGeez" description="Your board standing and introduction requests." path="/teach" />
      {authed ? (
        <Reveal><TeacherDashboard onSignOut={() => { signOut(); setAuthed(false) }} /></Reveal>
      ) : (
        <Reveal>
          <div className="mb-6 text-center">
            <h1 className="display-2">{t('thWelcomeT', 'Your teacher dashboard')}</h1>
            <p className="lede mx-auto mt-2 max-w-md" style={{ color: 'var(--muted)' }}>
              {t('thWelcomeB', 'Sign in with the email from your application to see your board standing and answer introduction requests.')}
            </p>
          </div>
          <TeacherAuth onDone={() => setAuthed(true)} />
          <p className="mt-5 text-center text-sm" style={{ color: 'var(--muted)' }}>
            {t('thNotApplied', 'Not on the board yet?')} <Link to="/teachers" className="font-bold underline">{t('thApply2', 'Apply here')}</Link>
          </p>
        </Reveal>
      )}
    </div>
  )
}
