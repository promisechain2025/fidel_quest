import { expect } from 'vitest'

const LATIN = /[A-Za-z]/
const GLOSS = /=|\bsounds? like\b|\bmeans\b/i

/** Latin letters may appear on a brick screen ONLY inside the wooden guide
    sign (i18n text, English by default) - never beside fidel content:
    no transliteration (le, lu), no "sounds like" hint, no English gloss. */
export function expectGuideOnlyLatin(root, guideText) {
  const guide = root.querySelector('[data-testid="guide"]')
  expect(guide, 'guide sign is shown').toBeTruthy()
  if (guideText) expect(guide.textContent).toBe(guideText)
  // every fidel brick / slot / glyph carries only fidel (or pips): no Latin, digits or "="
  for (const el of root.querySelectorAll('.geez')) {
    expect(el.textContent, `fidel element shows only fidel: "${el.textContent}"`).not.toMatch(/[A-Za-z0-9=]/)
  }
  // outside the guide sign there is no Latin text at all
  const clone = root.cloneNode(true)
  clone.querySelector('[data-testid="guide"]')?.remove()
  expect(clone.textContent).not.toMatch(LATIN)
  expect(clone.textContent).not.toMatch(GLOSS)
  // the sign itself is a short instruction, not a gloss of the content
  expect(guide.textContent).not.toMatch(GLOSS)
  expect(guide.textContent.length).toBeLessThanOrEqual(40)
}
