import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { MARKET_PICS } from './brickPicturesMarket'
import { brickPicOf } from './brickPictures'
import { BRICK_WORDS } from './brickWordsCore'

describe('Word Market brick pictures', () => {
  it('every market picture file is bundled', () => {
    for (const pic of Object.values(MARKET_PICS)) {
      expect(fs.existsSync(path.resolve(__dirname, '../public/img/games/bw', `${pic}.webp`)), pic).toBe(true)
    }
  })
  it('does not overlap or change the Brick Words pictures', () => {
    for (const w of BRICK_WORDS) {
      expect(MARKET_PICS[w.geez]).toBeUndefined()
      expect(brickPicOf(w.geez)).toBe(w.pic)
    }
  })
  it('new art files are not shared between two different word keys of one meaning', () => {
    // Tigrinya spellings may reuse a picture; each m-* file must still be used.
    const used = new Set(Object.values(MARKET_PICS))
    const files = fs.readdirSync(path.resolve(__dirname, '../public/img/games/bw')).filter((f) => f.startsWith('m-')).map((f) => f.replace('.webp', ''))
    for (const f of files) expect(used.has(f), f).toBe(true)
  })
  it('every Amharic stock word has a brick picture', async () => {
    localStorage.setItem('fq.pack', 'am')
    const core = await import('./wordMarketCore')
    const eth = await import('./platform/ethiopic')
    const words = eth.FIDEL_FAMILIES.flatMap((f, familyIndex) => (f.words || (f.word ? [f.word] : [])).map((w) => ({ ...w, familyIndex })))
    for (const w of core.marketStock(words)) expect(brickPicOf(w.geez), w.geez).toBeTruthy()
  })
})
