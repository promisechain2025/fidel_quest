/* /teachers/guide - the printable teacher guide (Print -> Save as PDF). */
import { Printer } from 'lucide-react'
import { CtaButton } from '../components.jsx'
import Seo from '../Seo.jsx'
import { APP_URL, CONTACT_EMAIL } from '../config.js'
import { WEEKS, LESSON_PLAN, MARKS } from '../teacherCurriculum.js'

export default function TeacherGuide() {
  return (
    <div className="teacher-guide mx-auto max-w-3xl px-6 pt-10">
      <Seo title="Printable teacher guide - eGeez" description="A printable week-by-week guide for teaching the fidel, words, reading and ጸሎት with reading marks in live video lessons, using eGeez class tools." path="/teachers/guide" />
      <style>{`@media print { header, footer, .no-print { display: none !important } .teacher-guide { max-width: none; padding: 0 } .tg-week { break-inside: avoid } body { background: #fff; color: #000 } }`}</style>
      <div className="no-print mb-6 flex flex-wrap gap-3">
        <CtaButton onClick={() => window.print()} tone="green"><Printer className="h-4 w-4" aria-hidden="true" /> Print / Save as PDF</CtaButton>
        <CtaButton to="/teachers" tone="ghost">Back to the teachers page</CtaButton>
      </div>
      <h1 className="display-2">eGeez Teacher Guide <span className="geez" lang="gez">· መምህር</span></h1>
      <p className="mt-2 text-sm">Fidel, words, reading, ጸሎት ዘዘወትር and ውዳሴ ማርያም in 17 weeks. App: {APP_URL.replace('https://', '')} · Help: {CONTACT_EMAIL}</p>

      <h2 className="mt-8 text-xl font-black">Before the first class</h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
        <li>Open {APP_URL.replace('https://', '')} → Grown-ups → Teacher. Create the class (your name + a class code).</li>
        <li>Set the pace to 2 letter families a week.</li>
        <li>Make the class unlock code (90 or 180 days) so students get the full web app.</li>
        <li>Post the class link or QR code in your family group. Ask each family to tap Join and type the child’s first name.</li>
        <li>Test screen sharing in Zoom or Meet with the TV lesson board and the prayer book.</li>
      </ol>

      <h2 className="mt-8 text-xl font-black">Every lesson (60 minutes)</h2>
      <table className="mt-2 w-full text-left text-sm"><tbody>
        {LESSON_PLAN.map(([time, h, b]) => <tr key={h} style={{ borderTop: '1px solid var(--line)' }}><td className="py-2 pr-3 align-top font-bold whitespace-nowrap">{time}</td><td className="py-2"><b>{h}.</b> {b}</td></tr>)}
      </tbody></table>

      <h2 className="mt-8 text-xl font-black">Reading marks <span className="geez" lang="gez">· ምልክቶች</span></h2>
      <table className="mt-2 w-full text-left text-sm"><thead><tr><th className="py-1">Amharic name</th><th className="py-1">Tigrinya name</th></tr></thead><tbody>
        {MARKS.map(([am, ti]) => <tr key={am} style={{ borderTop: '1px solid var(--line)' }}><td className="geez py-2">{am}</td><td className="geez py-2">{ti}</td></tr>)}
      </tbody></table>
      <p className="mt-2 text-sm">ሰያፍ is used only when a word’s last letter is ሳድስ (6th form). Turn the marks on with the eye button in the prayer book.</p>

      <h2 className="mt-8 text-xl font-black">Week by week</h2>
      {WEEKS.map((w) => (
        <div key={w.week} className="tg-week mt-4 rounded-xl p-3" style={{ border: '1px solid var(--line)' }}>
          <h3 className="font-black">Week {w.week} · <span className="geez">{w.letters}</span></h3>
          <p className="geez text-sm">{w.rows}</p>
          {w.words && <p className="text-sm"><b>Words:</b> <span className="geez">{w.words}</span></p>}
          <p className="text-sm"><b>Reading:</b> {w.reading}</p>
          <p className="text-sm"><b>ጸሎት:</b> {w.prayer}</p>
          <p className="text-sm"><b>Homework:</b> Teacher Mode → Week {w.week} → Send homework. Check “turned in” before next class.</p>
          <p className="text-sm">Notes: ____________________________________________</p>
        </div>
      ))}
    </div>
  )
}
