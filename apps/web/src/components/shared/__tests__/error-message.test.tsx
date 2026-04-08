import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { ErrorMessage } from '../error-message'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('ErrorMessage', () => {
  it('renders generic heading', () => {
    render(<ErrorMessage />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<ErrorMessage description="Could not load products." />)
    expect(screen.getByText('Could not load products.')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    const { container } = render(<ErrorMessage />)
    const paragraphs = container.querySelectorAll('p')
    // Only the heading paragraph, no description
    expect(paragraphs).toHaveLength(1)
  })

  it('renders retry button when onRetry is provided', () => {
    render(<ErrorMessage onRetry={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('does not render retry button when onRetry is not provided', () => {
    render(<ErrorMessage />)
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup()
    const handleRetry = vi.fn()

    render(<ErrorMessage onRetry={handleRetry} />)
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(handleRetry).toHaveBeenCalledOnce()
  })

  it('renders home link when showHomeLink is true', () => {
    render(<ErrorMessage showHomeLink />)
    expect(screen.getByRole('link', { name: 'Go to homepage' })).toBeInTheDocument()
  })

  it('does not render home link by default', () => {
    render(<ErrorMessage />)
    expect(screen.queryByRole('link', { name: 'Go to homepage' })).not.toBeInTheDocument()
  })

  it('has role="alert" for screen reader announcement', () => {
    render(<ErrorMessage />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
