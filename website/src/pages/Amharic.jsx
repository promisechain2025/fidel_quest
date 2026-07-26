import { Map, Gamepad2, BookOpenText, Mic, CalendarDays, Trophy } from 'lucide-react'
import { Section, Card, CtaButton, LetterTile } from '../components.jsx'
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
            [BookOpenText, t('amF2t', 'Words and stories'), t('amF2b', 'First words unlock as letters are learned; decodable stories use only letters a child already knows - real reading, right away.')],
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

      <Section mark="ነ" eyebrow={t('amForEyebrow', 'For families')} title={t('amForTitle', 'Try it free, own it forever')}>
        <div className="grid gap-5 md:grid-cols-2">
          <Card wash>
            <h3 className="font-black">{t('amOwn', 'The app - $12.99 once')}</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              {t('amOwnB', 'Start with a free try-out, no account needed. Then one purchase owns the entire journey - every letter, game, and story. No ads, no subscription, no child data, works offline. Buy on the web or in the store: one payment counts everywhere.')}
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
