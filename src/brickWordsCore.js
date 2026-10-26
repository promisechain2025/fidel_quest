/* WORD BRICKS (sample) - word list + round helpers.
   Reuses the Word Workshop core (wordToKeys / initWorkshop / workshopTransition)
   so the spelling rules stay in ONE place; this file only adds the words that
   have a 3D toy-brick picture and a tray that never offers a stranger letter. */
import { initWorkshop, workshopTransition, wordToKeys, Phase, WorkshopEvent } from './workshopCore'

/** Words: each has a bundled 3D picture (public/img/games/bw/<pic>.webp)
    and an existing word recording (audio words/<latin>). */
export const BRICK_WORDS = [
  { geez: 'ላም', latin: 'lam', pic: 'cow' },
  { geez: 'ቤት', latin: 'biet', pic: 'house' },
  { geez: 'ማር', latin: 'mar', pic: 'honey' },
  { geez: 'አሳ', latin: 'asa', pic: 'fish' },
  { geez: 'ሎሚ', latin: 'lomi', pic: 'lemon' },
  { geez: 'ኮከብ', latin: 'kokeb', pic: 'star' },
  { geez: 'ሙዝ', latin: 'muz', pic: 'banana' },
  { geez: 'ንብ', latin: 'nib', pic: 'bee' },
  { geez: 'ዶሮ', latin: 'doro', pic: 'chicken' },
  { geez: 'ዳቦ', latin: 'dabo', pic: 'bread' },
  { geez: 'ኬክ', latin: 'kek', pic: 'cake' },
  { geez: 'ዛፍ', latin: 'zaf', pic: 'tree' },
  { geez: 'ወፍ', latin: 'wef', pic: 'bird' },
  { geez: 'ጀልባ', latin: 'jelba', pic: 'boat' },
  { geez: 'መኪና', latin: 'mekina', pic: 'car' },
  { geez: 'ድመት', latin: 'dimet', pic: 'cat' },
  { geez: 'ዝሆን', latin: 'zihon', pic: 'elephant' },
  { geez: 'አንበሳ', latin: 'anbesa', pic: 'lion' },
  { geez: 'ፈረስ', latin: 'feres', pic: 'horse' },
  { geez: 'ግመል', latin: 'gimel', pic: 'camel' },
  { geez: 'ቡና', latin: 'buna', pic: 'coffee' },
  { geez: 'ሻማ', latin: 'shama', pic: 'candle' },
  { geez: 'ቁልፍ', latin: 'qulf', pic: 'key' },
  { geez: 'ጫማ', latin: 'chama', pic: 'shoe' },
  { geez: 'ካሮት', latin: 'karot', pic: 'carrot' },
  { geez: 'ፀሐይ', latin: 'tsehay', pic: 'sun' },
  { geez: 'ጨረቃ', latin: 'chereqa', pic: 'moon' },
  { geez: 'ፍየል', latin: 'fiyel', pic: 'goat' },
]

/** Tray distractors come from the letters of the other sample words. */
export const LETTER_POOL = [...new Set(BRICK_WORDS.flatMap((w) => wordToKeys(w.geez)))]

/** A round is 6 words; the stride walks the list so neighbours differ (5 is coprime with 28). */
export const BRICK_SESSION = 6
const STRIDE = 5
export const wordAt = (start, round) => BRICK_WORDS[(start + round * STRIDE) % BRICK_WORDS.length]
export const distractorsFor = (round) => Math.min(4, 2 + Math.floor(round / 2))

export function initBrickWord(word, seed, round = 0) {
  return initWorkshop(word, seed, LETTER_POOL, distractorsFor(round))
}

/** Which tray indices are already used up (placed letters, in order). */
export function usedIndices(ctx) {
  const used = new Set()
  for (const k of ctx.target.slice(0, ctx.placed)) {
    const i = ctx.tray.findIndex((t, idx) => t === k && !used.has(idx))
    if (i >= 0) used.add(i)
  }
  return used
}

/** Try a tray key on the next slot. */
export function place(ctx, key) {
  const r = workshopTransition(ctx, { type: WorkshopEvent.TAP, payload: { key } })
  return { ctx: r.next, accepted: r.accepted, won: r.next.phase === Phase.WIN }
}
