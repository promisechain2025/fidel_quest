import { Link } from 'react-router-dom'
import Seo from '../Seo.jsx'
import { CONTACT_EMAIL } from '../config.js'

/* Plain-language terms, honest about what the board is and is not.
   BEFORE PUBLISHING: fill the [bracketed] items (legal entity, governing
   law/jurisdiction, refund window) and have this reviewed by counsel. */
const H2 = ({ children }) => <h2 className="mt-8 text-xl font-black">{children}</h2>
const P = ({ children }) => <p className="mt-2 leading-relaxed" style={{ color: 'var(--muted)' }}>{children}</p>

export default function Terms() {
  return (
    <div className="mx-auto max-w-2xl px-5 pb-16 pt-12 sm:px-6">
      <Seo title="Terms of Service - eGeez" description="The terms for using the eGeez app, website, and teacher board." path="/terms" />
      <h1 className="display-2">Terms of Service</h1>
      <p className="mt-1 text-sm font-bold" style={{ color: 'var(--muted)' }}>Last updated: July 2026</p>

      <P>
        These terms govern your use of the eGeez app, website, and teacher
        board. By using them you agree to these terms. If you do not agree,
        please do not use the service.
      </P>

      <H2>What eGeez is</H2>
      <P>
        eGeez is (1) a learning app for children and (2) a board that
        introduces families to independent teachers. We are a platform and an
        introducer - we are not the employer of any teacher, we do not
        supervise lessons, and we are not a party to any arrangement you make
        with a teacher.
      </P>

      <H2>What "vetted" means - and does not</H2>
      <P>
        We review each teacher's application before it appears on the board and
        check the information they provide. We do not run formal background
        checks or verify credentials independently. Ratings and progress figures
        on the board are reported by families, gated on a real introduction, but
        are not independently audited. You are responsible for meeting a teacher,
        using your own judgment, and supervising your child. eGeez does not
        guarantee any teacher's conduct, quality, or results.
      </P>

      <H2>Accounts</H2>
      <P>
        Keep your login details accurate and secure; you are responsible for
        activity under your account. Teacher board profiles are owned by signing
        in with the same email used to apply. You must be an adult to create an
        account.
      </P>

      <H2>Acceptable use</H2>
      <P>
        Do not misuse the service: no unlawful, harmful, or abusive content; no
        attempts to break, scrape, or overload the systems; no impersonation.
        Reviews must reflect genuine first-hand experience. We may remove content
        or suspend accounts that break these rules.
      </P>

      <H2>Purchases and codes</H2>
      <P>
        The app is a one-time purchase; optional packs are additional. You should
        never pay twice for the same thing across our website and app - a purchase
        unlocks your access by code across your devices. Purchases made through
        the Apple App Store or Google Play are also governed by that store's terms
        and refund policy. For purchases made on this website, refunds are handled
        as described at [refund policy / window]; contact us for help.
      </P>

      <H2>Introductions and off-platform arrangements</H2>
      <P>
        When a teacher accepts your request, we share contact details so you can
        connect. Any lessons, schedules, and payments you arrange with a teacher
        are strictly between you and the teacher. eGeez is not responsible for
        those arrangements.
      </P>

      <H2>Content you submit</H2>
      <P>
        You keep ownership of what you submit (such as reviews). You grant us a
        license to display it in connection with the service. We may moderate,
        and we publish written reviews only after a check.
      </P>

      <H2>Disclaimers and liability</H2>
      <P>
        The service is provided "as is," without warranties of any kind,
        including any guarantee of learning outcomes. To the fullest extent
        permitted by law, eGeez and its operators are not liable for indirect or
        consequential damages, and our total liability is limited to the amount
        you paid us in the twelve months before the claim.
      </P>

      <H2>Termination</H2>
      <P>You may stop using the service and delete your account at any time. We may suspend or end access for breach of these terms.</P>

      <H2>Governing law</H2>
      <P>These terms are governed by the laws of [governing jurisdiction], and disputes will be handled in its courts, unless local law gives you other rights.</P>

      <H2>Contact</H2>
      <P>
        Operated by [operator legal entity]. Questions:{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold underline" style={{ color: 'var(--accent)' }}>{CONTACT_EMAIL}</a>.
        {' '}See also our <Link to="/privacy" className="font-bold underline" style={{ color: 'var(--accent)' }}>Privacy Policy</Link>.
      </P>
    </div>
  )
}
