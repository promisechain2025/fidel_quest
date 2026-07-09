# Community & Teacher — distribution + progress, without becoming a data company

> Status: **design**. Two separable asks: (1) let a church/community/weekend
> school **earn** by bringing families, (2) let a **teacher follow every kid's
> progress**. They have very different weight, so they ship in phases.

## Why

Ethiopian & Eritrean **weekend schools and church programs** are a built-in
distribution channel: one teacher can onboard 30 families at once. Turning that
channel on is probably the fastest path to the first 10k users — far cheaper
than ads. But "a teacher sees children's progress" means collecting and sharing
children's data, which moves the app out of its "collects nothing" posture. So
we phase it: earn first (low compliance), dashboard second (opt-in tier).

---

## Part 1 — Community revenue (chosen model: sponsored / bulk + affiliate)

The decision is to **avoid an ongoing-payout money-transmission build** for now
and lean on the store-native mechanics we already wired for gifting.

### 1a. Sponsored / bulk licenses
A community buys a **batch of family licenses at a discount** and hands them to
families. This reuses exactly the gifting rails from `APP-STORE.md`:
- **iOS:** the community buys N gifts via the App Store, or (cleaner for bulk)
  Apple's **Volume Purchase**; each family redeems once (spent on redeem).
- **Android:** developer **promo codes** (Play Console → Promotions), up to 500
  per app per quarter, each single-use — sell/hand a code sheet to the church.

No new backend; store handles payment and redemption.

### 1b. Affiliate code (earn per family)
Each community gets a **short code** (e.g. `DEBRE`). When a family enters it,
the community is credited. Two honest ways to make good on the credit without
building money-transmission:
- **Credit toward more licenses** (they earn free seats to give out) — stays
  entirely inside store mechanics, zero payout infrastructure.
- **Manual quarterly payout** against a simple attribution count — a
  spreadsheet + PayPal to start; formalize (Stripe Connect, 1099/VAT) only if
  volume justifies it.

Store note: sharing a cut of **IAP** revenue with a third party is allowed but
comes out of *your* net after the 15–30% store fee — which is exactly why the
"earn free seats" variant is the clean starting point.

### 1c. What we build now (small)
- A code field at purchase/redeem that records `referredBy` locally and, if the
  optional analytics URL is set, reports an anonymous `redeem{code}` count.
- A one-page **partner kit** (how to get codes, how crediting works). No PII, no
  child data — this part stays compliant and store-safe.

---

## Part 2 — Teacher progress dashboard (opt-in tier, later)

"Follow and see each kid's progress easily" needs the kids' progress to reach
the teacher's device. That is **collecting + sharing children's data** →
parental consent + a backend + data governance. So it is a **separate opt-in
"Fidel Quest for Community" tier**, never the default kids app.

### The good news: the skeleton exists
`server/src/social.js` (the dormant Family & Friends backend) already has the
right primitives:
- **group join-codes** (a class code),
- **per-member hashed tokens** (each family authorizes its own writes),
- **opt-in** (nothing runs unless `VITE_SOCIAL_URL` is set).

A class is a group; a member is a child; the teacher is a group owner with a
read view. So the dashboard is an evolution of social.js, not a greenfield
build.

### Shape
- Teacher creates a **class** → gets a join code.
- A parent joins with the code **after a consent step** (the parental gate +
  an explicit "share my child's progress with this class" toggle). Consent is
  revocable; revoking wipes the child's rows from the class.
- Each child's device pushes a **minimal** progress summary (letters learned,
  stars, trouble letters — no free text, no audio, no location).
- Teacher gets a **read-only dashboard**: roster, per-child mastery grid
  (reuse the Grown-ups mastery grid), "who's stuck on what", last-active.

### Compliance (the gating work, do before any child data moves)
- **Verifiable parental consent** before a child's data enters a class (COPPA /
  UK-AADC / GDPR-K). The teacher is not the consent-giver — the parent is.
- **Data minimization:** only the summary above; no PII beyond a parent-chosen
  display name; no audio; retention + delete-on-revoke.
- A **separate privacy policy** for the Community tier (the default app keeps
  its "collects nothing" label; only opted-in families are in scope).
- This tier likely wants its **own build flag / SKU** so the mainstream kids
  app is provably data-free.

### Interim (no backend): shareable report card
Until the dashboard is justified, each child can **export a progress card**
(image/PDF/link) that the parent sends to the teacher (WhatsApp/email). Not a
live dashboard, but zero compliance cost and useful for a small class. Reuse the
Share-card renderer.

---

## Phase 1.5 — SHIPPED: Teacher Mode on link + receipt rails (no backend)

What actually shipped as the interim (and likely long-term small-class) answer
is stronger than a report card: a full class loop where **every message is a
URL a person chooses to send**, on the same fragment-token rails as challenge
links (`src/utils/challenge.js`). Nothing about a child ever touches a server;
tokens live in the URL fragment and are validated/clamped on decode as
untrusted input.

- **Platform layer** `src/platform/classroom.js` (tested in
  `classroom.test.js`):
  - `#class=` invite tokens → `fq.class.v1` on the student device; joining
    also sets the community code (Part 1b credit) with the class code.
  - `#assign=` assignment tokens: `{class, teacher, familyIds, count, due,
    seed}` — the quiz is `buildReviewQueue` (platform/coach.js) over the
    chosen families, so **every student gets the same questions** and results
    are comparable. Pending assignment sits in `fq.assign.v1` and surfaces as
    a "Teacher's assignment" row in the home Today's-plan card.
  - `#receipt=` result tokens the student shares BACK (share sheet /
    WhatsApp): `{class, name, score, total, day, assignmentSeed}`. Opening
    one on the teacher's device files it into the local roster
    `fq.teacher.v1` (deduped per student+assignment; retakes replace).
- **Teacher UI** `src/components/TeacherMode.jsx` (Grown-ups → Teacher tools,
  behind the parental gate): create class, invite QR + share link (offline QR
  via the `qrcode` package), assignment builder (family grid, count, due
  date), results roster grouped by student.
- **TV classroom display** `src/components/TvClass.jsx`: full-screen chant
  board (giant letter + the family's seven orders, auto-advancing with audio,
  remote/keyboard driven) with the class-join QR in the corner — for casting
  or plugging a phone into the classroom TV.
- **Receipt = future sync payload.** The receipt shape is deliberately small
  and self-describing; if Phase 2's opt-in backend ever ships, receipts POST
  to it instead of traveling by WhatsApp — the client model doesn't change.

What this phase deliberately does NOT do: live/automatic sync (a receipt
travels only when a person sends it), cross-device identity (a student is a
self-reported name inside a link), or any consent machinery — none is needed
because no child data leaves any device except inside a link a family shares.

---

## Phasing

| Phase | What ships | Backend | Compliance |
| --- | --- | --- | --- |
| 1 | Bulk/promo licenses + affiliate code (earn seats) + partner kit | none | low (no child data) |
| 1.5 | **SHIPPED:** Teacher Mode — class links, seeded assignment links, receipt-link roster, TV chant board | none | low (links only, sent by people) |
| 2 | Class code + consent + minimal **automatic** sync + live dashboard | social.js tier | **high** (verifiable consent, minimization, separate policy) |

Start Phase 1 alongside launch; gate Phase 2 on real community demand so the
compliance and payout work is spent only once it will pay off. Phase 2's
client work shrinks to "POST the existing receipts": the token schema is the
sync protocol.
