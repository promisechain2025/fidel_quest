/* ============================================================================
   VOICED PROMPTS — instructions a pre-reader can hear
   ----------------------------------------------------------------------------
   The leading kids apps speak every instruction; ours were written text.
   Each key maps to a short recorded clip at audio/<pack>/prompts/<key>.mp3
   (see docs/prompt-recordings.md). The audio contract holds: no clip yet =
   silence, never a blocker - so this ships at ZERO bytes and lights up as
   recordings land. Spoken once per screen entry (not per question); the
   engine's wait-queue lets the prompt finish before the first letter plays.
   ========================================================================== */
import { audio } from './audioEngine'

export const PROMPT_LINES = Object.freeze({
  whichLetter: 'Which letter makes this sound?',
  buildWord: 'Tap the letters in order to build the word.',
  tapPicture: 'Listen to the word, then tap its picture.',
  whichGlyph: 'Which letter writes this word?',
  tapWords: 'Tap any word to hear it. Tap the speaker to hear the page.',
  traceLetter: 'Listen, then trace the letter with your finger.',
  warmupStart: 'Let us warm up with the letters you know!',
  placementStart: 'Show me the letters you already know!',
})

const said = new Set()

/** Speak an instruction once per app session per key. Silent when the clip
    is not recorded yet. */
export function sayPrompt(key, enabled) {
  if (!PROMPT_LINES[key] || said.has(key)) return
  said.add(key)
  try {
    audio.play(`prompts/${key}`, { enabled })
  } catch {
    /* never block on narration */
  }
}

/** Test/reset hook. */
export function resetPrompts() {
  said.clear()
}
