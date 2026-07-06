import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

function Boom() {
  throw new Error('boom')
}

afterEach(() => vi.restoreAllMocks())

describe('ErrorBoundary (crash protection)', () => {
  it('renders children normally when nothing throws', () => {
    render(
      <ErrorBoundary>
        <div>hello</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('catches a crash and shows a friendly retry instead of a white screen', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}) // silence React's error log
    const onReset = vi.fn()
    render(
      <ErrorBoundary onReset={onReset} title="Oops!">
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Oops!')).toBeInTheDocument()
    // The escape hatch calls onReset (go home) rather than a hard reload.
    fireEvent.click(screen.getByRole('button'))
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
