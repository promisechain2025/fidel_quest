/* ============================================================================
   SUPPORT — the page the App Store Support URL points at (Apple guideline 1.5)
   ----------------------------------------------------------------------------
   Apple rejected /about as a Support URL: it is a contact FORM, and with no
   VITE_API_URL configured that form degrades to opening the visitor's mail
   client. A reviewer taps Send and gets a compose window rather than a
   confirmation, and the page shows no address, no answers and no idea when
   anyone replies - so it reads as non-functional.

   This page therefore carries NO form and needs NO backend. The support
   address is written out as readable text (not only as a mailto link, which a
   reviewer on a device with no mail account cannot use), next to real answers
   to the questions people actually write in about - restoring a purchase,
   moving a child to a new device, silent audio - and a plain statement of how
   long a reply takes.
   ========================================================================== */
import { LifeBuoy, RotateCcw, Smartphone, VolumeX, ShieldCheck, Receipt } from 'lucide-react'
import { Section, Card, CtaButton } from '../components.jsx'
import { CONTACT_EMAIL, APP_URL } from '../config.js'
import { t } from '../i18n.js'
import Seo from '../Seo.jsx'

/* Written from the real failure modes in the app: the licence is device-local
   and restores from the store or an EGZ code (platform/license.js), progress
   lives in localStorage and moves by export/import (platform/backup.js), and
   audio falls back to a synth chime when a clip has not cached yet
   (platform/audioEngine.js). */
const FAQ = [
  {
    key: 'restore',
    Icon: RotateCcw,
    q: 'I paid, but the app is asking me to buy again',
    a: 'Nothing is lost. Open the Grown-ups corner and tap Restore purchases - that asks the store for what this Apple ID already owns. If you bought on the web instead, enter your EGZ code there and it unlocks the same way. One payment covers every platform, so you should never pay twice.',
  },
  {
    key: 'move',
    Icon: Smartphone,
    q: 'How do I move my child to a new phone or tablet?',
    a: 'Grown-ups corner - Back up progress writes a file with every child on the device. Copy it across, then use Restore progress on the new one. Progress is stored on the device rather than on our servers, so this export is the only way to move it - and it means nothing to hand over if you stop using the app.',
  },
  {
    key: 'audio',
    Icon: VolumeX,
    q: 'A letter or word plays a chime instead of a voice',
    a: 'The human recordings download in the background on first use. Until a clip has arrived the app plays a short chime rather than silence, so the game never blocks. Open the app once on wifi and let it sit for a minute. A few words have no recording yet and will chime by design.',
  },
  {
    key: 'refund',
    Icon: Receipt,
    q: 'I would like a refund',
    a: 'Purchases made through the App Store are refunded by Apple, not by us - use reportaproblem.apple.com. If you bought through the website, email us and we will refund it directly. Either way, tell us what went wrong; it is usually something we can fix.',
  },
  {
    key: 'privacy',
    Icon: ShieldCheck,
    q: 'What do you collect about my child?',
    a: 'Nothing leaves the device from the child side. No account is needed to play, there are no ads, and there is no analytics on a child profile. The full detail is on the privacy page.',
  },
]

export default function Support() {
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('eGeez support')}`
  return (
    <>
      <Seo
        title="Support - eGeez"
        description="Get help with eGeez: contact the team, restore a purchase, move a child to a new device, and answers to the questions families ask most."
        path="/support"
      />

      <Section
        mark="ሀ"
        eyebrow={t('spEyebrow', 'Support')}
        title={t('spTitle', 'We answer every message')}
        center
      >
        <Card className="text-center">
          <LifeBuoy className="mx-auto h-9 w-9" style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <p className="mt-3 text-base font-bold">
            {t('spIntro', 'Questions, problems, refunds, or anything about your child’s progress - write to us and a person will reply.')}
          </p>

          {/* The address is TEXT first. A mailto alone is unusable to anyone
              without a mail client configured - including an app reviewer. */}
          <p className="mt-5 text-sm font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            {t('spEmailLabel', 'Email us')}
          </p>
          <p className="mt-1 select-all break-all text-xl font-black" style={{ color: 'var(--accent)' }}>
            {CONTACT_EMAIL}
          </p>
          <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            {t('spSla', 'We reply within two business days, usually the same day.')}
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <CtaButton href={mailto}>
              {t('spWrite', 'Write to support')}
            </CtaButton>
          </div>
        </Card>

        <Card className="mt-5">
          <h3 className="text-base font-black">{t('spIncludeTitle', 'What to tell us')}</h3>
          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            {t('spIncludeBody', 'Any of these helps us fix it on the first reply - but write anyway if you do not have them.')}
          </p>
          <ul className="mt-3 space-y-1.5 text-sm font-semibold">
            {[
              ['device', 'The device and its system version (for example, iPad Air, iPadOS 26).'],
              ['what', 'What you tapped and what happened instead.'],
              ['often', 'Whether it happens every time or only sometimes.'],
              ['email', 'If it is about a purchase, the email address you bought with.'],
            ].map(([k, line]) => (
              <li key={k} className="flex gap-2">
                <span aria-hidden="true" style={{ color: 'var(--accent)' }}>·</span>
                <span>{t(`spInc_${k}`, line)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      <Section mark="ለ" eyebrow={t('spFaqEyebrow', 'Common questions')} title={t('spFaqTitle', 'Answers before you write')}>
        <div className="grid gap-4 sm:grid-cols-2">
          {FAQ.map(({ key, Icon, q, a }) => (
            <Card key={key}>
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden="true" />
                <div>
                  <h3 className="text-base font-black">{t(`spQ_${key}`, q)}</h3>
                  <p className="mt-1.5 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
                    {t(`spA_${key}`, a)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-5 text-center" wash>
          <p className="text-sm font-bold">
            {t('spMore', 'Still stuck? Email us at')}{' '}
            <span className="select-all break-all font-black" style={{ color: 'var(--accent)' }}>{CONTACT_EMAIL}</span>
            {'. '}
            {t('spMore2', 'We read everything.')}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <CtaButton to="/privacy" tone="ghost">{t('spPrivacy', 'Privacy')}</CtaButton>
            <CtaButton to="/terms" tone="ghost">{t('spTerms', 'Terms')}</CtaButton>
            <CtaButton href={APP_URL} external tone="ghost">{t('spOpenApp', 'Open the app')}</CtaButton>
          </div>
        </Card>
      </Section>
    </>
  )
}
