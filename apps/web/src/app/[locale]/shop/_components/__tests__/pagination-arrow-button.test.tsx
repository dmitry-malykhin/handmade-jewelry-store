import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PaginationArrowButton } from '../pagination-arrow-button'

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    'aria-label': ariaLabel,
    className,
  }: {
    children: React.ReactNode
    href: string
    'aria-label'?: string
    className?: string
  }) => (
    <a href={href} aria-label={ariaLabel} className={className}>
      {children}
    </a>
  ),
}))

describe('PaginationArrowButton — active (href provided)', () => {
  it('renders a link when href is provided', () => {
    render(<PaginationArrowButton href="/shop?page=2" ariaLabel="Next page" symbol="→" />)

    expect(screen.getByRole('link', { name: 'Next page' })).toBeInTheDocument()
  })

  it('link points to the provided href', () => {
    render(<PaginationArrowButton href="/shop?page=2" ariaLabel="Next page" symbol="→" />)

    expect(screen.getByRole('link', { name: 'Next page' })).toHaveAttribute('href', '/shop?page=2')
  })

  it('renders the ← symbol for the previous button', () => {
    render(<PaginationArrowButton href="/shop" ariaLabel="Previous page" symbol="←" />)

    expect(screen.getByRole('link', { name: 'Previous page' })).toHaveTextContent('←')
  })

  it('renders the → symbol for the next button', () => {
    render(<PaginationArrowButton href="/shop?page=3" ariaLabel="Next page" symbol="→" />)

    expect(screen.getByRole('link', { name: 'Next page' })).toHaveTextContent('→')
  })
})

describe('PaginationArrowButton — disabled (href is null)', () => {
  it('renders a span instead of a link when href is null', () => {
    render(<PaginationArrowButton href={null} ariaLabel="Previous page" symbol="←" />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('←')).toBeInTheDocument()
  })

  it('marks the span as aria-disabled="true"', () => {
    render(<PaginationArrowButton href={null} ariaLabel="Previous page" symbol="←" />)

    expect(screen.getByText('←')).toHaveAttribute('aria-disabled', 'true')
  })

  it('renders the → symbol as disabled when href is null', () => {
    render(<PaginationArrowButton href={null} ariaLabel="Next page" symbol="→" />)

    const disabledSpan = screen.getByText('→')
    expect(disabledSpan).toHaveAttribute('aria-disabled', 'true')
  })
})
