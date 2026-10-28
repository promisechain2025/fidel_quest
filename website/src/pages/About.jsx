import { Section, Card, CtaButton, LetterTile } from '../components.jsx'
import { t } from '../i18n.js'
import Seo from '../Seo.jsx'
import { APP_URL, COMPANY_NAME, CONTACT_EMAIL } from '../config.js'

/* Short About: mission, founder, company, contact. Copy marked [CONFIRM]
   in comments needs the owner's sign-off before launch. */
export default function About() {
  return (
    <>
      <Seo title="About eGeez - why a church teacher built it" description="eGeez is built by a church teacher who has taught many deacons, so every child in the diaspora can read the fidel, the prayers and their language." path="/about" />
      <div className="mx-auto max-w-3xl px-6 pt-14 text-center">
        <div className="mb-5 flex justify-center gap-2" aria-hidden="true">
          {['ግ', 'ዕ', 'ዝ'].map((ch) => <LetterTile key={ch} ch={ch} size={46} />)}
        </div>
        <h1 className="display-1" style={{ textWrap: 'balance' }}>{t('abTitle2', 'Built by a church teacher')}</h1>
        <p className="lede mt-5" style={{ color: 'var(--muted)' }}>
          {t('abLede2', 'eGeez exists so that every child of our community - in Asmara, Addis Ababa, or a city far from home - can read the fidel, pray the prayers of the Church, and speak with their grandparents.')}
        </p>
      </div>

      <Section mark="ሀ" eyebrow={t('abMissionE', 'Our mission')} title={t('abMissionT', 'Ge’ez, Tigrinya and Amharic for the next generation')}>
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <h3 className="text-lg font-black">{t('abFounderH', 'The founder')}</h3>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              {/* [CONFIRM] founder name, parish, and years of teaching */}
              {t('abFounderB', 'eGeez was started by a teacher in the Orthodox Tewahedo Church who has taught the fidel, Ge’ez reading and the prayers to many deacons. The reading marks, the prayer book and the recordings in the app come from that classroom, in his own voice.')}
            </p>
          </Card>
          <Card>
            <h3 className="text-lg font-black">{t('abWhyH', 'Why an app')}</h3>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              {t('abWhyB', 'Most diaspora children get one hour of Sunday school a week. Ten minutes a day at home - with real recordings and a teacher who can follow along - turns that hour into reading. No ads, no child data, and it works offline.')}
            </p>
          </Card>
        </div>
      </Section>

      <Section mark="ደ" eyebrow={t('abCoE', 'Who we are')} title={t('abCoT', 'The company and how to reach us')}>
        <Card>
          <p className="text-sm leading-relaxed">
            {/* [CONFIRM] legal name, entity type and state */}
            {t('abCoB', `eGeez is made by ${COMPANY_NAME}. Parishes, Sunday schools, teachers and supporters can write to us any time.`)}
          </p>
          <p className="mt-3 text-sm font-bold"><a className="underline" href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent-text)' }}>{CONTACT_EMAIL}</a></p>
          <div className="mt-5 flex flex-wrap gap-3">
            <CtaButton to="/teachers" tone="green">{t('abTeach', 'For teachers and parishes')}</CtaButton>
            <CtaButton href={APP_URL} tone="ghost">{t('openApp', 'Open the app')}</CtaButton>
          </div>
        </Card>
      </Section>
    </>
  )
}
