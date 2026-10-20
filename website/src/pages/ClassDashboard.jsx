/* ============================================================================
   /classes - the web teacher dashboard (gap #1: live roster)
   ----------------------------------------------------------------------------
   Sign in with the existing eGeez teacher account (api/routes/auth.js:
   email + password, verified email; no new service). Then: create and
   manage classes, share the class code + invite link, set homework, and see
   a live roster (refreshes every 30 s) with each student's week, homework
   turned in / missing, and trouble letters.

   Kid-safe: students are a nickname inside one class. The dashboard never
   sees a child email, birthday, token or free text. English is fine here -
   this is a grown-up page; the kid app is unchanged.
   Needs VITE_API_URL; without it the page says the dashboard is not on.
   ========================================================================== */
import { useCallback, useEffect, useState } from 'react'
import { LogOut, Plus, Copy, Check, Trash2, RefreshCw, Users, BookOpen, AlertTriangle, ShieldCheck } from 'lucide-react'
import { Card, CtaButton, Field, inputCls, inputStyle } from '../components.jsx'
import { signedIn, login, register, signOut, apiFetch } from '../auth.js'
import { API_URL, APP_URL, CONTACT_EMAIL } from '../config.js'
import { classInviteUrl, homeworkUrl } from '../classLinks.js'
import { FAMILY_IDS, familyChar } from '../familyIds.js'
import Seo from '../Seo.jsx'

const today = () => new Date().toISOString().slice(0, 10)
const plusDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)
const muted = { color: 'var(--muted)' }

function CopyButton({ text, label }) {
  const [done, setDone] = useState(false)
  return (
    <button type="button" className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-bold" style={{ border: '1px solid var(--line)' }}
      onClick={async () => { try { await navigator.clipboard.writeText(text) } catch { /* old browser */ } setDone(true); setTimeout(() => setDone(false), 1500) }}>
      {done ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />} {done ? 'Copied' : label}
    </button>
  )
}

function SignIn({ onDone }) {
  const [mode, setMode] = useState('signin')
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    try {
      if (mode === 'signup') await register(f.name, f.email, f.password, 'teacher')
      else await login(f.email, f.password)
      onDone()
    } catch (x) { setErr(x.message) }
  }
  return (
    <Card className="mx-auto max-w-md">
      <h2 className="text-xl font-black">{mode === 'signup' ? 'Create a teacher account' : 'Teacher sign in'}</h2>
      <form onSubmit={submit} className="mt-4 grid gap-3">
        {mode === 'signup' && <Field label="Your name (students see it)"><input required className={inputCls} style={inputStyle} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>}
        <Field label="Email"><input required type="email" autoComplete="email" className={inputCls} style={inputStyle} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Password (8+ characters)"><input required type="password" minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className={inputCls} style={inputStyle} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        {err && <p className="text-sm font-bold" style={{ color: 'var(--danger, #c0392b)' }}>{err}</p>}
        <CtaButton type="submit" tone="green">{mode === 'signup' ? 'Create account' : 'Sign in'}</CtaButton>
      </form>
      <button type="button" className="mt-3 text-sm font-bold underline" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
        {mode === 'signup' ? 'I already have an account' : 'New teacher? Create an account'}
      </button>
      <p className="mt-3 text-xs" style={muted}>We email you a link to confirm your address before you can create a class.</p>
    </Card>
  )
}

function StatusChip({ h }) {
  const s = h.status === 'done'
    ? { bg: 'var(--go-deep)', fg: '#fff', t: `${h.score}/${h.total}` }
    : h.status === 'missing' ? { bg: '#c0392b', fg: '#fff', t: 'missing' } : { bg: 'var(--card)', fg: 'var(--muted)', t: 'open' }
  return <span className="inline-block rounded-md px-1.5 py-0.5 text-xs font-black" style={{ background: s.bg, color: s.fg, border: '1px solid var(--line)' }}>{s.t}</span>
}

function HomeworkForm({ code, onMade }) {
  const [f, setF] = useState({ title: '', familyIds: [], count: 10, due: plusDays(7) })
  const [err, setErr] = useState('')
  const toggle = (id) => setF({ ...f, familyIds: f.familyIds.includes(id) ? f.familyIds.filter((x) => x !== id) : [...f.familyIds, id] })
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    try { await apiFetch(`/api/practice/classes/${code}/homework`, { method: 'POST', body: f }); setF({ ...f, title: '', familyIds: [] }); onMade() } catch (x) { setErr(x.message) }
  }
  return (
    <form onSubmit={submit} className="grid gap-3">
      <Field label="Title"><input className={inputCls} style={inputStyle} placeholder="Week 3 · መ ሠ" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
      <div>
        <div className="mb-1 text-sm font-bold">Letter families</div>
        <div className="flex flex-wrap gap-1.5">
          {FAMILY_IDS.map(([id, ch]) => (
            <button type="button" key={id} onClick={() => toggle(id)} aria-pressed={f.familyIds.includes(id)}
              className="geez h-10 w-10 rounded-lg text-lg font-black" lang="am"
              style={{ background: f.familyIds.includes(id) ? 'var(--accent)' : 'var(--paper)', color: f.familyIds.includes(id) ? '#241a05' : 'var(--ink)', border: '1px solid var(--line)' }}>{ch}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Questions"><input type="number" min={3} max={20} className={inputCls} style={inputStyle} value={f.count} onChange={(e) => setF({ ...f, count: Number(e.target.value) })} /></Field>
        <Field label="Due"><input type="date" min={today()} className={inputCls} style={inputStyle} value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></Field>
      </div>
      {err && <p className="text-sm font-bold" style={{ color: '#c0392b' }}>{err}</p>}
      <CtaButton type="submit" tone="gold" disabled={!f.familyIds.length}><Plus className="h-4 w-4" aria-hidden="true" /> Set homework</CtaButton>
    </form>
  )
}

function ClassView({ cls, teacher, onBack, onChanged }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [at, setAt] = useState(null)
  const load = useCallback(async () => {
    try { setData(await apiFetch(`/api/practice/classes/${cls.code}/roster`)); setAt(new Date()); setErr('') } catch (x) { setErr(x.message) }
  }, [cls.code])
  useEffect(() => { load(); const iv = setInterval(load, 30000); return () => clearInterval(iv) }, [load])
  const invite = classInviteUrl({ code: cls.code, teacher, goalMin: cls.goalMin })
  const removeStudent = async (s) => { if (window.confirm(`Remove ${s.name} and their results from this class?`)) { await apiFetch(`/api/practice/classes/${cls.code}/students/${s.id}`, { method: 'DELETE' }); load() } }
  const removeHw = async (h) => { if (window.confirm(`Delete “${h.title}” and its results?`)) { await apiFetch(`/api/practice/classes/${cls.code}/homework/${h.seed}`, { method: 'DELETE' }); load() } }
  const removeClass = async () => { if (window.confirm(`Delete ${cls.name} with all students and results? This cannot be undone.`)) { await apiFetch(`/api/practice/classes/${cls.code}`, { method: 'DELETE' }); onChanged(); onBack() } }
  const hw = data?.homework || []
  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 [&>*]:min-w-0">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className="text-sm font-bold underline">← All classes</button>
        <h2 className="text-2xl font-black">{cls.name}</h2>
        <span className="ml-auto text-xs" style={muted}>{at ? `Live · updated ${at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Loading…'}</span>
        <button type="button" onClick={load} aria-label="Refresh" className="rounded-lg p-2" style={{ border: '1px solid var(--line)' }}><RefreshCw className="h-4 w-4" aria-hidden="true" /></button>
      </div>
      {err && <p className="text-sm font-bold" style={{ color: '#c0392b' }}>{err}</p>}

      <Card>
        <h3 className="flex items-center gap-2 font-black"><Users className="h-5 w-5" aria-hidden="true" /> Invite students</h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div><div className="text-xs font-bold" style={muted}>Class code</div><div className="font-mono text-3xl font-black tracking-widest">{cls.code}</div></div>
          <CopyButton text={cls.code} label="Copy code" />
          <CopyButton text={invite} label="Copy invite link" />
        </div>
        <p className="mt-2 break-all text-xs" style={muted}>{invite}</p>
        <p className="mt-2 text-sm" style={muted}>Post the link in your class WhatsApp or Telegram group. A grown-up opens it, types the child’s nickname, and taps Join - or types the code in the app. Daily goal: {cls.goalMin} min.</p>
      </Card>

      <Card>
        <h3 className="font-black">Live roster · {data?.students.length ?? 0} students</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead><tr style={muted}>
              <th className="py-2 pr-2">Student</th><th className="pr-2">Last active</th><th className="pr-2">This week</th><th className="pr-2">Accuracy</th>
              {hw.map((h) => <th key={h.seed} className="pr-2" title={h.title}>{h.title.slice(0, 14)}</th>)}
              <th className="pr-2">Trouble</th><th />
            </tr></thead>
            <tbody>
              {(data?.students || []).map((s) => (
                <tr key={s.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td className="py-2 pr-2 font-black">{s.name}</td>
                  <td className="pr-2">{s.lastActive ? (s.lastActive === today() ? 'today' : s.lastActive) : <span style={muted}>not yet</span>}</td>
                  <td className="pr-2">{s.week.activeMin} min{s.week.prayerMin ? <span style={muted}> · ጸሎት {s.week.prayerMin}</span> : null}<div className="text-xs" style={muted}>{s.week.daysMetGoal}/7 days at goal</div></td>
                  <td className="pr-2">{s.week.accuracy == null ? '–' : `${s.week.accuracy}%`}</td>
                  {s.homework.map((h) => <td key={h.seed} className="pr-2"><StatusChip h={h} /></td>)}
                  <td className="geez pr-2 text-lg" lang="am">{s.trouble.map(familyChar).join(' ') || <span style={muted}>–</span>}</td>
                  <td><button type="button" aria-label={`Remove ${s.name}`} onClick={() => removeStudent(s)} className="rounded p-1" style={muted}><Trash2 className="h-4 w-4" aria-hidden="true" /></button></td>
                </tr>
              ))}
              {data && !data.students.length && <tr><td colSpan={6} className="py-4" style={muted}>No students yet - share the invite link above.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <h3 className="flex items-center gap-2 font-black"><BookOpen className="h-5 w-5" aria-hidden="true" /> Homework</h3>
          <ul className="mt-3 grid gap-3">
            {hw.map((h) => (
              <li key={h.seed} className="rounded-xl p-3" style={{ border: '1px solid var(--line)' }}>
                <div className="flex items-center gap-2">
                  <span className="font-black">{h.title}</span>
                  <span className="geez" lang="am">{h.familyIds.map(familyChar).join(' ')}</span>
                  <button type="button" aria-label="Delete homework" onClick={() => removeHw(h)} className="ml-auto" style={muted}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                </div>
                <div className="mt-1 text-sm" style={muted}>Due {h.due} · <b style={{ color: 'var(--ink)' }}>{h.turnedIn} turned in</b> · {h.missing} {h.overdue ? 'missing' : 'not yet'}</div>
                <div className="mt-2"><CopyButton text={homeworkUrl({ code: cls.code, teacher, homework: h })} label="Copy homework link" /></div>
              </li>
            ))}
            {!hw.length && <li className="text-sm" style={muted}>No homework yet.</li>}
          </ul>
          <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--line)' }}><HomeworkForm code={cls.code} onMade={load} /></div>
        </Card>
        <Card>
          <h3 className="flex items-center gap-2 font-black"><AlertTriangle className="h-5 w-5" aria-hidden="true" /> Class trouble letters</h3>
          <p className="mt-1 text-sm" style={muted}>Letters missed most in turned-in homework. Review them in the next live lesson.</p>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(data?.trouble || []).map((x) => (
              <li key={x.id} className="rounded-xl p-2 text-center" style={{ border: '1px solid var(--line)' }}>
                <div className="geez text-3xl font-black" lang="am">{familyChar(x.id)}</div>
                <div className="text-xs" style={muted}>{x.misses} misses · {x.students} students</div>
              </li>
            ))}
          </ul>
          {data && !data.trouble.length && <p className="mt-2 text-sm" style={muted}>Nothing yet.</p>}
          <div className="mt-6"><button type="button" onClick={removeClass} className="text-sm font-bold underline" style={{ color: '#c0392b' }}>Delete this class</button></div>
        </Card>
      </div>
    </div>
  )
}

function ConsentNotice() {
  return (
    <details className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
      <summary className="flex cursor-pointer items-center gap-2 font-black"><ShieldCheck className="h-5 w-5" aria-hidden="true" /> Parent consent notice and privacy note (draft) [LEGAL REVIEW]</summary>
      <div className="mt-3 space-y-3 text-sm leading-relaxed">
        <p className="font-bold">[LEGAL REVIEW] Draft only - not yet reviewed by a lawyer. Send this to parents before they join.</p>
        <p><b>To parents and guardians:</b> Your child’s teacher uses eGeez to follow class progress. If you join the class, the eGeez app on your device will share, with this teacher only:</p>
        <ul className="list-disc pl-5">
          <li>the nickname you type (please use a first name or nickname, not a full name);</li>
          <li>daily learning counts: minutes practised (including prayer-book minutes), sessions, questions answered and correct;</li>
          <li>homework results: score and which letter families were missed.</li>
        </ul>
        <p>We do <b>not</b> collect your child’s email, birthday, photo, voice, location or any free text, and there is no chat. You join only by choice, after the grown-up gate.</p>
        <p><b>Your choices:</b> you can leave the class at any time in the app’s grown-up area; the teacher can remove your child, which deletes their results. Deleting a class deletes all its data. Ask us to delete data any time at {CONTACT_EMAIL}.</p>
        <p><b>Privacy note [LEGAL REVIEW]:</b> data is stored by eGeez (PromiseChain [CONFIRM legal name]) on our server [CONFIRM host and region], used only to show this class dashboard, never sold or used for ads, and daily rows older than 62 days are not accepted. [LEGAL REVIEW: COPPA verifiable parental consent method, GDPR-K / UK AADC, retention period, school-official exception, data processing terms for parishes.]</p>
        <p>By joining, I confirm I am the child’s parent or guardian and agree to share the above with the teacher.</p>
      </div>
    </details>
  )
}

export default function ClassDashboard() {
  const [authed, setAuthed] = useState(signedIn())
  const [me, setMe] = useState(null)
  const [classes, setClasses] = useState([])
  const [open, setOpen] = useState(null)
  const [form, setForm] = useState({ name: '', goalMin: 20 })
  const [err, setErr] = useState('')
  const [sent, setSent] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const m = await apiFetch('/api/auth/me'); setMe(m.user || m)
      if ((m.user || m).role !== 'teacher') return
      setClasses((await apiFetch('/api/practice/classes')).classes)
      setErr('')
    } catch (x) { if (x.status === 401) setAuthed(false); else setErr(x.message) }
  }, [])
  useEffect(() => { if (authed && API_URL) refresh() }, [authed, refresh])

  const create = async (e) => {
    e.preventDefault()
    try { const { class: c } = await apiFetch('/api/practice/classes', { method: 'POST', body: form }); setForm({ name: '', goalMin: 20 }); await refresh(); setOpen(c) } catch (x) { setErr(x.message) }
  }

  const head = <Seo title="Teacher dashboard - eGeez" description="Sign in to manage your eGeez classes: class codes, invite links, homework and a live roster of student progress." path="/classes" noindex />
  if (!API_URL) {
    return (<div className="mx-auto max-w-xl px-6 pt-16 text-center">{head}
      <h1 className="display-2">Teacher dashboard - coming soon</h1>
      <p className="lede mt-3" style={muted}>We are getting the online class dashboard ready for parishes and Sunday schools. Until then, Teacher Mode in the app already lets you run a class with links: open the app, go to Grown-ups, then Teacher.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3"><CtaButton href={APP_URL} tone="green">Open the app</CtaButton><CtaButton href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Teacher dashboard - tell me when it opens')}`} tone="ghost">Tell me when it opens</CtaButton></div>
    </div>)
  }
  return (
    <div className="mx-auto max-w-5xl px-5 pt-10 sm:px-6">{head}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="display-2">Teacher dashboard</h1>
        {authed && <button type="button" onClick={() => { signOut(); setAuthed(false); setMe(null); setOpen(null) }} className="ml-auto inline-flex items-center gap-1 text-sm font-bold" style={muted}><LogOut className="h-4 w-4" aria-hidden="true" /> Sign out</button>}
      </div>
      {!authed && <SignIn onDone={() => setAuthed(true)} />}
      {authed && me && me.role !== 'teacher' && <Card>This account is a parent account. Create a teacher account to run classes.</Card>}
      {authed && me && me.role === 'teacher' && !me.emailVerified && (
        <Card className="mb-5">
          <p className="font-bold">Confirm your email to create classes.</p>
          <p className="mt-1 text-sm" style={muted}>We sent a link to {me.email}.</p>
          <div className="mt-3"><CtaButton tone="ghost" onClick={async () => { try { await apiFetch('/api/auth/resend-verification', { method: 'POST' }); setSent(true) } catch (x) { setErr(x.message) } }}>{sent ? 'Sent - check your inbox' : 'Send the link again'}</CtaButton></div>
        </Card>
      )}
      {err && <p className="mb-4 text-sm font-bold" style={{ color: '#c0392b' }}>{err}</p>}
      {authed && me?.role === 'teacher' && (open
        ? <ClassView cls={open} teacher={me.name} onBack={() => setOpen(null)} onChanged={refresh} />
        : (
          <div className="grid gap-5 md:grid-cols-[1fr_320px]">
            <div className="grid gap-3">
              {classes.map((c) => (
                <button type="button" key={c.code} onClick={() => setOpen(c)} className="text-left">
                  <Card><div className="flex items-center gap-3"><span className="text-lg font-black">{c.name}</span><span className="ml-auto font-mono font-black tracking-widest" style={muted}>{c.code}</span></div>
                    <div className="mt-1 text-sm" style={muted}>Daily goal {c.goalMin} min · open roster →</div></Card>
                </button>
              ))}
              {!classes.length && <Card><p style={muted}>No classes yet. Create your first class.</p></Card>}
            </div>
            <Card>
              <h2 className="font-black">New class</h2>
              <form onSubmit={create} className="mt-3 grid gap-3">
                <Field label="Class name"><input required maxLength={40} className={inputCls} style={inputStyle} placeholder="St. Mary Sunday school" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Daily goal (minutes)"><input type="number" min={5} max={180} className={inputCls} style={inputStyle} value={form.goalMin} onChange={(e) => setForm({ ...form, goalMin: Number(e.target.value) })} /></Field>
                <CtaButton type="submit" tone="green" disabled={!me.emailVerified}><Plus className="h-4 w-4" aria-hidden="true" /> Create class</CtaButton>
              </form>
            </Card>
          </div>
        ))}
      <div className="mt-8"><ConsentNotice /></div>
    </div>
  )
}
