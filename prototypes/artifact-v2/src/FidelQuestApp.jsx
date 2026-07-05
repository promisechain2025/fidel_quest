/* ============================================================================
   FIDEL QUEST v2 — an Amharic alphabet learning game for kids
   ----------------------------------------------------------------------------
   Single-file application, structured as if modular. Section map:

     §1  DATA LAYER        canonical Ge'ez table + pure derivations/indexes
     §2  DETERMINISTIC RNG pure, threaded PRNG (mulberry32) — no Math.random
     §3  STATE MACHINE     explicit states/events, table-driven transitions
     §4  QUESTION FACTORY  pure, seeded question-queue builder
     §5  INVARIANT SUITE   data + machine self-tests, run at module load
     §6  SOUND ENGINE      mp3 placeholders with Web Audio fallback tones
     §7  PERSISTENCE       localStorage progress + settings
     §8  UI                Home, Explore Mode, Lesson, Level Complete

   Design language: Duolingo-inspired — chunky press-down buttons, segmented
   lesson progress, bottom feedback sheets, streak flame, star rewards —
   on the Fidel Quest amber identity.

   Provenance: the character table is generated from the test-verified data
   module in the fidel_quest repository, not hand-typed.
   ========================================================================== */

import { useReducer, useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import {
  Volume2,
  VolumeX,
  X,
  Lock,
  Star,
  Flame,
  ChevronLeft,
  Sparkles,
  Play,
  BookOpen,
  Check,
  RotateCcw,
} from 'lucide-react'

/* ============================================================================
   §1 DATA LAYER
   ========================================================================== */

/** The seven vocalized orders of the abugida, as taught in Ethiopian schools. */
export const ORDERS = Object.freeze([
  { index: 1, geezName: "Ge'ez", vowel: 'a' },
  { index: 2, geezName: "Ka'ib", vowel: 'u' },
  { index: 3, geezName: 'Sals', vowel: 'ee' },
  { index: 4, geezName: "Rab'", vowel: 'aa' },
  { index: 5, geezName: 'Hams', vowel: 'ay' },
  { index: 6, geezName: 'Sadis', vowel: 'ih' }, // the bare-consonant order
  { index: 7, geezName: "Sab'", vowel: 'o' },
])

/** Canonical table: 33 consonant families in traditional abugida order. */
export const FIDEL_FAMILIES = Object.freeze([
  {"id":"ha","name":"Ha","consonant":"h","chars":"ሀሁሂሃሄህሆ","nickname":"Haleta Ha"},
  {"id":"le","name":"Le","consonant":"l","chars":"ለሉሊላሌልሎ","labial":"ሏ","word":{"geez":"ልጅ","latin":"lij","meaning":"child","picture":"👶"}},
  {"id":"hha","name":"Hha","consonant":"h","chars":"ሐሑሒሓሔሕሖ","nickname":"Hameru Hha","twinOf":"Ha"},
  {"id":"me","name":"Me","consonant":"m","chars":"መሙሚማሜምሞ","labial":"ሟ","word":{"geez":"ማር","latin":"mar","meaning":"honey","picture":"🍯"}},
  {"id":"sse","name":"Sse","consonant":"s","chars":"ሠሡሢሣሤሥሦ","nickname":"Nigusu Sse","twinOf":"Se","word":{"geez":"ሠዓሊ","latin":"seali","meaning":"painter","picture":"🎨"}},
  {"id":"re","name":"Re","consonant":"r","chars":"ረሩሪራሬርሮ","labial":"ሯ","word":{"geez":"ሩዝ","latin":"ruz","meaning":"rice","picture":"🍚"}},
  {"id":"se","name":"Se","consonant":"s","chars":"ሰሱሲሳሴስሶ","nickname":"Isatu Se","labial":"ሷ","word":{"geez":"ሳር","latin":"sar","meaning":"grass","picture":"🌿"}},
  {"id":"she","name":"She","consonant":"sh","chars":"ሸሹሺሻሼሽሾ","labial":"ሿ","word":{"geez":"ሻይ","latin":"shai","meaning":"tea","picture":"🍵"}},
  {"id":"qe","name":"Qe","consonant":"q","chars":"ቀቁቂቃቄቅቆ","labial":"ቋ","word":{"geez":"ቀይ","latin":"qey","meaning":"red","picture":"🔴"}},
  {"id":"be","name":"Be","consonant":"b","chars":"በቡቢባቤብቦ","labial":"ቧ","word":{"geez":"ቤት","latin":"biet","meaning":"house","picture":"🏠"}},
  {"id":"te","name":"Te","consonant":"t","chars":"ተቱቲታቴትቶ","labial":"ቷ","word":{"geez":"ተራራ","latin":"terara","meaning":"mountain","picture":"⛰️"}},
  {"id":"che","name":"Che","consonant":"ch","chars":"ቸቹቺቻቼችቾ","labial":"ቿ","word":{"geez":"ቸኮሌት","latin":"chokolet","meaning":"chocolate","picture":"🍫"}},
  {"id":"kha","name":"Kha","consonant":"h","chars":"ኀኁኂኃኄኅኆ","nickname":"Bizuhanu Kha","twinOf":"Ha","labial":"ኋ"},
  {"id":"ne","name":"Ne","consonant":"n","chars":"ነኑኒናኔንኖ","labial":"ኗ","word":{"geez":"ንብ","latin":"nib","meaning":"bee","picture":"🐝"}},
  {"id":"nye","name":"Nye","consonant":"ny","chars":"ኘኙኚኛኜኝኞ","labial":"ኟ"},
  {"id":"a","name":"A","consonant":"","chars":"አኡኢኣኤእኦ","nickname":"Alfau A","word":{"geez":"አሳ","latin":"asa","meaning":"fish","picture":"🐟"}},
  {"id":"ke","name":"Ke","consonant":"k","chars":"ከኩኪካኬክኮ","labial":"ኳ","word":{"geez":"ኮከብ","latin":"kokeb","meaning":"star","picture":"⭐"}},
  {"id":"khe","name":"Khe","consonant":"kh","chars":"ኸኹኺኻኼኽኾ"},
  {"id":"we","name":"We","consonant":"w","chars":"ወዉዊዋዌውዎ","word":{"geez":"ውሻ","latin":"wisha","meaning":"dog","picture":"🐕"}},
  {"id":"ae","name":"Ae","consonant":"","chars":"ዐዑዒዓዔዕዖ","nickname":"Aynu Ae","twinOf":"A","word":{"geez":"ዓይን","latin":"ayin","meaning":"eye","picture":"👁️"}},
  {"id":"ze","name":"Ze","consonant":"z","chars":"ዘዙዚዛዜዝዞ","labial":"ዟ","word":{"geez":"ዛፍ","latin":"zaf","meaning":"tree","picture":"🌳"}},
  {"id":"zhe","name":"Zhe","consonant":"zh","chars":"ዠዡዢዣዤዥዦ"},
  {"id":"ye","name":"Ye","consonant":"y","chars":"የዩዪያዬይዮ"},
  {"id":"de","name":"De","consonant":"d","chars":"ደዱዲዳዴድዶ","labial":"ዷ","word":{"geez":"ድመት","latin":"dimet","meaning":"cat","picture":"🐈"}},
  {"id":"je","name":"Je","consonant":"j","chars":"ጀጁጂጃጄጅጆ","labial":"ጇ","word":{"geez":"ጆሮ","latin":"joro","meaning":"ear","picture":"👂"}},
  {"id":"ge","name":"Ge","consonant":"g","chars":"ገጉጊጋጌግጎ","labial":"ጓ","word":{"geez":"ግመል","latin":"gimel","meaning":"camel","picture":"🐫"}},
  {"id":"the","name":"The","consonant":"t'","chars":"ጠጡጢጣጤጥጦ","labial":"ጧ","word":{"geez":"ጥርስ","latin":"tirs","meaning":"tooth","picture":"🦷"}},
  {"id":"chhe","name":"Chhe","consonant":"ch'","chars":"ጨጩጪጫጬጭጮ","labial":"ጯ","word":{"geez":"ጨረቃ","latin":"chereqa","meaning":"moon","picture":"🌙"}},
  {"id":"ppe","name":"Ppe","consonant":"p'","chars":"ጰጱጲጳጴጵጶ"},
  {"id":"tse","name":"Tse","consonant":"ts'","chars":"ጸጹጺጻጼጽጾ","nickname":"Tselotu Tse","labial":"ጿ","word":{"geez":"ጸሎት","latin":"tselot","meaning":"prayer","picture":"🙏"}},
  {"id":"ttse","name":"Ttse","consonant":"ts'","chars":"ፀፁፂፃፄፅፆ","nickname":"Tsehayu Ttse","twinOf":"Tse","word":{"geez":"ፀሐይ","latin":"tsehay","meaning":"sun","picture":"☀️"}},
  {"id":"fe","name":"Fe","consonant":"f","chars":"ፈፉፊፋፌፍፎ","labial":"ፏ","word":{"geez":"ፈረስ","latin":"feres","meaning":"horse","picture":"🐎"}},
  {"id":"pe","name":"Pe","consonant":"p","chars":"ፐፑፒፓፔፕፖ","word":{"geez":"ፓፓያ","latin":"papaya","meaning":"papaya","picture":"🥭"}},
])

/** Derive the flat list of vocalized forms. Pure. */
export function deriveForms(families = FIDEL_FAMILIES, orders = ORDERS) {
  return families.flatMap((family, familyIndex) =>
    Array.from(family.chars).map((char, i) => ({
      char,
      familyId: family.id,
      familyName: family.name,
      familyIndex,
      order: orders[i].index,
      sound: family.consonant + orders[i].vowel,
      audioKey: `${family.id}-${orders[i].index}`,
    })),
  )
}

/** Derive lookup indexes. Pure. */
export function deriveIndexes(forms) {
  const byChar = new Map()
  const byAudioKey = new Map()
  for (const form of forms) {
    byChar.set(form.char, form)
    byAudioKey.set(form.audioKey, form)
  }
  return { byChar, byAudioKey }
}

export const ALL_FORMS = deriveForms()
export const INDEXES = deriveIndexes(ALL_FORMS)

/** Level definitions: base (1st-order) letters in four groups. */
export const LEVELS = Object.freeze([
  { id: 'level-1', n: 1, title: 'First Letters', blurb: 'Meet the first eight Fidel', from: 0, to: 8 },
  { id: 'level-2', n: 2, title: 'More Letters', blurb: 'Eight new friends', from: 8, to: 16 },
  { id: 'level-3', n: 3, title: 'Even More Letters', blurb: 'The middle of the table', from: 16, to: 24 },
  { id: 'level-4', n: 4, title: 'The Last Letters', blurb: 'Finish the whole alphabet', from: 24, to: 33 },
].map((l) => ({
  ...l,
  pool: FIDEL_FAMILIES.slice(l.from, l.to).map((f) => `${f.id}-1`),
  questionCount: 8,
  optionCount: 4,
})))

/* ============================================================================
   §2 DETERMINISTIC RNG — threaded mulberry32; a run is pure in (level, seed)
   ========================================================================== */

export function rngNext(state) {
  let t = (state + 0x6d2b79f5) | 0
  let r = Math.imul(t ^ (t >>> 15), 1 | t)
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
  return [((r ^ (r >>> 14)) >>> 0) / 4294967296, t]
}

export function rngShuffle(items, rngState) {
  const out = items.slice()
  let state = rngState
  for (let i = out.length - 1; i > 0; i--) {
    let value
    ;[value, state] = rngNext(state)
    const j = Math.floor(value * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return [out, state]
}

/* ============================================================================
   §3 STATE MACHINE — rigid, table-driven; ill-timed events are rejected
   ========================================================================== */

export const GameState = Object.freeze({
  IDLE: 'IDLE',
  PRESENTATION: 'PRESENTATION',
  AWAITING_INPUT: 'AWAITING_INPUT',
  SUCCESS_BURST: 'SUCCESS_BURST',
  ERROR_RECOVERY: 'ERROR_RECOVERY',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
})

export const GameEvent = Object.freeze({
  START_LEVEL: 'START_LEVEL',
  PRESENTATION_DONE: 'PRESENTATION_DONE',
  SELECT_OPTION: 'SELECT_OPTION',
  FEEDBACK_DONE: 'FEEDBACK_DONE',
  EXIT: 'EXIT',
})

export function initialContext(seed = 1) {
  return {
    status: GameState.IDLE,
    seed,
    rngState: seed,
    levelId: null,
    queue: [],
    cursor: 0,
    wrongPicks: [],
    attempts: 0,
    streak: 0,
    bestStreak: 0,
    history: [],
  }
}

const TRANSITIONS = {
  [GameState.IDLE]: {
    [GameEvent.START_LEVEL]: (ctx, { levelId, seed }) => startLevel(ctx, levelId, seed),
  },
  [GameState.PRESENTATION]: {
    [GameEvent.PRESENTATION_DONE]: (ctx) => ({ ...ctx, status: GameState.AWAITING_INPUT }),
    [GameEvent.EXIT]: exitToIdle,
  },
  [GameState.AWAITING_INPUT]: {
    [GameEvent.SELECT_OPTION]: (ctx, { audioKey }) => {
      const question = ctx.queue[ctx.cursor]
      if (!question.options.includes(audioKey) || ctx.wrongPicks.includes(audioKey)) {
        return null
      }
      if (audioKey === question.target) {
        const streak = ctx.streak + 1
        return {
          ...ctx,
          status: GameState.SUCCESS_BURST,
          attempts: ctx.attempts + 1,
          streak,
          bestStreak: Math.max(ctx.bestStreak, streak),
          history: [...ctx.history, { target: question.target, attempts: ctx.attempts + 1 }],
        }
      }
      return {
        ...ctx,
        status: GameState.ERROR_RECOVERY,
        attempts: ctx.attempts + 1,
        streak: 0,
        wrongPicks: [...ctx.wrongPicks, audioKey],
      }
    },
    [GameEvent.EXIT]: exitToIdle,
  },
  [GameState.SUCCESS_BURST]: {
    [GameEvent.FEEDBACK_DONE]: (ctx) =>
      ctx.cursor + 1 >= ctx.queue.length
        ? { ...ctx, status: GameState.LEVEL_COMPLETE }
        : { ...ctx, status: GameState.PRESENTATION, cursor: ctx.cursor + 1, wrongPicks: [], attempts: 0 },
    [GameEvent.EXIT]: exitToIdle,
  },
  [GameState.ERROR_RECOVERY]: {
    [GameEvent.FEEDBACK_DONE]: (ctx) => ({ ...ctx, status: GameState.AWAITING_INPUT }),
    [GameEvent.EXIT]: exitToIdle,
  },
  [GameState.LEVEL_COMPLETE]: {
    [GameEvent.START_LEVEL]: (ctx, { levelId, seed }) => startLevel(ctx, levelId, seed),
    [GameEvent.EXIT]: exitToIdle,
  },
}

function exitToIdle(ctx) {
  return { ...initialContext(ctx.seed), status: GameState.IDLE }
}

function startLevel(ctx, levelId, seed) {
  const level = LEVELS.find((l) => l.id === levelId)
  if (!level) return null
  const effectiveSeed = seed ?? ctx.seed
  const [queue, rngState] = buildQuestionQueue(level, effectiveSeed)
  return { ...initialContext(effectiveSeed), status: GameState.PRESENTATION, levelId, rngState, queue }
}

export function transition(ctx, event) {
  const handler = TRANSITIONS[ctx.status]?.[event.type]
  if (!handler) return { next: ctx, accepted: false, from: ctx.status }
  const result = handler(ctx, event.payload ?? {})
  if (result === null) return { next: ctx, accepted: false, from: ctx.status }
  return { next: result, accepted: true, from: ctx.status }
}

/* ============================================================================
   §4 QUESTION FACTORY (pure, seeded)
   ========================================================================== */

export function buildQuestionQueue(level, seed) {
  let rngState = seed
  let targets
  ;[targets, rngState] = rngShuffle(level.pool, rngState)
  targets = targets.slice(0, level.questionCount)

  const queue = targets.map((target) => {
    // Twin letters (e.g. ሀ/ሐ/ኀ) share a modern pronunciation; a distractor
    // that sounds like the target would make the question unanswerable by
    // ear, so same-sounding characters are excluded from the option pool.
    const targetSound = INDEXES.byAudioKey.get(target).sound
    let distractors
    ;[distractors, rngState] = rngShuffle(
      level.pool.filter((k) => k !== target && INDEXES.byAudioKey.get(k).sound !== targetSound),
      rngState,
    )
    let options
    ;[options, rngState] = rngShuffle(
      [target, ...distractors.slice(0, level.optionCount - 1)],
      rngState,
    )
    return { target, options }
  })
  return [queue, rngState]
}

export const selectQuestion = (ctx) => ctx.queue[ctx.cursor] ?? null
export const selectProgress = (ctx) => ({ answered: ctx.history.length, total: ctx.queue.length })
export const selectAccuracy = (ctx) => {
  if (ctx.history.length === 0) return null
  const firstTry = ctx.history.filter((h) => h.attempts === 1).length
  return Math.round((firstTry / ctx.history.length) * 100)
}
export const starsForAccuracy = (accuracy) => (accuracy >= 90 ? 3 : accuracy >= 65 ? 2 : 1)
const formOf = (audioKey) => INDEXES.byAudioKey.get(audioKey)

/* ============================================================================
   §5 INVARIANT SUITE — self-tests at module load; failures land in console
   ========================================================================== */

export function runInvariants() {
  const checks = []
  const check = (name, pass, detail = '') => checks.push({ name, pass, detail })

  check('33 consonant families', FIDEL_FAMILIES.length === 33)
  check('Every family has exactly 7 forms', FIDEL_FAMILIES.every((f) => Array.from(f.chars).length === 7))
  const chars = ALL_FORMS.map((f) => f.char)
  check('All 231 characters unique', new Set(chars).size === 231)
  check(
    'All characters in the Ethiopic block',
    chars.every((c) => {
      const cp = c.codePointAt(0)
      return cp >= 0x1200 && cp <= 0x137f
    }),
  )
  check('Audio keys unique and resolvable', new Set(ALL_FORMS.map((f) => f.audioKey)).size === 231 && INDEXES.byAudioKey.size === 231)
  check('Twin references resolve', FIDEL_FAMILIES.every((f) => !f.twinOf || FIDEL_FAMILIES.some((g) => g.name === f.twinOf)))

  for (const level of LEVELS) {
    const [q1] = buildQuestionQueue(level, 42)
    const [q2] = buildQuestionQueue(level, 42)
    check(`${level.id}: deterministic`, JSON.stringify(q1) === JSON.stringify(q2))
    check(
      `${level.id}: answer present, options unique`,
      q1.every((q) => q.options.includes(q.target) && new Set(q.options).size === q.options.length),
    )
    const soundOf = (k) => INDEXES.byAudioKey.get(k).sound
    check(
      `${level.id}: twin-letter safe over 25 seeds`,
      Array.from({ length: 25 }, (_, s) => buildQuestionQueue(level, s + 1)[0]).every((queue) =>
        queue.every((q) => q.options.every((o) => o === q.target || soundOf(o) !== soundOf(q.target))),
      ),
    )
  }

  const idle = initialContext(7)
  check('Ill-timed event rejected in IDLE', transition(idle, { type: GameEvent.FEEDBACK_DONE }).accepted === false)

  let sim = transition(idle, { type: GameEvent.START_LEVEL, payload: { levelId: 'level-1', seed: 7 } }).next
  let guard = 0
  while (sim.status !== GameState.LEVEL_COMPLETE && guard++ < 200) {
    if (sim.status === GameState.PRESENTATION) {
      sim = transition(sim, { type: GameEvent.PRESENTATION_DONE }).next
    } else if (sim.status === GameState.AWAITING_INPUT) {
      const q = selectQuestion(sim)
      const wrong = q.options.find((o) => o !== q.target && !sim.wrongPicks.includes(o))
      const pick = sim.cursor === 0 && sim.attempts === 0 && wrong ? wrong : q.target
      sim = transition(sim, { type: GameEvent.SELECT_OPTION, payload: { audioKey: pick } }).next
    } else {
      sim = transition(sim, { type: GameEvent.FEEDBACK_DONE }).next
    }
  }
  check('Headless playthrough reaches LEVEL_COMPLETE', sim.status === GameState.LEVEL_COMPLETE && sim.history.length === 8)

  return checks
}

export const INVARIANTS = runInvariants()
for (const c of INVARIANTS) {
  if (!c.pass) console.error(`[FidelQuest invariant failed] ${c.name}`, c.detail)
}

/* ============================================================================
   §6 SOUND ENGINE
   Contract: try the real recording at /audio/fidel/letters/<audioKey>.mp3;
   when it is missing (as in this artifact) fall back to a deterministic
   two-note Web Audio chime derived from the letter's family and order, so
   every character still has a distinct, stable "voice".
   ========================================================================== */

let audioCtx = null
function getAudioCtx() {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  try {
    audioCtx = audioCtx || new Ctor()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    return audioCtx
  } catch {
    return null
  }
}

function playNote(ctx, freq, at, dur, gainPeak = 0.18, type = 'sine') {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(gainPeak, at + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(gain).connect(ctx.destination)
  osc.start(at)
  osc.stop(at + dur + 0.05)
}

/** Deterministic fallback chime for a letter: pitch = family, interval = order. */
function playFormTone(form) {
  const ctx = getAudioCtx()
  if (!ctx) return
  const base = 262 * Math.pow(2, (form.familyIndex % 13) / 13)
  const second = base * (1 + form.order * 0.045)
  const now = ctx.currentTime
  playNote(ctx, base, now, 0.22)
  playNote(ctx, second, now + 0.16, 0.3)
}

export function playForm(form, enabled = true) {
  if (!enabled || !form) return
  try {
    const audio = new Audio(`/audio/fidel/letters/${form.audioKey}.mp3`)
    audio.volume = 0.9
    const fallback = () => playFormTone(form)
    audio.addEventListener('error', fallback, { once: true })
    audio.play().catch(fallback)
  } catch {
    playFormTone(form)
  }
}

export function playEffect(kind, enabled = true) {
  if (!enabled) return
  const ctx = getAudioCtx()
  if (!ctx) return
  const now = ctx.currentTime
  if (kind === 'good') {
    playNote(ctx, 523, now, 0.15, 0.14, 'triangle')
    playNote(ctx, 784, now + 0.1, 0.25, 0.14, 'triangle')
  } else if (kind === 'bad') {
    playNote(ctx, 220, now, 0.25, 0.12, 'sawtooth')
    playNote(ctx, 180, now + 0.12, 0.3, 0.1, 'sawtooth')
  } else if (kind === 'win') {
    ;[523, 659, 784, 1047].forEach((f, i) => playNote(ctx, f, now + i * 0.12, 0.3, 0.16, 'triangle'))
  }
}

/* ============================================================================
   §7 PERSISTENCE
   ========================================================================== */

const PROGRESS_KEY = 'fq2.progress'
const SOUND_KEY = 'fq2.sound'

export function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}
  } catch {
    return {}
  }
}
function saveProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    /* storage unavailable: play session-only */
  }
}
export function mergeResult(progress, levelId, result) {
  const prev = progress[levelId] || { stars: 0, bestStreak: 0, plays: 0 }
  return {
    ...progress,
    [levelId]: {
      stars: Math.max(prev.stars, result.stars),
      bestStreak: Math.max(prev.bestStreak, result.bestStreak),
      plays: prev.plays + 1,
    },
  }
}
function loadSoundOn() {
  try {
    return localStorage.getItem(SOUND_KEY) !== '0'
  } catch {
    return true
  }
}

export const isLevelUnlocked = (progress, index) =>
  index === 0 || (progress[LEVELS[index - 1].id]?.stars ?? 0) >= 1

/* ============================================================================
   §8 UI
   ========================================================================== */

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2'

export default function FidelQuestApp() {
  const [screen, setScreen] = useState({ name: 'home' })
  const [progress, setProgress] = useState(loadProgress)
  const [soundOn, setSoundOn] = useState(loadSoundOn)
  const [runSeed, setRunSeed] = useState(() => (Date.now() % 1000000) | 1)

  const toggleSound = useCallback(() => {
    setSoundOn((on) => {
      try {
        localStorage.setItem(SOUND_KEY, on ? '0' : '1')
      } catch {
        /* session-only */
      }
      return !on
    })
  }, [])

  const finishLevel = useCallback((levelId, result) => {
    if (result) {
      setProgress((p) => {
        const next = mergeResult(p, levelId, result)
        saveProgress(next)
        return next
      })
    }
    setScreen({ name: 'home' })
  }, [])

  const startLesson = useCallback((levelId) => {
    setRunSeed((Date.now() % 1000000) | 1)
    setScreen({ name: 'lesson', levelId })
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen" style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
        <AnimatePresence mode="wait">
          {screen.name === 'home' && (
            <Screen key="home">
              <Home
                progress={progress}
                soundOn={soundOn}
                onToggleSound={toggleSound}
                onPlay={startLesson}
                onExplore={() => setScreen({ name: 'explore' })}
              />
            </Screen>
          )}
          {screen.name === 'explore' && (
            <Screen key="explore">
              <Explore soundOn={soundOn} onBack={() => setScreen({ name: 'home' })} />
            </Screen>
          )}
          {screen.name === 'lesson' && (
            <Screen key={`lesson-${screen.levelId}-${runSeed}`}>
              <Lesson
                level={LEVELS.find((l) => l.id === screen.levelId)}
                seed={runSeed}
                soundOn={soundOn}
                onFinish={finishLevel}
                onReplay={() => startLesson(screen.levelId)}
              />
            </Screen>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}

function Screen({ children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
      {children}
    </motion.div>
  )
}

/* ── Shared: chunky button ── */

const CHUNK_STYLES = {
  go: { bg: 'var(--go)', edge: 'var(--go-deep)', fg: '#fff' },
  accent: { bg: 'var(--accent)', edge: 'var(--accent-deep)', fg: '#fff' },
  sky: { bg: 'var(--sky)', edge: 'var(--sky-deep)', fg: '#fff' },
  bad: { bg: 'var(--bad)', edge: 'var(--bad-deep)', fg: '#fff' },
  card: { bg: 'var(--card)', edge: 'var(--line)', fg: 'var(--ink)' },
}

function Chunky({ tone = 'go', className = '', style, children, depth = 4, ...props }) {
  const t = CHUNK_STYLES[tone]
  return (
    <button
      type="button"
      className={`chunk rounded-2xl font-extrabold tracking-wide disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS} ${className}`}
      style={{
        background: t.bg,
        color: t.fg,
        boxShadow: `0 ${depth}px 0 ${t.edge}`,
        '--chunk-depth': `${depth}px`,
        outlineColor: 'var(--sky)',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}

/* ── Shared: star mascot (Kokeb) ── */

function Kokeb({ size = 96, mood = 'happy' }) {
  return (
    <div className="relative inline-block" style={{ width: size, height: size }} aria-hidden="true">
      <Star className="absolute inset-0 h-full w-full drop-shadow-lg" style={{ color: 'var(--star)', fill: 'var(--star)' }} strokeWidth={1} />
      <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: size * 0.14 }}>
        <div className="flex flex-col items-center" style={{ gap: size * 0.02 }}>
          <div className="flex" style={{ gap: size * 0.12 }}>
            <span className="rounded-full" style={{ width: size * 0.07, height: mood === 'happy' ? size * 0.09 : size * 0.07, background: '#7c5200' }} />
            <span className="rounded-full" style={{ width: size * 0.07, height: mood === 'happy' ? size * 0.09 : size * 0.07, background: '#7c5200' }} />
          </div>
          <div
            style={{
              width: size * 0.2,
              height: size * 0.1,
              borderBottom: `${Math.max(2, size * 0.035)}px solid #7c5200`,
              borderRadius: '0 0 50% 50%',
            }}
          />
        </div>
      </div>
    </div>
  )
}

/* ── Home ── */

function Home({ progress, soundOn, onToggleSound, onPlay, onExplore }) {
  const totalStars = LEVELS.reduce((sum, l) => sum + (progress[l.id]?.stars ?? 0), 0)
  const maxStars = LEVELS.length * 3
  const champion = totalStars === maxStars

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-2xl px-3 py-1.5 font-extrabold" style={{ background: 'var(--card)', border: '2px solid var(--line)' }}>
          <Star className="h-5 w-5" style={{ color: 'var(--star)', fill: 'var(--star)' }} aria-hidden="true" />
          <span className="mono">
            {totalStars} / {maxStars}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleSound}
          aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}
          aria-pressed={soundOn}
          className={`chunk flex h-11 w-11 items-center justify-center rounded-2xl ${FOCUS}`}
          style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 3px 0 var(--line)', color: 'var(--muted)', outlineColor: 'var(--sky)', '--chunk-depth': '3px' }}
        >
          {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
      </header>

      <div className="mt-6 flex flex-col items-center text-center">
        <motion.div initial={{ scale: 0.7, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
          <Kokeb size={104} />
        </motion.div>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Fidel Quest</h1>
        <p className="mt-1 font-semibold" style={{ color: 'var(--muted)' }}>
          Learn the Amharic alphabet with Kokeb the Star
        </p>
        {champion && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl px-4 py-2 font-extrabold" style={{ background: 'var(--go-soft)', color: 'var(--go-ink)' }}>
            <Sparkles className="h-5 w-5" aria-hidden="true" /> Fidel Champion — every star earned!
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {LEVELS.map((level, i) => (
          <LevelCard key={level.id} level={level} earned={progress[level.id]?.stars ?? 0} unlocked={isLevelUnlocked(progress, i)} onPlay={() => onPlay(level.id)} />
        ))}

        <button
          type="button"
          onClick={onExplore}
          className={`chunk flex items-center gap-4 rounded-3xl p-5 text-left ${FOCUS}`}
          style={{ background: 'var(--card)', border: '2px solid var(--line)', boxShadow: '0 4px 0 var(--line)', outlineColor: 'var(--sky)' }}
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'var(--sky)', color: '#fff' }}>
            <BookOpen className="h-7 w-7" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-extrabold">Letter Explorer</span>
            <span className="block text-sm font-semibold" style={{ color: 'var(--muted)' }}>
              Tap any of the 231 letters to hear it
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}

function LevelCard({ level, earned, unlocked, onPlay }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 p-5" style={{ background: 'var(--card)', borderColor: 'var(--line)', opacity: unlocked ? 1 : 0.72 }}>
      <div className="flex items-center gap-4">
        <div className="geez flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl font-black text-white" style={{ background: unlocked ? 'var(--accent)' : 'var(--muted)' }} aria-hidden="true">
          {formOf(level.pool[0]).char}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Level {level.n}
          </p>
          <h2 className="text-lg font-extrabold leading-tight">{level.title}</h2>
          <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            {level.blurb}
          </p>
        </div>
        {unlocked ? (
          <Chunky tone={earned > 0 ? 'card' : 'go'} className="flex h-14 w-14 shrink-0 items-center justify-center" aria-label={`Play ${level.title}`} onClick={onPlay}>
            {earned > 0 ? <RotateCcw className="h-6 w-6" aria-hidden="true" /> : <Play className="h-6 w-6" aria-hidden="true" />}
          </Chunky>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: 'var(--line)', color: 'var(--muted)' }} aria-hidden="true">
            <Lock className="h-6 w-6" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-1" aria-label={`${earned} of 3 stars earned`}>
        {[0, 1, 2].map((i) => (
          <Star key={i} className="h-5 w-5" style={i < earned ? { color: 'var(--star)', fill: 'var(--star)' } : { color: 'var(--line)' }} aria-hidden="true" />
        ))}
        {!unlocked && (
          <span className="ml-auto text-xs font-bold" style={{ color: 'var(--muted)' }}>
            Earn a star on Level {level.n - 1} to unlock
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Explore Mode ── */

function Explore({ soundOn, onBack }) {
  const [openFamily, setOpenFamily] = useState(null)
  const family = FIDEL_FAMILIES.find((f) => f.id === openFamily)

  return (
    <div className="mx-auto min-h-screen max-w-xl px-5 pb-12 pt-6">
      <header className="flex items-center gap-3">
        <Chunky tone="card" className="flex h-11 w-11 items-center justify-center" aria-label="Back" onClick={() => (family ? setOpenFamily(null) : onBack())} depth={3}>
          <ChevronLeft className="h-6 w-6" aria-hidden="true" />
        </Chunky>
        <div>
          <h1 className="text-xl font-black leading-tight">{family ? `The ${family.name} family` : 'Letter Explorer'}</h1>
          <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
            {family ? 'Seven forms, one letter — tap to hear each' : '33 letter families · tap to open'}
          </p>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {!family ? (
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {FIDEL_FAMILIES.map((f) => {
              const base = formOf(`${f.id}-1`)
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    playForm(base, soundOn)
                    setOpenFamily(f.id)
                  }}
                  className={`chunk flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 ${FOCUS}`}
                  style={{ background: 'var(--card)', borderColor: 'var(--line)', boxShadow: '0 4px 0 var(--line)', outlineColor: 'var(--sky)' }}
                >
                  <span className="geez text-4xl font-black">{base.char}</span>
                  <span className="text-xs font-extrabold" style={{ color: 'var(--muted)' }}>
                    {f.name}
                    {f.word?.picture && <span className="ml-1" aria-hidden="true">{f.word.picture}</span>}
                  </span>
                </button>
              )
            })}
          </motion.div>
        ) : (
          <motion.div key={family.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="mt-6">
            <FamilyDetail family={family} soundOn={soundOn} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FamilyDetail({ family, soundOn }) {
  const forms = useMemo(() => ALL_FORMS.filter((f) => f.familyId === family.id), [family.id])
  const [active, setActive] = useState(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {forms.map((form) => (
          <motion.button
            key={form.audioKey}
            type="button"
            onClick={() => {
              playForm(form, soundOn)
              setActive(form.audioKey)
            }}
            animate={active === form.audioKey ? { scale: [1, 1.12, 1] } : {}}
            transition={{ duration: 0.3 }}
            className={`chunk flex flex-col items-center gap-1 rounded-2xl border-2 py-4 ${FOCUS}`}
            style={{ background: 'var(--card)', borderColor: active === form.audioKey ? 'var(--sky)' : 'var(--line)', boxShadow: '0 4px 0 var(--line)', outlineColor: 'var(--sky)' }}
          >
            <span className="geez text-5xl font-black">{form.char}</span>
            <span className="mono text-sm font-bold" style={{ color: 'var(--sky)' }}>
              {form.sound}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              {ORDERS[form.order - 1].geezName}
            </span>
          </motion.button>
        ))}
        {family.labial && (
          <button
            type="button"
            onClick={() => playEffect('good', soundOn)}
            className={`chunk flex flex-col items-center gap-1 rounded-2xl border-2 border-dashed py-4 ${FOCUS}`}
            style={{ background: 'var(--card)', borderColor: 'var(--accent)', boxShadow: '0 4px 0 var(--line)', outlineColor: 'var(--sky)' }}
          >
            <span className="geez text-5xl font-black" style={{ color: 'var(--accent)' }}>
              {family.labial}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
              Bonus form
            </span>
          </button>
        )}
      </div>

      {family.word && (
        <div className="flex items-center gap-4 rounded-3xl border-2 p-5" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          <span className="text-5xl" aria-hidden="true">
            {family.word.picture}
          </span>
          <div>
            <p className="geez text-3xl font-black">{family.word.geez}</p>
            <p className="text-sm font-bold" style={{ color: 'var(--muted)' }}>
              {family.word.latin} · {family.word.meaning}
            </p>
          </div>
        </div>
      )}

      {family.nickname && (
        <p className="text-center text-sm font-semibold" style={{ color: 'var(--muted)' }}>
          Schools call this letter “{family.nickname}”
          {family.twinOf && <> — it sounds just like {family.twinOf}</>}
        </p>
      )}
    </div>
  )
}

/* ── Lesson ── */

function machineReducer(ctx, event) {
  return transition(ctx, event).next
}

function Lesson({ level, seed, soundOn, onFinish, onReplay }) {
  const [ctx, dispatch] = useReducer(machineReducer, undefined, () => transition(initialContext(seed), { type: GameEvent.START_LEVEL, payload: { levelId: level.id, seed } }).next)

  const question = selectQuestion(ctx)
  const targetForm = question ? formOf(question.target) : null
  const progress = selectProgress(ctx)
  const accuracy = selectAccuracy(ctx)

  // PRESENTATION: play the prompt, then auto-advance to input.
  useEffect(() => {
    if (ctx.status !== GameState.PRESENTATION) return undefined
    playForm(targetForm, soundOn)
    const t = setTimeout(() => dispatch({ type: GameEvent.PRESENTATION_DONE }), 1300)
    return () => clearTimeout(t)
  }, [ctx.status, ctx.cursor]) // eslint-disable-line react-hooks/exhaustive-deps

  // Feedback sounds fire on state entry.
  useEffect(() => {
    if (ctx.status === GameState.SUCCESS_BURST) playEffect('good', soundOn)
    if (ctx.status === GameState.ERROR_RECOVERY) playEffect('bad', soundOn)
    if (ctx.status === GameState.LEVEL_COMPLETE) playEffect('win', soundOn)
  }, [ctx.status]) // eslint-disable-line react-hooks/exhaustive-deps

  if (ctx.status === GameState.LEVEL_COMPLETE) {
    return (
      <LevelComplete
        level={level}
        accuracy={accuracy}
        stars={starsForAccuracy(accuracy)}
        bestStreak={ctx.bestStreak}
        onContinue={() => onFinish(level.id, { stars: starsForAccuracy(accuracy), bestStreak: ctx.bestStreak, accuracy })}
        onReplay={() => {
          onFinish(level.id, { stars: starsForAccuracy(accuracy), bestStreak: ctx.bestStreak, accuracy })
          onReplay()
        }}
      />
    )
  }

  const showSheet = ctx.status === GameState.SUCCESS_BURST || ctx.status === GameState.ERROR_RECOVERY
  const presenting = ctx.status === GameState.PRESENTATION

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 pb-44 pt-5">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => onFinish(level.id, null)} aria-label="Quit lesson" className={`flex h-10 w-10 items-center justify-center rounded-xl ${FOCUS}`} style={{ color: 'var(--muted)', outlineColor: 'var(--sky)' }}>
          <X className="h-6 w-6" />
        </button>
        <div className="flex h-4 flex-1 gap-1.5" role="progressbar" aria-valuenow={progress.answered} aria-valuemin={0} aria-valuemax={progress.total} aria-label="Lesson progress">
          {Array.from({ length: progress.total }, (_, i) => (
            <motion.div
              key={i}
              className="h-full flex-1 rounded-full"
              animate={{ background: i < progress.answered ? 'var(--go)' : i === ctx.cursor ? 'var(--accent)' : 'var(--line)' }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
        <AnimatePresence>
          {ctx.streak >= 2 && (
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              className="flex items-center gap-1 rounded-xl px-2.5 py-1 font-black"
              style={{ background: 'var(--accent)', color: '#fff' }}
              aria-label={`Streak: ${ctx.streak}`}
            >
              <Flame className="h-4 w-4" fill="currentColor" aria-hidden="true" />
              {ctx.streak}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex flex-1 flex-col justify-center gap-6 py-6">
        <div className="text-center">
          <p className="text-lg font-extrabold">
            Which letter says{' '}
            <button
              type="button"
              onClick={() => playForm(targetForm, soundOn)}
              className={`chunk inline-flex items-center gap-1.5 rounded-xl px-3 py-1 align-middle text-white ${FOCUS}`}
              style={{ background: 'var(--sky)', boxShadow: '0 3px 0 var(--sky-deep)', '--chunk-depth': '3px', outlineColor: 'var(--accent)' }}
              aria-label={`Play the sound ${targetForm?.sound} again`}
            >
              <Volume2 className="h-5 w-5" aria-hidden="true" />“{targetForm?.sound}”
            </button>
            ?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {question?.options.map((key) => {
            const form = formOf(key)
            const isTarget = key === question.target
            const isWrongPick = ctx.wrongPicks.includes(key)
            const showAsCorrect = ctx.status === GameState.SUCCESS_BURST && isTarget
            const showAsWrong = ctx.status === GameState.ERROR_RECOVERY && key === ctx.wrongPicks[ctx.wrongPicks.length - 1]
            return (
              <motion.button
                key={`${ctx.cursor}-${key}`}
                type="button"
                disabled={presenting || showSheet || isWrongPick}
                onClick={() => dispatch({ type: GameEvent.SELECT_OPTION, payload: { audioKey: key } })}
                animate={showAsWrong ? { x: [0, -9, 9, -6, 6, 0] } : showAsCorrect ? { scale: [1, 1.08, 1] } : {}}
                transition={{ duration: 0.4 }}
                className={`chunk geez flex h-32 items-center justify-center rounded-3xl border-2 text-6xl font-black sm:h-36 ${FOCUS}`}
                style={{
                  background: showAsCorrect ? 'var(--go-soft)' : showAsWrong ? 'var(--bad-soft)' : 'var(--card)',
                  borderColor: showAsCorrect ? 'var(--go)' : showAsWrong ? 'var(--bad)' : 'var(--line)',
                  color: showAsCorrect ? 'var(--go-ink)' : showAsWrong ? 'var(--bad-ink)' : 'var(--ink)',
                  boxShadow: `0 5px 0 ${showAsCorrect ? 'var(--go)' : showAsWrong ? 'var(--bad)' : 'var(--line)'}`,
                  '--chunk-depth': '5px',
                  opacity: isWrongPick && !showAsWrong ? 0.35 : presenting ? 0.6 : 1,
                  outlineColor: 'var(--sky)',
                }}
                aria-label={`Choose the letter that says ${form.sound}`}
              >
                {form.char}
              </motion.button>
            )
          })}
        </div>

        <div className="h-6 text-center" aria-live="polite">
          {presenting && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-bold" style={{ color: 'var(--muted)' }}>
              Listen…
            </motion.p>
          )}
        </div>
      </main>

      <FeedbackSheet ctx={ctx} targetForm={targetForm} onContinue={() => dispatch({ type: GameEvent.FEEDBACK_DONE })} />
    </div>
  )
}

function FeedbackSheet({ ctx, targetForm, onContinue }) {
  const success = ctx.status === GameState.SUCCESS_BURST
  const error = ctx.status === GameState.ERROR_RECOVERY
  return (
    <AnimatePresence>
      {(success || error) && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 500, damping: 42 }}
          className="fixed inset-x-0 bottom-0 z-40"
          style={{ background: success ? 'var(--go-soft)' : 'var(--bad-soft)' }}
          role="alertdialog"
          aria-label={success ? 'Correct answer' : 'Wrong answer'}
        >
          <div className="mx-auto flex max-w-xl items-center gap-4 px-5 py-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: success ? 'var(--go)' : 'var(--bad)', color: '#fff' }} aria-hidden="true">
              {success ? <Check className="h-7 w-7" strokeWidth={3.5} /> : <X className="h-7 w-7" strokeWidth={3.5} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-black" style={{ color: success ? 'var(--go-ink)' : 'var(--bad-ink)' }}>
                {success ? (ctx.streak >= 3 ? `Amazing! ${ctx.streak} in a row!` : 'Nice!') : 'Not quite!'}
              </p>
              <p className="font-bold" style={{ color: success ? 'var(--go-ink)' : 'var(--bad-ink)' }}>
                <span className="geez text-xl">{targetForm?.char}</span> says “{targetForm?.sound}”{error && ' — listen and try again'}
              </p>
            </div>
            <Chunky tone={success ? 'go' : 'bad'} className="shrink-0 px-6 py-3.5 text-sm uppercase" onClick={onContinue}>
              {success ? 'Continue' : 'Got it'}
            </Chunky>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── Level complete ── */

function LevelComplete({ level, accuracy, stars, bestStreak, onContinue, onReplay }) {
  return (
    <div className="relative mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center overflow-hidden px-5 py-10 text-center">
      <Confetti />
      <motion.div initial={{ scale: 0.5, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 15 }}>
        <Kokeb size={120} />
      </motion.div>

      <motion.h1 className="mt-4 text-3xl font-black uppercase tracking-wide" style={{ color: 'var(--go-ink)' }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        Level complete!
      </motion.h1>
      <p className="mt-1 font-bold" style={{ color: 'var(--muted)' }}>
        {level.title}
      </p>

      <div className="mt-5 flex items-end gap-2" aria-label={`${stars} of 3 stars earned`}>
        {[0, 1, 2].map((i) => (
          <motion.div key={i} initial={{ scale: 0, rotate: -30 }} animate={{ scale: i < stars ? 1 : 0.72, rotate: 0 }} transition={{ delay: 0.35 + i * 0.18, type: 'spring', stiffness: 300, damping: 12 }}>
            <Star
              className={i === 1 ? 'h-20 w-20' : 'h-14 w-14'}
              style={i < stars ? { color: 'var(--star)', fill: 'var(--star)', filter: 'drop-shadow(0 4px 0 rgba(0,0,0,0.12))' } : { color: 'var(--line)' }}
              strokeWidth={1}
              aria-hidden="true"
            />
          </motion.div>
        ))}
      </div>

      <motion.div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
        <div className="rounded-2xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            First-try
          </p>
          <p className="mono text-2xl font-black" style={{ color: 'var(--go-ink)' }}>
            {accuracy}%
          </p>
        </div>
        <div className="rounded-2xl border-2 p-4" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
          <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Best streak
          </p>
          <p className="mono flex items-center justify-center gap-1 text-2xl font-black" style={{ color: 'var(--accent)' }}>
            <Flame className="h-6 w-6" fill="currentColor" aria-hidden="true" />
            {bestStreak}
          </p>
        </div>
      </motion.div>

      <motion.div className="mt-8 flex w-full max-w-sm flex-col gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
        <Chunky tone="go" className="w-full py-4 text-base uppercase" onClick={onContinue}>
          Continue
        </Chunky>
        <Chunky tone="card" className="w-full py-4 text-base uppercase" onClick={onReplay}>
          Play again
        </Chunky>
      </motion.div>
    </div>
  )
}

function Confetti({ count = 28 }) {
  const palette = ['var(--go)', 'var(--star)', 'var(--sky)', 'var(--accent)', 'var(--bad)']
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <motion.span
          key={i}
          className="absolute top-0 block"
          style={{
            left: `${(i * 137) % 100}%`,
            width: 8 + ((i * 53) % 7),
            height: 12 + ((i * 31) % 8),
            background: palette[i % palette.length],
            borderRadius: i % 3 === 0 ? '9999px' : '3px',
          }}
          initial={{ y: -30, opacity: 1, rotate: 0 }}
          animate={{ y: '105vh', opacity: [1, 1, 0.7], rotate: ((i % 2 ? 1 : -1) * (180 + ((i * 97) % 360))) }}
          transition={{ duration: 2.4 + ((i * 37) % 14) / 10, delay: (i % 9) * 0.12, ease: 'linear' }}
        />
      ))}
    </div>
  )
}
