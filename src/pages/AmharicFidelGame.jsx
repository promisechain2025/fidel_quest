/* eslint-disable react-refresh/only-export-components --
   deliberately a single self-contained file (data + helpers + component);
   the named exports exist so the test file can exercise the pure logic. */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Star,
  Sparkles,
  Flame,
  Trophy,
  Volume2,
  VolumeX,
  ArrowLeft,
  Play,
  BookOpen,
  Gamepad2,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Smile,
  Frown,
  PartyPopper,
  ChevronRight,
  Music,
  Pencil,
  Languages,
} from 'lucide-react'
import { loadFromStorage } from '../utils/loadFromStorage'
import FidelTracePad from '../components/FidelTracePad'
import FidelMaster from '../components/FidelMaster'
import ScopeToggle from '../components/ScopeToggle'
import { getScope, setScope, scopedFamilyIndexSet } from '../platform/letterScope'
import { audio as platformAudio } from '../platform/audioEngine'
import { getLang, praiseWords, encourageWords } from '../platform/i18n'
import { loadClassicProgress, saveClassicProgress } from '../platform/classicSave'
import {
  FIDEL_FAMILIES,
  ALL_FORMS,
  CHAR_TO_FORM,
  WORDS,
  UI_STRINGS,
  ORDER_NAMES,
  GEEZ_ORDER_NAMES,
} from '../data/fidelGameData'

// Re-exported so tests (and future callers) keep a single import site.
export { FIDEL_FAMILIES, ALL_FORMS, CHAR_TO_FORM, WORDS }

/* ============================================================================
   FIDEL QUEST — an Amharic alphabet (Fidel) learning game for kids.

   Fully self-contained: data, audio helpers, state machine, and every screen
   live in this one file by design (per the product brief). No backend calls.

   ── AUDIO PLACEHOLDERS ──────────────────────────────────────────────────────
   The game calls the HTML5 Audio API with predictable file paths. Drop your
   own recordings into the Vite `public/` folder and they will just work:

     Letter pronunciations (one clip per character):
       public/audio/fidel/letters/<family>-<order>.mp3
       e.g.  ለ (1st order of "le")  ->  public/audio/fidel/letters/le-1.mp3
             ሉ (2nd order of "le")  ->  public/audio/fidel/letters/le-2.mp3
       Labialized bonus forms use order 8 (e.g. ሏ -> le-8.mp3).
       The exact key for any character is `form.audioKey` (data module).

     Word pronunciations (First Words level, one clip per word):
       public/audio/fidel/words/<latin>.mp3   e.g. ልጅ -> words/lij.mp3

   Letter and word playback goes through the shared platform AudioEngine
   (src/platform/audioEngine.js) — the same human recordings, memory-pack
   support (artifact builds), and deterministic chime floor as every other
   mode. UI sound effects are synthesized WebAudio tones (see AUDIO below).
   ========================================================================== */

/* ── LEVELS ──────────────────────────────────────────────────────────────────
   Seven levels over the full 33-family fidel table (data module holds the
   characters). Families are referenced by NAME and resolved to indices so
   the level definitions survive data reordering/insertion.

   1-3: base (1st-order) characters, sound -> letter, in traditional order.
   4:   the ejective ("popping") letters plus f/p.
   5:   vocalized orders inside familiar families — vowel discrimination.
   6:   first words — which letter starts the word?
   7:   grand review — hear any of the 231 forms, find the letter.            */

const familyIndicesByName = (names) =>
  names.map((name) => FIDEL_FAMILIES.findIndex((f) => f.name === name))

const ALL_FAMILY_INDICES = FIDEL_FAMILIES.map((f) => f.familyIndex)

export const LEVELS = [
  {
    id: 1,
    mode: 'sound-to-char',
    familyIndices: familyIndicesByName(['Ha', 'Le', 'Hha', 'Me', 'Sse', 'Re', 'Se', 'She']),
    formOrders: [0],
    questionCount: 8,
    accent: 'from-amber-400 to-orange-500',
  },
  {
    id: 2,
    mode: 'sound-to-char',
    familyIndices: familyIndicesByName(['Qe', 'Be', 'Te', 'Che', 'Kha', 'Ne', 'Nye', 'A']),
    formOrders: [0],
    questionCount: 8,
    accent: 'from-emerald-400 to-teal-500',
  },
  {
    id: 3,
    mode: 'sound-to-char',
    familyIndices: familyIndicesByName(['Ke', 'Khe', 'We', 'Ae', 'Ze', 'Zhe', 'Ye', 'De', 'Je', 'Ge']),
    formOrders: [0],
    questionCount: 10,
    accent: 'from-sky-400 to-blue-500',
  },
  {
    id: 4,
    mode: 'sound-to-char',
    familyIndices: familyIndicesByName(['The', 'Chhe', 'Ppe', 'Tse', 'Ttse', 'Fe', 'Pe']),
    formOrders: [0],
    questionCount: 8,
    accent: 'from-rose-400 to-pink-500',
  },
  {
    id: 5,
    mode: 'sound-to-char',
    familyIndices: familyIndicesByName(['Le', 'Me', 'Se', 'Be', 'Te', 'Ne', 'Ke']),
    formOrders: [0, 1, 2, 3, 4, 6],
    questionCount: 10,
    preferSameFamily: true,
    accent: 'from-violet-400 to-purple-500',
  },
  {
    id: 6,
    mode: 'word-to-char',
    familyIndices: ALL_FAMILY_INDICES,
    formOrders: [0],
    questionCount: 10,
    accent: 'from-lime-400 to-green-500',
  },
  {
    // Grand Review: hear any letter (all families, all seven orders), find
    // it. Replaces the old char-to-sound "Sound Detective" - kids should
    // never be asked to read Latin romanizations.
    id: 7,
    mode: 'sound-to-char',
    familyIndices: ALL_FAMILY_INDICES,
    formOrders: [0, 1, 2, 3, 4, 5, 6],
    questionCount: 12,
    accent: 'from-fuchsia-400 to-purple-600',
  },
  // English titles are canonical (tests reference them); the Amharic UI
  // resolves display titles through UI_STRINGS at render time.
].map((level) => ({
  ...level,
  title: UI_STRINGS.en.levels[level.id].title,
  subtitle: UI_STRINGS.en.levels[level.id].subtitle,
}))

const STORAGE_KEY = 'fidel-quest-progress-v1'

const TILE_COLORS = [
  'from-amber-300 to-orange-400',
  'from-emerald-300 to-teal-400',
  'from-sky-300 to-blue-400',
  'from-rose-300 to-pink-400',
  'from-violet-300 to-purple-400',
  'from-lime-300 to-green-400',
]

/* ── PURE HELPERS ──────────────────────────────────────────────────────────── */

export function shuffle(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function buildPool(level, familyIndexSet = null) {
  const build = (indices) => {
    const pool = []
    indices.forEach((fi) => {
      const family = FIDEL_FAMILIES[fi]
      level.formOrders.forEach((order) => {
        if (family.forms[order]) pool.push(family.forms[order])
      })
    })
    return pool
  }
  if (!familyIndexSet) return build(level.familyIndices)
  // In 'learned' scope a child must NEVER be quizzed on a letter they have
  // not met. When the learned slice of this level is too thin for real
  // choices (fewer than 4 forms), widen with OTHER vocal orders of learned
  // families - first the level's own, then any learned family - instead of
  // falling back to unlearned strangers.
  const inLevel = level.familyIndices.filter((fi) => familyIndexSet.has(fi))
  const pool = build(inLevel)
  const widen = (indices) => {
    const seen = new Set(pool.map((f) => f.char))
    for (const fi of indices) {
      if (pool.length >= 4) return
      for (const form of FIDEL_FAMILIES[fi].forms) {
        if (form && !seen.has(form.char)) {
          seen.add(form.char)
          pool.push(form)
          if (pool.length >= 4) return
        }
      }
    }
  }
  if (pool.length < 4) widen(inLevel)
  if (pool.length < 4) widen([...familyIndexSet].filter((fi) => !inLevel.includes(fi)))
  // Nothing learned at all cannot happen (scope falls back to the first
  // family), but keep the quiz playable no matter what.
  return pool.length >= 4 ? pool : build(level.familyIndices)
}

/* Pick 3 distractors for a target. Guarantees no distractor shares the
   target's pronunciation (ሀ vs ሐ would otherwise both be right answers),
   and dedupes by sound so char-to-sound questions never show two identical
   choices. `preferSameFamily` front-loads siblings of the target family to
   train vowel discrimination in Level 3.                                     */
export function buildQuestion(level, target, pool) {
  const candidates = pool.filter(
    (form) => form.char !== target.char && form.sound !== target.sound,
  )
  const ordered = level.preferSameFamily
    ? [
        ...shuffle(candidates.filter((f) => f.familyIndex === target.familyIndex)),
        ...shuffle(candidates.filter((f) => f.familyIndex !== target.familyIndex)),
      ]
    : shuffle(candidates)

  const seenSounds = new Set([target.sound])
  const seenChars = new Set([target.char])
  const distractors = []
  for (const form of ordered) {
    if (seenSounds.has(form.sound) || seenChars.has(form.char)) continue
    seenSounds.add(form.sound)
    seenChars.add(form.char)
    distractors.push(form)
    if (distractors.length === 3) break
  }
  return { target, options: shuffle([target, ...distractors]) }
}

/* Adaptive weighting: letters the child has missed before appear more often
   (weight 1 + missCount, capped at 3x) until correct answers decay the count
   back down. Pure so it can be tested exhaustively.                          */
export function weightTargets(forms, missCounts = {}) {
  const weighted = []
  forms.forEach((form) => {
    const weight = 1 + Math.min(missCounts[form.char] || 0, 2)
    for (let i = 0; i < weight; i++) weighted.push(form)
  })
  return weighted
}

/* First Words questions: show a word (with its picture), ask which letter
   starts it. The target is the form of the word's leading character;
   distractors come from the whole fidel table via buildQuestion, which
   already guarantees unique characters and pronunciations.                  */
export function buildWordQuestions(level, familyIndexSet = null) {
  // Same scope rule as the letter rounds: in 'learned' mode only ask about
  // words whose answer letter the child has met, with distractors from
  // learned families. Falls back to the full word list only when too few
  // words are in scope to make a real round.
  const inScope = (form) => !familyIndexSet || familyIndexSet.has(form.familyIndex)
  const scopedWords = WORDS.filter((w) => inScope(CHAR_TO_FORM.get(w.startChar)))
  const useScoped = familyIndexSet && scopedWords.length >= 4
  const words = shuffle(useScoped ? scopedWords : WORDS)
  const pool = useScoped ? ALL_FORMS.filter(inScope) : ALL_FORMS
  const questions = []
  for (let i = 0; i < level.questionCount; i++) {
    let word = words[i % words.length]
    const prevWord = questions.length ? questions[questions.length - 1].word.geez : null
    if (words.length > 1 && word.geez === prevWord) {
      word = words[(i + 1) % words.length]
    }
    const target = CHAR_TO_FORM.get(word.startChar)
    questions.push({ ...buildQuestion(level, target, pool), word })
  }
  return questions
}

export function buildQuestions(level, { missCounts = {}, targetForms = null, familyIndices = null } = {}) {
  if (level.mode === 'word-to-char') return buildWordQuestions(level, familyIndices)
  const pool = buildPool(level, familyIndices)
  // Practice rounds narrow the targets to just-missed letters while keeping
  // the full level pool available for distractors.
  const baseTargets = targetForms && targetForms.length ? targetForms : pool
  const targets = shuffle(weightTargets(baseTargets, missCounts))
  const questions = []
  for (let i = 0; i < level.questionCount; i++) {
    let target = targets[i % targets.length]
    // Avoid asking the exact same character twice in a row. Weighted targets
    // can hold adjacent duplicates, so scan forward for the first different
    // one instead of blindly taking the next slot (which may match too).
    const prevChar = questions.length ? questions[questions.length - 1].target.char : null
    if (prevChar !== null && target.char === prevChar) {
      for (let offset = 1; offset < targets.length; offset++) {
        const candidate = targets[(i + offset) % targets.length]
        if (candidate.char !== prevChar) {
          target = candidate
          break
        }
      }
    }
    questions.push(buildQuestion(level, target, pool))
  }
  return questions
}

// The mastery bar: 2 stars (80 percent) is a PASS and unlocks the next
// level; 1 star means the level wants another go after practicing.
export const PASS_RATE = 0.8
export function starsForAccuracy(accuracy) {
  if (accuracy >= 0.9) return 3
  if (accuracy >= PASS_RATE) return 2
  return 1
}

// Resolve a (possibly practice-cloned) level back to its canonical LEVELS
// entry — the single place that knows how run objects map to definitions.
function baseLevelOf(level) {
  return LEVELS.find((l) => l.id === level.id) || level
}

// Storage moved to platform/classicSave (registered app-level progress).
const loadProgress = loadClassicProgress
const saveProgress = saveClassicProgress

/* ── AUDIO ───────────────────────────────────────────────────────────────────
   Letters/words: the shared platform AudioEngine (human recordings with a
   deterministic chime floor — never a robotic synthesized voice).
   SFX: synthesized WebAudio tones, local to this mode.                       */

let sharedAudioCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  // Mobile browsers close a backgrounded context for good; a closed context
  // can never play again, so recreate rather than returning it forever.
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    try {
      sharedAudioCtx = new Ctor()
    } catch {
      return null
    }
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {})
  }
  return sharedAudioCtx
}

function playTones(steps, type = 'sine') {
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  steps.forEach(({ freq, at, dur, vol = 0.12 }) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, now + at)
    gain.gain.setValueAtTime(0.0001, now + at)
    gain.gain.exponentialRampToValueAtTime(vol, now + at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + dur)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now + at)
    osc.stop(now + at + dur + 0.05)
  })
}

// C-major flavored cues: rising = good, falling = try again.
const SYNTH_SFX = {
  tap: () => playTones([{ freq: 620, at: 0, dur: 0.08, vol: 0.05 }], 'triangle'),
  correct: () =>
    playTones([
      { freq: 523.25, at: 0, dur: 0.14 },
      { freq: 659.25, at: 0.09, dur: 0.14 },
      { freq: 783.99, at: 0.18, dur: 0.24 },
    ]),
  wrong: () =>
    playTones(
      [
        { freq: 311.13, at: 0, dur: 0.16, vol: 0.07 },
        { freq: 246.94, at: 0.15, dur: 0.26, vol: 0.07 },
      ],
      'sine',
    ),
  streak: () =>
    playTones([
      { freq: 523.25, at: 0, dur: 0.1 },
      { freq: 587.33, at: 0.08, dur: 0.1 },
      { freq: 659.25, at: 0.16, dur: 0.1 },
      { freq: 783.99, at: 0.24, dur: 0.1 },
      { freq: 1046.5, at: 0.32, dur: 0.3 },
    ]),
  'level-complete': () =>
    playTones([
      { freq: 523.25, at: 0, dur: 0.16 },
      { freq: 659.25, at: 0.14, dur: 0.16 },
      { freq: 783.99, at: 0.28, dur: 0.16 },
      { freq: 1046.5, at: 0.42, dur: 0.42, vol: 0.14 },
      { freq: 1318.5, at: 0.58, dur: 0.42, vol: 0.1 },
    ]),
}

function vibrate(pattern) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern)
  }
}

// Recitation cadence: ~0.8s clip + a beat of silence, so syllables never
// overlap (the engine's voice queue also holds any stragglers). The chant
// offers three paces; slow gives the most room to say each letter along.
const CHANT_PACES = { slow: 1900, normal: 1300, fast: 850 }
const CHANT_PACE_ORDER = ['slow', 'normal', 'fast']
const CHANT_CADENCE_MS = CHANT_PACES.normal

/* Spoken motivation. These keys map to optional human recordings the operator
   can drop in (e.g. public/audio/fidel/praise/gobez.mp3). Until a clip exists
   the resolver reports 'chime', and we simply skip it — the correct/wrong SFX
   already gives an audio cue, so we never double up or fake a robotic voice.
   The word lists (UI_STRINGS praise/encourage) are what to record. */
const PRAISE_CLIPS = ['praise/gobez', 'praise/betam-gobez', 'praise/arif', 'praise/girum', 'praise/tebarek', 'praise/kokeb-neh']
const ENCOURAGE_CLIPS = ['encourage/ayzoh', 'encourage/endegena-moker', 'encourage/teqarebk', 'encourage/tichlaleh']

function speakMotivation(clips) {
  try {
    const key = clips[Math.floor(Math.random() * clips.length)]
    // Only play when a real recording exists; a 'chime' resolution is skipped.
    if (platformAudio.resolve(key).type !== 'chime') platformAudio.play(key)
  } catch {
    /* audio unavailable — the SFX cue already fired */
  }
}

/* ── SHARED STYLES (keyframes Tailwind doesn't ship) ───────────────────────── */

const GAME_KEYFRAMES = `
@keyframes fq-confetti-fall {
  0%   { transform: translateY(-8vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(112vh) rotate(720deg); opacity: 0.85; }
}
@keyframes fq-pop-in {
  0%   { transform: scale(0.4); opacity: 0; }
  70%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes fq-bounce-soft {
  0%, 100% { transform: translateY(0); }
  40%      { transform: translateY(-14px); }
  60%      { transform: translateY(-6px); }
}
@keyframes fq-shake {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-7px); }
  40%      { transform: translateX(7px); }
  60%      { transform: translateX(-5px); }
  80%      { transform: translateX(5px); }
}
@keyframes fq-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-8px); }
}
@keyframes fq-glow-ring {
  0%   { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.85); }
  100% { box-shadow: 0 0 0 22px rgba(251, 191, 36, 0); }
}
@keyframes fq-score-float {
  0%   { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(-28px); opacity: 0; }
}
@keyframes fq-wiggle {
  0%, 100% { transform: rotate(0deg); }
  25%      { transform: rotate(-8deg); }
  75%      { transform: rotate(8deg); }
}
.fq-anim-pop      { animation: fq-pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.fq-anim-bounce   { animation: fq-bounce-soft 0.7s ease-in-out; }
.fq-anim-shake    { animation: fq-shake 0.45s ease-in-out; }
.fq-anim-float    { animation: fq-float 2.6s ease-in-out infinite; }
.fq-anim-glow     { animation: fq-glow-ring 0.9s ease-out; }
.fq-anim-score    { animation: fq-score-float 0.9s ease-out forwards; }
.fq-anim-wiggle   { animation: fq-wiggle 0.5s ease-in-out; }
/* No local prefers-reduced-motion block: src/index.css globally collapses
   all animation durations to 0.01ms (WCAG 2.3.3), which freezes the fq-*
   animations and sends confetti pieces instantly to their off-screen final
   frame ('forwards'). One app-wide policy, no second source of truth. */
`

const ETHIOPIC_FONT = {
  fontFamily: "'Noto Sans Ethiopic', 'Abyssinica SIL', 'Nyala', sans-serif",
}

// One keyboard-focus treatment for every interactive element; color
// variants append their own ring color after this base.
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/70'

/* ── SMALL PRESENTATIONAL PIECES ───────────────────────────────────────────── */

const CONFETTI_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#f97316', '#84cc16']

// 32 pieces reads as a full celebration while keeping the animating span
// count low enough not to compete with the answer-grid animations on
// low-end phones (bursts can overlap on fast streaks).
function ConfettiBurst({ pieceCount = 32 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: pieceCount }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.7,
        duration: 2.4 + Math.random() * 1.8,
        size: 7 + Math.random() * 8,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: i % 3 === 0,
      })),
    [pieceCount],
  )
  // Self-unmount once the slowest piece has landed — otherwise the fixed
  // overlay (and its spans) would linger invisibly for the whole session.
  const [done, setDone] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setDone(true), 5200)
    return () => clearTimeout(timer)
  }, [])
  if (done) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className={`fq-confetti-piece absolute top-0 block ${p.round ? 'rounded-full' : 'rounded-sm'}`}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.round ? 1 : 1.6),
            backgroundColor: p.color,
            animation: `fq-confetti-fall ${p.duration}s linear ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  )
}

/* The mascot: a smiling star named Kokeb ("star" in Amharic). Reacts to the
   game — bounces with sparkles on a correct answer, wiggles gently on a miss. */
function Mascot({ mood, size = 'md' }) {
  const dims = size === 'lg' ? 'h-28 w-28' : size === 'sm' ? 'h-12 w-12' : 'h-20 w-20'
  const starDims = size === 'lg' ? 'h-24 w-24' : size === 'sm' ? 'h-11 w-11' : 'h-16 w-16'
  const faceDims = size === 'lg' ? 'h-9 w-9' : size === 'sm' ? 'h-4 w-4' : 'h-6 w-6'
  const wrapAnim =
    mood === 'happy' || mood === 'party'
      ? 'fq-anim-bounce'
      : mood === 'sad'
        ? 'fq-anim-wiggle'
        : 'fq-anim-float'
  return (
    <div className={`relative flex items-center justify-center ${dims} ${wrapAnim}`} aria-hidden="true">
      <Star
        className={`${starDims} drop-shadow-lg ${
          mood === 'sad' ? 'fill-amber-200 text-amber-300' : 'fill-amber-300 text-amber-400'
        }`}
        strokeWidth={1.5}
      />
      {mood === 'sad' ? (
        <Frown className={`absolute ${faceDims} translate-y-1 text-amber-800`} strokeWidth={2.5} />
      ) : (
        <Smile className={`absolute ${faceDims} translate-y-1 text-amber-800`} strokeWidth={2.5} />
      )}
      {(mood === 'happy' || mood === 'party') && (
        <>
          <Sparkles className="fq-anim-pop absolute -top-2 -right-3 h-6 w-6 text-yellow-400" />
          <Sparkles className="fq-anim-pop absolute -bottom-1 -left-3 h-5 w-5 text-pink-400" />
        </>
      )}
      {mood === 'party' && (
        <PartyPopper className="fq-anim-pop absolute -top-3 -left-4 h-6 w-6 text-purple-500" />
      )}
    </div>
  )
}

function ProgressBar({ value, max, accent = 'from-amber-400 to-orange-500' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div
      className="h-4 w-full overflow-hidden rounded-full bg-white/60 shadow-inner dark:bg-gray-700"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`${value} of ${max} questions answered`}
    >
      <div
        className={`h-full rounded-full bg-gradient-to-r ${accent} transition-all duration-500 ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function StarRating({ count, size = 'h-8 w-8' }) {
  return (
    <div className="flex items-center justify-center gap-1" aria-label={`${count} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          className={`${size} ${i < count ? 'fq-anim-pop fill-amber-400 text-amber-500' : 'fill-gray-200 text-gray-300 dark:fill-gray-700 dark:text-gray-600'}`}
          style={i < count ? { animationDelay: `${i * 0.15}s` } : undefined}
        />
      ))}
    </div>
  )
}

/* ── MAIN COMPONENT ────────────────────────────────────────────────────────── */

export default function AmharicFidelGame() {
  // screen: menu | explore | game | complete | trace
  const [screen, setScreen] = useState('menu')
  const [soundOn, setSoundOn] = useState(() => loadFromStorage('fidel-quest-sound', 'on') !== 'off')
  // UI language follows the single global app-text setting (set in the main
  // app's Backpack). Classic's own strings live in UI_STRINGS (en/am); any
  // other diaspora language falls back to English here, while the spoken/shown
  // reinforcement words come from the shared multilingual lists.
  const lang = getLang()
  const [progress, setProgress] = useState(loadProgress)

  useEffect(() => {
    try {
      localStorage.setItem('fidel-quest-sound', soundOn ? 'on' : 'off')
    } catch {
      // Storage unavailable — the toggle just won't persist.
    }
  }, [soundOn])

  // Tiny i18n: current-language lookup with English fallback and
  // {placeholder} interpolation. Strings live in the data module.
  const t = useCallback(
    (key, vars) => {
      let s = UI_STRINGS[lang]?.[key] ?? UI_STRINGS.en[key] ?? key
      if (vars && typeof s === 'string') {
        Object.entries(vars).forEach(([k, v]) => {
          s = s.replace(`{${k}}`, v)
        })
      }
      return s
    },
    [lang],
  )
  const tLevelTitle = useCallback(
    (lvl) => (UI_STRINGS[lang]?.levels?.[lvl.id] || UI_STRINGS.en.levels[lvl.id]).title,
    [lang],
  )
  const tLevelSubtitle = useCallback(
    (lvl) => (UI_STRINGS[lang]?.levels?.[lvl.id] || UI_STRINGS.en.levels[lvl.id]).subtitle,
    [lang],
  )

  // Persist committed progress. Keeping the write out of setProgress
  // updaters keeps them pure (StrictMode double-invokes updaters, and
  // concurrent rendering may discard speculative updates).
  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  // Active game session
  const [level, setLevel] = useState(null)
  const [scope, setScopeState] = useState(getScope) // 'learned' (default) | 'all'
  const changeScope = (s) => { setScopeState(s); setScope(s) }
  const [questions, setQuestions] = useState([])
  const [questionIndex, setQuestionIndex] = useState(0)
  // phase: question | correct | wrong
  const [phase, setPhase] = useState('question')
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [wrongPicks, setWrongPicks] = useState([]) // options tried wrong this question (second-chance)
  const [chantPace, setChantPace] = useState('normal') // Explore chant speed
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreakInRun, setBestStreakInRun] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [mascotMood, setMascotMood] = useState('idle')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [lastGain, setLastGain] = useState(null) // { amount, key } floating "+N"
  const [confettiKey, setConfettiKey] = useState(0) // 0 = hidden; bump to burst
  const [missedForms, setMissedForms] = useState([]) // unique targets missed this run

  // Explore mode
  const [exploreFamilyIndex, setExploreFamilyIndex] = useState(null)
  const [glowingChar, setGlowingChar] = useState(null)

  // Trace mode
  const [traceFamilyIndex, setTraceFamilyIndex] = useState(null)
  const [traceFormIndex, setTraceFormIndex] = useState(0)
  const [traceResult, setTraceResult] = useState(null) // last computeTraceResult

  const advanceTimerRef = useRef(null)
  const advancedForIndexRef = useRef(-1)
  const answeredForIndexRef = useRef(-1)
  const runIdRef = useRef(0) // bumps per startLevel so per-run guards reset
  const glowTimerRef = useRef(null)
  const chantTimerRef = useRef(null)
  const traceTimerRef = useRef(null)
  const soundOnRef = useRef(soundOn)
  soundOnRef.current = soundOn
  const chantPaceRef = useRef(chantPace)
  chantPaceRef.current = chantPace

  useEffect(
    () => () => {
      clearTimeout(advanceTimerRef.current)
      clearTimeout(glowTimerRef.current)
      clearTimeout(chantTimerRef.current)
      clearTimeout(traceTimerRef.current)
    },
    [],
  )

  // interrupt:false lets the chant's 900ms cadence queue each syllable
  // instead of cross-fading it away (the platform engine's default).
  const playLetter = useCallback((form, { interrupt = true } = {}) => {
    if (!soundOnRef.current) return
    platformAudio.play(`letters/${form.audioKey}`, {
      interrupt,
      chime: { familyIndex: form.familyIndex ?? 0, order: (form.order ?? 0) + 1 },
    })
  }, [])

  const playWord = useCallback((word) => {
    if (!soundOnRef.current) return
    const familyIndex = CHAR_TO_FORM.get(word.startChar)?.familyIndex ?? 0
    platformAudio.play(`words/${word.latin}`, { chime: { familyIndex, order: 1 } })
  }, [])

  const playSfx = useCallback((name) => {
    if (!soundOnRef.current) return
    SYNTH_SFX[name]?.()
  }, [])

  const currentQuestion = questions[questionIndex] || null

  /* ── game session control ── */

  const startLevel = useCallback(
    (lvl, { targetForms = null } = {}) => {
      clearTimeout(advanceTimerRef.current)
      advancedForIndexRef.current = -1
      answeredForIndexRef.current = -1
      runIdRef.current += 1
      setLevel(lvl)
      setQuestions(buildQuestions(lvl, { missCounts: progress.missCounts, targetForms, familyIndices: scopedFamilyIndexSet(scope) }))
      setQuestionIndex(0)
      setPhase('question')
      setSelectedIndex(null)
      setWrongPicks([])
      setScore(0)
      setStreak(0)
      setBestStreakInRun(0)
      setCorrectCount(0)
      setMissedForms([])
      setMascotMood('idle')
      setFeedbackMessage('')
      setLastGain(null)
      setConfettiKey(0)
      setScreen('game')
      playSfx('tap')
    },
    [playSfx, progress.missCounts, scope],
  )

  // A short remedial round over just the letters missed in the last run.
  // Marked `practice` so it never writes stars or best-score.
  const startPractice = useCallback(() => {
    if (!level || missedForms.length === 0) return
    const practiceLevel = {
      ...baseLevelOf(level),
      practice: true,
      questionCount: Math.min(Math.max(missedForms.length * 2, 4), 10),
    }
    startLevel(practiceLevel, { targetForms: missedForms })
  }, [level, missedForms, startLevel])

  const finishLevel = useCallback(
    (finalCorrectCount, finalScore) => {
      if (!level) return // never write stars/score for a level that was left
      const accuracy = level ? finalCorrectCount / level.questionCount : 0
      const stars = starsForAccuracy(accuracy)
      if (!level?.practice) {
        setProgress((prev) => ({
          ...prev,
          stars: { ...prev.stars, [level.id]: Math.max(prev.stars[level.id] || 0, stars) },
          bestScore: Math.max(prev.bestScore, finalScore),
        }))
      }
      setScreen('complete')
      setConfettiKey((k) => k + 1)
      setMascotMood('party')
      playSfx('level-complete')
      vibrate([40, 60, 40, 60, 120])
    },
    [level, playSfx],
  )

  const handleAnswer = useCallback(
    (option, optionIndex) => {
      if (phase !== 'question' || !currentQuestion) return
      if (wrongPicks.includes(optionIndex)) return // already tried this wrong one
      const isCorrect = option.char === currentQuestion.target.char
      const targetChar = currentQuestion.target.char

      if (isCorrect) {
        // Ref guard: a native keydown and a click can both land before React
        // commits the phase change; only the first finalises the question.
        if (answeredForIndexRef.current === questionIndex) return
        answeredForIndexRef.current = questionIndex
        setSelectedIndex(optionIndex)
        // A first-try answer keeps the streak; a rescued one (after a wrong
        // pick) still counts as learned but does not build a streak.
        const cleanFirstTry = wrongPicks.length === 0
        const gained = cleanFirstTry ? 10 + Math.min(streak, 5) * 2 : 5
        const nextStreak = cleanFirstTry ? streak + 1 : 0
        setScore((s) => s + gained)
        setStreak(nextStreak)
        setBestStreakInRun((b) => Math.max(b, nextStreak))
        setCorrectCount((c) => c + 1)
        setLastGain({ amount: gained, key: `${questionIndex}-${optionIndex}` })
        const isStreakMilestone = cleanFirstTry && nextStreak % 5 === 0
        const praise = praiseWords()
        setPhase('correct')
        setMascotMood(isStreakMilestone ? 'party' : 'happy')
        setFeedbackMessage(
          isStreakMilestone
            ? t('streakMilestone', { n: nextStreak })
            : praise[Math.floor(Math.random() * praise.length)],
        )
        if (isStreakMilestone) {
          setConfettiKey((k) => k + 1)
          playSfx('streak')
          platformAudio.applause(soundOnRef.current, { claps: 8, spread: 0.7 }) // a cheer only on a streak
        } else {
          playSfx('correct') // clean chime per answer — no noise burst
        }
        speakMotivation(PRAISE_CLIPS) // spoken "gobez!" etc. once recorded
        vibrate(30)
        setProgress((prev) => {
          const current = prev.missCounts[targetChar] || 0
          if (current === 0) return prev
          return { ...prev, missCounts: { ...prev.missCounts, [targetChar]: current - 1 } }
        })
      } else {
        // Second chance: mark this pick wrong, encourage, re-say the letter,
        // and stay on the question so the child can try again (never reveal
        // the answer and move on). Count the miss once, on the first slip.
        const firstSlip = wrongPicks.length === 0
        setWrongPicks((w) => (w.includes(optionIndex) ? w : [...w, optionIndex]))
        setStreak(0)
        setMascotMood('sad')
        const encourage = encourageWords()
        setFeedbackMessage(encourage[Math.floor(Math.random() * encourage.length)])
        if (firstSlip) {
          setMissedForms((prev) => (prev.some((f) => f.char === targetChar) ? prev : [...prev, currentQuestion.target]))
          setProgress((prev) => ({
            ...prev,
            missCounts: { ...prev.missCounts, [targetChar]: Math.min(9, (prev.missCounts[targetChar] || 0) + 1) },
          }))
        }
        playSfx('wrong')
        speakMotivation(ENCOURAGE_CLIPS) // spoken "try again" once recorded
        vibrate([60, 40, 60])
        // Say the letter again so the child can listen and pick once more.
        setTimeout(() => playLetter(currentQuestion.target), 350)
      }
    },
    [phase, currentQuestion, wrongPicks, streak, questionIndex, playSfx, playLetter, t],
  )

  const advance = useCallback(() => {
    if (!level) return // a stale timer must never advance a left level
    // Idempotency guard: the Continue button, the Enter key, and the
    // auto-advance timer can all race on the same feedback beat — only the
    // first one through may move the question index.
    if (advancedForIndexRef.current === questionIndex) return
    advancedForIndexRef.current = questionIndex
    clearTimeout(advanceTimerRef.current)
    if (questionIndex >= (level?.questionCount || 0) - 1) {
      finishLevel(correctCount, score)
    } else {
      setQuestionIndex((i) => i + 1)
      setPhase('question')
      setSelectedIndex(null)
      setWrongPicks([])
      setMascotMood('idle')
      setFeedbackMessage('')
      // confettiKey is deliberately NOT reset here: a streak burst outlives
      // the 1.3s feedback beat, and ConfettiBurst unmounts itself when the
      // slowest piece lands.
    }
  }, [questionIndex, level, correctCount, score, finishLevel])

  // Auto-advance only after a CORRECT answer. Wrong answers now stay on the
  // question for a second chance, so there is no 'wrong' auto-advance. The
  // screen/level guard is essential: without it, tapping Back during the
  // feedback beat leaves this timer armed and it later fires advance() with a
  // null level, which crashed the app to the error screen.
  useEffect(() => {
    if (screen !== 'game' || !level || phase !== 'correct') return undefined
    advanceTimerRef.current = setTimeout(advance, 1300)
    return () => clearTimeout(advanceTimerRef.current)
  }, [screen, level, phase, advance])

  // Number keys 1-4 answer; kids on shared family laptops love this, and it
  // makes the whole quiz operable without a pointer.
  useEffect(() => {
    if (screen !== 'game') return undefined
    const onKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      // Never steal keystrokes from an overlay or form control — the
      // globally-mounted CommandPalette (and any dialog) sits above the
      // game, and its input's digits must not answer quiz questions.
      const target = event.target
      if (
        target &&
        typeof target.closest === 'function' &&
        target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')
      ) {
        return
      }
      if (phase !== 'question' || !currentQuestion) return
      const n = Number(event.key)
      if (Number.isInteger(n) && n >= 1 && n <= currentQuestion.options.length) {
        handleAnswer(currentQuestion.options[n - 1], n - 1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [screen, phase, currentQuestion, handleAnswer, advance])

  // Speak the prompt whenever a new question appears (sound-to-char plays
  // the letter, word-to-char plays the word). The ref guard makes the
  // effect idempotent per question so StrictMode's dev double-invoke can't
  // overlap two clips of the same prompt.
  const promptPlayedForRef = useRef(null)
  useEffect(() => {
    if (screen === 'game' && phase === 'question' && currentQuestion) {
      const promptKey = `${runIdRef.current}:${questionIndex}`
      if (promptPlayedForRef.current !== promptKey) {
        if (level?.mode === 'sound-to-char') {
          promptPlayedForRef.current = promptKey
          playLetter(currentQuestion.target)
        } else if (level?.mode === 'word-to-char') {
          promptPlayedForRef.current = promptKey
          playWord(currentQuestion.word)
        }
      }
    }
    if (screen !== 'game') promptPlayedForRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, questionIndex, level])

  /* ── explore mode control ── */

  const handleExploreTap = useCallback(
    (form) => {
      clearTimeout(glowTimerRef.current)
      clearTimeout(chantTimerRef.current)
      setGlowingChar(form.char)
      playLetter(form)
      glowTimerRef.current = setTimeout(() => setGlowingChar(null), 950)
    },
    [playLetter],
  )

  // "Chant the row": play a family's seven forms in sequence with a rolling
  // glow — the way the fidel table is traditionally recited in class.
  const chantFamily = useCallback(
    (family) => {
      clearTimeout(glowTimerRef.current)
      clearTimeout(chantTimerRef.current)
      const step = (index) => {
        if (index >= family.forms.length) {
          setGlowingChar(null)
          return
        }
        const form = family.forms[index]
        setGlowingChar(form.char)
        // interrupt:true cross-fades out any still-playing syllable so the
        // recitation never overlaps itself; the cadence leaves each ~0.8s clip
        // room to finish with a beat of silence before the next.
        playLetter(form, { interrupt: true })
        chantTimerRef.current = setTimeout(() => step(index + 1), CHANT_PACES[chantPaceRef.current] || CHANT_CADENCE_MS)
      }
      step(0)
    },
    [playLetter],
  )

  const stopChant = useCallback(() => {
    clearTimeout(chantTimerRef.current)
    setGlowingChar(null)
  }, [])

  /* ── trace mode control ── */

  const startTraceFamily = useCallback(
    (familyIndex) => {
      clearTimeout(traceTimerRef.current)
      setTraceFamilyIndex(familyIndex)
      setTraceFormIndex(0)
      setTraceResult(null)
      setMascotMood('idle')
      playSfx('tap')
    },
    [playSfx],
  )

  // A passing trace celebrates and auto-advances to the next form; a
  // failing one leaves the ink so the child can add to it and re-check.
  const handleTraceScored = useCallback(
    (result) => {
      setTraceResult(result)
      if (result.stars >= 1) {
        playSfx('correct')
        setMascotMood('happy')
        vibrate(30)
        clearTimeout(traceTimerRef.current)
        traceTimerRef.current = setTimeout(() => {
          setTraceResult(null)
          setMascotMood('idle')
          setTraceFormIndex((i) => {
            if (i + 1 >= 7) setConfettiKey((k) => k + 1)
            return i + 1
          })
        }, 1200)
      } else {
        playSfx('wrong')
        setMascotMood('sad')
        vibrate([60, 40, 60])
      }
    },
    [playSfx],
  )

  const skipTraceForm = useCallback(() => {
    clearTimeout(traceTimerRef.current)
    setTraceResult(null)
    setMascotMood('idle')
    setTraceFormIndex((i) => i + 1)
    playSfx('tap')
  }, [playSfx])

  const goToMenu = useCallback(() => {
    clearTimeout(advanceTimerRef.current)
    clearTimeout(chantTimerRef.current)
    clearTimeout(glowTimerRef.current)
    clearTimeout(traceTimerRef.current)
    advancedForIndexRef.current = -1
    answeredForIndexRef.current = -1
    setScreen('menu')
    setLevel(null)
    setPhase('question') // clear feedback state so no stale timer re-arms
    setSelectedIndex(null)
    setWrongPicks([])
    setConfettiKey(0)
    setMascotMood('idle')
    setExploreFamilyIndex(null)
    setGlowingChar(null)
    setTraceFamilyIndex(null)
    setTraceFormIndex(0)
    setTraceResult(null)
  }, [])

  // A level opens once the one before is PASSED (2 stars = the mastery
  // bar). Levels the child already played stay open - progress recorded
  // under the old any-star rule is never taken away.
  const isLevelUnlocked = useCallback(
    (lvl) => lvl.id === 1 || (progress.stars[lvl.id - 1] || 0) >= 2 || (progress.stars[lvl.id] || 0) > 0,
    [progress],
  )

  const totalStars = LEVELS.reduce((sum, l) => sum + (progress.stars[l.id] || 0), 0)

  /* ── SCREENS ── */

  const renderMenu = () => (
    <div className="fq-anim-pop mx-auto flex w-full max-w-3xl flex-col items-center gap-4">
      {/* Compact header: everything the old hero said, on one row - this
         page must fit a phone WITHOUT scrolling (features below the fold
         may as well not exist for a child). */}
      <div className="flex w-full max-w-md flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Mascot mood="idle" size="sm" />
          <h1 className="text-2xl font-extrabold tracking-tight text-amber-900 dark:text-amber-100">
            {t('title')}
          </h1>
        </div>
        <div className="flex items-center gap-3 rounded-full bg-white/70 px-4 py-1.5 shadow-md backdrop-blur dark:bg-gray-800/70">
          <span className="flex items-center gap-1 text-sm font-bold text-amber-700 dark:text-amber-300">
            <Star className="h-4 w-4 fill-amber-400 text-amber-500" /> {totalStars}/{LEVELS.length * 3}
          </span>
          <span className="h-4 w-px bg-amber-300/60" aria-hidden="true" />
          <span className="flex items-center gap-1 text-sm font-bold text-amber-700 dark:text-amber-300">
            <Trophy className="h-4 w-4 text-orange-500" /> {t('best', { n: progress.bestScore })}
          </span>
        </div>
      </div>

      <ScopeToggle scope={scope} onChange={changeScope} />

      {LEVELS.every((l) => (progress.stars[l.id] || 0) >= 3) && (
        <div className="fq-anim-pop flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 px-6 py-4 text-white shadow-xl">
          <PartyPopper className="h-8 w-8 shrink-0" />
          <div className="text-left">
            <p className="text-lg font-extrabold">{t('champion')}</p>
            <p className="text-sm font-semibold text-white/90">{t('championSub')}</p>
          </div>
        </div>
      )}

      {/* ONE current-level card + a compact chip strip. The child sees where
         they stand in a single row (finished chips replay their level, the
         current one pulses, the rest wait dim) and the page stays short -
         seven near-identical cards taught nothing extra. */}
      {(() => {
        const current =
          LEVELS.find((lvl) => isLevelUnlocked(lvl) && (progress.stars[lvl.id] || 0) === 0) ||
          LEVELS.find((lvl) => (progress.stars[lvl.id] || 0) < 3) ||
          null
        return (
          <div className="flex w-full max-w-md flex-col items-center gap-5">
            <div className="flex items-center justify-center gap-2" role="list">
              {LEVELS.map((lvl) => {
                const stars = progress.stars[lvl.id] || 0
                const unlocked = isLevelUnlocked(lvl)
                const isCurrent = current?.id === lvl.id
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    role="listitem"
                    disabled={!unlocked}
                    onClick={() => startLevel(lvl)}
                    aria-label={`${t('level', { n: lvl.id })} - ${tLevelTitle(lvl)}`}
                    className={`relative flex h-11 w-11 items-center justify-center rounded-full text-base font-extrabold shadow-md transition-all duration-200 ${FOCUS_RING} ${
                      isCurrent
                        ? `bg-gradient-to-br ${lvl.accent} scale-110 text-white`
                        : stars > 0
                          ? 'bg-amber-400 text-white hover:-translate-y-0.5'
                          : unlocked
                            ? 'bg-white/80 text-amber-800 dark:bg-gray-800/80 dark:text-amber-200'
                            : 'cursor-not-allowed bg-white/40 text-gray-400 opacity-70 dark:bg-gray-800/40 dark:text-gray-500'
                    }`}
                  >
                    {!isCurrent && stars >= 3 ? <Star className="h-5 w-5 fill-current" /> : lvl.id}
                    {stars > 0 && stars < 3 && (
                      <span className="absolute -bottom-2 flex gap-0.5" aria-hidden="true">
                        {Array.from({ length: stars }, (_, i) => (
                          <span key={i} className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        ))}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {current && (
              <button
                type="button"
                onClick={() => startLevel(current)}
                className={`group relative w-full overflow-hidden rounded-2xl bg-white/90 p-5 text-left shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:scale-95 dark:bg-gray-800/90 ${FOCUS_RING}`}
              >
                <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${current.accent}`} aria-hidden="true" />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {t('level', { n: current.id })}
                    </p>
                    <h2 className="text-xl font-extrabold text-gray-800 dark:text-gray-100">{tLevelTitle(current)}</h2>
                    <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">{tLevelSubtitle(current)}</p>
                  </div>
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${current.accent} text-white shadow-md transition-transform group-hover:scale-110`}
                  >
                    <Play className="ml-0.5 h-6 w-6 fill-current" />
                  </div>
                </div>
                <div className="mt-3">
                  <StarRating count={progress.stars[current.id] || 0} size="h-5 w-5" />
                </div>
              </button>
            )}
          </div>
        )
      })()}

      {/* The three modes: full-width rows, one under the other - the compact
         header freed the room, so each gets its icon, name AND description
         while the whole page still fits a phone without scrolling. */}
      <div className="flex w-full max-w-md flex-col gap-3">
        {[
          ['explore', BookOpen, 'from-sky-400 to-blue-500', t('exploreCta'), () => { setScreen('explore'); playSfx('tap') }],
          ['trace', Pencil, 'from-rose-400 to-pink-500', t('traceCta'), () => { setScreen('trace'); setTraceFamilyIndex(null); setTraceFormIndex(0); setTraceResult(null); playSfx('tap') }],
          ['master', Music, 'from-violet-400 to-purple-500', t('masterCta'), () => { setScreen('master'); playSfx('tap') }],
        ].map(([id, Icon, grad, cta, go]) => (
          <button
            key={id}
            type="button"
            onClick={go}
            className={`flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r ${grad} px-5 py-3.5 text-left font-extrabold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-95 ${FOCUS_RING}`}
          >
            <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
            <span className="flex-1 text-base leading-snug">{cta}</span>
            <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  )

  const renderExplore = () => {
    const family = exploreFamilyIndex !== null ? FIDEL_FAMILIES[exploreFamilyIndex] : null
    return (
      <div className="fq-anim-pop mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              stopChant()
              if (family) setExploreFamilyIndex(null)
              else goToMenu()
            }}
            className={`flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 font-bold text-amber-800 shadow-md transition-all hover:shadow-lg active:scale-95 dark:bg-gray-800/80 dark:text-amber-200 ${FOCUS_RING}`}
          >
            <ArrowLeft className="h-5 w-5" />
            {family ? t('allLetters') : t('menu')}
          </button>
          <h2 className="flex items-center gap-2 text-2xl font-extrabold text-amber-900 dark:text-amber-100">
            <Music className="h-6 w-6 text-sky-500" />
            {family ? t('familyTitle', { name: family.name }) : t('exploreTitle')}
          </h2>
          <span className="w-24" aria-hidden="true" />
        </div>

        {!family ? (
          <>
            <p className="mb-5 text-center text-base font-medium text-amber-800/80 dark:text-amber-200/70">
              {t('exploreHint')}
            </p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-6">
              {FIDEL_FAMILIES.map((fam) => {
                const base = fam.forms[0]
                const isGlowing = glowingChar === base.char
                return (
                  <div key={fam.name} className="relative aspect-square">
                    <button
                      type="button"
                      onClick={() => handleExploreTap(base)}
                      aria-label={t('letterSays', { char: base.char, sound: base.sound })}
                      className={`flex h-full w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${
                        TILE_COLORS[fam.familyIndex % TILE_COLORS.length]
                      } shadow-md transition-all duration-150 hover:-translate-y-1 hover:shadow-xl active:scale-90 ${FOCUS_RING} ${
                        isGlowing ? 'fq-anim-glow ring-4 ring-amber-300' : ''
                      }`}
                    >
                      <span className="text-4xl font-bold text-white drop-shadow-md sm:text-5xl" style={ETHIOPIC_FONT}>
                        {base.char}
                      </span>
                      <span className="mt-1 rounded-full bg-white/30 px-2 py-0.5 text-xs font-extrabold uppercase text-white">
                        {base.sound}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGlowingChar(null)
                        setExploreFamilyIndex(fam.familyIndex)
                        playSfx('tap')
                      }}
                      aria-label={t('openFamily', { name: fam.name })}
                      className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/40 text-white shadow-sm transition-all hover:bg-white/70 hover:text-amber-700 active:scale-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/80"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <p className="mb-1 text-center text-base font-medium text-amber-800/80 dark:text-amber-200/70">
              {t('familyHint')}
              {family.twinOf ? ` ${t('twinNote', { name: family.twinOf })}` : ''}
            </p>
            {family.nickname && (
              <p className="mb-3 text-center text-sm font-extrabold uppercase tracking-wide text-amber-600/80 dark:text-amber-300/70">
                {family.nickname}
              </p>
            )}
            <div className="mb-5 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => chantFamily(family)}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-2.5 font-extrabold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300/70"
              >
                <Play className="h-4 w-4 fill-current" /> {t('chant')}
              </button>
              <div className="flex items-center gap-1.5">
                {CHANT_PACE_ORDER.map((pace) => (
                  <button
                    key={pace}
                    type="button"
                    onClick={() => setChantPace(pace)}
                    aria-pressed={chantPace === pace}
                    className={`rounded-full px-3 py-1 text-xs font-extrabold transition-colors ${FOCUS_RING} ${
                      chantPace === pace
                        ? 'bg-teal-500 text-white shadow'
                        : 'bg-white/80 text-teal-700 dark:bg-gray-800/80 dark:text-teal-300'
                    }`}
                  >
                    {t(`chantPace_${pace}`, pace)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-7">
              {family.forms.map((form) => {
                const isGlowing = glowingChar === form.char
                return (
                  <button
                    key={form.char}
                    type="button"
                    onClick={() => handleExploreTap(form)}
                    aria-label={`${ORDER_NAMES[form.order]} form ${form.char}, sounds like ${form.sound}`}
                    className={`flex flex-col items-center justify-center gap-1 rounded-2xl bg-white/90 p-4 shadow-md transition-all duration-150 hover:-translate-y-1 hover:shadow-xl active:scale-90 ${FOCUS_RING} dark:bg-gray-800/90 ${
                      isGlowing ? 'fq-anim-glow ring-4 ring-amber-300' : ''
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                      {ORDER_NAMES[form.order]} · {GEEZ_ORDER_NAMES[form.order]}
                    </span>
                    <span
                      className={`text-5xl font-bold transition-colors ${
                        isGlowing ? 'text-amber-500' : 'text-gray-800 dark:text-gray-100'
                      }`}
                      style={ETHIOPIC_FONT}
                    >
                      {form.char}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-extrabold text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                      {form.sound}
                    </span>
                  </button>
                )
              })}
              {family.labialForm && (
                <button
                  type="button"
                  onClick={() => handleExploreTap(family.labialForm)}
                  aria-label={t('letterSays', { char: family.labialForm.char, sound: family.labialForm.sound })}
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50 to-orange-100 p-4 shadow-md transition-all duration-150 hover:-translate-y-1 hover:shadow-xl active:scale-90 ${FOCUS_RING} dark:from-amber-900/30 dark:to-orange-900/30 dark:ring-amber-700 ${
                    glowingChar === family.labialForm.char ? 'fq-anim-glow ring-4 ring-amber-300' : ''
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wide text-orange-500">
                    {t('bonusLabial')}
                  </span>
                  <span
                    className={`text-5xl font-bold transition-colors ${
                      glowingChar === family.labialForm.char ? 'text-amber-500' : 'text-gray-800 dark:text-gray-100'
                    }`}
                    style={ETHIOPIC_FONT}
                  >
                    {family.labialForm.char}
                  </span>
                  <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-sm font-extrabold text-orange-700 dark:bg-orange-900/60 dark:text-orange-300">
                    {family.labialForm.sound}
                  </span>
                </button>
              )}
            </div>
            {family.word && (
              <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-4 rounded-2xl bg-white/90 px-6 py-4 shadow-lg dark:bg-gray-800/90">
                <span className="text-5xl" aria-hidden="true">{family.word.picture}</span>
                <div className="text-left">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-gray-400">{t('wordToKnow')}</p>
                  <p className="text-3xl font-bold text-gray-800 dark:text-gray-100" style={ETHIOPIC_FONT}>
                    {family.word.geez}
                  </p>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    {family.word.latin} — {family.word.meaning}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => playWord(family.word)}
                  aria-label={t('playWordSound', { word: family.word.geez })}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md transition-all hover:shadow-lg active:scale-90 ${FOCUS_RING}`}
                >
                  <Volume2 className="h-6 w-6" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  const renderGame = () => {
    if (!level || !currentQuestion) return null
    const { target, options, word } = currentQuestion
    const isSoundToChar = level.mode === 'sound-to-char'
    const isWordMode = level.mode === 'word-to-char'
    return (
      <div className="fq-anim-pop mx-auto flex w-full max-w-2xl flex-col gap-5">
        {/* HUD */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goToMenu}
            aria-label="Back to menu"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/80 text-amber-800 shadow-md transition-all hover:shadow-lg active:scale-90 dark:bg-gray-800/80 dark:text-amber-200 ${FOCUS_RING}`}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <ProgressBar value={questionIndex + (phase === 'question' ? 0 : 1)} max={level.questionCount} accent={level.accent} />
          <div className="relative flex shrink-0 items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 font-extrabold text-amber-700 shadow-md dark:bg-gray-800/80 dark:text-amber-300">
            <Trophy className="h-5 w-5 text-orange-500" aria-hidden="true" />
            <span className="sr-only">{t('scoreLabel')}</span>
            <span className="tabular-nums">{score}</span>
            {lastGain && (
              <span
                key={lastGain.key}
                className="fq-anim-score absolute -top-4 right-1 text-sm font-extrabold text-emerald-500"
              >
                +{lastGain.amount}
              </span>
            )}
          </div>
          <div
            className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 font-extrabold shadow-md transition-colors ${
              streak >= 2
                ? 'bg-orange-500 text-white'
                : 'bg-white/80 text-gray-400 dark:bg-gray-800/80 dark:text-gray-500'
            }`}
          >
            <Flame className={`h-5 w-5 ${streak >= 2 ? 'fill-yellow-300 text-yellow-200' : ''}`} aria-hidden="true" />
            <span className="sr-only">{t('streakLabel')}</span>
            <span className="tabular-nums">{streak}</span>
          </div>
        </div>

        {/* Prompt card */}
        <div className="relative flex flex-col items-center gap-3 rounded-3xl bg-white/90 px-6 py-6 shadow-xl dark:bg-gray-800/90">
          <div className="absolute -top-6 left-4">
            <Mascot mood={mascotMood} />
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {isWordMode ? t('whichStarts') : t('findLetter')}
          </p>
          {isSoundToChar && (
            <button
              type="button"
              onClick={() => playLetter(target)}
              aria-label={t('playAgainSound', { sound: target.sound })}
              className={`flex items-center gap-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-8 py-3 shadow-lg transition-all hover:shadow-xl active:scale-95 ${FOCUS_RING}`}
            >
              <Volume2 className="h-7 w-7 text-white" />
              <span className="text-4xl font-extrabold text-white drop-shadow">{target.sound}</span>
            </button>
          )}
          {isWordMode && (
            <button
              type="button"
              onClick={() => playWord(word)}
              aria-label={t('playWordSound', { word: word.geez })}
              className={`flex items-center gap-4 rounded-3xl bg-gradient-to-br from-lime-50 to-green-100 px-8 py-3 shadow-inner transition-transform active:scale-95 dark:from-lime-900/30 dark:to-green-900/30 ${FOCUS_RING}`}
            >
              <span className="text-6xl" aria-hidden="true">{word.picture}</span>
              <span className="text-left">
                <span className="block text-5xl font-bold text-green-800 dark:text-green-200" style={ETHIOPIC_FONT}>
                  {word.geez}
                </span>
                <span className="block text-sm font-semibold text-green-700/70 dark:text-green-300/70">
                  {word.latin} — {word.meaning}
                </span>
              </span>
              <Volume2 className="h-6 w-6 shrink-0 text-green-600" />
            </button>
          )}
          <div className="flex min-h-10 items-center justify-center gap-3">
            <p
              role="status"
              aria-live="polite"
              className={`text-center text-base font-extrabold ${
                phase === 'correct' ? 'text-emerald-600' : wrongPicks.length ? 'text-rose-500' : 'text-transparent'
              }`}
            >
              {feedbackMessage || '·'}
            </p>
          </div>
        </div>

        {/* Answer grid — wrong picks stay disabled but the question stays open
            for a second chance; only the correct letter ends the round. */}
        <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${wrongPicks.length ? 'fq-anim-shake' : ''}`}>
          {options.map((option, i) => {
            const isTarget = option.char === target.char
            const showCorrect = phase === 'correct' && isTarget
            const showWrong = wrongPicks.includes(i)
            return (
              <button
                key={option.char}
                type="button"
                onClick={() => handleAnswer(option, i)}
                disabled={phase !== 'question' || showWrong}
                aria-label={`Letter ${option.char}`}
                className={`relative flex min-h-24 items-center justify-center rounded-2xl border-b-4 p-4 shadow-md transition-all duration-150 ${FOCUS_RING} sm:min-h-28 ${
                  showCorrect
                    ? 'fq-anim-bounce border-emerald-600 bg-emerald-400 text-white'
                    : showWrong
                      ? 'border-rose-300 bg-rose-100 text-rose-400 dark:border-rose-800 dark:bg-rose-950/40'
                      : 'border-amber-200 bg-white text-gray-800 hover:-translate-y-1 hover:border-amber-400 hover:shadow-xl active:scale-90 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-amber-500'
                } ${showWrong ? 'opacity-60' : ''}`}
              >
                <span
                  aria-hidden="true"
                  className="absolute left-2 top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-extrabold text-amber-600 sm:flex dark:bg-gray-700 dark:text-amber-300"
                >
                  {i + 1}
                </span>
                <span className="text-6xl font-bold sm:text-7xl" style={ETHIOPIC_FONT}>
                  {option.char}
                </span>
                {showCorrect && (
                  <CheckCircle2 className="fq-anim-pop absolute right-2 top-2 h-7 w-7 fill-white text-emerald-500" />
                )}
                {showWrong && (
                  <XCircle className="fq-anim-pop absolute right-2 top-2 h-7 w-7 fill-white text-rose-500" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const renderComplete = () => {
    if (!level) return null
    const accuracy = correctCount / level.questionCount
    // Derived, not stored: the same starsForAccuracy band that finishLevel
    // persisted, so the display can never drift from the saved value.
    const earnedStars = starsForAccuracy(accuracy)
    const nextLevel = LEVELS.find((l) => l.id === level.id + 1)
    const baseLevel = baseLevelOf(level)
    return (
      <div className="fq-anim-pop mx-auto flex w-full max-w-md flex-col items-center gap-6 rounded-3xl bg-white/90 px-6 py-10 text-center shadow-2xl dark:bg-gray-800/90">
        <Mascot mood="party" size="lg" />
        <div>
          <h2 className="text-3xl font-extrabold text-amber-900 dark:text-amber-100">
            {level.practice ? t('practiceDone') : t('levelComplete', { n: level.id })}
          </h2>
          <p className="mt-1 text-lg font-semibold text-gray-500 dark:text-gray-400">
            {level.practice ? t('practiceSub') : t(`stars${earnedStars}`)}
          </p>
        </div>
        {!level.practice && <StarRating count={earnedStars} size="h-12 w-12" />}
        <div className="grid w-full grid-cols-3 gap-3">
          <div className="rounded-2xl bg-amber-50 p-3 dark:bg-amber-900/30">
            <Trophy className="mx-auto h-6 w-6 text-orange-500" />
            <p className="mt-1 text-2xl font-extrabold text-amber-800 dark:text-amber-200 tabular-nums">{score}</p>
            <p className="text-xs font-bold uppercase text-amber-600/70 dark:text-amber-300/70">{t('score')}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-900/30">
            <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500" />
            <p className="mt-1 text-2xl font-extrabold text-emerald-800 dark:text-emerald-200 tabular-nums">
              {correctCount}/{level.questionCount}
            </p>
            <p className="text-xs font-bold uppercase text-emerald-600/70 dark:text-emerald-300/70">{t('correct')}</p>
          </div>
          <div className="rounded-2xl bg-orange-50 p-3 dark:bg-orange-900/30">
            <Flame className="mx-auto h-6 w-6 text-orange-500" />
            <p className="mt-1 text-2xl font-extrabold text-orange-800 dark:text-orange-200 tabular-nums">{bestStreakInRun}</p>
            <p className="text-xs font-bold uppercase text-orange-600/70 dark:text-orange-300/70">{t('bestStreak')}</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-gray-400">{t('accuracy', { n: Math.round(accuracy * 100) })}</p>

        {missedForms.length > 0 ? (
          <div className="w-full rounded-2xl bg-rose-50 p-4 dark:bg-rose-900/20">
            <p className="mb-2 text-sm font-extrabold uppercase tracking-wide text-rose-500 dark:text-rose-300">
              {t('lettersToPractice')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {missedForms.map((form) => (
                <button
                  key={form.char}
                  type="button"
                  onClick={() => playLetter(form)}
                  aria-label={t('hearForm', { char: form.char, sound: form.sound })}
                  className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-sm transition-all hover:shadow-md active:scale-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300/70 dark:bg-gray-700"
                >
                  <span className="text-2xl font-bold text-gray-800 dark:text-gray-100" style={ETHIOPIC_FONT}>
                    {form.char}
                  </span>
                  <span className="text-sm font-extrabold text-rose-500 dark:text-rose-300">{form.sound}</span>
                  <Volume2 className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={startPractice}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-400 to-pink-500 px-6 py-3 font-extrabold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-300/70"
            >
              <RotateCcw className="h-5 w-5" /> {t('practiceThese')}
            </button>
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-extrabold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
            <Sparkles className="h-4 w-4" /> {t('flawless')}
          </p>
        )}

        <div className="flex w-full flex-col gap-3">
          {!level.practice && nextLevel && earnedStars >= 2 && (
            <button
              type="button"
              onClick={() => startLevel(nextLevel)}
              className={`flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${nextLevel.accent} px-6 py-3.5 text-lg font-extrabold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-95 ${FOCUS_RING}`}
            >
              <Play className="h-5 w-5 fill-current" /> {t('next', { title: tLevelTitle(nextLevel) })}
            </button>
          )}
          <button
            type="button"
            onClick={() => startLevel(baseLevel)}
            className={`flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 font-extrabold text-amber-700 shadow-md ring-2 ring-amber-200 transition-all hover:shadow-lg active:scale-95 dark:bg-gray-700 dark:text-amber-300 dark:ring-amber-700 ${FOCUS_RING}`}
          >
            <RotateCcw className="h-5 w-5" /> {level.practice ? t('replayLevel', { n: level.id }) : t('playAgain')}
          </button>
          <button
            type="button"
            onClick={goToMenu}
            className="rounded-2xl px-6 py-2 font-bold text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
          >
            {t('backToMenu')}
          </button>
        </div>
      </div>
    )
  }

  const renderTrace = () => {
    const family = traceFamilyIndex !== null ? FIDEL_FAMILIES[traceFamilyIndex] : null
    const familyDone = family && traceFormIndex >= family.forms.length
    const currentForm = family && !familyDone ? family.forms[traceFormIndex] : null
    return (
      <div className="fq-anim-pop mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              clearTimeout(traceTimerRef.current)
              if (family) {
                setTraceFamilyIndex(null)
                setTraceResult(null)
                setMascotMood('idle')
              } else {
                goToMenu()
              }
            }}
            className={`flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 font-bold text-amber-800 shadow-md transition-all hover:shadow-lg active:scale-95 dark:bg-gray-800/80 dark:text-amber-200 ${FOCUS_RING}`}
          >
            <ArrowLeft className="h-5 w-5" />
            {family ? t('allLetters') : t('menu')}
          </button>
          <h2 className="flex items-center gap-2 text-2xl font-extrabold text-amber-900 dark:text-amber-100">
            <Pencil className="h-6 w-6 text-rose-500" />
            {family ? t('traceFamily', { name: family.name }) : t('traceTitle')}
          </h2>
          <span className="w-24" aria-hidden="true" />
        </div>

        {!family ? (
          <>
            <p className="mb-5 text-center text-base font-medium text-amber-800/80 dark:text-amber-200/70">
              {t('tracePick')}
            </p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-6">
              {FIDEL_FAMILIES.map((fam) => (
                <button
                  key={fam.name}
                  type="button"
                  onClick={() => startTraceFamily(fam.familyIndex)}
                  aria-label={t('familyTitle', { name: fam.name })}
                  className={`flex aspect-square flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${
                    TILE_COLORS[fam.familyIndex % TILE_COLORS.length]
                  } shadow-md transition-all duration-150 hover:-translate-y-1 hover:shadow-xl active:scale-90 ${FOCUS_RING}`}
                >
                  <span className="text-4xl font-bold text-white drop-shadow-md sm:text-5xl" style={ETHIOPIC_FONT}>
                    {fam.forms[0].char}
                  </span>
                  <Pencil className="mt-1 h-4 w-4 text-white/80" aria-hidden="true" />
                </button>
              ))}
            </div>
          </>
        ) : familyDone ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-3xl bg-white/90 px-6 py-10 text-center shadow-2xl dark:bg-gray-800/90">
            <Mascot mood="party" size="lg" />
            <h3 className="text-2xl font-extrabold text-amber-900 dark:text-amber-100">{t('traceDone')}</h3>
            <p className="text-4xl tracking-wide" style={ETHIOPIC_FONT}>
              {family.chars}
            </p>
            <button
              type="button"
              onClick={() => {
                setTraceFamilyIndex(null)
                setTraceResult(null)
                playSfx('tap')
              }}
              className={`flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-400 to-pink-500 px-6 py-3 font-extrabold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:scale-95 ${FOCUS_RING}`}
            >
              <Pencil className="h-5 w-5" /> {t('allLetters')}
            </button>
            <button
              type="button"
              onClick={goToMenu}
              className="rounded-2xl px-6 py-2 font-bold text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            >
              {t('backToMenu')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            {/* Per-form progress dots */}
            <div className="flex items-center gap-2" aria-hidden="true">
              {family.forms.map((form, i) => (
                <span
                  key={form.char}
                  className={`h-3 w-3 rounded-full transition-colors ${
                    i < traceFormIndex
                      ? 'bg-emerald-400'
                      : i === traceFormIndex
                        ? 'bg-amber-400 ring-4 ring-amber-200 dark:ring-amber-800'
                        : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
            <div className="relative flex items-center gap-3">
              <div className="absolute -left-24 top-1/2 hidden -translate-y-1/2 sm:block">
                <Mascot mood={mascotMood} />
              </div>
              <span className="rounded-full bg-white/80 px-4 py-1.5 text-lg font-extrabold text-amber-800 shadow-md dark:bg-gray-800/80 dark:text-amber-200">
                {ORDER_NAMES[currentForm.order]} · {GEEZ_ORDER_NAMES[currentForm.order]} · {currentForm.sound}
              </span>
              <button
                type="button"
                onClick={() => playLetter(currentForm)}
                aria-label={t('traceHear')}
                className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md transition-all hover:shadow-lg active:scale-90 ${FOCUS_RING}`}
              >
                <Volume2 className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm font-medium text-amber-800/70 dark:text-amber-200/60">{t('traceInstruction')}</p>
            <FidelTracePad
              key={`${family.name}-${currentForm.char}`}
              char={currentForm.char}
              labels={{
                clear: t('traceClear'),
                check: t('traceCheck'),
                instruction: t('traceInstruction'),
                unsupported: t('traceUnsupported'),
              }}
              onScored={handleTraceScored}
            />
            <div className="flex min-h-8 items-center gap-3">
              <p
                role="status"
                aria-live="polite"
                className={`text-base font-extrabold ${
                  !traceResult ? 'text-transparent' : traceResult.stars >= 1 ? 'text-emerald-600' : 'text-rose-500'
                }`}
              >
                {!traceResult
                  ? '·'
                  : traceResult.stars >= 2
                    ? t('traceGreat')
                    : traceResult.stars === 1
                      ? t('traceGood')
                      : t('traceTry')}
              </p>
              {traceResult && traceResult.stars >= 1 && <StarRating count={traceResult.stars} size="h-5 w-5" />}
            </div>
            <button
              type="button"
              onClick={skipTraceForm}
              className="rounded-full px-4 py-1.5 text-sm font-bold text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            >
              {t('traceSkip')} <ChevronRight className="inline h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-amber-100 via-yellow-50 to-emerald-100 px-4 py-8 sm:py-12 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950">
      <style>{GAME_KEYFRAMES}</style>
      {confettiKey > 0 && <ConfettiBurst key={confettiKey} />}

      {/* Sound + language toggles float over every screen */}
      <button
        type="button"
        onClick={() => setSoundOn((s) => !s)}
        aria-label={soundOn ? t('soundOff') : t('soundOn')}
        aria-pressed={soundOn}
        className={`fixed bottom-20 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-amber-700 shadow-lg transition-all hover:shadow-xl active:scale-90 md:bottom-6 md:left-6 dark:bg-gray-800/90 dark:text-amber-300 ${FOCUS_RING}`}
      >
        {soundOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
      </button>

      {screen === 'menu' && renderMenu()}
      {screen === 'explore' && renderExplore()}
      {screen === 'game' && renderGame()}
      {screen === 'complete' && renderComplete()}
      {screen === 'trace' && renderTrace()}
      {screen === 'master' && <FidelMaster onBack={() => setScreen('menu')} soundOn={soundOn} />}

      {screen === 'menu' && (
        <p className="mx-auto mt-10 flex max-w-md items-center justify-center gap-2 text-center text-sm font-semibold text-amber-700/60 dark:text-amber-300/50">
          <Gamepad2 className="h-4 w-4 shrink-0" />
          {t('footer')}
        </p>
      )}
    </div>
  )
}
