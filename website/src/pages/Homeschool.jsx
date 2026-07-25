import { CalendarDays, Repeat2, Search, Printer, Share2, ShieldCheck } from 'lucide-react'
import { Section, Card, CtaButton } from '../components.jsx'
import { APP_URL } from '../config.js'
import { t } from '../i18n.js'

export default function Homeschool() {
  return (
    <>
      <div className="mx-auto max-w-5xl px-6 pt-14 text-center">
        <h1 className="text-4xl font-black md:text-5xl" style={{ textWrap: 'balance' }}>{t('hsTitle', 'Run a real language class at your kitchen table')}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
          {t('hsLede', 'You do not need to be a teacher. The app carries the lessons; this page gives you the rhythm, the tools, and the printables to wrap a family school-week around it.')}
        </p>
      </div>

      <Section eyebrow={t('hsWeekEyebrow', 'The rhythm')} title={t('hsWeekTitle', 'A simple week that works')}>
        <div className="grid gap-5 md:grid-cols-2">
          {[
            [t('hsW1t', 'Daily · 10 minutes'), t('hsW1b', 'One journey step plus the built-in Warm-up (it automatically reviews whatever is fading). The streak chip keeps kids coming back on their own.')],
            [t('hsW2t', 'Twice a week · together'), t('hsW2b', 'Sit in for First Words or a Story - reading aloud together is where letters become language. The story picks only letters your child already knows.')],
            [t('hsW3t', 'Weekly · celebrate'), t('hsW3b', 'Friday is Closet day: dress Anbessa in the week’s earned gear and share the card with grandparents. Motivation, handled.')],
            [t('hsW4t', 'Termly · assess lightly'), t('hsW4b', 'The Grown-Ups corner shows letters learned vs. shaky. If you work with a remote teacher, their assignments and receipts do this for you.')],
          ].map(([title, body], i) => (
            <Card key={i}>
              <h3 className="font-black">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section eyebrow={t('hsToolsEyebrow', 'In the app')} title={t('hsToolsTitle', 'Homeschool features you already have')}>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            [CalendarDays, t('hsT1t', 'Daily Letter Hunt'), t('hsT1b', 'A 2-minute daily ritual (Akukulu!) that keeps practice alive on busy days.')],
            [Repeat2, t('hsT2t', 'Smart review'), t('hsT2b', 'Spaced repetition schedules each letter’s comeback so nothing silently slips away.')],
            [Search, t('hsT3t', 'Placement test-out'), t('hsT3b', 'Already knows some fidel? A quick placement opens the journey at the right spot.')],
            [Printer, t('hsT4t', 'Review packs'), t('hsT4b', 'Teacher-style review packs regenerate from real progress - use them as worksheets.')],
            [Share2, t('hsT5t', 'Family sharing'), t('hsT5b', 'Voice postcards and share cards keep far-away family inside the learning loop.')],
            [ShieldCheck, t('hsT6t', 'Safe by design'), t('hsT6b', 'Offline-first, no ads, no child accounts, nothing leaves the device unless you share it.')],
          ].map(([Icon, title, body], i) => (
            <Card key={i}>
              <Icon className="h-6 w-6" style={{ color: 'var(--accent)' }} aria-hidden="true" />
              <h3 className="mt-3 font-black">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-8 text-center">
          <CtaButton href={APP_URL} tone="green">{t('hsCta', 'Open the app and start today')}</CtaButton>
        </div>
      </Section>

      <Section eyebrow={t('hsMoreEyebrow', 'Coming to this page')} title={t('hsMoreTitle', 'Growing resource shelf')} center>
        <p className="mx-auto max-w-2xl text-center leading-relaxed" style={{ color: 'var(--muted)' }}>
          {t('hsMoreBody', 'Printable fidel charts, week-plan templates, read-aloud guides for parents who do not read Ge’ez script themselves, and - as remote teachers join - guided term programs you can simply follow. Tell us what you need first via the contact form.')}
        </p>
        <div className="mt-6 text-center">
          <CtaButton to="/about" tone="ghost">{t('hsContact', 'Request a resource')}</CtaButton>
        </div>
      </Section>
    </>
  )
}
