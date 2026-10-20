/* The /pricing page for the free-download model. Only shown when
   FREE_PRICING is on (config.js). Not live yet. */
import { Check } from 'lucide-react'
import { Card, Section, StoreButtons } from '../components.jsx'
import { NEW_PRICES, APP_URL } from '../config.js'
import Seo from '../Seo.jsx'
import { t } from '../i18n.js'

const TIERS = [
  { name: 'eGeez Core', price: NEW_PRICES.core, note: 'one time', items: ['All 231 fidel, words, stories, tracing, chants and games', 'Bible books', 'Grown-ups corner and progress reports', 'Works offline, no ads'] },
  { name: 'ጸሎት · Prayer book', price: NEW_PRICES.prayer, note: 'one time, free trial first', items: ['ጸሎት ዘዘወትር and ውዳሴ ማርያም for every day', 'Traditional reading marks', 'Read aloud in a church teacher’s voice'] },
  { name: 'Core + Prayer bundle', price: NEW_PRICES.bundle, note: 'one time - save $2.99', items: ['Everything in Core', 'The full prayer book'], best: true },
]

export default function PricingFree() {
  return (
    <>
      <Seo title="Pricing - eGeez" description="Free to download. Core $12.99, the prayer book $9.99 with a free trial, or both for $19.99. ጸሎት ዘዘወትር and today’s ውዳሴ ማርያም are free forever." path="/pricing" />
      <div className="mx-auto max-w-3xl px-6 pt-14 text-center">
        <h1 className="display-1">{t('pfTitle', 'Free to download. Pay once for what you use.')}</h1>
        <p className="lede mt-4" style={{ color: 'var(--muted)' }}>{t('pfLede', 'Download eGeez free on the App Store and Google Play. Unlock Core, the prayer book, or both - one-time purchases, no subscriptions, no ads.')}</p>
        <StoreButtons className="mt-6" center />
      </div>
      <Section>
        <Card wash className="mb-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: 'var(--accent-text)' }}>{t('pfFreeE', 'Free forever')}</p>
          <p className="geez mt-1 text-2xl font-black">ጸሎት ዘዘወትር + {t('pfToday', 'today’s')} ውዳሴ ማርያም</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{t('pfFreeB', 'The daily prayer, and the Praises of Mary for the day of the week, are always free - no purchase needed.')}</p>
        </Card>
        <div className="grid gap-4 md:grid-cols-3">
          {TIERS.map((x) => (
            <Card key={x.name} className={x.best ? 'ring-2' : ''}>
              <h2 className="text-lg font-black">{x.name}</h2>
              <p className="mt-1 text-3xl font-black" style={{ color: 'var(--accent-text)' }}>{x.price}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{x.note}</p>
              <ul className="mt-3 space-y-1.5 text-sm">{x.items.map((i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--go)' }} aria-hidden="true" />{i}</li>)}</ul>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-center text-sm" style={{ color: 'var(--muted)' }}>{t('pfWeb', 'On a computer? Try it free at')} <a className="font-bold underline" href={APP_URL}>easygeez.com/app</a>.</p>
      </Section>
    </>
  )
}
