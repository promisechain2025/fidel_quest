import { useState } from 'react'
import { Users, KeyRound, WifiOff, RefreshCcw, Check, Sparkles } from 'lucide-react'
import { Section, Card, CtaButton, Reveal } from '../components.jsx'
import { API_URL, CONTACT_EMAIL, APP_URL } from '../config.js'
import Seo from '../Seo.jsx'
import { t } from '../i18n.js'

export const APP_PRICE = '$12.99'
export const PACK_PRICE = '$4.99'

const PRICING_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Product', name: 'eGeez - the whole journey', description: 'One-time unlock of the full Amharic learning journey on web and mobile.', offers: { '@type': 'Offer', price: '12.99', priceCurrency: 'USD' } },
    { '@type': 'Product', name: 'eGeez Family Pack', description: 'One-time add-on: separate profiles for up to 6 children on one device.', offers: { '@type': 'Offer', price: '4.99', priceCurrency: 'USD' } },
  ],
}

function BuyButton({ product, label, dormantSetter, dormant }) {
  const [state, setState] = useState({ status: 'idle', error: '' })
  const buy = async () => {
    setState({ status: 'busy', error: '' })
    try {
      const res = await fetch(`${API_URL}/api/pay/checkout`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ product }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 503 && json.dormant) { dormantSetter(true); setState({ status: 'idle', error: '' }); return }
      if (!res.ok || !json.url) throw new Error(json.error || 'Could not start checkout. Please try again.')
      window.location.href = json.url
    } catch (err) {
      setState({ status: 'idle', error: err.message })
    }
  }
  if (dormant) {
    return (
      <div className="rounded-2xl p-4 text-center text-sm font-bold" style={{ background: 'var(--paper)', border: '2px dashed var(--line)', color: 'var(--muted)' }}>
        {t('prSoon', 'Web checkout opens very soon.')}{' '}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('eGeez - notify me when checkout opens')}`}>{t('prNotify', 'Email us to be notified')}</a>
      </div>
    )
  }
  return (
    <>
      <CtaButton onClick={buy} tone="green" className="w-full" disabled={state.status === 'busy'}>
        {state.status === 'busy' ? t('prStarting', 'Opening secure checkout…') : label}
      </CtaButton>
      {state.error && <p className="mt-2 text-center text-sm font-bold" role="alert" style={{ color: 'var(--danger)' }}>{state.error}</p>}
    </>
  )
}

export default function Pricing() {
  const [dormant, setDormant] = useState(!API_URL)

  return (
    <>
      <Seo title="Pricing - eGeez" description="Try free, then $12.99 once for the whole journey - on web and in the stores, never pay twice. Family Pack add-on $4.99." path="/pricing" jsonLd={PRICING_LD} />
      <div className="mx-auto max-w-5xl px-5 pt-12 text-center sm:px-6 md:pt-16">
        <Reveal>
          <img src="/art/anbessa-cheer.png" width={110} height={110} alt="" aria-hidden="true" className="mx-auto" />
          <h1 className="display-1 mx-auto mt-4 max-w-2xl">{t('prTitle', 'Pay once. Learn everywhere. Never twice.')}</h1>
          <p className="lede mx-auto mt-4 max-w-2xl" style={{ color: 'var(--muted)' }}>
            {t('prLede', 'Try eGeez free. Then one purchase unlocks the whole journey - on the web and in the mobile apps, delivered as a code that works on every platform. Add-on packs sit on top, the same way.')}
          </p>
        </Reveal>
      </div>

      <Section mark="ገ" className="pt-8">
        <div className="mx-auto grid max-w-4xl items-stretch gap-5 md:grid-cols-2">
          <Reveal>
            <Card wash className="flex h-full flex-col" >
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
                <Sparkles className="h-4 w-4" aria-hidden="true" /> {t('prAppTag', 'The app')}
              </div>
              <h2 className="display-3 mt-2">{t('prAppName', 'eGeez - the whole journey')}</h2>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="display-2">{APP_PRICE}</span>
                <span className="text-sm font-bold" style={{ color: 'var(--muted)' }}>{t('prOnce', 'once - no subscription')}</span>
              </div>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed">
                {[
                  t('prA1', 'All 231 letters, words, stories, games, streaks, and the daily coach'),
                  t('prA2', 'Free try-out first - fall in love before you pay'),
                  t('prA3', 'One code unlocks web AND the store apps - never pay twice'),
                  t('prA4', '100% offline, no ads, no accounts, no child data'),
                ].map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--go-ink)' }} aria-hidden="true" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex-1" />
              <BuyButton product="app" label={t('prBuyApp', `Get eGeez - ${APP_PRICE}`)} dormant={dormant} dormantSetter={setDormant} />
              <p className="mt-2.5 text-center text-xs" style={{ color: 'var(--muted)' }}>{t('prStripe', 'Secure payment by Stripe - cards, Apple Pay, Google Pay.')}</p>
            </Card>
          </Reveal>

          <Reveal delay={0.08}>
            <Card className="flex h-full flex-col">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
                <Users className="h-4 w-4" aria-hidden="true" /> {t('prPackTag', 'Add-on pack')}
              </div>
              <h2 className="display-3 mt-2">{t('prPackName', 'Family Pack')}</h2>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="display-2">{PACK_PRICE}</span>
                <span className="text-sm font-bold" style={{ color: 'var(--muted)' }}>{t('prOnce', 'once - no subscription')}</span>
              </div>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed">
                {[
                  [Users, t('prP1', 'Up to 6 child profiles - each with their own journey, streak, and closet')],
                  [KeyRound, t('prP2', 'Its own code (FAM), redeemed once in the Grown-ups corner')],
                  [WifiOff, t('prP3', 'Still fully offline after unlock')],
                  [RefreshCcw, t('prP4', 'Survives reinstalls - keep the email, reuse the code')],
                ].map(([Icon, s], i) => (
                  <li key={i} className="flex gap-3">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--go-ink)' }} aria-hidden="true" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs font-bold" style={{ color: 'var(--muted)' }}>
                {t('prPackNote', 'More packs are coming the same way - the Tigrinya course among them. Own the app once; add what your family needs.')}
              </p>
              <div className="mt-4 flex-1" />
              <BuyButton product="family_pack" label={t('prBuyPack', `Add the Family Pack - ${PACK_PRICE}`)} dormant={dormant} dormantSetter={setDormant} />
            </Card>
          </Reveal>
        </div>
      </Section>

      <Section eyebrow={t('prFaqE', 'Questions')} title={t('prFaqT', 'Fair questions, straight answers')} center mark="ጥ">
        <div className="mx-auto grid max-w-3xl gap-4">
          {[
            [t('prQ0', 'Can we try it before paying?'), t('prA0', `Yes - the journey starts free, no account needed. After the free days the app asks (gently, once a day) to be bought. Kids are never blocked mid-lesson.`)],
            [t('prQ1', 'Will I ever pay twice - web and app store?'), t('prA1x', 'No. Buying here gives you an EGZ code that unlocks the app on the web AND in the iOS/Android builds. Buying inside the store app restores through your store account. One family, one payment.')],
            [t('prQ2', 'What exactly costs extra?'), t('prA2x', `Only add-on packs. ${APP_PRICE} buys the entire Amharic journey for one learner. The Family Pack (${PACK_PRICE}) adds sibling profiles; future language packs will be add-ons too.`)],
            [t('prQ3', 'Does it work offline?'), t('prA3x', 'Completely. Codes are checked on the device; after unlock nothing ever needs a connection.')],
            [t('prQ4', 'Refunds?'), t('prA4x', `If it does not work for your family, email ${CONTACT_EMAIL} within 14 days and we will refund you - no forms, no fuss.`)],
          ].map(([q, a], i) => (
            <Reveal key={i} delay={i * 0.05}>
              <Card>
                <h3 className="font-black">{q}</h3>
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{a}</p>
              </Card>
            </Reveal>
          ))}
        </div>
        <div className="mt-8 text-center">
          <CtaButton href={APP_URL} tone="ghost">{t('prTry', 'Start the free try-out')}</CtaButton>
        </div>
      </Section>
    </>
  )
}
