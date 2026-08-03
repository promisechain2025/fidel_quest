import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Link2, ClipboardList, CalendarRange, MonitorPlay, Grid3x3, CheckCircle2, GraduationCap, MapPin, Star, TrendingUp, ShieldCheck, Users, School, Search } from 'lucide-react'
import { Section, Card, CtaButton, Field, inputCls, inputStyle, Reveal } from '../components.jsx'
import { submitForm } from '../api.js'
import { API_URL, APP_URL } from '../config.js'
import { SUBJECTS, SUBJECT_LABEL } from '../subjects.js'
import { t } from '../i18n.js'
import Seo from '../Seo.jsx'

const LANG_LABEL = { am: 'Amharic', ti: 'Tigrinya', other: 'Other' }

export function Stars({ avg, count }) {
  if (!count) return <span className="text-xs font-bold" style={{ color: 'var(--muted)' }}>{t('teNewTeacher', 'New on the board')}</span>
  return (
    <span className="inline-flex items-center gap-1 text-sm font-black" role="img" aria-label={`${avg} out of 5 stars from ${count} families`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className="h-4 w-4" aria-hidden="true"
          style={{ color: 'var(--star)', fill: i <= Math.round(avg) ? 'var(--star)' : 'transparent' }} />
      ))}
      <span className="ml-1">{avg}</span>
      <span className="font-bold" style={{ color: 'var(--muted)' }}>({count})</span>
    </span>
  )
}

/* Ask the platform to broker an introduction. Contacts are exchanged only
   if the teacher accepts - the form says so. */
function IntroForm({ te, onClose }) {
  const [childName, setChildName] = useState('')
  const [message, setMessage] = useState('')
  const [state, setState] = useState({ status: 'idle', error: '' })
  const send = async (e) => {
    e.preventDefault()
    setState({ status: 'busy', error: '' })
    try {
      const { apiFetch } = await import('../auth.js')
      await apiFetch(`/api/teachers/${te.id}/intros`, { method: 'POST', body: { childName, message } })
      setState({ status: 'done', error: '' })
    } catch (err) { setState({ status: 'idle', error: err.message }) }
  }
  if (state.status === 'done') {
    return (
      <div className="mt-3 rounded-xl p-3 text-sm font-bold" style={{ background: 'var(--go-soft)', color: 'var(--go-ink)', border: '1px solid var(--go)' }}>
        {t('inSent', 'Request sent! {n} will answer in their dashboard - you will get an email either way. Track it in your Family page.').replace('{n}', te.name)}
      </div>
    )
  }
  return (
    <form onSubmit={send} className="mt-3 flex flex-col gap-2">
      <input value={childName} onChange={(e) => setChildName(e.target.value.slice(0, 40))}
        placeholder={t('inChild', 'Child first name (optional)')} aria-label={t('inChildL', 'Child first name')}
        className="rounded-xl px-3 py-2.5 text-[16px]" style={{ background: 'var(--paper)', border: '2px solid var(--line)', color: 'var(--ink)' }} />
      <textarea required value={message} onChange={(e) => setMessage(e.target.value.slice(0, 1000))} rows={3}
        placeholder={t('inMsg', 'What are you looking for? Age, level, days that work…')} aria-label={t('inMsgL', 'Message to the teacher')}
        className="rounded-xl px-3 py-2.5 text-[16px]" style={{ background: 'var(--paper)', border: '2px solid var(--line)', color: 'var(--ink)' }} />
      {state.error && <p className="text-xs font-bold" role="alert" style={{ color: 'var(--danger)' }}>{state.error}</p>}
      <div className="flex gap-2">
        <CtaButton type="submit" tone="green" className="flex-1 !py-2.5 text-sm" disabled={state.status === 'busy'}>
          {state.status === 'busy' ? t('fSending', 'Sending…') : t('inSend', 'Send request')}
        </CtaButton>
        <button type="button" onClick={onClose} className="px-3 text-sm font-bold" style={{ color: 'var(--muted)' }}>{t('inCancel', 'Cancel')}</button>
      </div>
      <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
        {t('inPrivacy', 'Your contact is shared with the teacher only if they accept.')}
      </p>
    </form>
  )
}

function TeacherCard({ te }) {
  const [reviews, setReviews] = useState(null)
  const [asking, setAsking] = useState(false)
  const [authed, setAuthed] = useState(false)
  useEffect(() => { import('../auth.js').then((m) => setAuthed(m.signedIn())) }, [])
  const loadReviews = () => {
    if (reviews !== null) { setReviews(null); return }
    fetch(`${API_URL}/api/teachers/${te.id}/reviews`)
      .then((r) => (r.ok ? r.json() : { reviews: [] }))
      .then((j) => setReviews(j.reviews || []))
      .catch(() => setReviews([]))
  }
  return (
    <Card className="h-full">
      <div className="flex items-center gap-3">
        <span className="lt flex-none" style={{ width: 44, height: 44, fontSize: 20, fontFamily: 'inherit' }} aria-hidden="true">
          {te.name.trim()[0]?.toUpperCase() || '?'}
        </span>
        <div className="min-w-0">
          <h3 className="font-black">{te.name}</h3>
          <p className="text-xs font-bold" style={{ color: 'var(--accent)' }}>
            {(te.languages || []).map((l) => LANG_LABEL[l] || l).join(' · ')}
          </p>
        </div>
      </div>
      {(te.subjectTags || []).length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {te.subjectTags.map((s) => (
            <span key={s} className="rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={{ background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--muted)' }}>
              {SUBJECT_LABEL[s] || s}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3"><Stars avg={te.rating?.avg} count={te.rating?.count} /></div>
      {te.progress?.show && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black"
          style={{ background: 'var(--go-soft)', color: 'var(--go-ink)', border: '1px solid var(--go)' }}
          title={t('teVerifiedTip', 'Average new letters that families recorded for their children after linking this teacher.')}>
          <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
          {t('teVerified', '+{n} letters/child, reported by {k} families')
            .replace('{n}', te.progress.avgLettersGained).replace('{k}', te.progress.verified)}
        </p>
      )}
      {te.progress?.families > 0 && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--muted)' }}>
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {(te.progress.families === 1
            ? t('teFamilies1', 'Working with {k} family')
            : t('teFamiliesN', 'Working with {k} families')).replace('{k}', te.progress.families)}
        </p>
      )}
      {te.subjects && (
        <p className="mt-3 flex items-start gap-2 text-sm" style={{ color: 'var(--muted)' }}>
          <GraduationCap className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {te.subjects}
        </p>
      )}
      {te.location && (
        <p className="mt-1.5 flex items-start gap-2 text-sm" style={{ color: 'var(--muted)' }}>
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {te.location}
        </p>
      )}
      {te.rating?.count > 0 && (
        <button type="button" onClick={loadReviews} className="mt-3 text-xs font-bold underline" style={{ color: 'var(--muted)' }}>
          {reviews === null ? t('teShowReviews', 'What families say') : t('teHideReviews', 'Hide')}
        </button>
      )}
      {reviews && reviews.length > 0 && (
        <ul className="mt-2 space-y-2">
          {reviews.map((r, i) => (
            <li key={i} className="rounded-xl p-2.5 text-xs leading-relaxed" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
              <Stars avg={r.stars} count={1} /> <span style={{ color: 'var(--muted)' }}>{r.comment}</span>
            </li>
          ))}
        </ul>
      )}
      {reviews && reviews.length === 0 && (
        <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>{t('teNoComments', 'No written reviews yet.')}</p>
      )}
      <div className="mt-4">
        {asking ? (
          <IntroForm te={te} onClose={() => setAsking(false)} />
        ) : authed ? (
          <CtaButton onClick={() => setAsking(true)} tone="gold" className="w-full !py-2.5 text-sm">
            {t('inAsk', 'Request an introduction')}
          </CtaButton>
        ) : (
          <CtaButton to="/family" tone="ghost" className="w-full !py-2.5 text-sm">
            {t('inSignIn', 'Sign in to request an introduction')}
          </CtaButton>
        )}
      </div>
    </Card>
  )
}

/* The trust board: owner-vetted teachers with family ratings and
   family-reported progress (computed from linked children's own saved
   gameplay snapshots - real usage, gated on an accepted relationship, but
   reported by families, not independently audited). Renders once approved. */
function Directory() {
  const [teachers, setTeachers] = useState([])
  const [subject, setSubject] = useState('') // '' = all subjects
  useEffect(() => {
    if (!API_URL) return
    fetch(`${API_URL}/api/teachers`)
      .then((r) => (r.ok ? r.json() : { teachers: [] }))
      .then((j) => setTeachers(j.teachers || []))
      .catch(() => {})
  }, [])
  if (teachers.length === 0) return null
  // Only offer filters for subjects that actually appear on the board.
  const present = SUBJECTS.filter((s) => teachers.some((te) => (te.subjectTags || []).includes(s.id)))
  const shown = subject ? teachers.filter((te) => (te.subjectTags || []).includes(subject)) : teachers
  return (
    <Section mark="ት" eyebrow={t('teDirEyebrow', 'The teacher board')} title={t('teDirTitle', 'Vetted, rated, and progress-tracked')} center>
      {present.length > 0 && (
        <div className="mb-6 flex flex-wrap justify-center gap-2" role="group" aria-label={t('teFilterLabel', 'Filter teachers by subject')}>
          {[['', t('teFilterAll', 'All subjects')], ...present.map((s) => [s.id, s.label])].map(([id, label]) => (
            <button key={id || 'all'} type="button" onClick={() => setSubject(id)} aria-pressed={subject === id}
              className="rounded-full px-4 py-1.5 text-sm font-bold"
              style={subject === id
                ? { background: 'var(--accent)', color: '#241a05' }
                : { background: 'var(--card)', border: '2px solid var(--line)', color: 'var(--muted)' }}>
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((te) => <Reveal key={te.id}><TeacherCard te={te} /></Reveal>)}
      </div>
      {shown.length === 0 && (
        <p className="mt-4 text-center text-sm" style={{ color: 'var(--muted)' }}>
          {t('teNoneForSubject', 'No teachers listed for this subject yet.')}
        </p>
      )}
      <Card className="mx-auto mt-8 max-w-2xl">
        <h3 className="flex items-center gap-2 font-black">
          <ShieldCheck className="h-5 w-5" style={{ color: 'var(--go-ink)' }} aria-hidden="true" />
          {t('teHowT', 'How this board earns your trust')}
        </h3>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
          <li>{t('teHow1', 'Vetted: we review every teacher’s application before they appear here. We check their stated background - we do not run formal background checks, so meet and judge for yourself before hiring.')}</li>
          <li>{t('teHow2', 'Rated: stars come only from families who requested an introduction, had it accepted, and linked their child to the teacher - not from anonymous strangers.')}</li>
          <li>{t('teHow3', 'Progress-tracked: the green badge shows the average new letters that linked families recorded for their own children through normal app play after starting with this teacher. It only appears once at least two families have measurable gains. It is real usage - stronger than a testimonial - but it is reported by families through the app, not independently audited.')}</li>
        </ul>
      </Card>
      <p className="mt-6 text-center text-sm" style={{ color: 'var(--muted)' }}>
        {t('teDirNote2', 'Pick a teacher in your Family dashboard to link them with your child - rating unlocks after that.')}
        {' '}<Link to="/teach" className="font-bold underline">{t('teDash', 'On the board? Open your teacher dashboard')}</Link>
      </p>
    </Section>
  )
}

const LANGS = [
  ['am', 'Amharic'],
  ['ti', 'Tigrinya'],
  ['other', 'Other'],
]

/* The two teacher paths, stated up front so nobody has to guess which one
   they want - and so the "board has no responsibility" line for own-class
   teaching is clear before anyone applies. */
function TwoWays() {
  return (
    <Section mark="ሁ" eyebrow={t('teWaysEyebrow', 'Two ways to teach')} title={t('teWaysTitle', 'Bring your own class, or let families find you')} center>
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="flex h-full flex-col">
          <School className="h-7 w-7" style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <h3 className="mt-3 text-lg font-black">{t('teWayOwnT', 'Run your own class')}</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            {t('teWayOwnB', 'Already have students - a weekend school, a church group, your own tutoring? Use the classroom built into the app: register your students, send homework with due dates, and watch each child’s progress. It works offline, needs no accounts, and stays entirely on your device. No application, no waiting - you are in charge, and eGeez is just your tool.')}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <CtaButton href={APP_URL} tone="green" className="!py-2.5 text-sm">{t('teWayOwnCta', 'Open the app')}</CtaButton>
            <a href="#toolkit" className="self-center text-sm font-bold underline" style={{ color: 'var(--accent)' }}>{t('teWayOwnLink', 'See the classroom tools')}</a>
          </div>
        </Card>
        <Card className="flex h-full flex-col">
          <Search className="h-7 w-7" style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <h3 className="mt-3 text-lg font-black">{t('teWayBoardT', 'Get found by families')}</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            {t('teWayBoardB', 'Want new students? Join the teacher board. Families looking for face-to-face help find you, request an introduction, and eGeez brokers the first contact. You keep your rating and your track record here as families work with you.')}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="#apply" className="chunk inline-flex items-center rounded-2xl px-4 py-2.5 text-sm font-black"
              style={{ background: 'var(--accent)', color: '#241a05', boxShadow: '0 3px 0 var(--accent-deep)' }}>
              {t('teWayBoardCta', 'Apply to the board')}
            </a>
          </div>
        </Card>
      </div>
      <p className="mt-5 text-center text-sm" style={{ color: 'var(--muted)' }}>
        {t('teWaysBoth', 'You can do both - run your own class and take new families from the board.')}
      </p>
    </Section>
  )
}

export default function Teachers() {
  const [form, setForm] = useState({ name: '', email: '', languages: [], subjectTags: [], subjects: '', location: '', experience: '', message: '' })
  const [state, setState] = useState({ status: 'idle', error: '' })

  const toggleLang = (id) => setForm((f) => ({
    ...f, languages: f.languages.includes(id) ? f.languages.filter((l) => l !== id) : [...f.languages, id],
  }))
  const toggleSubject = (id) => setForm((f) => ({
    ...f, subjectTags: f.subjectTags.includes(id) ? f.subjectTags.filter((s) => s !== id) : [...f.subjectTags, id],
  }))

  const submit = async (e) => {
    e.preventDefault()
    setState({ status: 'busy', error: '' })
    try {
      await submitForm('/api/teachers/apply', form, 'Teacher application - eGeez')
      setState({ status: 'done', error: '' })
    } catch (err) {
      setState({ status: 'idle', error: err.message })
    }
  }

  return (
    <>
      <Seo title="Teach Amharic or Tigrinya remotely - eGeez" description="Class links, assignments with receipts, a term planner, TV display, and Class Bingo - a real classroom for remote teachers. Apply now." path="/teachers" />
      <div className="mx-auto max-w-5xl px-6 pt-14 text-center">
        <h1 className="display-1" style={{ textWrap: 'balance' }}>{t('teTitle', 'Teach the next generation - from anywhere')}</h1>
        <p className="lede mx-auto mt-4 max-w-2xl" style={{ color: 'var(--muted)' }}>
          {t('teLede', 'eGeez gives remote teachers a real classroom: your students play a curriculum that runs itself, and you guide, assign, and celebrate. Diaspora families are looking for you.')}
        </p>
      </div>

      <TwoWays />

      <span id="toolkit" className="block" aria-hidden="true" />
      <Section mark="መ" eyebrow={t('teToolsEyebrow', 'Already in the app')} title={t('teToolsTitle', 'Your classroom toolkit')}>
        <div className="mb-8 grid items-center gap-8 md:grid-cols-[0.9fr_1.1fr]">
          <div className="phone mx-auto w-full max-w-[260px]">
            <img src="/shots/app-bingo.png" width={780} height={1688} loading="lazy"
              alt={t('teShotAlt', 'Kokeb’s Bingo in the app: play solo, host for a class, or join a game')} />
          </div>
          <p className="lede text-center md:text-left" style={{ color: 'var(--muted)' }}>
            {t('teToolsLede', 'This is not a promise of future tools - it is a screenshot. Class Bingo, invite links, assignments with receipts, the term planner, and the TV display are in the app your students already have.')}
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            [Link2, t('teT1t', 'Class links'), t('teT1b', 'Invite a whole class with one link or QR - no student accounts, no passwords, works on any phone.')],
            [ClipboardList, t('teT2t', 'Assignments + receipts'), t('teT2b', 'Send a letter-range assignment; each child’s app returns a receipt of what they mastered. You see progress without collecting data.')],
            [CalendarRange, t('teT3t', 'Term Plan'), t('teT3b', 'A syllabus organizer that lays your term out week by week over the journey.')],
            [MonitorPlay, t('teT4t', 'TV classroom display'), t('teT4b', 'Project a big, chant-along display for in-person or video classes.')],
            [Grid3x3, t('teT5t', 'Class Bingo + group games'), t('teT5b', 'Host live listening games: you pick the letters and the winning shape, kids scan a QR for unique cards, and you call the letters - show or voice-only.')],
          ].map(([Icon, title, body], i) => (
            <Card key={i}>
              <Icon className="h-6 w-6" style={{ color: 'var(--accent)' }} aria-hidden="true" />
              <h3 className="mt-3 font-black">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{body}</p>
            </Card>
          ))}
          <Card>
            <h3 className="font-black" style={{ color: 'var(--accent)' }}>{t('teNextT', 'Coming for teachers')}</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              {t('teNextB', 'Public teacher profiles, family matching, and scheduling - apply now and you will be first in the directory when it opens.')}
            </p>
          </Card>
        </div>
      </Section>

      <Directory />

      <span id="apply" className="block" aria-hidden="true" />
      <Section mark="ም" eyebrow={t('teApplyEyebrow', 'Apply')} title={t('teApplyTitle', 'Tell us about your teaching')} center>
        <Card className="mx-auto max-w-xl">
          {state.status === 'done' ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-9 w-9" style={{ color: 'var(--go-ink)' }} aria-hidden="true" />
              <h3 className="mt-2 font-black">{t('teThanks', 'Application received!')}</h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{t('teThanksB', 'We read every application and will reply by email.')}</p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4 text-left">
              <Field label={t('fName2', 'Full name')}>
                <input className={inputCls} style={inputStyle} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
              </Field>
              <Field label={t('fEmail', 'Email')}>
                <input className={inputCls} style={inputStyle} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
              </Field>
              <fieldset>
                <legend className="mb-1.5 text-sm font-bold">{t('fLangs', 'Languages you teach')}</legend>
                <div className="flex flex-wrap gap-2">
                  {LANGS.map(([id, label]) => (
                    <button key={id} type="button" onClick={() => toggleLang(id)} aria-pressed={form.languages.includes(id)}
                      className="rounded-full px-4 py-1.5 text-sm font-bold"
                      style={form.languages.includes(id)
                        ? { background: 'var(--go-soft)', border: '2px solid var(--go)', color: 'var(--go-ink)' }
                        : { background: 'var(--paper)', border: '2px solid var(--line)', color: 'var(--muted)' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-1.5 text-sm font-bold">{t('fSubjectsL', 'Subjects you teach')}</legend>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map((s) => (
                    <button key={s.id} type="button" onClick={() => toggleSubject(s.id)} aria-pressed={form.subjectTags.includes(s.id)}
                      className="rounded-full px-4 py-1.5 text-sm font-bold"
                      style={form.subjectTags.includes(s.id)
                        ? { background: 'var(--go-soft)', border: '2px solid var(--go)', color: 'var(--go-ink)' }
                        : { background: 'var(--paper)', border: '2px solid var(--line)', color: 'var(--muted)' }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <Field label={t('fSubjects', 'Focus / details (e.g. conversational, grades 3-6, exam prep)')}>
                <input className={inputCls} style={inputStyle} value={form.subjects} onChange={(e) => setForm({ ...form, subjects: e.target.value })} />
              </Field>
              <Field label={t('fLocation', 'Where are you based? (city, timezone)')}>
                <input className={inputCls} style={inputStyle} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </Field>
              <Field label={t('fExperience', 'Your teaching experience')}>
                <textarea className={inputCls} style={inputStyle} rows={3} value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
              </Field>
              <Field label={t('fMessage', 'Anything else? (optional)')}>
                <textarea className={inputCls} style={inputStyle} rows={2} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              </Field>
              {state.error && <p className="text-sm font-bold" role="alert" style={{ color: 'var(--danger)' }}>{state.error}</p>}
              <CtaButton type="submit" tone="green" className="justify-center">
                {state.status === 'busy' ? t('fSending', 'Sending…') : t('teSubmit', 'Send application')}
              </CtaButton>
            </form>
          )}
        </Card>
      </Section>
    </>
  )
}
