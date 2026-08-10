/* The guides hub and the guide renderer. Both read src/guides.js, so the
   prose has one home and every guide gets the same heading structure. */
import { useParams, Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Section, Card, CtaButton, Reveal } from '../components.jsx'
import { GUIDES, guideBySlug } from '../guides.js'
import { APP_URL } from '../config.js'
import { t } from '../i18n.js'
import Seo from '../Seo.jsx'

export function GuidesIndex() {
  return (
    <>
      <Seo
        title="Guides for parents - eGeez"
        description="Practical guides for teaching a child the Amharic fidel at home: where to start, how the Ge’ez script works, and what helps in the diaspora."
        path="/guides"
      />
      <div className="mx-auto max-w-3xl px-5 pt-12 text-center sm:px-6 md:pt-16">
        <Reveal>
          <h1 className="display-1">{t('gdTitle', 'Guides for parents')}</h1>
          <p className="lede mx-auto mt-4 max-w-2xl" style={{ color: 'var(--muted)' }}>
            {t('gdLede', 'Written to be useful whether or not you ever install anything of ours. No sign-up, no email gate.')}
          </p>
        </Reveal>
      </div>

      <Section mark="መ" className="pt-8">
        <div className="mx-auto grid max-w-3xl gap-4">
          {GUIDES.map((g, i) => (
            <Reveal key={g.slug} delay={i * 0.05}>
              <Card wash>
                <h2 className="display-3">
                  <Link to={`/guides/${g.slug}`} className="rounded hover:underline">{g.title}</Link>
                </h2>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{g.lede}</p>
                <Link to={`/guides/${g.slug}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-black" style={{ color: 'var(--accent-text)' }}>
                  {t('gdRead', 'Read it')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>
    </>
  )
}

export default function Guide() {
  const { slug } = useParams()
  const g = guideBySlug(slug)

  if (!g) {
    return (
      <div className="mx-auto max-w-xl px-6 pt-16 text-center">
        <Seo title="Guide not found - eGeez" description="That guide is not one of ours. See the full list of parent guides for teaching the Amharic fidel at home." path={`/guides/${slug || ''}`} noindex />
        <h1 className="display-2">{t('gdMissing', 'That guide does not exist')}</h1>
        <div className="mt-6"><CtaButton to="/guides">{t('gdAll', 'See all guides')}</CtaButton></div>
      </div>
    )
  }

  return (
    <>
      <Seo title={g.metaTitle} description={g.metaDescription} path={`/guides/${g.slug}`} />
      <article className="mx-auto max-w-2xl px-5 pb-4 pt-12 sm:px-6 md:pt-16">
        <Reveal>
          <Link to="/guides" className="text-sm font-bold" style={{ color: 'var(--muted)' }}>{t('gdBack', 'Guides')}</Link>
          <h1 className="display-1 mt-2">{g.title}</h1>
          <p className="lede mt-4" style={{ color: 'var(--muted)' }}>{g.lede}</p>
        </Reveal>

        {g.sections.map((s, i) => (
          <Reveal key={i} delay={0.03}>
            <section className="mt-10">
              <h2 className="display-3">{s.h}</h2>
              {(s.p || []).map((para, j) => (
                <p key={j} className="mt-3 leading-relaxed" style={{ color: 'var(--muted)' }}>{para}</p>
              ))}
              {s.list && (
                <ul className="mt-3 space-y-2">
                  {s.list.map((item, j) => (
                    <li key={j} className="flex gap-3 leading-relaxed" style={{ color: 'var(--muted)' }}>
                      <span aria-hidden="true" style={{ color: 'var(--accent-text)' }}>&bull;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              {s.cta && <div className="mt-4"><CtaButton to={s.cta.to} tone="ghost">{s.cta.label}</CtaButton></div>}
            </section>
          </Reveal>
        ))}

        <Reveal>
          <div className="mt-12 rounded-2xl p-6 text-center" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <p className="font-black">{t('gdCtaT', 'Want the ten minutes handled for you?')}</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              {t('gdCtaB', 'eGeez walks a child through the whole fidel one step at a time, voiced, offline, with the first two letter families free forever.')}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <CtaButton href={APP_URL} tone="green">{t('gdCtaA', 'Start the free try-out')}</CtaButton>
              <CtaButton to="/guides" tone="ghost">{t('gdCtaC', 'More guides')}</CtaButton>
            </div>
          </div>
        </Reveal>
      </article>
    </>
  )
}
