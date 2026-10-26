// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrickScreen, GameStage, FitBox, WoodTopBar, useShortScreen, useLandscapeShort } from './brickKit'

const rect = (w, h) => ({ top: 0, left: 0, right: w, bottom: h, width: w, height: h, x: 0, y: 0 })

function mockBox(w, h) {
  return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
    return this.dataset?.testid === 'fit' ? rect(w, h) : rect(0, 0)
  })
}

describe('FitBox (flexible brick layout)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('scales the block down to the room it has, never up', () => {
    mockBox(200, 100)
    render(<FitBox w={400} h={400} testId="fit"><i data-testid="kid" /></FitBox>)
    expect(Number(screen.getByTestId('fit').dataset.fit)).toBe(0.25)
    vi.restoreAllMocks()
    mockBox(1000, 1000)
    render(<FitBox w={400} h={400} testId="fit"><i /></FitBox>)
    expect(screen.getAllByTestId('fit').pop().dataset.fit).toBe('1')
  })

  it('keeps a floor so content is never scaled to nothing', () => {
    mockBox(10, 10)
    render(<FitBox w={400} h={400} min={0.3} testId="fit"><i /></FitBox>)
    expect(screen.getByTestId('fit').dataset.fit).toBe('0.3')
  })

  it('exposes the scale as --fit so a control can stay >= 44px on screen', () => {
    mockBox(200, 400)
    render(<FitBox w={400} h={400} testId="fit"><i /></FitBox>)
    expect(screen.getByTestId('fit').firstElementChild.style.getPropertyValue('--fit')).toBe('0.5')
  })
})

describe('shared brick shell', () => {
  it('marks tray games with data-side and puts the guide inside the in-flow head', () => {
    render(
      <BrickScreen testId="s" side>
        <GameStage head={<WoodTopBar onBack={() => {}} value={1} total={3} guide={<span data-testid="g">hi</span>} />}>
          <span data-testid="body-kid" />
        </GameStage>
      </BrickScreen>,
    )
    expect(screen.getByTestId('s').dataset.side).toBe('1')
    expect(screen.getByTestId('head').contains(screen.getByTestId('g'))).toBe(true)
    expect(screen.getByTestId('head').contains(screen.getByTestId('body-kid'))).toBe(false)
  })

  it('media hooks fall back to false where matchMedia is missing (jsdom)', () => {
    let out
    function Probe() { out = [useShortScreen(), useLandscapeShort()]; return null }
    render(<Probe />)
    expect(out).toEqual([false, false])
  })
})
