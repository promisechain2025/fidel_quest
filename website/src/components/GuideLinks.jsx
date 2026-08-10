/* ============================================================================
   GUIDE LINKS — "read next" strip for pages that answer a nearby question
   ----------------------------------------------------------------------------
   A guide nobody links to is a guide nobody reads. This pulls the title and
   lede straight out of src/guides.js so a page can point at a guide by slug
   and never carry a stale copy of its title. An unknown slug renders nothing
   rather than an empty card, so deleting a guide cannot leave a dead link.
   ========================================================================== */
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Section, Card, Reveal } from '../components.jsx'
import { guideBySlug } from '../guides.js'
import { t } from '../i18n.js'

export default function GuideLinks({ slugs = [], eyebrow, title, mark = 'ጉ' }) {
  const guides = slugs.map(guideBySlug).filter(Boolean)
  if (!guides.length) return null

  return (
    <Section
      mark={mark}
      eyebrow={eyebrow || t('glEyebrow', 'Read next')}
      title={title || t('glTitle', 'Guides for parents')}
      center
    >
      <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-2">
        {guides.map((g, i) => (
          <Reveal key={g.slug} delay={i * 0.05}>
            <Card wash>
              <h3 className="font-black">
                <Link to={`/guides/${g.slug}`} className="rounded hover:underline">{g.title}</Link>
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{g.lede}</p>
              <Link
                to={`/guides/${g.slug}`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-black"
                style={{ color: 'var(--accent-text)' }}
              >
                {t('gdRead', 'Read it')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Card>
          </Reveal>
        ))}
      </div>
      <div className="mt-6 text-center">
        <Link to="/guides" className="text-sm font-black" style={{ color: 'var(--accent-text)' }}>
          {t('glAll', 'See all guides')}
        </Link>
      </div>
    </Section>
  )
}
