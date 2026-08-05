import { useState } from 'react'
import { Sparkles, Users, BookOpen, Radio, PenLine } from 'lucide-react'
import { Card, CtaButton, LetterTile, Picture, Reveal, Section, Tibeb } from '../components.jsx'
import { APP_URL } from '../config.js'
import { nameToFidel } from '../fidel.js'
import { t } from '../i18n.js'
import Seo from '../Seo.jsx'

const HERO_TILES = ['ሀ', 'ለ', 'መ', 'ሠ', 'ረ', 'ሰ', 'በ', 'ተ']

/* The viral teaser: type a name, see it in Ge'ez letters. */
function NameWidget() {
  const [name, setName] = useState('')
  const { geez, ok } = nameToFidel(name)
  return (
    <Card wash className="mx-auto max-w-xl text-center">
      <PenLine className="mx-auto h-7 w-7" style={{ color: 'var(--accent)' }} aria-hidden="true" />
      <h2 className="display-3 mt-2">{t('nwTitle', 'See your child’s name in Fidel')}</h2>
      <input
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 20))}
        placeholder={t('nwPlaceholder', 'Type a name - Sara, Daniel, Tsion…')}
        aria-label={t('nwLabel', 'Name to write in Fidel')}
        className="mt-4 w-full max-w-sm rounded-xl px-4 py-3 text-center text-[16px] font-bold"
        style={{ background: 'var(--paper)', border: '2px solid var(--line)', color: 'var(--ink)' }}
      />
      <div className="mt-4 flex min-h-[72px] items-center justify-center" aria-live="polite">
        {ok ? (
          <span className="geez rounded-2xl px-6 py-3 text-4xl font-black sm:text-5xl"
            style={{ background: 'var(--tile)', color: 'var(--glyph)', border: '2px solid var(--tile-deep)', boxShadow: '0 5px 0 var(--tile-deep)' }}>
            {geez}
          </span>
        ) : (
          <span className="text-sm font-bold" style={{ color: 'var(--muted)' }}>{t('nwEmpty', 'Their name will appear here, letter by letter.')}</span>
        )}
      </div>
      <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
        {t('nwNote', 'A friendly approximation - real spelling has rules. In the app, kids learn to write it themselves, stroke by stroke.')}
      </p>
      {ok && (
        <div className="mt-4">
          <CtaButton href={APP_URL} tone="green">{t('nwCta', 'Let them write it for real')}</CtaButton>
        </div>
      )}
    </Card>
  )
}

export default function Home() {
  return (
    <>
      <Seo title="eGeez - Learn Amharic and Tigrinya, guided from anywhere" description="A joyful app that teaches kids the fidel, tools for remote teachers, and homeschool guidance for families around the world." path="/" />
      {/* hero: message left, the real app right */}
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-5 pb-6 pt-10 sm:px-6 md:grid-cols-[1.15fr_0.85fr] md:pt-16 lg:gap-14">
        <div className="text-center md:text-left">
          <Reveal>
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2 md:justify-start" aria-hidden="true">
              {HERO_TILES.map((ch, i) => <LetterTile key={i} ch={ch} size={i % 3 === 1 ? 48 : 38} float delay={i * 0.06} />)}
            </div>
            <h1 className="display-1">
              {t('heroTitle', 'Their language. Their story.')}{' '}
              <span style={{ color: 'var(--accent-text)' }}>{t('heroTitle2', 'Learned at home.')}</span>
            </h1>
            <p className="lede mx-auto mt-5 max-w-xl md:mx-0" style={{ color: 'var(--muted)' }}>
              {t('heroLede', 'eGeez is a learning home for every family that wants its children to read Amharic or Tigrinya - wherever in the world they live: a joyful app that teaches kids the fidel, tools for remote teachers, and guidance for homeschooling. The first step toward learning every subject, together.')}
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center md:justify-start">
              <CtaButton href={APP_URL} tone="green">{t('heroCta', 'Start the free try-out')}</CtaButton>
              <CtaButton to="/teachers" tone="ghost">{t('heroCtaTeach', 'Teach with us')}</CtaButton>
            </div>
            <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>{t('heroNote', 'Works offline. No account needed. Free to download, free for 3 days, then $12.99 once. Ages 3-9.')}</p>
          </Reveal>
        </div>
        <Reveal delay={0.15} className="relative mx-auto w-full max-w-[290px] md:max-w-[320px]">
          <Picture src="/art/anbessa-cheer.png" width={150} height={150} alt="" aria-hidden="true"
            className="absolute -left-16 -top-10 z-10 hidden w-[130px] md:block lg:w-[150px]" />
          <div className="phone">
            <Picture src="/shots/app-journey.png" fetchPriority="high" width={780} height={1688} alt={t('heroShotAlt', 'The eGeez journey: a winding path of golden letter tiles')} loading="eager" />
          </div>
        </Reveal>
      </div>

      <Tibeb className="mt-8" />

      {/* name-in-fidel teaser */}
      <div className="mx-auto max-w-5xl px-5 pt-14 sm:px-6">
        <Reveal><NameWidget /></Reveal>
      </div>

      {/* the two languages */}
      <Section eyebrow={t('langsEyebrow', 'Two languages, one script')} title={t('langsTitle', 'Start with the fidel your family speaks')} center mark="ፊ">
        {/* The whole product rests on a word many visitors do not know - and
            on a brand name that is a pun on it. Say both, once, plainly. */}
        <Reveal>
          <p className="mx-auto mb-6 max-w-2xl text-center text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            {t('fidelWhat', 'Amharic and Tigrinya are both written in the fidel - the Ge’ez script (say it "GUH-ez"). It is a syllabary, not an alphabet: each of the 33 Amharic letter families has seven forms, one per vowel, which is how 33 letters become 231. That script is where eGeez gets its name.')}
          </p>
        </Reveal>
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
                {t('amBlurb', 'A complete journey: all 231 letters, first words, read-along stories, tracing, chants, arcade games, and a daily practice loop - taught by Anbessa the lion cub and friends. Try free, own it for $12.99.')}
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
                  <p className="text-xs font-black" style={{ color: 'var(--accent-text)' }}>{t('tiStatus', 'Foundations now · full course coming')}</p>
                </div>
              </div>
              <p className="mt-3 leading-relaxed" style={{ color: 'var(--muted)' }}>
                {t('tiBlurb', 'Tigrinya is written in the Ge’ez script - the letter foundations are ready for kids today. The full Tigrinya course (names, words, stories, audio) is in the works.')}
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

      {/* honest trust band - facts, not testimonials */}
      <div className="mx-auto max-w-5xl px-5 pb-2 sm:px-6">
        <Reveal>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['231', t('tb1', 'letters taught, all voiced')],
              ['100%', t('tb2', 'works offline - any phone')],
              ['0', t('tb3', 'ads. Zero child data collected')],
              ['1x', t('tb4', 'pay once - never twice')],
            ].map(([big, small], i) => (
              <div key={i} className="rounded-2xl px-4 py-5 text-center" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
                <div className="text-3xl font-black" style={{ color: 'var(--accent-text)' }}>{big}</div>
                <div className="mt-1 text-xs font-bold leading-snug" style={{ color: 'var(--muted)' }}>{small}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      {/* The objections that actually stop a parent. Every answer here is
          checkable against the app: the pace numbers come from the plan
          settings (1/2/4 letter families a week), the free-forever content
          from journey.js, the daily window from license.js. */}
      <Section eyebrow={t('faqE', 'Before you start')} title={t('faqT', 'The questions parents actually ask')} center mark="ጥ">
        <div className="mx-auto grid max-w-3xl gap-4">
          {[
            [t('hqQ1', 'I cannot read the fidel myself. Can I still do this with my child?'),
             t('hqA1', 'Yes - that is who it is built for. All 231 letters are real recordings, and any word can be tapped to hear it, so the app does the teaching out loud and your child never needs you to sound anything out. The grown-ups corner then tells you in plain English what was learned, what is fading, and what to do next. Plenty of parents pick up the letters alongside their child.')],
            [t('hqQ2', 'How long does it take to learn all of it?'),
             t('hqA2', 'You choose the pace in the app: one letter family a week is a gentle school year, two a week gets through all 33 Amharic families in about four months, and four a week in about two. Ten minutes a day is the whole ask - the daily warm-up reviews exactly what is starting to fade, so nothing needs cramming.')],
            [t('hqQ3', 'What happens when the 3 free days are over?'),
             t('hqA3', 'The first two letter families and the first arcade game stay free forever, and one tap opens the entire app for 5 more free minutes every single day - no payment, no account, for as long as you like. The buy prompt appears at most once a day, behind a grown-up gate, and always has a "Not now". A child is never stopped in the middle of a lesson.')],
            [t('hqQ4', 'Does my child need to speak Amharic or Tigrinya already?'),
             t('hqA4', 'No. It starts at the sound of a single letter and builds up - first letters, then first words with pictures, then short stories read along with the voice. Children who speak only English at home start at exactly the same place as children who hear Amharic every day.')],
            [t('hqQ5', 'Is it safe to hand my child the phone with this open?'),
             t('hqA5', 'There are no ads, no chat, and no account to create. Nothing about your child leaves the device - progress lives in the phone itself. Everything that leaves the app or costs money (buying, sharing, settings) sits behind a hold-and-answer gate a young child cannot pass. And it works fully offline, so it is the same app on a plane as it is at home.')],
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

      {/* teacher band */}
      <div className="mx-auto max-w-5xl px-5 pb-6 sm:px-6">
        <Reveal>
          <Card wash className="relative overflow-hidden text-center">
            <Picture src="/art/kokeb.png" loading="lazy" decoding="async" width={90} height={90} alt="" aria-hidden="true" className="absolute -right-4 -top-4 w-16 opacity-90 md:w-20" />
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
