import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Copy, Check, Mail } from 'lucide-react'
import { Card, CtaButton, Reveal } from '../components.jsx'
import { API_URL, APP_URL, CONTACT_EMAIL } from '../config.js'
import { t } from '../i18n.js'

const STEPS = {
  app: [
    ['fpsA1', 'Open eGeez - when it asks about buying, tap for a grown-up.'],
    ['fpsA2', 'Choose "Have a code?" and enter it.'],
    ['fpsA3', 'That is it - the whole journey is unlocked. The same code works in the store apps too.'],
  ],
  family_pack: [
    ['fpsS1', 'Open eGeez and tap the Grown-ups corner.'],
    ['fpsS2', 'Choose Family Pack and enter the code.'],
    ['fpsS3', 'Add a profile for each child - up to six.'],
  ],
}

/* Polls the order endpoint with backoff until the webhook (or the inline
   fallback) has minted the code. */
export default function PricingSuccess() {
  const [params] = useSearchParams()
  const sessionId = params.get('session_id') || ''
  const [state, setState] = useState({ status: 'loading', code: '', product: 'app', error: '' })
  const [copied, setCopied] = useState(false)
  const tries = useRef(0)

  useEffect(() => { document.title = 'Your unlock code - eGeez' }, [])

  useEffect(() => {
    if (!sessionId || !API_URL) {
      setState((s) => ({ ...s, status: 'error', error: t('fpsNoSession', 'Missing order reference. Check the email receipt for your code.') }))
      return undefined
    }
    let stop = false
    const poll = async () => {
      if (stop) return
      tries.current += 1
      try {
        const res = await fetch(`${API_URL}/api/pay/order/${encodeURIComponent(sessionId)}`)
        const json = await res.json().catch(() => ({}))
        if (res.ok && json.status === 'paid' && json.code) {
          setState({ status: 'done', code: json.code, product: json.product || 'app', error: '' })
          return
        }
        if (res.status === 404 || res.status === 400) throw new Error(t('fpsNotFound', 'We could not find this order.'))
      } catch (err) {
        if (tries.current > 8) { setState((s) => ({ ...s, status: 'error', error: err.message })); return }
      }
      if (tries.current > 12) {
        setState((s) => ({ ...s, status: 'error', error: t('fpsSlow', 'This is taking longer than usual. Your code will arrive by email - or contact us.') }))
        return
      }
      setTimeout(poll, Math.min(1000 * 2 ** Math.floor(tries.current / 3), 8000))
    }
    poll()
    return () => { stop = true }
  }, [sessionId])

  const copy = async () => {
    try { await navigator.clipboard.writeText(state.code); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* older browsers */ }
  }
  const steps = STEPS[state.product] || STEPS.app

  return (
    <div className="mx-auto max-w-xl px-5 pb-10 pt-12 text-center sm:px-6 md:pt-16">
      <Reveal>
        <img src="/art/anbessa-cheer.png" width={120} height={120} alt="" aria-hidden="true" className="mx-auto" />
        <h1 className="display-2 mt-4">{t('fpsTitle', 'Thank you! Anbessa is cheering.')}</h1>
      </Reveal>

      <Reveal delay={0.1}>
        <Card className="mt-7 text-left">
          {state.status === 'loading' && (
            <div className="py-6 text-center">
              <p className="font-black">{t('fpsWait', 'Fetching your unlock code…')}</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{t('fpsWaitB', 'Usually a second or two.')}</p>
            </div>
          )}
          {state.status === 'done' && (
            <>
              <p className="text-center text-xs font-black uppercase tracking-[0.2em]" style={{ color: 'var(--accent)' }}>
                {state.product === 'family_pack' ? t('fpsCodeLabelPack', 'Your Family Pack code') : t('fpsCodeLabelApp', 'Your eGeez unlock code')}
              </p>
              <div className="mt-3 flex items-center justify-center gap-3">
                <span className="rounded-2xl px-5 py-3 text-3xl font-black tracking-[0.14em]"
                  style={{ background: 'var(--paper)', border: '2px solid var(--accent)', color: 'var(--ink)' }}>
                  {state.code}
                </span>
                <button type="button" onClick={copy} aria-label={t('fpsCopy', 'Copy code')} className="chunk p-3"
                  style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)' }}>
                  {copied ? <Check className="h-5 w-5" style={{ color: 'var(--go-ink)' }} aria-hidden="true" /> : <Copy className="h-5 w-5" aria-hidden="true" />}
                </button>
              </div>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs" style={{ color: 'var(--muted)' }}>
                <Mail className="h-3.5 w-3.5" aria-hidden="true" /> {t('fpsEmailed', 'Also sent to your email - keep it for reinstalls.')}
              </p>
              <ol className="mt-6 space-y-3 text-sm leading-relaxed">
                {steps.map(([key, fallback], i) => (
                  <li key={key} className="flex gap-3">
                    <span className="lt flex-none" style={{ width: 26, height: 26, fontSize: 13, fontFamily: 'inherit' }}>{i + 1}</span>
                    <span>{t(key, fallback)}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-6 text-center">
                <CtaButton href={APP_URL} tone="green">{t('fpsOpen', 'Open eGeez now')}</CtaButton>
              </div>
            </>
          )}
          {state.status === 'error' && (
            <div className="py-4 text-center">
              <p className="font-black" role="alert">{state.error}</p>
              <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
                {t('fpsHelp', 'Need a hand?')}{' '}
                <a className="underline" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('eGeez order help')}&body=${encodeURIComponent(`Order reference: ${sessionId}`)}`}>{CONTACT_EMAIL}</a>
              </p>
            </div>
          )}
        </Card>
      </Reveal>

      <p className="mt-6 text-sm" style={{ color: 'var(--muted)' }}>
        <Link to="/pricing" className="underline">{t('fpsBackPr', 'Back to pricing')}</Link>
      </p>
    </div>
  )
}
