import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Section, Card, CtaButton, Field, inputCls, inputStyle, LetterTile } from '../components.jsx'
import { submitForm } from '../api.js'
import { t } from '../i18n.js'

export default function About() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [state, setState] = useState({ status: 'idle', error: '' })

  const submit = async (e) => {
    e.preventDefault()
    setState({ status: 'busy', error: '' })
    try {
      await submitForm('/api/contact', form, 'Contact - eGeez website')
      setState({ status: 'done', error: '' })
    } catch (err) {
      setState({ status: 'idle', error: err.message })
    }
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-6 pt-14 text-center">
        <div className="mb-5 flex justify-center gap-2" aria-hidden="true">
          {['ፊ', 'ደ', 'ል'].map((ch, i) => <LetterTile key={i} ch={ch} size={46} />)}
        </div>
        <h1 className="display-1" style={{ textWrap: 'balance' }}>{t('abTitle', 'Why we are building this')}</h1>
      </div>

      <Section>
        <div className="mx-auto max-w-2xl space-y-5 text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
          <p>{t('abP1', 'Millions of Ethiopian and Eritrean families live far from home. Their children grow up brilliant in the language of school - and quiet in the language of their grandparents. The fidel, one of the world’s oldest writing systems, deserves better than to fade a generation at a time.')}</p>
          <p>{t('abP2', 'We started with the hardest, most important piece: a way for a small child to fall in love with the alphabet. That is eGeez - a journey through all 231 letters that feels like play, works offline on any phone, and treats a child’s attention and privacy as sacred.')}</p>
          <p>{t('abP3', 'But an app alone is not a school. Families need rhythm, resources, and real teachers. So we are building the facilitator around the app: classroom tools that already work today, remote teachers joining through this site, Tigrinya next, and then - subject by subject - everything a homeschooling family needs to learn together, guided from anywhere.')}</p>
          <p className="font-bold" style={{ color: 'var(--ink)' }}>{t('abP4', 'Language first. School next. Family always.')}</p>
        </div>
      </Section>

      <Section mark="ል" eyebrow={t('abContactEyebrow', 'Contact')} title={t('abContactTitle', 'Talk to us')} center>
        <Card className="mx-auto max-w-xl">
          {state.status === 'done' ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-9 w-9" style={{ color: 'var(--go-ink)' }} aria-hidden="true" />
              <h3 className="mt-2 font-black">{t('abThanks', 'Message sent!')}</h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{t('abThanksB', 'We will get back to you by email.')}</p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4 text-left">
              <Field label={t('fName2', 'Full name')}>
                <input className={inputCls} style={inputStyle} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
              </Field>
              <Field label={t('fEmail', 'Email')}>
                <input className={inputCls} style={inputStyle} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
              </Field>
              <Field label={t('fMessage2', 'Message')}>
                <textarea className={inputCls} style={inputStyle} rows={4} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              </Field>
              {state.error && <p className="text-sm font-bold" role="alert" style={{ color: '#e06c4f' }}>{state.error}</p>}
              <CtaButton type="submit" tone="green" className="justify-center">
                {state.status === 'busy' ? t('fSending', 'Sending…') : t('abSend', 'Send message')}
              </CtaButton>
            </form>
          )}
        </Card>
      </Section>
    </>
  )
}
