import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import WebTrialPaywall from './WebTrialPaywall'

describe('WebTrialPaywall', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('shows the kid message and keeps store links behind the grown-up gate', () => {
    render(<WebTrialPaywall onClose={() => {}} onUnlocked={() => {}} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Time to ask a grown-up')).toBeInTheDocument()
    expect(screen.getByText(/three visits with eGeez/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'App Store' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Google Play' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/unlock code/i)).not.toBeInTheDocument()
    expect(screen.getByText(/This part is for grown-ups/)).toBeInTheDocument()
  })
})