/* ============================================================================
   FIDEL MASTER — pure logic for the "master every letter" trainer.
   ----------------------------------------------------------------------------
   Three tools sit on top of these pure helpers (the screen is
   components/FidelMaster.jsx):
     1. Abugida mix   - shuffle all 231 forms into a mixed mastery drill.
     2. Auto-voice    - step a sequence at a chosen pace, voicing each letter.
     3. Say-it        - on-device pronunciation check (offline, private): grade
                        a mic sample by loudness + voiced duration, never
                        sending audio anywhere, and coach the missed letters.
   Pure + seeded so the mix is deterministic and the grader is unit-testable. */

/** Deterministic PRNG (mulberry32) — the app forbids Math.random in seeded
    logic so a mix is reproducible from its seed. */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffleSeeded(arr, seed) {
  const a = [...arr]
  const rnd = mulberry32(seed >>> 0 || 1)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** The mastery sequence. `order` (1-7) narrows it to a single vowel order
    across all families (e.g. every 4th-order "-aa" letter) so a child can
    master one vowel at a time; null/0 keeps the whole abugida. `mix` shuffles,
    else the natural family-by-family, order-by-order reading order. */
export function buildMasterSequence(forms, { seed = 1, mix = true, order = null } = {}) {
  const pool = order ? forms.filter((f) => f.order === order) : forms
  return mix ? shuffleSeeded(pool, seed) : [...pool]
}

/* ── Auto-voice pacing (ms between letters) ───────────────────────────────────
   Slower than a fluent reader wants on purpose: a learning child needs time to
   look, hear, and echo. "Say with me" adds a repeat window on top so the pace
   is play -> your-turn pause -> next. */
export const AUTOPLAY_SPEEDS = Object.freeze({ slow: 2800, normal: 1900, fast: 1100 })
export const SPEED_ORDER = Object.freeze(['slow', 'normal', 'fast'])
// After the letter plays, hold this long for the child to repeat it aloud.
export const SAY_WITH_ME_GAP = 1700
// Roughly how long a letter clip runs, so the "your turn" cue lands after it.
export const CLIP_LEAD_MS = 750

/** Next vowel order in the round-robin (1..7 wrapping), for auto-advancing
    through the orders once the current one is finished. */
export function nextOrder(order, count = 7) {
  return order >= count ? 1 : order + 1
}

/* ── On-device pronunciation grading (offline, private) ──────────────────────
   This is encouragement-grade, NOT phonetic recognition: with no cloud ASR we
   honestly measure that the child spoke and roughly how long, then celebrate
   or invite another try. peakRms/voicedMs come from a mic AnalyserNode sample;
   nothing is stored or transmitted. Never blocks - a miss just replays the
   model sound and lets them go again. Pure so the bands are testable.         */
export const VOICE_RMS_THRESHOLD = 0.02

export function gradePronunciation({ peakRms = 0, voicedMs = 0 } = {}) {
  if (peakRms < VOICE_RMS_THRESHOLD) {
    return { grade: 'again', accept: false, stars: 0, reason: 'quiet' }
  }
  // A spoken fidel syllable is roughly a quarter to one second of voicing.
  if (voicedMs >= 250 && voicedMs <= 1300 && peakRms >= 0.05) {
    return { grade: 'great', accept: true, stars: 3, reason: 'clear' }
  }
  if (voicedMs >= 120) {
    return { grade: 'good', accept: true, stars: 2, reason: 'heard' }
  }
  return { grade: 'again', accept: false, stars: 1, reason: 'short' }
}

/** Running accuracy over a say-it session. */
export function sessionAccuracy({ correct = 0, total = 0 } = {}) {
  return total === 0 ? null : Math.round((correct / total) * 100)
}
