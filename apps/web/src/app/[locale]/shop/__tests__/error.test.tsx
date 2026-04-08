import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test-utils'
import CatalogError from '../error'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('CatalogError boundary', () => {
  it('renders generic error heading', () => {
    render(<CatalogError reset={vi.fn()} />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders catalog-specific error description', () => {
    render(<CatalogError reset={vi.fn()} />)
    expect(screen.getByText('Could not load products. Please try again.')).toBeInTheDocument()
  })

  it('renders retry button that calls reset', async () => {
    const { userEvent: user } = await import('@testing-library/user-event').then((m) => ({
      userEvent: m.default,
    }))
    const handleReset = vi.fn()
    render(<CatalogError reset={handleReset} />)

    await user.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(handleReset).toHaveBeenCalledOnce()
  })

  it('renders home link', () => {
    render(<CatalogError reset={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Go to homepage' })).toBeInTheDocument()
  })
})
