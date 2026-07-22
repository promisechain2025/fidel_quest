import { describe, it, expect, beforeEach } from 'vitest'
import { placementWindows, buildPlacementQueue, placementCut, applyPlacement, WINDOW_SIZE, QUESTIONS_PER_FAMILY } from './placement'
import { FIDEL_FAMILIES } from './ethiopic'
import { JOURNEY, NodeKind, loadJourney, nextNode } from '../journey'

beforeEach(() => localStorage.clear())

const ids = FIDEL_FAMILIES.map((f) => f.id)

describe('placement ladder', () => {
  it('windows tile the journey order completely and in order', () => {
    const windows = placementWindows()
    expect(windows.flat()).toEqual(ids)
    for (const w of windows.slice(0, -1)) expect(w).toHaveLength(WINDOW_SIZE)
  })

  it('a window check covers the window, targets and options in scope, twins never doubled by ear', () => {
    const w = placementWindows()[0] // ha le hha me - ha/hha share a sound
    const queue = buildPlacementQueue(77, w)
    // Two questions per distinct SOUND: twin families cannot fairly be
    // separate listen-targets, so 3 unique sounds x 2 orders here.
    expect(queue.length).toBeGreaterThanOrEqual(w.length + 2)
    expect(queue.length).toBeLessThanOrEqual(w.length * QUESTIONS_PER_FAMILY)
    for (const q of queue) {
      expect(w).toContain(q.target.split('-')[0])
      for (const opt of q.options) expect(w).toContain(opt.split('-')[0])
    }
  })

  it('the check is a pure function of its seed', () => {
    const w = placementWindows()[1]
    expect(buildPlacementQueue(123, w)).toEqual(buildPlacementQueue(123, w))
    expect(JSON.stringify(buildPlacementQueue(123, w))).not.toEqual(JSON.stringify(buildPlacementQueue(124, w)))
  })
})

describe('crediting', () => {
  it('cuts at the first LEARN of an unplaced family', () => {
    const cut = placementCut(['ha', 'le', 'hha', 'me'])
    const node = JOURNEY[cut]
    expect(node.kind).toBe(NodeKind.LEARN)
    expect(node.familyId).toBe(ids[4])
    // every node before the cut involves only placed families
    for (const n of JOURNEY.slice(0, cut)) {
      if (n.kind === NodeKind.LEARN) expect(['ha', 'le', 'hha', 'me']).toContain(n.familyId)
    }
  })

  it('placing every family still stops before the vowel-orders lap', () => {
    const cut = placementCut(ids)
    expect(JOURNEY[cut].vowel).toBe(true)
    expect(cut).toBeLessThan(JOURNEY.length)
  })

  it('applyPlacement completes the prefix with 2 stars + wearables and moves the path', () => {
    const credited = applyPlacement(['ha', 'le', 'hha', 'me'])
    expect(credited).toBeGreaterThan(0)
    const p = loadJourney()
    const cut = placementCut(['ha', 'le', 'hha', 'me'])
    for (const n of JOURNEY.slice(0, cut)) {
      expect(p.done[n.id], n.id).toBeTruthy()
      expect(p.done[n.id].stars).toBe(2)
      expect(p.done[n.id].placed).toBe(true)
    }
    expect(p.collection.owned.length).toBeGreaterThan(0)
    expect(nextNode(p).id).toBe(JOURNEY[cut].id)
  })

  it('re-applying is idempotent and never downgrades played nodes', () => {
    applyPlacement(['ha', 'le'])
    const p1 = loadJourney()
    p1.done[JOURNEY[0].id] = { stars: 3 } // pretend the child replayed to 3 stars
    localStorage.setItem('fq.journey.v1', JSON.stringify(p1))
    const credited = applyPlacement(['ha', 'le'])
    expect(credited).toBe(0)
    expect(loadJourney().done[JOURNEY[0].id].stars).toBe(3)
  })
})
