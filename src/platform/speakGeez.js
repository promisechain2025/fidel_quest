/* Speak Ge'ez the way Story Time already does.
   A word with a pack clip plays words/<latin>.mp3. noAudio words, and any
   word the pack does not list, are spelled letter by letter through the
   letter clips. Family Voice, when a parent has recorded letters, is applied
   by the audio engine on those letter keys. There is no speech recognizer
   and no new clip set here. */

import { audio, afterVoice } from './audioEngine'
import { INDEXES } from './ethiopic'
import { storyWords, wordAudioFor } from './stories'

/** Speak one Ge'ez word. Returns a cancel fn for the spelling chain. */
export function speakWord(geez, soundOn) {
  const w = wordAudioFor(geez)
  if (w && !w.noAudio) {
    audio.play(`words/${w.latin}`, { enabled: soundOn })
    return () => {}
  }
  const chars = Array.from(geez || '').filter((ch) => INDEXES.byChar.has(ch))
  let cancelled = false
  let cancelStep = () => {}
  const step = (i) => {
    if (cancelled || i >= chars.length) return
    const form = INDEXES.byChar.get(chars[i])
    audio.play(`letters/${form.audioKey}`, { enabled: soundOn, chime: { familyIndex: form.familyIndex, order: form.order + 1 } })
    cancelStep = afterVoice(() => step(i + 1), 350)
  }
  step(0)
  return () => {
    cancelled = true
    cancelStep()
  }
}

/** Speak a short line word by word (Echo, and the same fallback Story Time
    uses when a page has no narration). Sound off is a no-op so a child is
    never waiting on a clip. Returns a cancel fn. */
export function speakLine(geez, soundOn) {
  if (!soundOn) return () => {}
  const words = storyWords(geez)
  if (!words.length) return () => {}
  let cancelled = false
  let cancelStep = () => {}
  const step = (i) => {
    if (cancelled || i >= words.length) return
    const cancelWord = speakWord(words[i], soundOn)
    const cancelWait = afterVoice(() => step(i + 1), 500)
    cancelStep = () => {
      cancelWord()
      cancelWait()
    }
  }
  step(0)
  return () => {
    cancelled = true
    cancelStep()
    audio.stopVoice()
  }
}
