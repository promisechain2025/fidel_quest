import { Map, Gamepad2, BookOpenText, Mic, CalendarDays, Trophy } from 'lucide-react'
import { Section, Card, CtaButton, LetterTile } from '../components.jsx'
import AppGallery from '../components/AppGallery.jsx'
import GuideLinks from '../components/GuideLinks.jsx'
import { t } from '../i18n.js'
import Seo from '../Seo.jsx'

export default function Amharic() {
  return (
    <>
      <Seo title="The Amharic journey - eGeez" description="All 231 fidel taught through play: words, stories, tracing, games, and a daily practice loop. One-time $12.99 on the App Store and Google Play, everything included." path="/amharic" />
      <div className="mx-auto max-w-5xl px-6 pt-14 text-center">
        <div className="mb-5 flex justify-center gap-2" aria-hidden="true">
          {['አ', 'ማ', 'ር', 'ኛ'].map((ch, i) => <LetterTile key={i} ch={ch} size={48} />)}
        </div>
        <h1 className="display-1" style={{ textWrap: 'balance' }}>{t('amTitle', 'The Amharic journey')}</h1>
        <p className="lede mx-auto mt-4 max-w-2xl" style={{ color: 'var(--muted)' }}>
          {t('amLede', 'From first sound to first story: every one of the 231 fidel, taught the way kids actually stay - through play. Built with love for Ethiopian families, at home and across the diaspora. Fully offline, no ads, made for ages 3-9.')}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <CtaButton to="/pricing" tone="green">{t('amOpen', 'Get eGeez - $12.99')}</CtaButton>
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
        <AppGallery pack="am" />
      </Section>

      <Section mark="ነ" eyebrow={t('amForEyebrow', 'For families')} title={t('amForTitle', 'Pay once, own it forever')}>
        <div className="grid gap-5 md:grid-cols-2">
          <Card wash>
            <h3 className="font-black">{t('amOwn', 'The app - $12.99 once')}</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              {t('amOwnB', 'One purchase on the App Store or Google Play owns the entire journey - every letter, game, story and Bible book. No ads, no subscriptions, no in-app purchases, no child data, and it works offline with no account.')}
            </p>
          </Card>
          <Card>
            <h3 className="font-black">{t('amKids', 'Kids profiles included')}</h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              {t('amKidsB', 'Up to 6 children can each have their own profile, journey, streak and closet on one device - included in the price, nothing extra to buy.')}
            </p>
          </Card>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <CtaButton to="/pricing" tone="ghost">{t('amSeePricing', 'See pricing')}</CtaButton>
        </div>
      </Section>

      <GuideLinks
        slugs={['amharic-alphabet-for-kids', 'teach-amharic-at-home']}
        eyebrow={t('amGuidesE', 'Before you start')}
        title={t('amGuidesT', 'Two guides worth ten minutes')}
        mark="ጎ"
      />
    </>
  )
}
