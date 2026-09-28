import { describe, it, expect } from 'vitest'
import {
  WordBuildPhase,
  FindPhase,
  EchoPhase,
  wordBuildInitial,
  wordBuildTransition,
  findFidelInitial,
  findFidelTransition,
  echoInitial,
  echoTransition,
} from './schoolPathDrillCore'

const hello = { geez: 'ሀሎ', meaningEn: 'hello', familyIds: ['ha', 'le'] }
const mama = { geez: 'ማማ', meaningEn: 'mom', familyIds: ['me'] }

const tapUntilBuilt = (ctx) => {
  let cur = ctx
  let guard = 0
  while (cur.phase === WordBuildPhase.PICK && guard++ < 12) {
    const want = [...cur.words[cur.wi].geez][cur.slot]
    const index = cur.tray.findIndex((t) => !t.used && t.ch === want)
    const r = wordBuildTransition(cur, { type: 'TILE', index })
    expect(r.correct).toBe(true)
    cur = r.next
  }
  return cur
}

describe('word build', () => {
  it('is a pure function of the seed', () => {
    const word = { geez: 'ሰላም', meaningEn: 'peace', familyIds: ['se', 'le', 'me'] }
    expect(wordBuildInitial([word], 7)).toEqual(wordBuildInitial([word], 7))
    const trays = new Set(
      Array.from({ length: 24 }, (_, i) => wordBuildInitial([word], i + 1).tray.map((t) => t.ch).join('')),
    )
    expect(trays.size).toBeGreaterThan(1)
  })

  it('never deals a two-letter word already in reading order', () => {
    for (let seed = 1; seed < 40; seed++) {
      const ctx = wordBuildInitial([hello], seed)
      expect(ctx.tray.map((t) => t.ch).join('')).not.toBe('ሀሎ')
    }
  })

  it('builds the word from syllable tiles and rejects a wrong tap', () => {
    let ctx = wordBuildInitial([hello], 3)
    expect(ctx.phase).toBe(WordBuildPhase.PICK)
    const want = [...hello.geez][0]
    const wrong = ctx.tray.findIndex((t) => t.ch !== want)
    const miss = wordBuildTransition(ctx, { type: 'TILE', index: wrong })
    expect(miss.correct).toBe(false)
    expect(miss.next.slot).toBe(0)
    expect(miss.next.phase).toBe(WordBuildPhase.PICK)
    expect(miss.next.tray[wrong].used).toBe(false)

    ctx = tapUntilBuilt(miss.next)
    expect(ctx.phase).toBe(WordBuildPhase.BUILT)
    expect(ctx.slot).toBe(2)
    expect(wordBuildTransition(ctx, { type: 'TILE', index: 0 }).advanced).toBe(false)

    const done = wordBuildTransition(ctx, { type: 'NEXT' })
    expect(done.next.phase).toBe(WordBuildPhase.DONE)
  })

  it('accepts either copy of a repeated syllable', () => {
    let ctx = wordBuildInitial([mama], 5)
    const first = wordBuildTransition(ctx, { type: 'TILE', index: 0 })
    expect(first.correct).toBe(true)
    ctx = first.next
    const second = ctx.tray.findIndex((t) => !t.used)
    const built = wordBuildTransition(ctx, { type: 'TILE', index: second })
    expect(built.next.phase).toBe(WordBuildPhase.BUILT)
  })

  it('walks to the next word only from the built word', () => {
    let ctx = wordBuildInitial([hello, mama], 4)
    expect(wordBuildTransition(ctx, { type: 'NEXT' }).next).toBe(ctx)
    ctx = tapUntilBuilt(ctx)
    const next = wordBuildTransition(ctx, { type: 'NEXT' }).next
    expect(next.phase).toBe(WordBuildPhase.PICK)
    expect(next.wi).toBe(1)
    expect(next.words[1].geez).toBe('ማማ')
  })

  it('starts finished when there is nothing to build', () => {
    expect(wordBuildInitial([], 1).phase).toBe(WordBuildPhase.DONE)
  })
})

describe('find the fidel', () => {
  const hello = { geez: 'ሀሎ', target: 'ሎ', index: 1, position: 'final', meaningEn: 'hello', familyId: 'le' }
  const sky = { geez: 'ሰማይ', target: 'ማ', index: 1, position: 'mid', meaningEn: 'sky', familyId: 'me' }

  it('rejects the first letter and accepts the hiding fidel', () => {
    let ctx = findFidelInitial([hello])
    expect(ctx.phase).toBe(FindPhase.HUNT)
    const miss = findFidelTransition(ctx, { type: 'TAP', index: 0 })
    expect(miss.correct).toBe(false)
    expect(miss.next.phase).toBe(FindPhase.HUNT)
    const hit = findFidelTransition(miss.next, { type: 'TAP', index: 1 })
    expect(hit.correct).toBe(true)
    expect(hit.next.phase).toBe(FindPhase.FOUND)
    expect(findFidelTransition(hit.next, { type: 'TAP', index: 1 }).advanced).toBe(false)
    expect(findFidelTransition(hit.next, { type: 'NEXT' }).next.phase).toBe(FindPhase.DONE)
  })

  it('advances to the next word after a correct tap', () => {
    let ctx = findFidelInitial([hello, sky])
    ctx = findFidelTransition(ctx, { type: 'TAP', index: 1 }).next
    ctx = findFidelTransition(ctx, { type: 'NEXT' }).next
    expect(ctx.phase).toBe(FindPhase.HUNT)
    expect(ctx.ti).toBe(1)
    expect(ctx.targets[1].geez).toBe('ሰማይ')
  })

  it('starts finished when the unit has no target', () => {
    expect(findFidelInitial([]).phase).toBe(FindPhase.DONE)
  })
})

describe('echo', () => {
  const heart = { geez: 'ሀሎ ልቢ።', meaningEn: 'Hello, heart.' }
  const mom = { geez: 'ማማ ማይ።', meaningEn: 'Mom, water.' }

  it('starts on the first authored line and does not skip ahead', () => {
    const ctx = echoInitial([heart, mom])
    expect(ctx.phase).toBe(EchoPhase.LISTEN)
    expect(ctx.li).toBe(0)
    expect(ctx.lines.map((l) => l.geez)).toEqual([heart.geez, mom.geez])
    expect(echoTransition(ctx, { type: 'NEXT' }).next).toBe(ctx)
    const again = echoTransition(ctx, { type: 'AGAIN' })
    expect(again.correct).toBe(true)
    expect(again.advanced).toBe(false)
    expect(again.next).toBe(ctx)
  })

  it('takes I said it, then the next line, then finishes', () => {
    let ctx = echoInitial([heart, mom])
    const said = echoTransition(ctx, { type: 'SAID' })
    expect(said.next.phase).toBe(EchoPhase.SAID)
    expect(echoTransition(said.next, { type: 'SAID' }).advanced).toBe(false)
    ctx = echoTransition(said.next, { type: 'NEXT' }).next
    expect(ctx.phase).toBe(EchoPhase.LISTEN)
    expect(ctx.li).toBe(1)
    expect(ctx.lines[1].geez).toBe(mom.geez)
    ctx = echoTransition(ctx, { type: 'SAID' }).next
    const done = echoTransition(ctx, { type: 'NEXT' })
    expect(done.next.phase).toBe(EchoPhase.DONE)
    expect(echoTransition(done.next, { type: 'NEXT' }).next).toBe(done.next)
    expect(echoTransition(done.next, { type: 'AGAIN' }).advanced).toBe(false)
  })

  it('starts finished when the unit has no echo line', () => {
    expect(echoInitial([]).phase).toBe(EchoPhase.DONE)
    expect(echoInitial([{ geez: '  ' }, null]).phase).toBe(EchoPhase.DONE)
  })
})
