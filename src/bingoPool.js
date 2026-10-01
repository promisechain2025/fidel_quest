/* Kokeb's Bingo solo pool - kept out of the component file so it stays
   fast-refresh friendly and unit-testable. */
import { ALL_FORMS } from './platform/ethiopic'
import { uniqueBySound } from './platform/sameSound'

const BASE_FORMS = ALL_FORMS.filter((f) => f.order === 1)

/** Solo pool: base forms of the in-scope families, ONE per sound (twins such as
    ጸ/ፀ never share a card - a called letter must have exactly one answer),
    topped up with other sound-unique forms until a 3x3 card can be dealt. */
export function soloPool(familyIds) {
  const inScope = familyIds && familyIds.length ? ALL_FORMS.filter((f) => familyIds.includes(f.familyId)) : ALL_FORMS
  const src = inScope.length ? inScope : ALL_FORMS
  const bases = uniqueBySound(src.filter((f) => f.order === 1).map((f) => f.audioKey))
  if (bases.length >= 9) return bases
  const more = uniqueBySound([...bases, ...src.map((f) => f.audioKey)])
  return more.length >= 9 ? more : uniqueBySound([...more, ...BASE_FORMS.map((f) => f.audioKey), ...ALL_FORMS.map((f) => f.audioKey)])
}
