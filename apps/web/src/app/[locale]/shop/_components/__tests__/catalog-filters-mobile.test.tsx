import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CatalogFiltersMobile } from '../catalog-filters-mobile'
import type { Category } from '@jewelry/shared'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/en/shop',
}))

// CatalogFilters uses useSearchParams internally — stub it to prevent hook errors
vi.mock('../catalog-filters', () => ({
  CatalogFilters: () => <div data-testid="catalog-filters-stub">Filters</div>,
}))

const mockCategories: Category[] = [
  { id: '1', name: 'Rings', slug: 'rings', description: null, imageUrl: null },
  { id: '2', name: 'Necklaces', slug: 'necklaces', description: null, imageUrl: null },
]

describe('CatalogFiltersMobile — trigger button', () => {
  it('renders the filters button', () => {
    render(<CatalogFiltersMobile categories={mockCategories} activeFiltersCount={0} />)
    expect(screen.getByRole('button', { name: /mobileFiltersButton/i })).toBeInTheDocument()
  })

  it('does not show the count badge when there are no active filters', () => {
    render(<CatalogFiltersMobile categories={mockCategories} activeFiltersCount={0} />)
    // Badge renders the count only when > 0
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('shows the active filter count badge when filters are applied', () => {
    render(<CatalogFiltersMobile categories={mockCategories} activeFiltersCount={3} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows a count of 1 for a single active filter', () => {
    render(<CatalogFiltersMobile categories={mockCategories} activeFiltersCount={1} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})

describe('CatalogFiltersMobile — sheet open/close', () => {
  beforeEach(() => {
    // Radix Sheet uses portals — ensure body is clean before each test
    document.body.innerHTML = ''
  })

  it('opens the filters sheet when the trigger button is clicked', () => {
    render(<CatalogFiltersMobile categories={mockCategories} activeFiltersCount={0} />)
    fireEvent.click(screen.getByRole('button', { name: /mobileFiltersButton/i }))
    expect(screen.getByText('mobileFiltersTitle')).toBeInTheDocument()
  })

  it('renders the CatalogFilters component inside the sheet', () => {
    render(<CatalogFiltersMobile categories={mockCategories} activeFiltersCount={0} />)
    fireEvent.click(screen.getByRole('button', { name: /mobileFiltersButton/i }))
    expect(screen.getByTestId('catalog-filters-stub')).toBeInTheDocument()
  })
})
