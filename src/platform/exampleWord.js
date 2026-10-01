/* An example word for a letter, for the after-answer moment in the learning
   games: one that STARTS with that exact form, preferring a recorded one;
   else (strict) one that CONTAINS the exact form anywhere; else (default)
   one starting with its family; else null. Pure.
   strict is for games about vowel ORDER, where a same-family word would
   teach the wrong vowel. */
import { INDEXES } from './ethiopic'

export function exampleWord(key, words, { strict = false } = {}) {
  const f = INDEXES.byAudioKey.get(key)
  if (!f || !words) return null
  const first = (w) => INDEXES.byChar.get(Array.from(w.geez)[0])
  const exact = words.filter((w) => first(w)?.audioKey === key)
  const fam = words.filter((w) => first(w)?.familyId === f.familyId)
  const pick = (list) => list.find((w) => !w.noAudio) || list[0] || null
  if (strict) {
    const inside = words.filter((w) => Array.from(w.geez).some((c) => INDEXES.byChar.get(c)?.audioKey === key))
    return pick(exact) || pick(inside)
  }
  return pick(exact) || pick(fam)
}
