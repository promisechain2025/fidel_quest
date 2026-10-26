/* WORD BRICKS (sample) - word list + round helpers.
   Reuses the Word Workshop core (wordToKeys / initWorkshop / workshopTransition)
   so the spelling rules stay in ONE place; this file only adds the words that
   have a 3D toy-brick picture and a tray that never offers a stranger letter.

   The word list follows the learn language (fq.pack): Amharic keeps its
   curated list (brickWordsAm.js); every other pack - Tigrinya - gets the words
   of ITS OWN pack word list that have a toy-brick picture and a recording, so a
   Tigrinya child never sees (or hears) an Amharic word. A Tigrinya word with no
   picture or no recording is simply left out. */
import { initWorkshop, workshopTransition, wordToKeys, Phase, WorkshopEvent } from './workshopCore'
import { AM_BRICK_WORDS } from './brickWordsAm'
import { brickPicOf } from './brickPictures'
import { PACKS, INDEXES, mergeFamilies, getActivePackId } from './platform/ethiopic'
import { ETHIOPIC_SCRIPT } from './script/ethiopic'

/** Every word of a pack's own list, as { geez, latin, noAudio }. Pure. */
export function packWordList(packId) {
  const pack = PACKS[packId]
  if (!pack) return []
  const out = []
  for (const f of mergeFamilies(ETHIOPIC_SCRIPT, pack)) {
    const list = Array.isArray(f.words) && f.words.length ? f.words : f.word ? [f.word] : []
    for (const w of list) if (w && w.geez && w.latin) out.push(w)
  }
  return out
}

/** Tigrinya words whose only brick picture is a near-miss (sugar is drawn as candy),
    fine for a market stall but not for a spelling game that names the picture. */
const NEAR_MISS_PICTURE = new Set(['ሽኮር'])

/** The Word Bricks words for a learn language: { geez, latin, pic }.
    Amharic = the curated list; any other pack = its recorded, pictured,
    2-4 fidel words (one per picture, so two answers never share art). */
export function brickWordsFor(packId) {
  if (packId === 'am') return AM_BRICK_WORDS
  const seenPic = new Set()
  const seenGeez = new Set()
  const out = []
  for (const w of packWordList(packId)) {
    if (w.noAudio || seenGeez.has(w.geez) || NEAR_MISS_PICTURE.has(w.geez)) continue
    const pic = brickPicOf(w.geez)
    const n = Array.from(w.geez).length
    if (!pic || seenPic.has(pic) || n < 2 || n > 4) continue
    if (!Array.from(w.geez).every((c) => INDEXES.byChar.has(c))) continue
    seenGeez.add(w.geez)
    seenPic.add(pic)
    out.push({ geez: w.geez, latin: w.latin, pic })
  }
  return out
}

/** The words of the language the child is learning (fixed per load; a pack switch reloads). */
export const BRICK_WORDS = brickWordsFor(getActivePackId())

/** Tray distractors come from the letters of the other sample words. */
export const LETTER_POOL = [...new Set(BRICK_WORDS.flatMap((w) => wordToKeys(w.geez)))]

/** A round is 6 words; the stride walks the list so neighbours differ. It is the
    first number from 5 up that shares no factor with the list length, so the
    walk visits every word before it repeats (5 for the 28 Amharic words). */
export const BRICK_SESSION = 6
const gcd = (a, b) => (b ? gcd(b, a % b) : a)
const strideFor = (n) => { let s = 5; while (n > 1 && gcd(s, n) !== 1) s += 1; return s }
const STRIDE = strideFor(BRICK_WORDS.length)
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
