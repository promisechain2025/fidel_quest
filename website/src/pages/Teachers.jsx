/* ============================================================================
   /teachers - everything a church-school or parish teacher needs to run an
   online Ge'ez / Tigrinya / Amharic class with eGeez.
   ----------------------------------------------------------------------------
   Only REAL app features are described as available (src/components/
   TeacherMode.jsx, TvClass.jsx, ClassUnlockCard.jsx, platform/classroom.js,
   platform/classUnlock.js, platform/practiceReport.js). Anything not built
   yet is under "Coming next" and labelled as a plan. Prices are [CONFIRM].
   ========================================================================== */
import { useState } from 'react'
import { CheckCircle2, Church, Users, BookOpen, Home as HomeIcon, Globe, Printer } from 'lucide-react'
import { Section, Card, CtaButton, Field, inputCls, inputStyle, LetterTile } from '../components.jsx'
import { submitForm } from '../api.js'
import { t } from '../i18n.js'
import Seo from '../Seo.jsx'
import { APP_URL, CONTACT_EMAIL } from '../config.js'
import { WEEKS, LESSON_PLAN } from '../teacherCurriculum.js'

const WHO = [
  [Church, 'Parishes', 'One class code for the whole Sunday school, so every family starts on the same week.'],
  [BookOpen, 'Deacon training', 'Fidel to fluent Ge’ez reading, with ጸሎት and ውዳሴ ማርያም read with the traditional marks.'],
  [Users, 'Sunday schools', 'A ready term plan: two letter families a week, a TV lesson and one homework link per week.'],
  [Globe, 'Online diaspora classes', 'Teach students in many cities over Zoom or Google Meet. Everything they need opens in a browser.'],
  [HomeIcon, 'Homeschool families', 'A parent can run the same plan at the kitchen table with one or several children.'],
]

const STEPS = [
  ['Open Teacher Mode', 'Open easygeez.com/app (or the eGeez app) on your phone, tablet or computer. Go to Grown-ups (hold-and-answer gate) and tap Teacher.'],
  ['Create your class', 'Type your name and a class code you choose, e.g. STMARY1. The class lives on your device - no account and no server needed.'],
  ['Pick your pace', 'Choose letter families per week (2 matches the plan below). The term plan lays out every week with due dates.'],
  ['Unlock the app for your class', 'In “Unlock the web app for this class”, choose 30, 90 or 180 days and make the class unlock code. It rides inside your invite link.'],
  ['Invite students', 'Share the class link in your WhatsApp or Telegram group, or show the QR code on screen. Students tap Join and get the full web app on that browser until the code expires.'],
  ['Teach live', 'Share your screen with the TV lesson board: Chant mode with “Say after me”, then Quiz mode where students answer by number.'],
  ['Send homework', 'Tap “Send homework” on the week’s row. Every student gets the same questions from one link, so results are comparable.'],
  ['See progress', 'When a student finishes, they send back a result link. Open it on your device: the roster fills in, the week shows “5 of 7 turned in”, and missed letters add up in “Class trouble letters”.'],
]

const FEATURES = [
  'Class code + invite link and QR code',
  'Class unlock code (30/90/180 days) that opens the full web app for students',
  'Term plan with weekly due dates, at your pace',
  'TV lesson board: chant with “Say after me” and number quiz, keyboard or remote',
  'Weekly homework links, plus extra assignments on any letter families',
  'Result links back to the teacher: roster, turned in / missing, class trouble letters',
  'Parent practice reports (signed links, 7 days of minutes including prayer time)',
  'Tigrinya and Amharic learning packs; prayer book with reading marks',
]

const COMING = [
  'Teacher dashboard on the web with a live class roster (no result links needed)',
  'Homework on words, reading and prayer pages - today homework covers letters',
  'Live reading checks: a student reads a prayer line and the teacher listens and marks it',
  'Class-wide prayer book screen in the TV board with marks',
  'Parish license billing and bulk codes for the phone apps',
]

const FAQ = [
  ['Do students need to buy the app?', 'For your class, no: the class unlock code opens the full web app (easygeez.com/app) on each student’s browser until it expires. Families who want it on their phone offline can get it from the App Store or Google Play.'],
  ['Does it work for Tigrinya and Amharic?', 'Yes. Teacher Mode, the TV board, homework and the term plan run in both learning packs. The prayer book is Ge’ez; when learning in Tigrinya the marks use the Tigrinya names ተለዓሊ and ተዋሓጢ.'],
  ['Do I need an account or a server?', 'No. Your class lives on your device and travels in links. If you change devices, keep your class code; [CONFIRM] moving a class between devices is planned.'],
  ['What about children’s privacy?', 'The app has no ads and no chat. Results come back only as links a family chooses to send you, with the first name they typed. Nothing is uploaded unless a family shares it.'],
  ['Can I use it on Zoom or Google Meet?', 'Yes - open the TV lesson board or the prayer book and share your screen. Students follow along and answer out loud or in chat.'],
  ['How long does the code last?', 'Up to 180 days, then make a new one. If a code leaks, “Make a new code” replaces it in your invite link.'],
]

function RequestForm() {
  const [form, setForm] = useState({ name: '', email: '', parish: '', city: '', language: 'Ge’ez + Tigrinya', students: '', message: '' })
  const [state, setState] = useState('idle')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    setState('busy')
    try { await submitForm('/api/contact', { ...form, topic: 'class code request' }, 'Class code request - eGeez teachers'); setState('done') } catch { setState('idle') }
  }
  if (state === 'done') {
    return (
      <Card className="text-center">
        <CheckCircle2 className="mx-auto h-10 w-10" style={{ color: 'var(--go)' }} aria-hidden="true" />
        <p className="mt-2 font-black">{t('tcSent', 'Thank you! Your email app should have opened - send that message and we will reply within a few days.')}</p>
      </Card>
    )
  }
  return (
    <Card>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={t('tcName', 'Your name')}><input required className={inputCls} style={inputStyle} value={form.name} onChange={set('name')} /></Field>
        <Field label={t('tcEmail', 'Email')}><input required type="email" className={inputCls} style={inputStyle} value={form.email} onChange={set('email')} /></Field>
        <Field label={t('tcParish', 'Parish / school')}><input className={inputCls} style={inputStyle} value={form.parish} onChange={set('parish')} /></Field>
        <Field label={t('tcCity', 'City and country')}><input className={inputCls} style={inputStyle} value={form.city} onChange={set('city')} /></Field>
        <Field label={t('tcLang', 'Class language')}>
          <select className={inputCls} style={inputStyle} value={form.language} onChange={set('language')}>
            {['Ge’ez + Tigrinya', 'Ge’ez + Amharic', 'Ge’ez only (prayers)'].map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label={t('tcStudents', 'About how many students?')}><input inputMode="numeric" className={inputCls} style={inputStyle} value={form.students} onChange={set('students')} /></Field>
        <div className="sm:col-span-2"><Field label={t('tcMsg', 'Anything we should know?')}><textarea rows={3} className={inputCls} style={inputStyle} value={form.message} onChange={set('message')} /></Field></div>
        <div className="sm:col-span-2"><CtaButton type="submit" tone="green" disabled={state === 'busy'}>{t('tcSubmit', 'Request help with a class code')}</CtaButton></div>
      </form>
      <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>{t('tcMailNote', 'Opens your email app with the details filled in, addressed to')} {CONTACT_EMAIL}.</p>
    </Card>
  )
}

export default function Teachers() {
  return (
    <>
      <Seo title="Teach Ge’ez, Tigrinya or Amharic online - eGeez for teachers" description="Run an online fidel and prayer class for your parish or Sunday school: class codes, homework links, a weekly lesson plan and a printable guide." path="/teachers" />
      <div className="mx-auto max-w-4xl px-6 pt-14 text-center">
        <div className="mb-5 flex justify-center gap-2" aria-hidden="true">
          {['መ', 'ም', 'ህ', 'ር'].map((ch) => <LetterTile key={ch} ch={ch} size={46} />)}
        </div>
        <p className="geez text-lg font-black" style={{ color: 'var(--accent-text)' }} lang="gez">ለመምህራን · ንመማህራን</p>
        <h1 className="display-1 mt-2" style={{ textWrap: 'balance' }}>{t('tcTitle', 'Run your fidel and prayer class online')}</h1>
        <p className="lede mx-auto mt-5 max-w-2xl" style={{ color: 'var(--muted)' }}>
          {t('tcLede', 'For parish, Sunday school and deacon-training teachers. Create a class, share one link, teach live on Zoom or Meet, send weekly homework and see who is keeping up - with a ready 17-week plan for the fidel, words, reading, ጸሎት and ውዳሴ ማርያም.')}
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
          <CtaButton href={APP_URL} tone="green">{t('tcOpen', 'Open Teacher Mode')}</CtaButton>
          <CtaButton to="/teachers/guide" tone="ghost"><Printer className="h-4 w-4" aria-hidden="true" /> {t('tcGuide', 'Printable teacher guide')}</CtaButton>
          <CtaButton href="#request" tone="ghost">{t('tcReq', 'Request a class code')}</CtaButton>
        </div>
      </div>

      <Section mark="ሰ" eyebrow={t('tcWhoE', 'Who it is for')} title={t('tcWhoT', 'Made for the Church’s teachers')}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WHO.map(([Icon, h, b]) => (
            <Card key={h}>
              <Icon className="h-6 w-6" style={{ color: 'var(--accent-text)' }} aria-hidden="true" />
              <h3 className="mt-2 text-lg font-black">{t(`tcWho_${h}`, h)}</h3>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{b}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section mark="ተ" eyebrow={t('tcHowE', 'How it works · እንዴት')} title={t('tcHowT', 'From zero to a running class in 15 minutes')}>
        <ol className="grid gap-3 md:grid-cols-2">
          {STEPS.map(([h, b], i) => (
            <li key={h}><Card className="h-full">
              <div className="flex items-start gap-3">
                <span className="chunk flex h-9 w-9 shrink-0 items-center justify-center text-base font-black" style={{ background: 'var(--accent)', color: '#241a05' }}>{i + 1}</span>
                <div><h3 className="font-black">{h}</h3><p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{b}</p></div>
              </div>
            </Card></li>
          ))}
        </ol>
      </Section>

      <Section mark="ለ" eyebrow={t('tcLessonE', 'Each live lesson')} title={t('tcLessonT', 'A 60-minute Zoom or Meet lesson')}>
        <Card>
          <table className="w-full text-left text-sm">
            <tbody>
              {LESSON_PLAN.map(([time, h, b]) => (
                <tr key={h} style={{ borderTop: '1px solid var(--line)' }}>
                  <td className="py-3 pr-3 align-top font-black whitespace-nowrap">{time}</td>
                  <td className="py-3"><span className="font-black">{h}.</span> <span style={{ color: 'var(--muted)' }}>{b}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </Section>

      <Section mark="ቀ" eyebrow={t('tcPlanE', 'Curriculum · ትምህርት')} title={t('tcPlanT', 'A ready 17-week plan')}>
        <p className="mb-5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
          {t('tcPlanB', 'Two letter families a week - set the same pace in Teacher Mode and each week gets its own TV lesson and homework link. Prayers run alongside: first by ear, then reading ውዳሴ ማርያም with the reading marks.')}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {WEEKS.map((w) => (
            <Card key={w.week}>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-black">{t('tcWeek', 'Week')} {w.week}</h3>
                <span className="geez text-xl font-black" style={{ color: 'var(--accent-text)' }} lang="am">{w.letters}</span>
              </div>
              <p className="geez mt-1 text-base" lang="am">{w.rows}</p>
              <dl className="mt-2 space-y-1 text-sm" style={{ color: 'var(--muted)' }}>
                {w.words && <div><dt className="inline font-bold" style={{ color: 'var(--ink)' }}>Words: </dt><dd className="inline geez">{w.words}</dd></div>}
                <div><dt className="inline font-bold" style={{ color: 'var(--ink)' }}>Reading: </dt><dd className="inline">{w.reading}</dd></div>
                <div><dt className="inline font-bold" style={{ color: 'var(--ink)' }}>ጸሎት: </dt><dd className="inline">{w.prayer}</dd></div>
              </dl>
            </Card>
          ))}
        </div>
        <div className="mt-6"><CtaButton to="/teachers/guide" tone="gold"><Printer className="h-4 w-4" aria-hidden="true" /> {t('tcGuide2', 'Print or save the guide as PDF')}</CtaButton></div>
      </Section>

      <Section mark="ከ" eyebrow={t('tcFeatE', 'In the app today')} title={t('tcFeatT', 'What you get now, and what is coming')}>
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <h3 className="font-black">{t('tcNow', 'Available now')}</h3>
            <ul className="mt-2 space-y-2 text-sm">{FEATURES.map((f) => <li key={f} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--go)' }} aria-hidden="true" />{f}</li>)}</ul>
          </Card>
          <Card>
            <h3 className="font-black">{t('tcNext', 'Coming next (planned, not yet in the app)')}</h3>
            <ul className="mt-2 space-y-2 text-sm" style={{ color: 'var(--muted)' }}>{COMING.map((f) => <li key={f} className="flex gap-2"><span aria-hidden="true">○</span>{f}</li>)}</ul>
          </Card>
        </div>
      </Section>

      <Section mark="ዋ" eyebrow={t('tcPriceE', 'Pricing')} title={t('tcPriceT', 'For teachers and parishes')}>
        {/* [CONFIRM] all prices below with the owner before launch. */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['Teacher', 'Free [CONFIRM]', 'Teacher Mode, TV board, homework links, the plan and guide.'],
            ['Class', '$[CONFIRM] per class / term', 'Class unlock code for up to [CONFIRM] students on the web app.'],
            ['Parish license', '$[CONFIRM] / month', 'All classes in a parish, phone-app codes for families, and help setting up.'],
          ].map(([h, p, b]) => (
            <Card key={h}>
              <h3 className="font-black">{h}</h3>
              <p className="mt-1 text-xl font-black" style={{ color: 'var(--accent-text)' }}>{p}</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{b}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section mark="ጥ" eyebrow={t('tcFaqE', 'Questions · ጥያቄዎች')} title={t('tcFaqT', 'Teacher FAQ')}>
        <div className="space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
              <summary className="cursor-pointer font-black">{q}</summary>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{a}</p>
            </details>
          ))}
        </div>
      </Section>

      <div id="request" />
      <Section mark="ደ" eyebrow={t('tcReqE', 'Get started')} title={t('tcReqT', 'Request a class code or help')}>
        <RequestForm />
      </Section>
    </>
  )
}
