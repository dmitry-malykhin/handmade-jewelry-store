import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

import * as Sentry from '@sentry/nextjs'
import GlobalError from '../global-error'

describe('GlobalError', () => {
  const mockReset = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders error heading and message', () => {
    render(<GlobalError error={new Error('boom')} reset={mockReset} />)

    expect(screen.getByRole('heading')).toHaveTextContent('Something went wrong')
    expect(screen.getByText(/our team has been notified/i)).toBeInTheDocument()
  })

  it('renders a retry button', () => {
    render(<GlobalError error={new Error('boom')} reset={mockReset} />)

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('calls reset when retry button is clicked', () => {
    render(<GlobalError error={new Error('boom')} reset={mockReset} />)

    fireEvent.click(screen.getByRole('button', { name: /try again/i }))

    expect(mockReset).toHaveBeenCalledTimes(1)
  })

  it('reports the error to Sentry on mount', () => {
    const testError = new Error('test error')
    render(<GlobalError error={testError} reset={mockReset} />)

    expect(Sentry.captureException).toHaveBeenCalledWith(testError)
    expect(Sentry.captureException).toHaveBeenCalledTimes(1)
  })

  it('shows the error digest when present', () => {
    const errorWithDigest = Object.assign(new Error('boom'), { digest: 'abc123' })
    render(<GlobalError error={errorWithDigest} reset={mockReset} />)

    expect(screen.getByText(/abc123/)).toBeInTheDocument()
  })

  it('does not show error ID section when digest is absent', () => {
    render(<GlobalError error={new Error('boom')} reset={mockReset} />)

    expect(screen.queryByText(/error id/i)).not.toBeInTheDocument()
  })
})
