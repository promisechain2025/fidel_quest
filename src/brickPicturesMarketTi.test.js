import { describe, it, expect } from 'vitest'

// The Tigrinya pack is the app default, so its market stock needs brick art too.
describe('Word Market brick pictures (Tigrinya pack)', () => {
  it('every Tigrinya stock word has a brick picture', async () => {
    localStorage.setItem('fq.pack', 'ti')
    const { brickPicOf } = await import('./brickPictures')
    const core = await import('./wordMarketCore')
    const eth = await import('./platform/ethiopic')
    const words = eth.FIDEL_FAMILIES.flatMap((f, familyIndex) => (f.words || (f.word ? [f.word] : [])).map((w) => ({ ...w, familyIndex })))
    const stock = core.marketStock(words)
    expect(stock.length).toBeGreaterThan(30)
    for (const w of stock) expect(brickPicOf(w.geez), w.geez).toBeTruthy()
  })
})
