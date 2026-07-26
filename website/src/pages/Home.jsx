import { Sparkles, Users, BookOpen, Radio } from 'lucide-react'
import { Section, Card, CtaButton, LetterTile, Tibeb, Reveal } from '../components.jsx'
import { APP_URL } from '../config.js'
import { t } from '../i18n.js'

const HERO_TILES = ['ሀ', 'ለ', 'መ', 'ሠ', 'ረ', 'ሰ', 'በ', 'ተ']

export default function Home() {
  return (
    <>
      {/* hero: message left, the real app right */}
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 pb-6 pt-10 sm:px-6 md:grid-cols-[1.15fr_0.85fr] md:pt-16 lg:gap-14">
        <div className="text-center md:text-left">
          <Reveal>
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2 md:justify-start" aria-hidden="true">
              {HERO_TILES.map((ch, i) => <LetterTile key={i} ch={ch} size={i % 3 === 1 ? 48 : 38} float delay={i * 0.06} />)}
            </div>
            <h1 className="display-1">
              {t('heroTitle', 'Their language. Their story.')}{' '}
              <span style={{ color: 'var(--accent)' }}>{t('heroTitle2', 'Learned at home.')}</span>
            </h1>
            <p className="lede mx-auto mt-5 max-w-xl md:mx-0" style={{ color: 'var(--muted)' }}>
              {t('heroLede', 'eGeez is a learning home for Ethiopian and Eritrean families anywhere in the world: a joyful app that teaches kids to read Amharic and Tigrinya, tools for remote teachers, and guidance for homeschooling - the first step toward learning every subject, together.')}
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center md:justify-start">
              <CtaButton href={APP_URL} tone="green">{t('heroCta', 'Start learning free')}</CtaButton>
              <CtaButton to="/teachers" tone="ghost">{t('heroCtaTeach', 'Teach with us')}</CtaButton>
            </div>
            <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>{t('heroNote', 'Works offline. No account needed to start. Made for ages 3-9.')}</p>
          </Reveal>
        </div>
        <Reveal delay={0.15} className="relative mx-auto w-full max-w-[290px] md:max-w-[320px]">
          <img src="/art/anbessa-cheer.png" width={150} height={150} alt="" aria-hidden="true"
            className="absolute -left-16 -top-10 z-10 hidden w-[130px] md:block lg:w-[150px]" />
          <div className="phone">
            <img src="/shots/app-journey.png" width={780} height={1688} alt={t('heroShotAlt', 'The eGeez journey: a winding path of golden letter tiles')} loading="eager" />
          </div>
        </Reveal>
      </div>

      <Tibeb className="mt-8" />

      {/* the two languages */}
      <Section eyebrow={t('langsEyebrow', 'Two languages, one script')} title={t('langsTitle', 'Start with the fidel your family speaks')} center mark="ፊ">
        <div className="grid gap-5 md:grid-cols-2">
          <Reveal>
            <Card wash className="h-full">
              <div className="flex items-center gap-3">
                <LetterTile ch="አ" size={46} />
                <div>
                  <h3 className="display-3">{t('amCard', 'Amharic')} · <span className="geez">አማርኛ</span></h3>
                  <p className="text-xs font-black" style={{ color: 'var(--go-ink)' }}>{t('amStatus', 'Available now')}</p>
                </div>
              </div>
              <p className="mt-3 leading-relaxed" style={{ color: 'var(--muted)' }}>
                {t('amBlurb', 'A complete journey: all 231 letters, first words, decodable stories, tracing, songs, arcade games, and a daily practice loop - taught by Anbessa the lion cub and friends.')}
              </p>
              <div className="mt-5"><CtaButton to="/amharic" tone="gold">{t('amCta', 'See the Amharic journey')}</CtaButton></div>
            </Card>
          </Reveal>
          <Reveal delay={0.08}>
            <Card className="h-full">
              <div className="flex items-center gap-3">
                <LetterTile ch="ት" size={46} />
                <div>
                  <h3 className="display-3">{t('tiCard', 'Tigrinya')} · <span className="geez">ትግርኛ</span></h3>
                  <p className="text-xs font-black" style={{ color: 'var(--accent)' }}>{t('tiStatus', 'Foundations now · full course coming')}</p>
                </div>
              </div>
              <p className="mt-3 leading-relaxed" style={{ color: 'var(--muted)' }}>
                {t('tiBlurb', 'Tigrinya shares the Ge’ez script - the letter foundations kids learn today carry straight over. The full Tigrinya course (names, words, stories, audio) is in the works.')}
              </p>
              <div className="mt-5"><CtaButton to="/tigrinya" tone="gold">{t('tiCta', 'Tigrinya plans + waitlist')}</CtaButton></div>
            </Card>
          </Reveal>
        </div>
      </Section>

      {/* how it works for families */}
      <Section eyebrow={t('howEyebrow', 'How it works')} title={t('howTitle', 'A school day that fits in a family day')} center mark="ቤ">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            [Sparkles, t('how1t', 'Kids play the journey'), t('how1b', 'One winding path of lessons, games, and stories. Ten joyful minutes a day; streaks, rewards, and a lion cub who cheers them on.')],
            [Users, t('how2t', 'Grown-ups see progress'), t('how2b', 'A grown-ups corner shows what was learned, what needs review, and a ready-made plan for the week - no teaching degree required.')],
            [Radio, t('how3t', 'Teachers guide from anywhere'), t('how3b', 'Remote teachers send class links, assignments, and live class games; the app returns receipts of what each child mastered.')],
          ].map(([Icon, title, body], i) => (
            <Reveal key={i} delay={i * 0.07}>
              <Card className="h-full">
                <Icon className="h-7 w-7" style={{ color: 'var(--accent)' }} aria-hidden="true" />
                <h3 className="mt-3 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* bigger picture */}
      <Section eyebrow={t('visionEyebrow', 'Where this is going')} title={t('visionTitle', 'From one alphabet to a whole homeschool')} center mark="ትም">
        <p className="lede mx-auto max-w-2xl text-center" style={{ color: 'var(--muted)' }}>
          {t('visionBody', 'Language is the door. Behind it we are building a facilitator for online learning: more subjects, vetted remote teachers, structured terms, and resources that let any family run a real school week from their living room - wherever in the world they live.')}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm font-bold" style={{ color: 'var(--muted)' }}>
          {[t('vis1', 'Languages - now'), t('vis2', 'Teacher-guided classes - rolling out'), t('vis3', 'More subjects - next')].map((s, i) => (
            <span key={i} className="rounded-full px-4 py-1.5" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>{s}</span>
          ))}
        </div>
        <div className="mt-8 text-center">
          <CtaButton to="/about" tone="ghost">{t('visionCta', 'Read the full vision')}</CtaButton>
        </div>
      </Section>

      {/* teacher band */}
      <div className="mx-auto max-w-5xl px-5 pb-6 sm:px-6">
        <Reveal>
          <Card wash className="relative overflow-hidden text-center">
            <img src="/art/kokeb.png" width={90} height={90} alt="" aria-hidden="true" className="absolute -right-4 -top-4 w-16 opacity-90 md:w-20" />
            <BookOpen className="mx-auto h-8 w-8" style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <h2 className="display-2 mt-3">{t('teachBandT', 'Do you teach Amharic or Tigrinya?')}</h2>
            <p className="lede mx-auto mt-2 max-w-xl" style={{ color: 'var(--muted)' }}>
              {t('teachBandB', 'Classroom tools are already live: class invite links, assignments with receipts, a term planner, a TV display mode, and group games like Class Bingo. Bring your students - or find new ones through us.')}
            </p>
            <div className="mt-6"><CtaButton to="/teachers" tone="green">{t('teachBandCta', 'Apply to teach')}</CtaButton></div>
          </Card>
        </Reveal>
      </div>
    </>
  )
}
