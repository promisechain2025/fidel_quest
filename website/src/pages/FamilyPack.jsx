import { useEffect, useState } from 'react'
import { Users, KeyRound, WifiOff, RefreshCcw } from 'lucide-react'
import { Section, Card, CtaButton, Reveal } from '../components.jsx'
import { API_URL, CONTACT_EMAIL } from '../config.js'
import { t } from '../i18n.js'

const PRICE = '$4.99'

export default function FamilyPack() {
  const [state, setState] = useState({ status: 'idle', error: '' })
  const [dormant, setDormant] = useState(!API_URL)

  useEffect(() => {
    document.title = 'Family Pack - eGeez'
  }, [])

  const buy = async () => {
    setState({ status: 'busy', error: '' })
    try {
      const res = await fetch(`${API_URL}/api/pay/checkout`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
      const json = await res.json().catch(() => ({}))
      if (res.status === 503 && json.dormant) { setDormant(true); setState({ status: 'idle', error: '' }); return }
      if (!res.ok || !json.url) throw new Error(json.error || 'Could not start checkout. Please try again.')
      window.location.href = json.url
    } catch (err) {
      setState({ status: 'idle', error: err.message })
    }
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-5 pt-12 text-center sm:px-6 md:pt-16">
        <Reveal>
          <img src="/art/anbessa-cheer.png" width={110} height={110} alt="" aria-hidden="true" className="mx-auto" />
          <h1 className="display-1 mx-auto mt-4 max-w-2xl">{t('fpTitle', 'One family. Every child. One unlock.')}</h1>
          <p className="lede mx-auto mt-4 max-w-xl" style={{ color: 'var(--muted)' }}>
            {t('fpLede', 'The whole eGeez journey is free for one learner. The Family Pack gives every child in the house their own path, streaks, and rewards - on the same device.')}
          </p>
        </Reveal>
      </div>

      <Section mark="ቤ" className="pt-8">
        <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-[1.1fr_1fr]">
          <Reveal>
            <Card wash className="flex h-full flex-col">
              <div className="flex items-baseline gap-2">
                <span className="display-2">{PRICE}</span>
                <span className="text-sm font-bold" style={{ color: 'var(--muted)' }}>{t('fpOnce', 'once - no subscription')}</span>
              </div>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed">
                {[
                  [Users, t('fpB1', 'Up to 6 child profiles, each with their own journey, streak, and closet')],
                  [KeyRound, t('fpB2', 'Delivered as an unlock code - enter it once in the app, done')],
                  [WifiOff, t('fpB3', 'Still 100% offline after unlock - no account, no tracking, ever')],
                  [RefreshCcw, t('fpB4', 'Code survives reinstalls; keep the email and reuse it')],
                ].map(([Icon, text], i) => (
                  <li key={i} className="flex gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--go-ink)' }} aria-hidden="true" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex-1" />
              {dormant ? (
                <div className="rounded-2xl p-4 text-center text-sm font-bold" style={{ background: 'var(--paper)', border: '2px dashed var(--line)', color: 'var(--muted)' }}>
                  {t('fpSoon', 'Web checkout opens very soon.')}{' '}
                  <a className="underline" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Family Pack - notify me')}`}>{t('fpNotify', 'Email us to be notified')}</a>
                </div>
              ) : (
                <>
                  <CtaButton onClick={buy} tone="green" className="w-full" disabled={state.status === 'busy'}>
                    {state.status === 'busy' ? t('fpStarting', 'Opening secure checkout…') : t('fpBuy', `Get the Family Pack - ${PRICE}`)}
                  </CtaButton>
                  <p className="mt-2.5 text-center text-xs" style={{ color: 'var(--muted)' }}>{t('fpStripe', 'Secure payment by Stripe - cards, Apple Pay, Google Pay.')}</p>
                  {state.error && <p className="mt-2 text-center text-sm font-bold" role="alert" style={{ color: '#e06c4f' }}>{state.error}</p>}
                </>
              )}
            </Card>
          </Reveal>
          <Reveal delay={0.1}>
            <Card className="h-full">
              <h2 className="display-3">{t('fpHowT', 'How it works')}</h2>
              <ol className="mt-4 space-y-4 text-sm leading-relaxed">
                {[
                  t('fpH1', 'Pay once with card, Apple Pay, or Google Pay.'),
                  t('fpH2', 'Your unlock code appears right away - and lands in your email.'),
                  t('fpH3', 'In eGeez: Grown-ups corner, then Family Pack, enter the code.'),
                  t('fpH4', 'Add a profile for each child. Everyone gets their own journey.'),
                ].map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="lt flex-none" style={{ width: 28, height: 28, fontSize: 14, fontFamily: 'inherit' }}>{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </Reveal>
        </div>
      </Section>

      <Section eyebrow={t('fpFaqE', 'Questions')} title={t('fpFaqT', 'Fair questions, straight answers')} center mark="ጥ">
        <div className="mx-auto grid max-w-3xl gap-4">
          {[
            [t('fpQ1', 'Is the app itself free?'), t('fpA1', 'Yes - the full learning journey is free for one learner. The Family Pack only adds separate profiles for siblings.')],
            [t('fpQ2', 'I already bought the app on the App Store.'), t('fpA2', 'The paid store download and the Family Pack are separate things; on iOS/Android you can also buy the pack inside the app so it restores through the store.')],
            [t('fpQ3', 'Does it work offline?'), t('fpA3', 'Completely. The code check happens on the device; after unlock nothing ever needs a connection.')],
            [t('fpQ4', 'Refunds?'), t('fpA4', `If it does not work for your family, email ${CONTACT_EMAIL} within 14 days and we will refund you - no forms, no fuss.`)],
          ].map(([q, a], i) => (
            <Reveal key={i} delay={i * 0.05}>
              <Card>
                <h3 className="font-black">{q}</h3>
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{a}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  )
}
