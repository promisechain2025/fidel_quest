# Fidel Quest — Game Design

Every mode as it plays today, how a child interacts with it, how progress
flows between modes, and the plan from here. Numbers in this document are
taken from the shipped code (`src/`), not from intentions.

## The world and its characters

Fidel Quest teaches the Amharic alphabet to children who cannot yet read,
so every mode is audio-first and touch-first. Nothing important is ever
written-only, and nothing requires a precise click.

- **Anbessa** the lion cub — the hero the child helps and feeds. All
  character art is drawn in code (no image files), so the same lion appears
  as a 2D sprite and as a 3D texture.
- **Kokeb** the star — the companion who speaks the letters. She is the
  voice of every question and the power meter in the Runner.
- **Jibby** the hyena — the villain. He creeps toward the cookies in Letter
  Steps and steals letters in Skylands. He creates tension but never
  punishes: he always retreats, and the child never loses progress to him.
- **Zebra friends** — cheer from the sidelines of the Runner tracks.

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
   over a faint guide (the Classic mode's trace pad). Scoring is
   coverage-based and kid-lenient; a miss just plays a retry tone.

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
  appear together as options.

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
single-file artifact build), the app's mp3 library (277 clips: all 231
letter forms plus words and effects), then a musical chime derived from the
letter — never silent, never broken by a missing file. Current voices are
synthesized placeholders (espeak-ng Amharic, peak-normalized); the plan is
to replace them with human recordings per `recording-script.md` (34 files:
one per family chanting its forms with one-second gaps, plus one words
file), split on silence, verified, trimmed, normalized, and slotted in.

## The plan

**Shipped and verified:** all nine surfaces in one app; Letter Steps
complete including the trace-to-carve finale (verified end-to-end in a real
browser); adaptive practice; telemetry dashboard; ghost-hand onboarding;
bilingual UI; PWA offline build; single-file artifact build with embedded
audio.

**Waiting on a human:** voice recordings (34 files — the single
highest-impact improvement left); native-speaker review of the Amharic UI
strings and the draft Tigrinya pack; kid playtesting (trace difficulty,
shuffle round length); store publishing via the Capacitor shells.

**Proposed next, pending review:** mid-lesson resume (resume a family
lesson at its current phase instead of restarting the stone); word audio
from the recordings; activating the Tigrinya pack after native sign-off;
growing the word list beyond 25 once real word audio exists.

## Open review questions

1. **Trace leniency** — the carve finale accepts a trace that covers the
   letter even with heavy overshoot. Strict enough?
2. **Mix stones** — should big mixes (4+ families) also end with a trace?
3. **Home ordering** — Letter Steps first, quizzes gated behind it, 3D
   games as free play below. The right order for a new family?
4. **Default language** — UI defaults to English with an Amharic toggle.
   Should it default to Amharic?
5. **Recording priority** — letters first, words second, chimes stay as
   effects. Agreed?
