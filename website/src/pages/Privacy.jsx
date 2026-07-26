import { Link } from 'react-router-dom'
import Seo from '../Seo.jsx'
import { CONTACT_EMAIL } from '../config.js'

/* Honest privacy policy, written to match what the code actually does.
   BEFORE PUBLISHING: the operator must fill the [bracketed] legal specifics
   (legal entity, hosting region) and have this reviewed - it involves
   children's data. Effective date is set by hand on each revision. */
const H2 = ({ children }) => <h2 className="mt-8 text-xl font-black">{children}</h2>
const P = ({ children }) => <p className="mt-2 leading-relaxed" style={{ color: 'var(--muted)' }}>{children}</p>
const LI = ({ children }) => <li className="leading-relaxed" style={{ color: 'var(--muted)' }}>{children}</li>

export default function Privacy() {
  return (
    <div className="mx-auto max-w-2xl px-5 pb-16 pt-12 sm:px-6">
      <Seo title="Privacy Policy - eGeez" description="How eGeez handles your data: minimal collection, no ads, no selling, parent-controlled child profiles." path="/privacy" />
      <h1 className="display-2">Privacy Policy</h1>
      <p className="mt-1 text-sm font-bold" style={{ color: 'var(--muted)' }}>Last updated: July 2026</p>

      <P>
        eGeez ("we", "us") is a learning home for the Amharic and Tigrinya
        writing systems and, increasingly, other subjects. This policy explains
        what we collect, why, and the choices you have. We collect as little as
        possible, we never sell your data, and we run no advertising.
      </P>

      <H2>The eGeez app collects nothing</H2>
      <P>
        The eGeez learning game is fully offline. It has no accounts and makes
        no network calls. A child's progress and settings live only in that
        device's local storage. Nothing leaves the device unless a grown-up
        deliberately shares something - for example, tapping "Share progress
        report" or "Share Anbessa," which creates a link or image that you, and
        only you, choose to send. We run no ads, analytics, or third-party
        trackers inside the app.
      </P>

      <H2>The website and hub (accounts) - what we collect</H2>
      <P>The rest of this policy covers this website and its hub service, used only if you create an account or submit a form:</P>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <LI><b>Parent account:</b> your email, a securely hashed password, the child first names you add, and the learning-progress snapshots you choose to save.</LI>
        <LI><b>Teacher account and application:</b> your name, email, the languages and subjects you teach, location, experience, and any message you write.</LI>
        <LI><b>Introductions:</b> the message and optional child first name you send a teacher. Contact details are shared with the other party only when a teacher accepts a request.</LI>
        <LI><b>Ratings and reviews</b> you submit about a teacher you are linked to.</LI>
        <LI><b>Waitlist and contact forms:</b> your email (and name/message where provided).</LI>
        <LI><b>Payments:</b> processed by Stripe. We never receive your full card details. We keep an order record (email, the product, and the unlock code issued).</LI>
      </ul>

      <H2>Children's data</H2>
      <P>
        We deliberately minimize this. There are no child accounts. The only
        child information we hold is what a parent enters in their own dashboard
        - a first name and learning counts - all under the parent's control. A
        parent can delete a child profile and all of its saved snapshots at any
        time from the family dashboard. We do not knowingly collect personal
        information directly from children.
      </P>

      <H2>How we use it</H2>
      <P>
        To run the service: sign you in, save the profiles and progress you
        choose to keep, introduce families and teachers, and send you
        transactional email (email confirmation, introduction notifications,
        and purchase receipts). That is all. We do not use your data for
        advertising and we do not sell or rent it.
      </P>

      <H2>Who we share it with</H2>
      <P>
        Only the service providers needed to operate: Stripe (payment
        processing), our email delivery provider (transactional email), and our
        hosting provider [hosting region / provider]. They process data on our
        behalf under their own terms. We share your contact details with a
        teacher (or a teacher's with you) only at the moment an introduction is
        accepted. We disclose data if required by law.
      </P>

      <H2>Storage and security</H2>
      <P>
        Passwords are stored only as salted hashes; sessions use signed tokens;
        traffic is encrypted in transit. No system is perfectly secure, but we
        keep the data we hold small on purpose.
      </P>

      <H2>Your choices and rights</H2>
      <P>
        You can view and edit your profiles in your dashboard, delete a child
        profile and its snapshots yourself, and request access to or deletion of
        your account and data by emailing us. Depending on where you live, you
        may have additional rights (access, correction, deletion, portability,
        objection); we honor these requests.
      </P>

      <H2>Retention</H2>
      <P>We keep account data while your account is active and delete it on request or after prolonged inactivity. Form submissions are kept only as long as needed to respond.</P>

      <H2>Changes</H2>
      <P>We will update this page and its "last updated" date when our practices change.</P>

      <H2>Contact</H2>
      <P>
        Questions or requests: <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold underline" style={{ color: 'var(--accent)' }}>{CONTACT_EMAIL}</a>.
        {' '}This service is operated by [operator legal entity], [address], governed as described in our{' '}
        <Link to="/terms" className="font-bold underline" style={{ color: 'var(--accent)' }}>Terms of Service</Link>.
      </P>
    </div>
  )
}
