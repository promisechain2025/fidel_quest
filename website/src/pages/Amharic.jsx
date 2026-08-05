import { Map, Gamepad2, BookOpenText, Mic, CalendarDays, Trophy } from 'lucide-react'
import { Section, Card, CtaButton, LetterTile, Picture, Reveal } from '../components.jsx'
import { APP_URL } from '../config.js'
import { t } from '../i18n.js'
import Seo from '../Seo.jsx'

export default function Amharic() {
  return (
    <>
      <Seo title="The Amharic journey - eGeez" description="All 231 fidel taught through play: words, stories, tracing, games, and a daily practice loop. Try free, own it for $12.99." path="/amharic" />
      <div className="mx-auto max-w-5xl px-6 pt-14 text-center">
        <div className="mb-5 flex justify-center gap-2" aria-hidden="true">
          {['አ', 'ማ', 'ር', 'ኛ'].map((ch, i) => <LetterTile key={i} ch={ch} size={48} />)}
        </div>
        <h1 className="display-1" style={{ textWrap: 'balance' }}>{t('amTitle', 'The Amharic journey')}</h1>
        <p className="lede mx-auto mt-4 max-w-2xl" style={{ color: 'var(--muted)' }}>
          {t('amLede', 'From first sound to first story: every one of the 231 fidel, taught the way kids actually stay - through play. Built with love for Ethiopian families, at home and across the diaspora. Fully offline, no ads, made for ages 3-9.')}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <CtaButton href={APP_URL} tone="green">{t('amOpen', 'Open the app free')}</CtaButton>
        </div>
      </div>

      <Section mark="ጨ" eyebrow={t('amWhatEyebrow', 'What is inside')} title={t('amWhatTitle', 'A whole curriculum, disguised as a game')}>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            [Map, t('amF1t', 'The Journey'), t('amF1b', 'One winding path with exactly one next step: letter lessons, mixed practice, boss quizzes, and earned arcade games. No menus to get lost in.')],
            [BookOpenText, t('amF2t', 'Words and stories'), t('amF2b', 'First words unlock as letters are learned; stories arrive chapter by chapter and every word can be tapped to hear it - reading along, right away.')],
            [Mic, t('amF3t', 'Listening first'), t('amF3b', 'Every letter is voiced. Games call sounds out loud so kids read by ear and eye together - including tricky twins like ሀ and ሐ.')],
            [Gamepad2, t('amF4t', 'Games that earn'), t('amF4b', 'Letter Runner, Letter Catch, memory match, bingo, a daily letter hunt - celebration games kids unlock by learning.')],
            [CalendarDays, t('amF5t', 'A daily rhythm'), t('amF5b', 'Streaks, a daily warm-up that reviews exactly what is fading, and a session coach that plans tomorrow - habits, not cramming.')],
            [Trophy, t('amF6t', 'Rewards kids keep'), t('amF6b', 'Every step dresses Anbessa the lion cub in earned gear; kids share their dressed-up lion (and their letter count) with family.')],
          ].map(([Icon, title, body], i) => (
            <Card key={i}>
              <Icon className="h-6 w-6" style={{ color: 'var(--accent)' }} aria-hidden="true" />
              <h3 className="mt-3 font-black">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{body}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* Six real screens in the order a child meets them. A feature list
          cannot answer "what is this actually like" - the product can. */}
      <Section mark="ዐ" eyebrow={t('amSeeE', 'A look inside')} title={t('amSeeT', 'What a week of it looks like')} center>
        <p className="lede mx-auto -mt-2 mb-8 max-w-2xl text-center" style={{ color: 'var(--muted)' }}>
          {t('amSeeB', 'Real screens from the app, in the order a child meets them: find the next step, learn the letter, write it, prove it, read a word, and see the whole fidel laid out.')}
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            ['journey', t('amSh1', 'One path, one next step')],
            ['learn', t('amSh2', 'Meet the letter by sound')],
            ['trace', t('amSh3', 'Write it with a finger')],
            ['quiz', t('amSh4', 'Prove it by ear')],
            ['words', t('amSh5', 'Read a real word')],
            ['explorer', t('amSh6', 'The whole fidel, tappable')],
          ].map(([file, caption], i) => (
            <Reveal key={file} delay={i * 0.04}>
              <figure className="m-0">
                <Picture
                  src={`/shots/am-${file}.png`}
                  loading="lazy"
                  decoding="async"
                  width={560}
                  height={1212}
                  alt={caption}
                  className="w-full rounded-2xl"
                  style={{ border: '1px solid var(--line)' }}
                />
                <figcaption className="mt-2 text-center text-xs font-bold" style={{ color: 'var(--muted)' }}>{caption}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section mark="ነ" eyebrow={t('amForEyebrow', 'For families')} title={t('amForTitle', 'Try it free, own it forever')}>
        <div className="grid gap-5 md:grid-cols-2">
          <Card wash>
            <h3 className="font-black">{t('amOwn', 'The app - $12.99 once')}</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              {t('amOwnB', 'Start with a free try-out, no account needed. Then one purchase owns the entire journey - every letter, game, and story. No ads, no subscription, no child data, works offline. One payment counts everywhere: a code bought here unlocks the mobile app too.')}
            </p>
          </Card>
          <Card>
            <h3 className="font-black">{t('amPack', 'Add-on packs')}</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              {t('amPackB2', 'Extras sit on top the same way, one-time: the Family Pack ($4.99) gives each sibling their own profile and progress, and future language packs - Tigrinya first - will join as add-ons.')}
            </p>
          </Card>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <CtaButton href={APP_URL} tone="gold">{t('amOpen2', 'Start the free try-out')}</CtaButton>
          <CtaButton to="/pricing" tone="ghost">{t('amSeePricing', 'See pricing')}</CtaButton>
        </div>
      </Section>
    </>
  )
}
