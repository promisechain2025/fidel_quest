import { Check, Apple, Play, Ban, UserPlus } from 'lucide-react'
import { Card, CtaButton, Picture, Reveal, Section } from '../components.jsx'
import { APP_PRICE, SECOND_PROFILE_PRICE, EXTRA_PROFILE_PRICE, APP_STORE_URL, PLAY_STORE_URL, CONTACT_EMAIL } from '../config.js'
import Seo from '../Seo.jsx'
import { t } from '../i18n.js'

/* eGeez is PAID UPFRONT: one purchase in the App Store or Google Play buys
   every learning path, every Bible book and 1 kid profile. The only
   in-app purchases are extra kids profiles, one per child, bought in order:
   the 2nd child $4.99, each child after $2.49, up to 6 children. One-time
   (non-consumable, restorable) - no subscriptions, no unlock codes, no web
   checkout. The prices themselves are set in App Store Connect / Play
   Console; config.js must match them. */
export { APP_PRICE }

const INCLUDED = [
  'Every learning path - all 231 fidel, first words, read-along stories, tracing, chants and games',
  'The Bible books and every story, unlocked from day one',
  '1 kid profile with their own journey, streak and closet',
  'The grown-ups corner: progress reports, pace settings and family voice recordings',
  'Fully offline, with no account needed',
]

const NEVER = [
  'No ads',
  'No subscriptions',
  'No unlock codes',
  'No child data collected',
]

const PROFILES = [
  ['2nd child', SECOND_PROFILE_PRICE],
  ['3rd child', EXTRA_PROFILE_PRICE],
  ['4th child', EXTRA_PROFILE_PRICE],
  ['5th child', EXTRA_PROFILE_PRICE],
  ['6th child', EXTRA_PROFILE_PRICE],
]

const offer = (url, price, name) => ({
  '@type': 'Offer',
  ...(name ? { name } : {}),
  price,
  priceCurrency: 'USD',
  url,
  availability: 'https://schema.org/InStock',
})

/* Structured data: the app (one price, two stores) plus the extra kids
   profiles as in-app add-on offers. */
export const PRICING_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'eGeez',
      image: 'https://easygeez.com/og.png',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'iOS, Android',
      description: 'A one-time $12.99 purchase on the App Store and Google Play: all learning paths, the Bible books and 1 kid profile. Extra kids profiles are optional in-app purchases: $4.99 for a 2nd child, $2.49 for each child after, up to 6. No ads, no subscriptions.',
      offers: [
        offer(APP_STORE_URL, '12.99'),
        offer(PLAY_STORE_URL, '12.99'),
        {
          '@type': 'AggregateOffer',
          name: 'Extra kids profiles (in-app purchases, one per child)',
          lowPrice: '2.49',
          highPrice: '4.99',
          priceCurrency: 'USD',
          offerCount: 5,
          offers: [
            offer(APP_STORE_URL, '4.99', '2nd kid profile'),
            offer(APP_STORE_URL, '2.49', '3rd, 4th, 5th or 6th kid profile (each)'),
          ],
        },
      ],
    },
  ],
}

export default function Pricing() {
  return (
    <>
      <Seo title="Pricing - eGeez" description="One-time $12.99 with 1 kid profile. More children: $4.99 for a 2nd child, $2.49 for each child after, up to 6. No ads, no subscriptions." path="/pricing" jsonLd={PRICING_LD} />
      <div className="mx-auto max-w-5xl px-5 pt-12 text-center sm:px-6 md:pt-16">
        <Reveal>
          <Picture src="/art/anbessa-cheer.png" width={110} height={110} alt="" aria-hidden="true" className="mx-auto" />
          <h1 className="display-1 mx-auto mt-4 max-w-2xl">{t('prTitle2', 'One price for the whole journey.')}</h1>
          <p className="lede mx-auto mt-4 max-w-2xl" style={{ color: 'var(--muted)' }}>
            {t('prLede2', `eGeez is a one-time ${APP_PRICE} purchase on the App Store and Google Play: every path and every Bible book, with 1 kid profile. More children? ${SECOND_PROFILE_PRICE} for a 2nd child, ${EXTRA_PROFILE_PRICE} for each child after, up to 6.`)}
          </p>
        </Reveal>
      </div>

      <Section mark="ገ" className="pt-8">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1.4fr_1fr]">
          <Reveal>
            <Card wash className="flex h-full flex-col">
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
                    <span>{t(`prJ${i}`, s)}</span>
                  </li>
                ))}
              </ul>
              <ul className="mt-5 grid grid-cols-2 gap-2 text-sm font-bold">
                {NEVER.map((s, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Ban className="h-4 w-4 shrink-0" style={{ color: 'var(--muted)' }} aria-hidden="true" />
                    <span>{t(`prM${i}`, s)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto grid gap-3 pt-6 sm:grid-cols-2">
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
          <Reveal delay={0.08}>
            <Card className="flex h-full flex-col">
              <h2 className="display-3 flex items-center gap-2"><UserPlus className="h-6 w-6" aria-hidden="true" /> {t('prKidsT', 'More children')}</h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                {t('prKidsB', `Optional in-app purchase, one per child: ${SECOND_PROFILE_PRICE} for a 2nd child, ${EXTRA_PROFILE_PRICE} for each child after, up to 6. Each child gets their own journey, streak and closet on the device.`)}
              </p>
              <ul className="mt-4 divide-y text-sm font-bold" style={{ borderColor: 'var(--line)' }}>
                <li className="flex justify-between py-2"><span>{t('prKid1', '1st child')}</span><span style={{ color: 'var(--go-ink)' }}>{t('prKidIncl', 'included')}</span></li>
                {PROFILES.map(([who, price], i) => (
                  <li key={i} className="flex justify-between py-2"><span>{t(`prKid${i + 2}`, who)}</span><span>{price}</span></li>
                ))}
              </ul>
              <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                {t('prKidsNote', 'One-time purchases, no subscription. Unlocked in order from the grown-ups area, behind a parental gate, and restorable with Restore purchases. Already bought the Family Pack? All 6 profiles stay unlocked.')}
              </p>
            </Card>
          </Reveal>
        </div>
      </Section>

      <Section eyebrow={t('prFaqE', 'Questions')} title={t('prFaqT', 'Fair questions, straight answers')} center mark="ጥ">
        <div className="mx-auto grid max-w-3xl gap-4">
          {[
            [t('prQ1b', 'Is there anything to buy inside the app?'), t('prA1y', `Only extra kids profiles. ${APP_PRICE} at download unlocks every path, every Bible book and every game, with 1 kid profile. If more children will use the same device, a grown-up can add a 2nd child for ${SECOND_PROFILE_PRICE} and each child after for ${EXTRA_PROFILE_PRICE}, up to 6. No subscriptions, no ads.`)],
            [t('prQ2', 'How many children can use it?'), t('prA2y', 'Up to 6 kids profiles on one device, each with their own journey, streak and closet. The first is included; each extra child is a one-time in-app purchase. A child picks their profile when the app opens.')],
            [t('prQ3', 'Does it work offline?'), t('prA3x', 'Completely. Once it is downloaded, nothing ever needs a connection and there is no account to create.')],
            [t('prQ4', 'Do I pay again on a new phone?'), t('prA4y', 'Not on the same store account: the App Store and Google Play let you download a purchased app again for free, and Restore purchases brings back your extra kids profiles. Each store sells its own copy, so an iPhone and an Android phone are bought separately.')],
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
