/* BRICK WORDS (sample) - word list + round helpers.
   Reuses the Word Workshop core (wordToKeys / initWorkshop / workshopTransition)
   so the spelling rules stay in ONE place; this file only adds the words that
   have a 3D toy-brick picture and a tray that never offers a stranger letter. */
import { initWorkshop, workshopTransition, wordToKeys, Phase, WorkshopEvent } from './workshopCore'

/** Sample words: each has a bundled 3D picture (public/img/games/bw/<pic>.webp)
    and an existing word recording (audio words/<latin>). */
export const BRICK_WORDS = [
  { geez: 'ላም', latin: 'lam', pic: 'cow' },
  { geez: 'ቤት', latin: 'biet', pic: 'house' },
  { geez: 'ማር', latin: 'mar', pic: 'honey' },
  { geez: 'አሳ', latin: 'asa', pic: 'fish' },
  { geez: 'ሎሚ', latin: 'lomi', pic: 'lemon' },
  { geez: 'ኮከብ', latin: 'kokeb', pic: 'star' },
]

/** Tray distractors come from the letters of the other sample words. */
export const LETTER_POOL = [...new Set(BRICK_WORDS.flatMap((w) => wordToKeys(w.geez)))]

export const wordAt = (start, round) => BRICK_WORDS[(start + round) % BRICK_WORDS.length]
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
