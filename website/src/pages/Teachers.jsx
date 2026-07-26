import { useState } from 'react'
import { Link2, ClipboardList, CalendarRange, MonitorPlay, Grid3x3, CheckCircle2 } from 'lucide-react'
import { Section, Card, CtaButton, Field, inputCls, inputStyle } from '../components.jsx'
import { submitForm } from '../api.js'
import { t } from '../i18n.js'
import Seo from '../Seo.jsx'

const LANGS = [
  ['am', 'Amharic'],
  ['ti', 'Tigrinya'],
  ['other', 'Other'],
]

export default function Teachers() {
  const [form, setForm] = useState({ name: '', email: '', languages: [], subjects: '', location: '', experience: '', message: '' })
  const [state, setState] = useState({ status: 'idle', error: '' })

  const toggleLang = (id) => setForm((f) => ({
    ...f, languages: f.languages.includes(id) ? f.languages.filter((l) => l !== id) : [...f.languages, id],
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
            [CalendarRange, t('teT3t', 'Term Plan'), t('teT3b', 'A syllabus organizer that lays your term out week by week over the journey - review packs included.')],
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
              <Field label={t('fSubjects', 'Subjects / focus (e.g. reading, conversation, culture)')}>
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
              {state.error && <p className="text-sm font-bold" role="alert" style={{ color: '#e06c4f' }}>{state.error}</p>}
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
