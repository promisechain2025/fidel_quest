/* ============================================================================
   WORD WORKSHOP — pure core
   ----------------------------------------------------------------------------
   The reading bridge: a whole word is shown as a picture (and heard), and the
   child BUILDS it by tapping its letters in order onto the workbench. This is
   blending - stitching single fidel into a syllable string - the step from
   "I know letters" to "I can read a word".

   The target is the word's fidel in order; the tray holds those letters plus a
   few distractors, shuffled. A correct next tap advances the build; a wrong
   tap is REJECTED (the renderer re-cues, never blocks). Fill the word to win.

   PURE + SEEDED: which distractors and shuffle the tray gets is a pure
   function of (word, seed); taps arrive as TAP events. No clock. Tests
   headless.
   ========================================================================== */
import { rngShuffle } from './platform/rng'
import { INDEXES, ALL_FORMS } from './platform/ethiopic'

export const Phase = Object.freeze({ PLAY: 'PLAY', WIN: 'WIN' })
export const WorkshopEvent = Object.freeze({ TAP: 'TAP', RESET: 'RESET' })

/** A word's fidel as ordered audioKeys (['se-1','la-4','me-6'] for ሰላም). */
export function wordToKeys(geez) {
  return Array.from(geez)
    .map((ch) => INDEXES.byChar.get(ch))
    .filter(Boolean)
    .map((f) => f.audioKey)
}

export function initWorkshop(word, seed, distractorPool = null, distractors = 3) {
  const target = wordToKeys(word.geez)
  const need = new Set(target)
  const s0 = (seed >>> 0) | 1
  const pool = (distractorPool && distractorPool.length ? distractorPool : ALL_FORMS.map((f) => f.audioKey)).filter((k) => !need.has(k))
  const [shuffledPool, s1] = rngShuffle(pool, s0)
  const nDistract = Math.max(0, Math.min(distractors, shuffledPool.length))
  const [tray, rngState] = rngShuffle([...target, ...shuffledPool.slice(0, nDistract)], s1)
  return { word, target, tray, placed: 0, phase: Phase.PLAY, rngState, seed, distractors }
}

const rej = (ctx) => ({ next: ctx, accepted: false })
const ok = (next) => ({ next, accepted: true })

/** Pure transition. TAP is correct only when it is the word's next letter. */
export function workshopTransition(ctx, event) {
  const { type, payload = {} } = event
  if (type === WorkshopEvent.RESET) {
    return ok(initWorkshop(ctx.word, (ctx.seed * 1664525 + 1013904223) >>> 0, null, ctx.distractors))
  }
  if (ctx.phase !== Phase.PLAY) return rej(ctx)
  if (type !== WorkshopEvent.TAP) return rej(ctx)
  if (payload.key !== ctx.target[ctx.placed]) return rej(ctx) // wrong / out of order

  const placed = ctx.placed + 1
  return ok({ ...ctx, placed, phase: placed >= ctx.target.length ? Phase.WIN : Phase.PLAY })
}
