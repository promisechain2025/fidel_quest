import { Map, Gamepad2, BookOpenText, Mic, CalendarDays, Trophy } from 'lucide-react'
import { Section, Card, CtaButton, LetterTile } from '../components.jsx'
import { APP_URL } from '../config.js'
import { t } from '../i18n.js'

export default function Amharic() {
  return (
    <>
      <div className="mx-auto max-w-5xl px-6 pt-14 text-center">
        <div className="mb-5 flex justify-center gap-2" aria-hidden="true">
          {['አ', 'ማ', 'ር', 'ኛ'].map((ch, i) => <LetterTile key={i} ch={ch} size={48} />)}
        </div>
        <h1 className="text-4xl font-black md:text-5xl" style={{ textWrap: 'balance' }}>{t('amTitle', 'The Amharic journey')}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
          {t('amLede', 'From first sound to first story: every one of the 231 fidel, taught the way kids actually stay - through play. Fully offline, no ads, made for ages 3-9.')}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <CtaButton href={APP_URL} tone="green">{t('amOpen', 'Open the app free')}</CtaButton>
        </div>
      </div>

      <Section eyebrow={t('amWhatEyebrow', 'What is inside')} title={t('amWhatTitle', 'A whole curriculum, disguised as a game')}>
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

      <Section eyebrow={t('amForEyebrow', 'For families')} title={t('amForTitle', 'Free to learn, fair to families')}>
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <h3 className="font-black">{t('amFree', 'Free')}</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              {t('amFreeB', 'The learning journey is free to play: letters, games, daily practice. It works offline and never shows ads or collects a child’s data.')}
            </p>
          </Card>
          <Card>
            <h3 className="font-black">{t('amPack', 'Family Pack')}</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              {t('amPackB', 'One purchase for the whole household: separate profiles and progress for each child. That is it - no subscriptions for the basics.')}
            </p>
          </Card>
        </div>
        <div className="mt-8 text-center">
          <CtaButton href={APP_URL} tone="gold">{t('amOpen2', 'Start the journey')}</CtaButton>
        </div>
      </Section>
    </>
  )
}
