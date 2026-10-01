/**
 * Per-game round-progress stores, kept in one tiny module so the Grown-ups
 * panel (in the main bundle) can read them without pulling each game's core
 * logic out of its lazy chunk.
 */
import { roundStore, isLetterKey } from './roundProgress'

export const GAME_MAX_LEVEL = 4

export const ECHO_KEY = 'fq.echo.v1'
export const TRAIN_KEY = 'fq.train.v1'

export const echoStore = roundStore(ECHO_KEY, GAME_MAX_LEVEL, isLetterKey)
export const trainStore = roundStore(TRAIN_KEY, GAME_MAX_LEVEL, isLetterKey)
