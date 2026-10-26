/* Quiz play view in the brick look: fidel bricks only (no Latin sound label,
   no gloss), guide text through i18n, and the same events the Lesson drives. */
import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen, fireEvent } from '@testing-library/react'
import BrickQuizPlay from './BrickQuizPlay'
import { expectGuideOnlyLatin as guideOnlyLatin } from './brickTestUtils'

// Anbessa / Kokeb carry an SVG <title> (an accessible name, not UI text).
const expectGuideOnlyLatin = (root, text) => {
  const clone = root.cloneNode(true)
  clone.querySelectorAll('title').forEach((n) => n.remove())
  guideOnlyLatin(clone, text)
}

const CHARS = { ha: 'ሀ', hu: 'ሁ', hi: 'ሂ', haa: 'ሃ' }
const formOf = (k) => ({ char: CHARS[k], sound: `LATIN-${k}` })
const question = { target: 'hu', options: ['ha', 'hu', 'hi', 'haa'] }
const base = { ctx: { cursor: 0, streak: 0, wrongPicks: [] }, question, progress: { answered: 2, total: 8 }, formOf, presenting: false, feedback: false }
const mount = (props = {}) => {
  const fns = { onQuit: vi.fn(), onPick: vi.fn(), onHear: vi.fn(), onContinue: vi.fn() }
  const view = render(<BrickQuizPlay {...base} status="ask" {...fns} {...props} />)
  return { ...view, ...fns }
}

describe('BrickQuizPlay', () => {
  it('asks with a guide sign, shows only fidel on the bricks and reports taps', () => {
    const { container, onPick, onHear, onQuit } = mount()
    expectGuideOnlyLatin(container, 'Tap the letter you hear')
    expect(container.textContent).not.toMatch(/LATIN/)
    expect(screen.getAllByRole('button', { name: /^[\u1200-\u137F]$/ })).toHaveLength(4)
    fireEvent.click(screen.getByRole('button', { name: 'ሁ' }))
    expect(onPick).toHaveBeenCalledWith('hu')
    fireEvent.click(screen.getByRole('button', { name: 'Hear it again' }))
    expect(onHear).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onQuit).toHaveBeenCalled()
  })

  it('shows the miss with shape + colour, dims a tried brick and offers Got it', () => {
    const { container, onContinue } = mount({ status: 'error', feedback: true, ctx: { cursor: 0, streak: 0, wrongPicks: ['ha'] } })
    expectGuideOnlyLatin(container, 'Not quite!')
    expect(screen.getByRole('button', { name: 'ሀ' })).toHaveAttribute('data-state', 'wrong')
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }))
    expect(onContinue).toHaveBeenCalled()
  })

  it('celebrates the right brick and a streak', () => {
    const { container } = mount({ status: 'success', feedback: true, ctx: { cursor: 0, streak: 3, wrongPicks: [] } })
    expectGuideOnlyLatin(container, 'Amazing! 3 in a row!')
    expect(screen.getByRole('button', { name: 'ሁ' })).toHaveAttribute('data-state', 'correct')
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
  })

  it('locks the bricks while the letter is being played', () => {
    mount({ status: 'ask', presenting: true })
    for (const b of screen.getAllByRole('button', { name: /^[\u1200-\u137F]$/ })) expect(b).toBeDisabled()
  })

  it('source never reads a Latin sound or hardcodes English', () => {
    const code = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'BrickQuizPlay.jsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(code).not.toMatch(/\.sound\b/)
    expect([...code.matchAll(/>\s*([A-Za-z][A-Za-z ,.!']{2,})\s*</g)]).toEqual([])
  })
})
