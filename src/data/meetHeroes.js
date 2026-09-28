/* Picture-book backgrounds for the School Path Meet card.
   One original gouache scene per picture word, keyed by family id.
   The fidel bubble stays in front; the painting is the scenery behind it.
   Files live in public/art/meet so they stay out of the JS bundle and
   cache on first view (see the runtime cache in vite.config.js).
   Amharic Meet does not use these: meetHeroSrc requires fromSchoolPath. */

export const MEET_HERO_BY_FAMILY = Object.freeze({
  ha: '/art/meet/ha.webp',
  le: '/art/meet/le.webp',
  hha: '/art/meet/hha.webp',
  me: '/art/meet/me.webp',
  se: '/art/meet/se.webp',
  re: '/art/meet/re.webp',
  she: '/art/meet/she.webp',
  qe: '/art/meet/qe.webp',
  qhe: '/art/meet/qhe.webp',
  be: '/art/meet/be.webp',
  te: '/art/meet/te.webp',
  che: '/art/meet/che.webp',
  ne: '/art/meet/ne.webp',
  a: '/art/meet/a.webp',
  ke: '/art/meet/ke.webp',
  khe: '/art/meet/khe.webp',
  we: '/art/meet/we.webp',
  ae: '/art/meet/ae.webp',
  ze: '/art/meet/ze.webp',
  de: '/art/meet/de.webp',
  je: '/art/meet/je.webp',
  ye: '/art/meet/ye.webp',
  ge: '/art/meet/ge.webp',
  the: '/art/meet/the.webp',
  chhe: '/art/meet/chhe.webp',
  tse: '/art/meet/tse.webp',
  fe: '/art/meet/fe.webp',
  pe: '/art/meet/pe.webp',
})

/** Hero painting for a School Path Meet word, or null when this card stays a letter bubble. */
export function meetHeroSrc(word) {
  if (!word || word.fromSchoolPath !== true) return null
  return MEET_HERO_BY_FAMILY[word.familyId] || null
}
