import { Check, Apple, Play, Ban } from 'lucide-react'
import { Card, CtaButton, Picture, Reveal, Section } from '../components.jsx'
import { APP_PRICE, APP_STORE_URL, PLAY_STORE_URL, CONTACT_EMAIL } from '../config.js'
import Seo from '../Seo.jsx'
import { t } from '../i18n.js'

/* eGeez is PAID UPFRONT: one purchase in the App Store or Google Play, and
   everything is included. There is nothing to buy inside the app - no
   in-app purchases, no subscriptions, no add-on packs, no unlock codes. The
   price itself is set in App Store Connect / Play Console; APP_PRICE must
   match it. */
export { APP_PRICE }

const INCLUDED = [
  'Every learning path - all 231 fidel, first words, read-along stories, tracing, chants and games',
  'The Bible books and every story, unlocked from day one',
  'Kids profiles for up to 6 children, each with their own journey, streak and closet',
  'The grown-ups corner: progress reports, pace settings and family voice recordings',
  'Fully offline, with no account needed',
]

const NEVER = [
  'No ads',
  'No subscriptions',
  'No in-app purchases',
  'No child data collected',
]

const offer = (url) => ({
  '@type': 'Offer',
  price: '12.99',
  priceCurrency: 'USD',
  url,
  availability: 'https://schema.org/InStock',
})

/* Structured data: ONE product, one price, sold only through the two stores.
   No add-on products. */
export const PRICING_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'eGeez',
      image: 'https://easygeez.com/og.png',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'iOS, Android',
      description: 'A one-time $12.99 purchase on the App Store and Google Play. Everything included: all learning paths, the Bible books, and kids profiles for up to 6 children. No ads, no subscriptions, no in-app purchases.',
      offers: [offer(APP_STORE_URL), offer(PLAY_STORE_URL)],
    },
  ],
}

export default function Pricing() {
  return (
    <>
      <Seo title="Pricing - eGeez" description="One-time $12.99 on the App Store and Google Play. Everything included, kids profiles for up to 6 children. No ads, no subscriptions, no in-app purchases." path="/pricing" jsonLd={PRICING_LD} />
      <div className="mx-auto max-w-5xl px-5 pt-12 text-center sm:px-6 md:pt-16">
        <Reveal>
          <Picture src="/art/anbessa-cheer.png" width={110} height={110} alt="" aria-hidden="true" className="mx-auto" />
          <h1 className="display-1 mx-auto mt-4 max-w-2xl">{t('prTitle', 'One price. Everything included.')}</h1>
          <p className="lede mx-auto mt-4 max-w-2xl" style={{ color: 'var(--muted)' }}>
            {t('prLede', `eGeez is a one-time ${APP_PRICE} purchase on the App Store and Google Play. Pay once when you download, and the whole app is yours - nothing more to buy, ever.`)}
          </p>
        </Reveal>
      </div>

      <Section mark="ገ" className="pt-8">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <Card wash className="flex flex-col">
              <h2 className="display-3">{t('prAppName', 'eGeez - the whole journey')}</h2>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="display-2">{APP_PRICE}</span>
                <span className="text-sm font-bold" style={{ color: 'var(--muted)' }}>{t('prOnce', 'one time, on the App Store and Google Play')}</span>
              </div>
              <h3 className="mt-5 text-xs font-black uppercase tracking-[0.18em]" style={{ color: 'var(--accent-text)' }}>{t('prIncl', 'Everything included')}</h3>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed">
                {INCLUDED.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--go-ink)' }} aria-hidden="true" />
                    <span>{t(`prI${i}`, s)}</span>
                  </li>
                ))}
              </ul>
              <ul className="mt-5 grid grid-cols-2 gap-2 text-sm font-bold">
                {NEVER.map((s, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Ban className="h-4 w-4 shrink-0" style={{ color: 'var(--muted)' }} aria-hidden="true" />
                    <span>{t(`prN${i}`, s)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <CtaButton href={APP_STORE_URL} tone="green" external>
                  <Apple className="h-5 w-5" aria-hidden="true" /> {t('prIos', 'App Store')}
                </CtaButton>
                <CtaButton href={PLAY_STORE_URL} tone="green" external>
                  <Play className="h-5 w-5" aria-hidden="true" /> {t('prAndroid', 'Google Play')}
                </CtaButton>
              </div>
              <p className="mt-3 text-center text-xs" style={{ color: 'var(--muted)' }}>
                {t('prStoreNote', 'Paid and refunded through your App Store or Google Play account.')}
              </p>
            </Card>
          </Reveal>
        </div>
      </Section>

      <Section eyebrow={t('prFaqE', 'Questions')} title={t('prFaqT', 'Fair questions, straight answers')} center mark="ጥ">
        <div className="mx-auto grid max-w-3xl gap-4">
          {[
            [t('prQ1', 'Is there anything to buy inside the app?'), t('prA1x', `No. ${APP_PRICE} at download is the whole price. There are no in-app purchases, no subscriptions, no add-on packs and no ads - every path, every Bible book and every game is unlocked from the start.`)],
            [t('prQ2', 'How many children can use it?'), t('prA2x', 'Up to 6 kids profiles on one device are included, each with their own journey, streak and closet. A child picks their profile when the app opens.')],
            [t('prQ3', 'Does it work offline?'), t('prA3x', 'Completely. Once it is downloaded, nothing ever needs a connection and there is no account to create.')],
            [t('prQ4', 'Do I pay again on a new phone?'), t('prA4x', 'Not on the same store account: the App Store and Google Play let you download a purchased app again for free. Each store sells its own copy, so an iPhone and an Android phone are bought separately.')],
            [t('prQ5', 'Refunds?'), t('prA5x', `Purchases are made through Apple or Google, so refunds follow their policy - request one from your App Store or Google Play account. If something is not working, email ${CONTACT_EMAIL} and we will help.`)],
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
