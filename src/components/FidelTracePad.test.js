/* Tracing honesty: a zig-zag over the whole pad used to pass (coverage >= 0.5
   with a lenient stray check). Ink far from the letter now marks a scribble. */
import { describe, it, expect } from 'vitest'
import { computeTraceResult, computeTraceResultV2, densifyStrokes, outsideInk, TRACE_TOLERANCE, OUTSIDE_MAX } from './FidelTracePad'

// A letter-ish glyph mask on the 320px pad: a tall stem plus a top bar (like ተ).
const MASK = []
for (let y = 60; y <= 270; y += 6) for (let x = 150; x <= 172; x += 6) MASK.push([x, y])
for (let x = 80; x <= 240; x += 6) for (let y = 60; y <= 80; y += 6) MASK.push([x, y])

const careful = densifyStrokes([[[161, 62], [161, 270]], [[80, 70], [240, 70]]])
const wobbly = densifyStrokes([
  Array.from({ length: 30 }, (_, i) => [161 + (i % 2 ? 14 : -14), 62 + i * 7]),
  Array.from({ length: 24 }, (_, i) => [80 + i * 7, 70 + (i % 2 ? 12 : -12)]),
])
const zigzag = (() => {
  const pts = []
  for (let y = 10; y < 315; y += 12) { pts.push([5, y]); pts.push([315, y + 6]) }
  return densifyStrokes([pts])
})()

describe('trace scoring rejects scribbles', () => {
  it('a careful trace passes with stars and no outside ink', () => {
    const r = computeTraceResult(MASK, careful)
    expect(r.scribble).toBe(false)
    expect(r.outside).toBeLessThan(0.05)
    expect(r.stars).toBeGreaterThanOrEqual(2)
  })
  it('a wobbly but honest trace still passes', () => {
    const r = computeTraceResult(MASK, wobbly, { coverRadius: TRACE_TOLERANCE[1].cover, strayRadius: TRACE_TOLERANCE[1].stray })
    expect(r.outside).toBeLessThan(OUTSIDE_MAX)
    expect(r.stars).toBeGreaterThanOrEqual(1)
  })
  it('a zig-zag over the whole pad is a scribble: no stars, no pass, even at chapter 1', () => {
    const r = computeTraceResult(MASK, zigzag)
    expect(r.coverage).toBeGreaterThan(0.9) // it DOES cover the letter...
    expect(r.scribble).toBe(true) // ...but it is not a trace
    expect(r.stars).toBe(0)
    for (const ch of [1, 2, 3, 4]) {
      const v2 = computeTraceResultV2(MASK, [[161, 62], ...zigzag], ch, 'te')
      expect(v2.pass).toBe(false)
      expect(v2.cue).toBe('scribble')
    }
  })
  it('outsideInk is 0 for ink on the letter and ~1 for a filled pad', () => {
    expect(outsideInk(MASK, MASK, 34)).toBe(0)
    expect(outsideInk(MASK, zigzag, 34)).toBeGreaterThan(0.8)
  })
  it('densifyStrokes fills gaps inside a stroke but never bridges two strokes', () => {
    const d = densifyStrokes([[[0, 0], [20, 0]], [[100, 100]]], 4)
    expect(d.filter(([, y]) => y === 0).length).toBeGreaterThanOrEqual(5)
    expect(d.some(([x, y]) => x > 20 && x < 100 && y > 0 && y < 100)).toBe(false)
  })
})
