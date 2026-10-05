/* Picture-book Anbessa and Jibby for Letter Runner.
   Both views are the same rear paintings: the animals run away
   up the road, backs toward the chase camera. Original gouache,
   the same warm storybook language as the School Path Meet animals.
   publicUrl prefixes these with the Vite base (/ or /app/). */
import { publicUrl } from '../platform/publicUrl'

export const RUNNER_CAST = Object.freeze({
  anbessaChase: publicUrl('/art/runner/anbessa-chase.webp'),
  jibbyChase: publicUrl('/art/runner/jibby-chase.webp'),
  anbessaFront: publicUrl('/art/runner/anbessa-front.webp'),
  jibbyFront: publicUrl('/art/runner/jibby-front.webp'),
})
