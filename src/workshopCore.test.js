import { describe, it, expect } from 'vitest'
import { initWorkshop, workshopTransition, wordToKeys, unambiguousWords, Phase, WorkshopEvent } from './workshopCore'
import { INDEXES } from './platform/ethiopic'

const tap = (ctx, key) => workshopTransition(ctx, { type: WorkshopEvent.TAP, payload: { key } })
const WORD = { geez: 'ሰላም', latin: 'selam', meaning: 'peace', picture: '👋' }

describe('word workshop core', () => {
  it('maps a word to its ordered fidel keys, all real forms', () => {
    const keys = wordToKeys(WORD.geez)
    expect(keys).toHaveLength(3)
    for (const k of keys) expect(INDEXES.byAudioKey.has(k)).toBe(true)
  })

  it('is deterministic and the tray contains every target letter', () => {
    const a = initWorkshop(WORD, 42)
    const b = initWorkshop(WORD, 42)
    expect(a).toEqual(b)
    for (const k of a.target) expect(a.tray).toContain(k)
    expect(a.tray.length).toBeGreaterThanOrEqual(a.target.length)
  })

  it('builds the word by tapping its letters in order, then wins', () => {
    let ctx = initWorkshop(WORD, 7)
    for (let i = 0; i < ctx.target.length; i++) {
      const r = tap(ctx, ctx.target[i])
      expect(r.accepted, `step ${i}`).toBe(true)
      ctx = r.next
    }
    expect(ctx.phase).toBe(Phase.WIN)
    expect(ctx.placed).toBe(ctx.target.length)
  })

  it('rejects a wrong / out-of-order letter and changes nothing', () => {
    const ctx = initWorkshop(WORD, 3)
    const wrong = ctx.tray.find((k) => k !== ctx.target[0])
    const r = tap(ctx, wrong)
    expect(r.accepted).toBe(false)
    expect(r.next).toBe(ctx)
  })

  it('taps after a win are rejected; RESET rebuilds the same word', () => {
    let ctx = initWorkshop(WORD, 9)
    for (const k of ctx.target) ctx = tap(ctx, k).next
    expect(ctx.phase).toBe(Phase.WIN)
    expect(tap(ctx, ctx.target[0]).accepted).toBe(false)
    const reset = workshopTransition(ctx, { type: WorkshopEvent.RESET })
    expect(reset.accepted).toBe(true)
    expect(reset.next.word.latin).toBe('selam')
    expect(reset.next.phase).toBe(Phase.PLAY)
    expect(reset.next.placed).toBe(0)
  })
})

describe('unambiguousWords (Build without audio)', () => {
  it('drops a silent word whose picture another word shares, keeps voiced ones', () => {
    const words = [
      { geez: 'ዛፍ', picture: '🌳' },
      { geez: 'ሾላ', picture: '🌳', noAudio: true },
      { geez: 'ሌሊት', picture: '🌙', noAudio: true },
      { geez: 'ጨረቃ', picture: '🌙', noAudio: true },
      { geez: 'ማር', picture: '🍯' },
      { geez: 'ሻማ', picture: '🕯️', noAudio: true },
    ]
    expect(unambiguousWords(words).map((w) => w.geez)).toEqual(['ዛፍ', 'ማር', 'ሻማ'])
  })

  it('the real Build pool never shows a silent word with a shared picture', async () => {
    const { BUILDABLE } = await import('./components/WordWorkshop')
    const count = new Map()
    for (const w of BUILDABLE) count.set(w.picture, (count.get(w.picture) || 0) + 1)
    expect(BUILDABLE.length).toBeGreaterThan(10)
    expect(BUILDABLE.filter((w) => w.noAudio && count.get(w.picture) > 1)).toEqual([])
  })
})
