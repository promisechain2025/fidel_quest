import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import RepCodeCard from './RepCodeCard'

const KEEP = 'Keep this code. You can use it again if you change phone (up to 2 devices).'
const ETHIOPIC = /[\u1200-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/
const enter = () => {
  fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'EGR-CET01-ABCD-EFGH' } })
  fireEvent.click(screen.getByTestId('rep-code-submit'))
}

describe('rep code restore wording', () => {
  beforeEach(() => localStorage.clear())
  it('success shows the keep-your-code note', async () => {
    const { container } = render(<RepCodeCard available redeem={async () => ({ ok: true, pkg: 'core' })} />)
    expect(screen.queryByTestId('rep-keep-code')).toBeNull()
    enter()
    await waitFor(() => expect(screen.getByTestId('rep-keep-code').textContent).toBe(KEEP))
    expect(container.textContent).not.toMatch(ETHIOPIC)
  })
  it('over the device limit shows the clear message', async () => {
    render(<RepCodeCard available redeem={async () => ({ ok: false, reason: 'devices' })} />)
    enter()
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('This code is already used on 2 devices. Contact your representative.'))
  })
  it('representatives page carries the same note', () => {
    expect(readFileSync(resolve(process.cwd(), 'public/representatives.html'), 'utf8')).toContain(KEEP)
  })
})
