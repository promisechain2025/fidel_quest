import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CtaButton, Reveal } from '../components.jsx'
import { API_URL } from '../config.js'
import { t } from '../i18n.js'
import Seo from '../Seo.jsx'

/* Consumes the email-verification token from the link we send on register
   (/verify?token=...). The token is single-use; the API marks the account
   verified. No auth needed - the token itself is the proof. */
export default function Verify() {
  const [state, setState] = useState({ status: 'working', error: '' })

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token') || ''
    if (!token) { setState({ status: 'error', error: t('vrNoToken', 'This link is missing its verification code.') }); return }
    if (!API_URL) { setState({ status: 'error', error: t('vrNoApi', 'Verification is not available yet.') }); return }
    fetch(`${API_URL}/api/auth/verify`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }),
    })
      .then((r) => r.json().catch(() => ({})).then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => setState(ok
        ? { status: 'done', error: '' }
        : { status: 'error', error: j.error || t('vrFailed', 'This verification link is invalid or already used.') }))
      .catch(() => setState({ status: 'error', error: t('vrNetwork', 'Could not reach the server. Try again in a moment.') }))
  }, [])

  return (
    <div className="mx-auto max-w-xl px-5 pb-10 pt-16 text-center sm:px-6">
      <Seo title="Confirm your email - eGeez" description="Confirm your eGeez account email." path="/verify" />
      <Reveal>
        {state.status === 'working' && (
          <p className="lede" style={{ color: 'var(--muted)' }}>{t('vrWorking', 'Confirming your email…')}</p>
        )}
        {state.status === 'done' && (
          <Card className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12" style={{ color: 'var(--go-ink)' }} aria-hidden="true" />
            <h1 className="display-2 mt-3">{t('vrDoneT', 'Email confirmed')}</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              {t('vrDoneB', 'Your account is verified. You can now request introductions and, if you teach, answer them.')}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <CtaButton to="/family" tone="green">{t('vrGoFamily', 'Go to your family dashboard')}</CtaButton>
              <CtaButton to="/teach" tone="ghost">{t('vrGoTeach', 'Teacher dashboard')}</CtaButton>
            </div>
          </Card>
        )}
        {state.status === 'error' && (
          <Card className="text-center">
            <AlertCircle className="mx-auto h-12 w-12" style={{ color: 'var(--danger)' }} aria-hidden="true" />
            <h1 className="display-2 mt-3">{t('vrErrT', 'We could not confirm this link')}</h1>
            <p className="mt-2 text-sm font-bold" role="alert" style={{ color: 'var(--danger)' }}>{state.error}</p>
            <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>
              {t('vrErrB', 'Sign in and use "Resend confirmation email" to get a fresh link.')}
            </p>
            <div className="mt-5"><CtaButton to="/family" tone="green">{t('vrGoSignIn', 'Sign in')}</CtaButton></div>
            <p className="mt-3 text-sm"><Link to="/" className="underline" style={{ color: 'var(--muted)' }}>{t('vrHome', 'Back to home')}</Link></p>
          </Card>
        )}
      </Reveal>
    </div>
  )
}
