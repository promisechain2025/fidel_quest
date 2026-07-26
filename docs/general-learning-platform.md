# From fidel app to general learning platform

Owner decision (July 2026): eGeez grows from "the Amharic/Tigrinya fidel
app" into **the Ethiopian & Eritrean kids' learning platform** - the app
itself teaches more than fidel over time, and the tutor board carries every
subject now. This doc is the plan and the guardrails.

## The two surfaces expand very differently

- **The board (marketplace)** is subject-agnostic by nature - it matches
  families to teachers. Adding a subject is taxonomy + filtering + matching.
  **Cheap.**
- **The app (the game)** is a fidel content engine end to end - the journey,
  progress mask (231 letters), mini-games, and quizzes are all literacy.
  Adding a subject means a second content engine and a generalized progress
  model. **Expensive**, and it is a real content-authoring effort on the
  scale of the original fidel build.

Treat "add math" as two projects, not one. Only the board part is cheap.

## Phase 0 - board goes multi-subject  (DONE)

- `api/subjects.js` + `website/src/subjects.js` (mirrored ids): a structured,
  neutral subject taxonomy (Amharic, Tigrinya, Math, Science, English,
  Other). WHAT a teacher teaches, distinct from `languages` (the medium).
- Teacher application carries `subjectTags: [String]` (validated against the
  taxonomy) alongside the free-text `subjects` focus field.
- `GET /api/teachers?subject=math` narrows the board; the directory shows a
  subject filter and per-card subject chips.
- History / culture / religious studies are deliberately NOT enumerated -
  they are the sensitive topics for these communities (same reason the
  language pages are separate). They live in free text + "Other". Numbers
  and science travel without that baggage, which is why math is the safe
  first expansion.

## Phase 1 - make the progress signal subject-aware  (DONE)

The instinct here was to let families type a per-subject score (grade level,
mastery %) that would feed a math tutor's badge. We deliberately did NOT do
that: a family-typed number is exactly the gameable, self-reported signal the
trust review just removed. Re-introducing it - even relabeled - would repeat
the mistake. Credible per-subject *learning* progress must come from real
activity (in-app gameplay, Phase 2), not a self-entered figure.

What Phase 1 shipped instead - honest and non-gameable:

1. **Correct subject scoping of the fidel-letters badge.** The app-derived
   letters gain now only credits a teacher who actually teaches literacy
   (amharic/tigrinya, or a legacy no-tags teacher). A math tutor linked to a
   child was previously credited with that child's fidel gameplay - a
   misattribution. `teacherProgressStats(teacherId, subjectTags)` now returns
   `teachesLiteracy` and gates `show` on it.
2. **An all-subject relationship signal:** `families` - the count of distinct
   families with a child linked to this teacher. Shown on the board card and
   the teacher dashboard from the first link. Non-gameable (families vote
   with their feet) and works for math, science, anything - no app content
   required.

Still open for a *future* Phase 1.5, only if a trustworthy source appears:
subject-tagged snapshots `{ subject, metric, value, day }` fed by in-app
gameplay (Phase 2) or a teacher-administered assessment - never a raw
family-typed score. The Progress Card contract (`src/platform/progressCard.js`
<-> `website/src/progressCard.js`) would grow a subject field, cross-checked
by the existing anti-drift test.

## Phase 2 - math content inside the app  (BIG, deliberate bet)

Only worth building once the board proves families want math tutors.

Architecture reuse (the structure is generic; the content is not):
- **`src/journey.js`** already models typed nodes, sequential unlock gating,
  rewards, and legacy migration. Introduce a **subject/track dimension**: the
  home screen picks a track (Fidel, Numbers, ...) and each track has its own
  node list + its own progress key (registered in
  `src/platform/progress.js`, never an ad-hoc localStorage key).
- The pure, seeded state-machine pattern (`transition(ctx, event)`, mulberry32
  PRNG, no `Math.random`) carries straight over to arithmetic drills.
- Reward table, quiz machinery, and the character cast (Anbessa, Kokeb,
  Jibby) are shared across tracks - one art system, many subjects.

First math track (smallest shippable slice), mirroring the fidel arc:
1. Ge'ez / Arabic numerals recognition (LEARN nodes) - a validated numeral
   table in `src/data/`, the single source of truth, test-verified exactly
   like `fidelGameData.js`. **STARTED:** `src/data/numerals.js` is that table
   (glyphs 1..100, `toGeez`/`fromGeez`, exhaustively round-trip tested); the
   existing `MerkatoMarket` counting game already teaches 1..9 recognition.
   Remaining: spoken number names (native-speaker review) and the journey
   nodes that string counting -> number sense -> arithmetic together.
2. Counting and number sense (MIX nodes).
3. Addition / subtraction boss quizzes (QUIZ nodes).
4. A celebratory arcade node reusing the Runner/Catch engines with numerals.

Guardrails (unchanged platform contract):
- Fully **offline**, low-end friendly, **all 8 languages** (zero missing
  keys - audit with the split script).
- Pure and seeded so it tests headless; extend the module-load invariant
  suite with numeral-table integrity checks.
- Never block a child mid-task.
- Numeral heritage and example contexts stay **culturally neutral** - no
  content that reads as Ethiopian-only or Eritrean-only.

## Brand and packaging

- The name stays eGeez; the promise widens from "learn the fidel" to "learn".
- Pricing: the app-unlock model already generalizes - math ships inside the
  paid app (no per-subject paywall for core tracks) or as an add-on pack in
  the same "never pay twice" EGZ/FAM code system, TBD per track.
- SEO/positioning shifts from "Amharic alphabet" keywords toward
  "Ethiopian/Eritrean kids learning" while keeping the strong fidel landing
  pages as the top funnel.

## Sequencing recommendation

Ship Phase 0 (done) and Phase 1 next - both make the marketplace a real
multi-subject tutoring board with credible per-subject progress at low cost.
Treat Phase 2 as a separate, deliberate content bet triggered by real demand
from the board, not built on spec.
