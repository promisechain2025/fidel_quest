/* ማማ reads the same two stores as the rest of the app and never writes them.
   fq.pack is the learn language (Amharic or Tigrinya). fq.lang is the UI text. */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

vi.mock('./platform/audioEngine', async (importOriginal) => {
  const real = await importOriginal()
  real.audio.play = () => {}
  return { ...real, playForm: () => {}, playEffect: () => {} }
})

import MamaPreview from './components/MamaPreview'
import { getActivePackId } from './platform/ethiopic'
import { getLang, t } from './platform/i18n'
import { mamaPools, initRound, mamaTransition, nearestSiblings, packIndex } from './mamaCore'
import { addBuilding, rememberSpeed } from './mamaSave'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)))

beforeEach(() => localStorage.clear())

function keep(pack, lang) {
  localStorage.setItem('fq.pack', pack)
  localStorage.setItem('fq.lang', lang)
}

describe('ማማ language selection', () => {
  it('reads the learn pack and the UI language from the same stores as the other games', () => {
    keep('ti', 'fr')
    expect(getActivePackId()).toBe('ti')
    expect(getLang()).toBe('fr')
    render(<MamaPreview still />)
    const root = screen.getByTestId('mama-preview')
    expect(root.getAttribute('data-pack')).toBe('ti')
    expect(root.getAttribute('data-lang')).toBe(getLang())
    expect(screen.getByTestId('guide').textContent).toBe(t('mamaPick', 'Pick a tower'))
    const sample = document.querySelector('[data-testid="mama-level-1"] img')
    expect(sample.getAttribute('src')).toContain(mamaPools('ti')[1][0].pic)
  })

  it('uses that pack for the word, its recording, and the decoy letters', () => {
    const am = mamaPools('am')
    const ti = mamaPools('ti')
    expect(ti[1].map((w) => w.geez)).not.toEqual(am[1].map((w) => w.geez))
    for (const w of [...ti[1], ...ti[2], ...ti[3]]) {
      expect([`words/${w.latin}`, `words/${w.latin}-ti`]).toContain(w.clip)
      for (const letter of w.letters) {
        expect(packIndex('ti').byChar.get(letter.char).audioKey).toBe(letter.key)
      }
    }
    let state = initRound(1, 3, ti[1], 'ti')
    let guard = 0
    while (state.brick?.role !== 'decoy' && guard < 6) {
      state = mamaTransition(state, 'bin').state
      state = mamaTransition(state, 'settle').state
      guard += 1
    }
    expect(state.brick.role).toBe('decoy')
    const need = state.letters[state.placed]
    const decoy = packIndex('ti').byChar.get(state.brick.char)
    expect(decoy.familyId).toBe(packIndex('ti').byChar.get(need.char).familyId)
    expect(decoy.audioKey).toBe(state.brick.key)
    expect(nearestSiblings(need.char, state.letters.map((l) => l.char), 6, 'ti')).toContain(state.brick.char)
    expect(state.letters.map((l) => l.char)).not.toContain(state.brick.char)

    keep('ti', 'de')
    render(<MamaPreview scene="play" seed={4} still />)
    const word = screen.getByTestId('mama-preview').getAttribute('data-word')
    expect(ti[1].some((w) => w.geez === word)).toBe(true)
    expect(am[1].some((w) => w.geez === word)).toBe(false)
  })

  it('keeps a language chosen elsewhere when ማማ opens', () => {
    keep('am', 'en')
    const first = render(<MamaPreview still />)
    expect(screen.getByTestId('mama-preview').getAttribute('data-pack')).toBe('am')
    const amPic = document.querySelector('[data-testid="mama-level-1"] img').getAttribute('src')
    first.unmount()

    keep('ti', 'sv')
    render(<MamaPreview still />)
    expect(getActivePackId()).toBe('ti')
    expect(getLang()).toBe('sv')
    expect(screen.getByTestId('mama-preview').getAttribute('data-pack')).toBe('ti')
    expect(screen.getByTestId('mama-preview').getAttribute('data-lang')).toBe('sv')
    const tiPic = document.querySelector('[data-testid="mama-level-1"] img').getAttribute('src')
    expect(tiPic).not.toBe(amPic)
    expect(localStorage.getItem('fq.pack')).toBe('ti')
    expect(localStorage.getItem('fq.lang')).toBe('sv')
  })

  it('does not change the language when you leave ማማ', () => {
    keep('ti', 'nl')
    const back = vi.fn()
    const view = render(<MamaPreview still onBack={back} />)
    fireEvent.click(screen.getByTestId('mama-level-2'))
    fireEvent.click(screen.getByLabelText('Back'))
    expect(back).not.toHaveBeenCalled()
    expect(screen.getByTestId('guide').textContent).toBe(t('mamaPick', 'Pick a tower'))
    fireEvent.click(screen.getByLabelText('Back'))
    expect(back).toHaveBeenCalledTimes(1)
    view.unmount()
    expect(localStorage.getItem('fq.pack')).toBe('ti')
    expect(localStorage.getItem('fq.lang')).toBe('nl')
  })

  it('saving the city and the speed does not touch the language settings', () => {
    keep('ti', 'it')
    rememberSpeed('fast')
    addBuilding('anbesa')
    render(<MamaPreview scene="play" seed={4} still />)
    fireEvent.click(screen.getByTestId('mama-fall'))
    fireEvent.click(screen.getByTestId('mama-bin'))
    fireEvent.click(screen.getByTestId('mama-fall'))
    fireEvent.click(screen.getByTestId('mama-slot'))
    expect(localStorage.getItem('fq.pack')).toBe('ti')
    expect(localStorage.getItem('fq.lang')).toBe('it')
    const saved = JSON.parse(localStorage.getItem('fq.mama.v1'))
    expect(saved.city.length).toBeGreaterThan(0)
    expect(saved.speed).toBe('fast')
    const saveSrc = fs.readFileSync(path.join(SRC, 'mamaSave.js'), 'utf8')
    expect(saveSrc).not.toMatch(/fq\.pack|fq\.lang|setActivePack|setLang/)
    const uiSrc = fs.readFileSync(path.join(SRC, 'components/MamaPreview.jsx'), 'utf8')
    expect(uiSrc).not.toMatch(/setActivePack|setLang/)
  })
})
