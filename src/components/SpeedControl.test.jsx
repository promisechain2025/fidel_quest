import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SpeedControl from './SpeedControl'
import { Explore } from '../FidelQuestApp'
import FidelMaster from './FidelMaster'

describe('SpeedControl (icon-only tortoise / normal / rabbit)', () => {
  it('shows three icon buttons and no visible words', () => {
    const { container } = render(<SpeedControl value="normal" onChange={() => {}} />)
    const btns = screen.getAllByRole('button')
    expect(btns).toHaveLength(3)
    btns.forEach((b) => {
      expect(b.textContent).toBe('')
      expect(b.querySelector('svg')).toBeTruthy()
      expect(b.getAttribute('aria-label')).toBeTruthy()
    })
    expect(container.textContent).toBe('')
    expect(btns.map((b) => b.getAttribute('aria-label'))).toEqual(['Slow', 'Normal speed', 'Fast'])
  })

  it('marks only the current stop and reports the picked name', () => {
    const onChange = vi.fn()
    const { rerender } = render(<SpeedControl value="normal" onChange={onChange} />)
    expect(screen.getByLabelText('Normal speed')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Slow')).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByLabelText('Slow'))
    fireEvent.click(screen.getByLabelText('Fast'))
    expect(onChange.mock.calls.map((c) => c[0])).toEqual(['slow', 'fast'])
    rerender(<SpeedControl value="fast" onChange={onChange} />)
    expect(screen.getByTestId('speed-control')).toHaveAttribute('data-speed', 'fast')
  })

  it('falls back to the middle stop for an unknown value', () => {
    render(<SpeedControl value="warp" onChange={() => {}} />)
    expect(screen.getByTestId('speed-control')).toHaveAttribute('data-speed', 'slow')
  })

  it('Explorer: replaces the Slow/Normal/Fast words with the icon control, default normal', async () => {
    localStorage.clear()
    render(<Explore soundOn onBack={() => {}} />)
    const ctl = await screen.findByTestId('explore-pace')
    expect(ctl).toHaveAttribute('data-speed', 'normal')
    expect(screen.queryByText(/^(Slow|Normal|Fast)$/)).toBeNull()
    fireEvent.click(screen.getByTestId('explore-pace-fast'))
    await waitFor(() => expect(screen.getByTestId('explore-pace')).toHaveAttribute('data-speed', 'fast'))
  })

  it('Fidel Master keeps its own default (slow) and shows the icon control', async () => {
    localStorage.clear()
    render(<FidelMaster onBack={() => {}} soundOn={false} />)
    fireEvent.click(screen.getByRole('button', { name: /Auto-voice/i }))
    const ctl = await screen.findByTestId('master-speed')
    expect(ctl).toHaveAttribute('data-speed', 'slow')
    expect(ctl.textContent).toBe('')
    fireEvent.click(screen.getByTestId('master-speed-normal'))
    await waitFor(() => expect(screen.getByTestId('master-speed')).toHaveAttribute('data-speed', 'normal'))
  })
})
