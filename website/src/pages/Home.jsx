import { Link } from 'react-router-dom'
import { Sparkles, Users, BookOpen, Radio } from 'lucide-react'
import { Section, Card, CtaButton, LetterTile, Tibeb } from '../components.jsx'
import { APP_URL } from '../config.js'
import { t } from '../i18n.js'

const HERO_TILES = ['ሀ', 'ለ', 'መ', 'ሠ', 'ረ', 'ሰ', 'በ', 'ተ']

export default function Home() {
  return (
    <>
      {/* hero */}
      <div className="mx-auto max-w-5xl px-6 pb-4 pt-16 text-center md:pt-24">
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2" aria-hidden="true">
          {HERO_TILES.map((ch, i) => <LetterTile key={i} ch={ch} size={i % 3 === 1 ? 52 : 42} />)}
        </div>
        <h1 className="mx-auto max-w-3xl text-4xl font-black leading-tight md:text-6xl" style={{ textWrap: 'balance' }}>
          {t('heroTitle', 'Their language. Their story.')}{' '}
          <span style={{ color: 'var(--accent)' }}>{t('heroTitle2', 'Learned at home.')}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
          {t('heroLede', 'eGeez is a learning home for Ethiopian and Eritrean families anywhere in the world: a joyful app that teaches kids to read Amharic and Tigrinya, tools for remote teachers, and guidance for homeschooling - the first step toward learning every subject, together.')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <CtaButton href={APP_URL} tone="green">{t('heroCta', 'Start learning free')}</CtaButton>
          <CtaButton to="/teachers" tone="ghost">{t('heroCtaTeach', 'Teach with us')}</CtaButton>
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>{t('heroNote', 'Works offline. No account needed to start. Made for ages 3-9.')}</p>
      </div>

      <Tibeb className="mt-10" />

      {/* the two languages */}
      <Section eyebrow={t('langsEyebrow', 'Two languages, one script')} title={t('langsTitle', 'Start with the fidel your family speaks')} center>
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <div className="flex items-center gap-3">
              <LetterTile ch="አ" size={44} />
              <div>
                <h3 className="text-xl font-black">{t('amCard', 'Amharic')} · <span className="geez">አማርኛ</span></h3>
                <p className="text-xs font-bold" style={{ color: 'var(--go-ink)' }}>{t('amStatus', 'Available now')}</p>
              </div>
            </div>
            <p className="mt-3 leading-relaxed" style={{ color: 'var(--muted)' }}>
              {t('amBlurb', 'A complete journey: all 231 letters, first words, decodable stories, tracing, songs, arcade games, and a daily practice loop - taught by Anbessa the lion cub and friends.')}
            </p>
            <div className="mt-4"><CtaButton to="/amharic" tone="gold">{t('amCta', 'See the Amharic journey')}</CtaButton></div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <LetterTile ch="ት" size={44} />
              <div>
                <h3 className="text-xl font-black">{t('tiCard', 'Tigrinya')} · <span className="geez">ትግርኛ</span></h3>
                <p className="text-xs font-bold" style={{ color: 'var(--accent)' }}>{t('tiStatus', 'Foundations now · full course coming')}</p>
              </div>
            </div>
            <p className="mt-3 leading-relaxed" style={{ color: 'var(--muted)' }}>
              {t('tiBlurb', 'Tigrinya shares the Ge’ez script - the letter foundations kids learn today carry straight over. The full Tigrinya course (names, words, stories, audio) is in the works.')}
            </p>
            <div className="mt-4"><CtaButton to="/tigrinya" tone="gold">{t('tiCta', 'Tigrinya plans + waitlist')}</CtaButton></div>
          </Card>
        </div>
      </Section>

      {/* how it works for families */}
      <Section eyebrow={t('howEyebrow', 'How it works')} title={t('howTitle', 'A school day that fits in a family day')} center>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            [Sparkles, t('how1t', 'Kids play the journey'), t('how1b', 'One winding path of lessons, games, and stories. Ten joyful minutes a day; streaks, rewards, and a lion cub who cheers them on.')],
            [Users, t('how2t', 'Grown-ups see progress'), t('how2b', 'A grown-ups corner shows what was learned, what needs review, and a ready-made plan for the week - no teaching degree required.')],
            [Radio, t('how3t', 'Teachers guide from anywhere'), t('how3b', 'Remote teachers send class links, assignments, and live class games; the app returns receipts of what each child mastered.')],
          ].map(([Icon, title, body], i) => (
            <Card key={i}>
              <Icon className="h-7 w-7" style={{ color: 'var(--accent)' }} aria-hidden="true" />
              <h3 className="mt-3 text-lg font-black">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{body}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* bigger picture */}
      <Section eyebrow={t('visionEyebrow', 'Where this is going')} title={t('visionTitle', 'From one alphabet to a whole homeschool')} center>
        <p className="mx-auto max-w-2xl text-center leading-relaxed" style={{ color: 'var(--muted)' }}>
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
      <div className="mx-auto max-w-5xl px-6 pb-6">
        <Card className="text-center">
          <BookOpen className="mx-auto h-8 w-8" style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <h2 className="mt-3 text-2xl font-black">{t('teachBandT', 'Do you teach Amharic or Tigrinya?')}</h2>
          <p className="mx-auto mt-2 max-w-xl leading-relaxed" style={{ color: 'var(--muted)' }}>
            {t('teachBandB', 'Classroom tools are already live: class invite links, assignments with receipts, a term planner, a TV display mode, and group games like Class Bingo. Bring your students - or find new ones through us.')}
          </p>
          <div className="mt-5"><CtaButton to="/teachers" tone="green">{t('teachBandCta', 'Apply to teach')}</CtaButton></div>
        </Card>
      </div>
    </>
  )
}
