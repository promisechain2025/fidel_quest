/* Brick pictures by word: the toy-brick art made for Brick Words, reusable by
   any screen that shows a word (Word Market stall, quiz cards ...). */
import { BRICK_WORDS } from './brickWordsCore'

const BY_GEEZ = new Map(BRICK_WORDS.map((w) => [w.geez, w.pic]))

/** Bundled brick picture name for a fidel word, or null when there is none. */
export const brickPicOf = (geez) => BY_GEEZ.get(geez) || null
