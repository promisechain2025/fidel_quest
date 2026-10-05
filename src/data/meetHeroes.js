/* Picture-book backgrounds for the School Path Meet card.
   One original gouache scene per picture word, keyed by family id.
   The fidel bubble stays in front; the painting is the scenery behind it.
   Files live in public/art/meet so they stay out of the JS bundle and
   cache on first view (see the runtime cache in vite.config.js).
   URLs go through publicUrl so a /app/ web build requests /app/art/meet/.
   Amharic Meet does not use these: meetHeroSrc requires fromSchoolPath. */

import { publicUrl } from '../platform/publicUrl'

const meetArt = (id) => publicUrl(`/art/meet/${id}.webp`)

export const MEET_HERO_BY_FAMILY = Object.freeze({
  ha: meetArt('ha'),
  le: meetArt('le'),
  hha: meetArt('hha'),
  me: meetArt('me'),
  se: meetArt('se'),
  re: meetArt('re'),
  she: meetArt('she'),
  qe: meetArt('qe'),
  qhe: meetArt('qhe'),
  be: meetArt('be'),
  te: meetArt('te'),
  che: meetArt('che'),
  ne: meetArt('ne'),
  a: meetArt('a'),
  ke: meetArt('ke'),
  khe: meetArt('khe'),
  we: meetArt('we'),
  ae: meetArt('ae'),
  ze: meetArt('ze'),
  de: meetArt('de'),
  je: meetArt('je'),
  ye: meetArt('ye'),
  ge: meetArt('ge'),
  the: meetArt('the'),
  chhe: meetArt('chhe'),
  tse: meetArt('tse'),
  fe: meetArt('fe'),
  pe: meetArt('pe'),
})

/** Hero painting for a School Path Meet word, or null when this card stays a letter bubble. */
export function meetHeroSrc(word) {
  if (!word || word.fromSchoolPath !== true) return null
  return MEET_HERO_BY_FAMILY[word.familyId] || null
}
