import { describe, it, expect } from 'vitest'
import { initBingo, bingoTransition, currentCall, linesFor, dealCard, toggleMark, initCaller, callNext, lastCalled, patternWin, PATTERNS, encodeBingoConfig, decodeBingoConfig, Phase, BingoEvent } from './bingoCore'

const POOL = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l']
const daub = (ctx, index) => bingoTransition(ctx, { type: BingoEvent.DAUB, payload: { index } })

describe('kokeb bingo core', () => {
  it('linesFor(3) yields 3 rows + 3 cols + 2 diagonals, all valid', () => {
    const lines = linesFor(3)
    expect(lines).toHaveLength(8)
    expect(lines).toContainEqual([0, 1, 2])
    expect(lines).toContainEqual([0, 3, 6])
    expect(lines).toContainEqual([0, 4, 8])
    expect(lines).toContainEqual([2, 4, 6])
    for (const ln of lines) expect(ln.every((c) => c >= 0 && c < 9)).toBe(true)
  })

  it('builds a distinct 3x3 card with a full call order (deterministic)', () => {
    const a = initBingo(11, POOL)
    const b = initBingo(11, POOL)
    expect(a).toEqual(b)
    expect(a.card).toHaveLength(9)
    expect(new Set(a.card).size).toBe(9)
    expect([...a.callOrder].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('only the called cell can be daubed; wrong or repeat taps are rejected', () => {
    const ctx = initBingo(5, POOL)
    const called = currentCall(ctx)
    const other = [0, 1, 2, 3, 4, 5, 6, 7, 8].find((i) => i !== called)
    expect(daub(ctx, other).accepted).toBe(false) // not the called cell
    const r = daub(ctx, called)
    expect(r.accepted).toBe(true)
    expect(r.next.marked[called]).toBe(true)
    expect(daub(r.next, called).accepted).toBe(false) // already daubed
  })

  it('completing a line ends the game with that line recorded', () => {
    let ctx = initBingo(8, POOL)
    let won = null
    for (let step = 0; step < 9 && ctx.phase === Phase.PLAY; step++) {
      const r = daub(ctx, currentCall(ctx))
      expect(r.accepted).toBe(true)
      ctx = r.next
      if (r.won) { won = r; break }
    }
    expect(ctx.phase).toBe(Phase.WIN)
    expect(ctx.winLine).not.toBeNull()
    expect(ctx.winLine.every((c) => ctx.marked[c])).toBe(true)
    expect(currentCall(ctx)).toBeNull()
    expect(daub(ctx, 0).accepted).toBe(false) // no daubs after the win
  })

  it('RESET deals a fresh card and restarts', () => {
    let ctx = initBingo(3, POOL)
    while (ctx.phase === Phase.PLAY) ctx = daub(ctx, currentCall(ctx)).next
    const r = bingoTransition(ctx, { type: BingoEvent.RESET })
    expect(r.accepted).toBe(true)
    expect(r.next.phase).toBe(Phase.PLAY)
    expect(r.next.marked.every((m) => m === false)).toBe(true)
  })

  it('falls back to repeats when the pool is smaller than the card', () => {
    const ctx = initBingo(2, ['a', 'b', 'c'])
    expect(ctx.card).toHaveLength(9)
    // still fully playable to a win
    let c = ctx
    while (c.phase === Phase.PLAY) c = daub(c, currentCall(c)).next
    expect(c.phase).toBe(Phase.WIN)
  })
})

describe('class bingo (teacher-called)', () => {
  const POOL16 = Array.from({ length: 16 }, (_, i) => `k${i}`)

  it('deals distinct cards drawn from the shared pool; different seeds differ', () => {
    const a = dealCard(POOL16, 100)
    const b = dealCard(POOL16, 999)
    expect(a.card).toHaveLength(9)
    expect(new Set(a.card).size).toBe(9) // distinct within a card
    expect(a.card.every((k) => POOL16.includes(k))).toBe(true) // subset of the pool
    expect(a.card).not.toEqual(b.card) // two kids get different cards
    expect(dealCard(POOL16, 100).card).toEqual(a.card) // but seeded/deterministic
  })

  it('self-marking toggles cells and wins on a completed row', () => {
    let s = dealCard(POOL16, 7)
    s = toggleMark(s, 0)
    expect(s.marked[0]).toBe(true)
    s = toggleMark(s, 0) // toggle back off (mis-tap recovery)
    expect(s.marked[0]).toBe(false)
    s = toggleMark(toggleMark(toggleMark(s, 0), 1), 2) // fill the top row
    expect(s.phase).toBe(Phase.WIN)
    expect(s.winLine).toEqual([0, 1, 2])
  })

  it('honors the winning pattern the teacher chose', () => {
    const on = (idxs) => { const m = Array(9).fill(false); idxs.forEach((i) => { m[i] = true }); return m }
    // a full top row wins 'line' but NOT 'diagonal'/'x'/'corners'/'blackout'
    expect(patternWin(on([0, 1, 2]), 3, 'line')).toEqual([0, 1, 2])
    expect(patternWin(on([0, 1, 2]), 3, 'diagonal')).toBeNull()
    // one diagonal wins 'diagonal' but 'x' needs both
    expect(patternWin(on([0, 4, 8]), 3, 'diagonal')).toEqual([0, 4, 8])
    expect(patternWin(on([0, 4, 8]), 3, 'x')).toBeNull()
    expect(patternWin(on([0, 4, 8, 2, 6]), 3, 'x')).toEqual(expect.arrayContaining([0, 2, 4, 6, 8]))
    // corners + blackout
    expect(patternWin(on([0, 2, 6, 8]), 3, 'corners')).toEqual([0, 2, 6, 8])
    expect(patternWin(on([0, 1, 2, 3, 4, 5, 6, 7, 8]), 3, 'blackout')).toHaveLength(9)
    expect(patternWin(on([0, 1, 2, 3, 4, 5, 6, 7]), 3, 'blackout')).toBeNull()
  })

  it('a dealt card carries its pattern and wins only on that pattern', () => {
    let s = dealCard(POOL16, 5, 3, 'corners')
    expect(s.pattern).toBe('corners')
    s = toggleMark(toggleMark(toggleMark(s, 0), 1), 2) // a full top row
    expect(s.phase).toBe(Phase.PLAY) // not corners, keep going
    s = dealCard(POOL16, 5, 3, 'corners')
    ;[0, 2, 6, 8].forEach((i) => { s = toggleMark(s, i) })
    expect(s.phase).toBe(Phase.WIN)
    expect(s.winLine).toEqual([0, 2, 6, 8])
  })

  it('encodes and decodes the teacher config (letters + pattern) URL-safely', () => {
    const cfg = { families: [3, 1, 12, 7, 20, 0], pattern: 'x' }
    const code = encodeBingoConfig(cfg)
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/) // URL/QR safe, no +/=
    const back = decodeBingoConfig(code)
    expect(back.families).toEqual([0, 1, 3, 7, 12, 20]) // sorted, same set
    expect(back.pattern).toBe('x')
    expect(PATTERNS).toContain(back.pattern)
    expect(decodeBingoConfig('not valid!!')).toBeNull()
    expect(decodeBingoConfig(encodeBingoConfig({ families: [1], pattern: 'bogus' })).pattern).toBe('line') // bad pattern -> line
  })

  it('the caller runs the whole pool once, in order, tracking a called list', () => {
    let c = initCaller(POOL16, 42)
    expect(c.order).toHaveLength(16)
    expect(new Set(c.order)).toEqual(new Set(POOL16))
    expect(lastCalled(c)).toBeNull()
    const first = c.order[0]
    c = callNext(c)
    expect(c.called).toEqual([first])
    expect(lastCalled(c)).toBe(first)
    for (let i = 0; i < 20; i++) c = callNext(c) // past the end is a no-op
    expect(c.called).toHaveLength(16)
    expect(new Set(c.called)).toEqual(new Set(POOL16))
  })
})
