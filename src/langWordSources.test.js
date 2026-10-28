import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/* Language audit: every game that shows or says a WORD must take it from the
   learn language the child picked (fq.pack), never from the other one.
   The pack is read at module load (a switch reloads the app), so each case
   sets fq.pack, resets the module graph and imports the games fresh. */

const WORDS_DIR = path.resolve(__dirname, '../public/audio/fidel/words')
const BW_DIR = path.resolve(__dirname, '../public/img/games/bw')
const hasClip = (latin) => fs.existsSync(path.join(WORDS_DIR, `${latin}.mp3`))

async function load(pack) {
  localStorage.clear()
  localStorage.setItem('fq.pack', pack)
  vi.resetModules()
  const eth = await import('./platform/ethiopic')
  const app = await import('./FidelQuestApp')
  const bw = await import('./brickWordsCore')
  const market = await import('./wordMarketCore')
  const kebero = await import('./keberoCore')
  const { exampleWord } = await import('./platform/exampleWord')
  const workshop = await import('./components/WordWorkshop')
  return { eth, app, bw, market, kebero, exampleWord, workshop }
}

const geezSet = (list) => new Set(list.map((w) => w.geez))

describe.each(['am', 'ti'])('every game word source follows the %s pack', (pack) => {
  let m
  let own
  let other
  beforeEach(async () => {
    m = await load(pack)
    own = geezSet(m.bw.packWordList(pack))
    const otherId = pack === 'am' ? 'ti' : 'am'
    const o = geezSet(m.bw.packWordList(otherId))
    other = new Set([...o].filter((g) => !own.has(g))) // words that exist ONLY in the other language
  })

  const expectOwn = (words, what) => {
    expect(words.length, `${what} has words`).toBeGreaterThan(0)
    for (const w of words) {
      expect(own.has(w.geez), `${what}: ${w.geez} is not a ${pack} word`).toBe(true)
      expect(other.has(w.geez), `${what}: ${w.geez} belongs to the other language`).toBe(false)
    }
  }

  it('the active pack is the one asked for', () => {
    expect(m.eth.getActivePackId()).toBe(pack)
  })

  it('Word Bricks: own words, own recordings, real pictures, spellable', () => {
    expect(m.bw.BRICK_WORDS).toEqual(m.bw.brickWordsFor(pack))
    expectOwn(m.bw.BRICK_WORDS, 'Word Bricks')
    const ownByGeez = new Map(m.bw.packWordList(pack).map((w) => [w.geez, w]))
    for (const w of m.bw.BRICK_WORDS) {
      if (pack === 'ti') expect(w.latin, `${w.geez} audio key`).toBe(ownByGeez.get(w.geez).latin)
      expect(hasClip(w.latin), `${w.geez} recording ${w.latin}`).toBe(true)
      expect(fs.existsSync(path.join(BW_DIR, `${w.pic}.webp`)), `${w.geez} picture ${w.pic}`).toBe(true)
      expect(Array.from(w.geez).every((c) => m.eth.INDEXES.byChar.has(c)), w.geez).toBe(true)
    }
    // a round never runs dry or repeats within a session
    const seen = new Set(Array.from({ length: m.bw.BRICK_SESSION }, (_, r) => m.bw.wordAt(3, r).geez))
    expect(seen.size).toBe(Math.min(m.bw.BRICK_SESSION, m.bw.BRICK_WORDS.length))
    // the tray only ever offers letters of this language's words
    const letters = new Set(m.bw.BRICK_WORDS.flatMap((w) => Array.from(w.geez)))
    for (const k of m.bw.LETTER_POOL) expect(letters.has(m.eth.INDEXES.byAudioKey.get(k).char), k).toBe(true)
  })

  it('Word Market, Kebero Beats, First Words, Word Build, Echo Match and Vowel Train use the pack word list', () => {
    expectOwn(m.market.marketStock(m.app.ALL_WORDS), 'Word Market')
    expectOwn(m.kebero.beatStock(m.app.ALL_WORDS), 'Kebero Beats')
    expectOwn(m.app.WORDS, 'First Words')
    expectOwn(m.app.ALL_WORDS, 'ALL_WORDS (Word Steps, Word Build, hunt)')
    expectOwn(m.workshop.BUILDABLE, 'Word Build')
    const examples = m.eth.ALL_FORMS.map((f) => m.exampleWord(f.audioKey, m.app.ALL_WORDS)).filter(Boolean)
    expectOwn(examples, 'Echo Match / Vowel Train example words')
  })

  it('every voiced game word has a recording of its own', () => {
    for (const w of m.app.WORDS) expect(hasClip(w.latin), `${w.geez} (${w.latin})`).toBe(true)
  })
})

describe('Word Bricks differs by language', () => {
  it('Tigrinya never gets the Amharic-only words, Amharic keeps its curated list', async () => {
    const ti = (await load('ti')).bw
    const am = (await load('am')).bw
    expect(am.BRICK_WORDS.length).toBe(28)
    expect(ti.BRICK_WORDS.length).toBeGreaterThanOrEqual(25)
    const amOnly = ['ጀልባ', 'ዶሮ', 'አንበሳ', 'ቡና', 'ዳቦ', 'ጫማ']
    const tiGeez = ti.BRICK_WORDS.map((w) => w.geez)
    for (const g of amOnly) expect(tiGeez, g).not.toContain(g)
    expect(ti.BRICK_WORDS.map((w) => w.latin)).toContain('lam-ti') // the Tigrinya cow recording, not the Amharic lam
    expect(am.BRICK_WORDS.map((w) => w.latin)).toContain('lam')
  })
})
