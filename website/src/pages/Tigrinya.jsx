import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Section, Card, CtaButton, LetterTile, Field, inputCls, inputStyle } from '../components.jsx'
import { APP_URL } from '../config.js'
import { submitForm } from '../api.js'
import { t } from '../i18n.js'

export default function Tigrinya() {
  const [form, setForm] = useState({ name: '', email: '' })
  const [state, setState] = useState({ status: 'idle', error: '' })

  const submit = async (e) => {
    e.preventDefault()
    setState({ status: 'busy', error: '' })
    try {
      await submitForm('/api/waitlist', { ...form, language: 'ti' }, 'Tigrinya waitlist - eGeez')
      setState({ status: 'done', error: '' })
    } catch (err) {
      setState({ status: 'idle', error: err.message })
    }
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-6 pt-14 text-center">
        <div className="mb-5 flex justify-center gap-2" aria-hidden="true">
          {['ት', 'ግ', 'ር', 'ኛ'].map((ch, i) => <LetterTile key={i} ch={ch} size={48} />)}
        </div>
        <h1 className="text-4xl font-black md:text-5xl" style={{ textWrap: 'balance' }}>{t('tiTitle', 'Tigrinya at eGeez')}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
          {t('tiLede', 'Tigrinya is written in the same Ge’ez script as Amharic - so a Tigrinya-speaking family can start today, and the full Tigrinya course is on its way.')}
        </p>
      </div>

      <Section eyebrow={t('tiNowEyebrow', 'Available today')} title={t('tiNowTitle', 'What already carries over')}>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            [t('tiN1t', 'The script itself'), t('tiN1b', 'Letter shapes, the seven vowel orders, tracing, and sound-to-symbol play - the foundations of reading any Ge’ez-script language.')],
            [t('tiN2t', 'The learning engine'), t('tiN2b', 'The journey, games, streaks, review, and teacher tools all work identically - only the words and voices are language-specific.')],
            [t('tiN3t', 'Honest labeling'), t('tiN3b', 'Where content is Amharic-specific (letter names, example words, stories) the app says so - no pretending, no confusion.')],
          ].map(([title, body], i) => (
            <Card key={i}>
              <CheckCircle2 className="h-6 w-6" style={{ color: 'var(--go-ink)' }} aria-hidden="true" />
              <h3 className="mt-3 font-black">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-6 text-center">
          <CtaButton href={APP_URL} tone="ghost">{t('tiTry', 'Try the script foundations now')}</CtaButton>
        </div>
      </Section>

      <Section eyebrow={t('tiSoonEyebrow', 'Coming')} title={t('tiSoonTitle', 'The full Tigrinya course')} center>
        <p className="mx-auto max-w-2xl text-center leading-relaxed" style={{ color: 'var(--muted)' }}>
          {t('tiSoonBody', 'Tigrinya letter names and chants, first words and decodable stories in Tigrinya, native-speaker audio, and Tigrinya-speaking teachers in the classroom tools. Join the waitlist and we will tell you the moment it opens - and you will help us decide what to build first.')}
        </p>

        <Card className="mx-auto mt-8 max-w-md">
          {state.status === 'done' ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-9 w-9" style={{ color: 'var(--go-ink)' }} aria-hidden="true" />
              <h3 className="mt-2 font-black">{t('tiThanks', 'You are on the list!')}</h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{t('tiThanksB', 'We will email you when Tigrinya opens.')}</p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <Field label={t('fName', 'Name (optional)')}>
                <input className={inputCls} style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
              </Field>
              <Field label={t('fEmail', 'Email')}>
                <input className={inputCls} style={inputStyle} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
              </Field>
              {state.error && <p className="text-sm font-bold" role="alert" style={{ color: '#e06c4f' }}>{state.error}</p>}
              <CtaButton type="submit" tone="green" className="justify-center">
                {state.status === 'busy' ? t('fSending', 'Sending…') : t('tiJoin', 'Join the Tigrinya waitlist')}
              </CtaButton>
            </form>
          )}
        </Card>
      </Section>
    </>
  )
}
