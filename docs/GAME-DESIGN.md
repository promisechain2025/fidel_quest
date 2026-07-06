# Fidel Quest — Game Design Review Packet

> **For the reviewer.** This is a self-contained description of a shipped
> children's educational game, written for external review. You have not
> seen the code; everything you need is below. Please review it as a
> product and learning design — see "What to review" at the end. Numbers
> here are taken from the shipped code, not from intentions.

## What the app is

**Fidel Quest** is an Amharic alphabet (Fidel) learning game for children
who cannot yet read. It is a standalone, mobile-first, fully client-side
product — no backend, no accounts; all progress lives in the browser's
local storage. The Amharic script (Fidel/Ge'ez) has 33 base consonant
"families," each with 7 vowel "orders," for 231 vocalized forms total.

Because the audience is pre-readers, every mode is **audio-first and
touch-first**: nothing important is written-only, and nothing requires a
precise click.

**Tech (for context, not for review):** React 19 + Vite, TailwindCSS,
framer-motion for 2D, three.js and React Three Fiber for the 3D modes, a
PWA for offline install, and a Capacitor scaffold for native store builds.
Game logic is written as pure, seeded state machines (no runtime
randomness), which makes every round reproducible and testable.

## The world and its characters

- **Anbessa** the lion cub — the hero the child helps and feeds.
- **Kokeb** the star — the companion who *speaks* the letters; she is the
  voice of every question and the power meter in the Runner.
- **Jibby** the hyena — the villain. He creeps toward the cookies in Letter
  Steps and steals letters in Skylands. He creates tension but never
  punishes: he always retreats, and the child never loses progress to him.
- **Zebra friends** — cheer from the sidelines of the Runner tracks.

All character art is drawn in code (no image files), so the same lion
appears as a 2D sprite and as a 3D texture.

## How progress flows between modes

The home screen is one scroll, ordered as a learning path:

| Layer     | Surfaces                                                        |
| --------- | --------------------------------------------------------------- |
| Learn     | Letter Steps — master families here first; this is the gate     |
| Quiz      | Levels 1–4 (unlock per Letter Steps group), Levels 5–8 (vowels) |
| Adapt     | Star Practice (appears on trouble letters), First Words         |
| Play      | Letter Runner, Fidel Skylands (own learn-then-play gates)       |
| Reference | Letter Explorer, Classic Game, Grown-Ups (parents)              |

## The modes

### Letter Steps (the learn-first path)

A stone path of 62 stones: 33 family stones and 29 mix stones, unlocked
strictly in order, in 4 groups of 8/8/8/9 families mirroring quiz Levels
1–4. Each family stone teaches one family (7 forms) through six phases —
every phase is a mini-game, not a drill:

1. **Meet — Bubble Pop.** Each form drifts inside a wobbling soap bubble;
   pop it to hear the letter. Popped letters collect on Anbessa's shelf.
2. **Forward — Star Constellation.** The family becomes stars on a night
   sky; the child slides a finger star-to-star in order. A golden trail
   draws behind the finger and each star speaks as it lights.
3. **Backward — Star Constellation** in reverse.
4. **Echo — Feed Anbessa (5 rounds).** Kokeb says a letter; the letters are
   cookies. The right cookie flies into Anbessa's mouth. After two wrong
   touches the correct cookie pulses as a hint.
5. **Shuffle — Jibby the Thief (5 rounds).** Same game, scrambled order,
   with Jibby creeping toward the cookies each round. Grabbing the spoken
   cookie makes him retreat.
6. **Trace — Carve it.** The child finger-traces the family's base letter
   over a faint guide. Scoring is coverage-based and kid-lenient; a miss
   just plays a retry tone.

Mix stones are 6 shuffle-style rounds over all families mastered so far in
the group (no trace). Mastering all families in a group unlocks the
matching quiz level. Interaction is slide-touch everywhere: the finger
glides and letters respond under it. Wrong answers feed the adaptive
practice engine but never block progress.

### Lesson Levels 1–4 (base quizzes)

Kokeb speaks a sound; the child picks the matching letter tile. Right
answers burst into celebration; a wrong answer flips into a short recovery
(the app shows and says the correct letter, then asks again).

- Levels: First Letters (8), More Letters (8), Even More Letters (8),
  The Last Letters (9).
- Stars: 3 at >= 90% first-try accuracy, 2 at >= 65%, else 1.
- Gating: a level opens when its Letter Steps group is mastered and the
  previous level has stars.
- Twin safety: letters that share a sound (ሀ/ሐ/ኀ, ሰ/ሠ, አ/ዐ, ጸ/ፀ) never
  appear together as options, so a child is never marked wrong for an
  answer that sounds right.

### Levels 5–8 (Vowel Magic)

Same quiz engine; the choices are different orders of the same family
(ለ ሉ ሊ ላ …), so the child must hear the vowel, not just the consonant.
Across the four levels this covers all 231 vocalized forms. Titles: Vowel
Magic, More Vowel Magic, Deep Vowels, Vowel Master.

### Star Practice (adaptive review)

Every answer in every mode is recorded locally (device-only, capped
ledger). When the app notices trouble letters — seen at least twice with a
fail rate of 25% or more, up to 5 letters — a Star Practice card appears on
the home screen with a personalized queue: the trouble letters plus their
confusion partners. Master them and the card disappears.

### First Words

Kokeb says a real Amharic word; the child picks the matching picture card
from three. Six words per round from a pool of 25 (one per letter family
that carries a word). Pictures are guaranteed distinct within a question.
Stars use the same first-try accuracy bands as the lessons.

### Letter Runner (3D)

Anbessa runs down a three-lane track with Kokeb above him. Letter gates
approach; Kokeb calls a sound; the child steers into the gate with the
right letter (swipe, big left/right buttons, or arrow keys). Correct feeds
make Kokeb glow (power); wrong feeds strengthen the Letter Muncher. After
every 5 meals the Muncher attacks: power must beat his strength or the run
is destroyed. Survive and the run speeds up into the next letter group.
Tracks are procedurally built landmarks of Lalibela, Aksum, the Simien
Mountains, Gondar, Asmara, and Massawa, with grazing zebras. 3 gate options
per question; runs are seeded and reproducible.

### Fidel Skylands (3D quest)

Four floating islands themed after Lalibela, Aksum, the Simien Mountains,
and Massawa; each island is a session over one letter group. The rule is
strict learn-then-play: the child must take the learning walk — touching
and hearing every letter on the island — before that island's game
unlocks. The game is fruit-picking (tap the fruit carrying the called
letter). Quizzes are cumulative: island n draws on islands 1..n, weighted
toward the newest letters. Each island ends with Jibby's Snack Attack: he
steals three letters from earlier islands and the child wins them back — a
built-in review. Beating an island springs a plank bridge to the next.

### Classic Game

The original game, preserved and lazy-loaded: chant mode (sing through a
family row), the tracing pad, and its own first-words list.

### Letter Explorer

The full fidel table as a touchable grid: 33 rows x 7 orders, tap any cell
to hear it. No score, no gates.

### Grown-Ups

Behind a child-proof gate (press-and-hold plus a number match): a mastery
grid over all forms, trouble letters with plain-language tips including
confusion pairs, overall accuracy, and a progress reset — all computed
from the on-device answer ledger.

## Interaction rules that hold everywhere

- **Fingers, not clicks.** Letters respond to a finger sliding over them;
  targets a child aims at are large.
- **Audio-first.** Every question is spoken; a pre-reader can play every
  mode without reading UI text.
- **No punishment.** Wrong answers cost nothing permanent; progress is only
  ever added.
- **Ghost-hand onboarding.** On first launch a translucent hand plays a
  demo round by itself; demo answers are excluded from telemetry.
- **Deterministic play.** No runtime randomness — every round is a pure
  function of (level, seed), which is also how the game is tested.
- **Bilingual UI.** One tap switches English/Amharic; the choice persists.
- **Offline PWA** with all audio cached; Capacitor scaffold for native
  shells; a low-end quality tier tones down 3D effects on weak phones.
- **Accessible fallbacks.** Every touch target is a keyboard target with a
  visible focus ring; reduced motion is respected.

## Audio

Every sound call tries three sources in order: an embedded audio pack (the
single-file build), the app's mp3 library (277 clips: all 231 letter forms
plus words and effects), then a musical chime derived from the letter —
never silent, never broken by a missing file. Current voices are
synthesized placeholders (a text-to-speech engine, peak-normalized); the
plan is to replace them with human recordings (34 files: one per family
chanting its forms with one-second gaps, plus one words file), split on
silence, verified, trimmed, normalized, and slotted in.

## Current state and roadmap

**Shipped and verified:** all nine surfaces in one app; Letter Steps
complete including the trace-to-carve finale (verified end-to-end in a real
browser); adaptive practice; a parents' telemetry dashboard; ghost-hand
onboarding; bilingual UI; PWA offline build; single-file build with
embedded audio. Full automated test suite green.

**Waiting on a human:** professional voice recordings (the single
highest-impact improvement left); native-speaker review of the Amharic UI
strings and a draft Tigrinya letter pack; kid playtesting (trace
difficulty, shuffle round length); app-store publishing via the Capacitor
shells.

**Proposed next:** mid-lesson resume (resume a family lesson at its current
phase instead of restarting the stone); word audio from the recordings;
activating the Tigrinya pack after native sign-off; growing the word list
beyond 25 once real word audio exists.

## What to review

Please give a critical product- and learning-design review. Specific
questions we want a second opinion on:

1. **Pedagogy / sequencing.** Is "learn a family through six phases, then
   quiz, then cumulative 3D review" a sound way to teach an abecedary to
   3–6 year olds? Any gaps in the learn → practice → recall loop?
2. **Cognitive load.** Nine surfaces on one home screen. Too many entry
   points for a small child (and their parent)? What would you cut or hide?
3. **Trace finale.** The carve step accepts a trace that covers the letter
   even with heavy overshoot. Is coverage-based, near-impossible-to-fail
   tracing good for motivation, or does it teach nothing? Better scoring?
4. **Difficulty pacing.** 5 echo + 5 shuffle rounds per family, 5 meals per
   Runner level, cumulative Skylands quizzes. Where is this likely too long
   or too hard, and where too easy?
5. **Motivation model.** Stars, streaks, star-gated unlocks, a
   never-punishing villain. Is the reward loop strong enough to bring a
   child back daily? What is missing (collection, story, daily goal)?
6. **Retention of similar letters.** The 4 twin/near-twin groups that sound
   identical are kept apart so a child is never wrong. Does that help
   (no false failure) or hurt (never learns to distinguish them)?
7. **Accessibility & inclusivity** for the actual audience (often shared
   low-end phones, intermittent connectivity, multilingual households).
8. **Anything that would make a child churn** in the first session.

Concrete, prioritized recommendations preferred over general praise.
