import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import type * as ProductsApiModule from '@/lib/api/products'
import { SearchResults } from '../search-results'

const searchProductsMock = vi.fn()
const routerReplaceMock = vi.fn()

vi.mock('@/lib/api/products', async () => {
  const actual = await vi.importActual<typeof ProductsApiModule>('@/lib/api/products')
  return { ...actual, searchProducts: (...args: unknown[]) => searchProductsMock(...args) }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplaceMock }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: React.ReactNode
  } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

function buildProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-1',
    slug: 'silver-ring',
    title: 'Sterling Silver Moonstone Ring',
    description: 'Handmade silver ring',
    price: '49.99',
    stock: 1,
    stockType: 'IN_STOCK' as const,
    productionDays: 0,
    images: ['/img.jpg'],
    sku: 'RING-001',
    material: 'Silver',
    avgRating: 0,
    reviewCount: 0,
    status: 'ACTIVE',
    category: { name: 'Rings', slug: 'rings' },
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

describe('SearchResults', () => {
  beforeEach(() => {
    searchProductsMock.mockReset()
    routerReplaceMock.mockReset()
  })

  it('shows the no-query hint when input is empty', () => {
    render(<SearchResults initialQuery="" />)
    expect(screen.getByText(/Type to start searching the catalog/i)).toBeInTheDocument()
  })

  it('fetches results after debounce and renders product cards', async () => {
    searchProductsMock.mockResolvedValueOnce([buildProduct()])

    render(<SearchResults initialQuery="" />)

    await userEvent.type(screen.getByLabelText(/Search products/i), 'silver')

    await waitFor(() => expect(searchProductsMock).toHaveBeenCalledWith('silver'), {
      timeout: 2000,
    })
    await waitFor(() => expect(screen.getByText(/1 match/i)).toBeInTheDocument())
    // Product title rendered (split into highlight segments — assert via the link href instead)
    const productLink = screen.getByRole('link', { name: /Sterling Silver Moonstone Ring/i })
    expect(productLink).toHaveAttribute('href', expect.stringContaining('silver-ring'))
  })

  it('shows no-results message + Browse-all link when no products match', async () => {
    searchProductsMock.mockResolvedValueOnce([])

    render(<SearchResults initialQuery="zzznothing" />)

    await waitFor(() => expect(searchProductsMock).toHaveBeenCalledWith('zzznothing'))
    await waitFor(() =>
      expect(screen.getByText(/No results for "zzznothing"/i)).toBeInTheDocument(),
    )
    expect(screen.getByRole('link', { name: /Browse all products/i })).toBeInTheDocument()
  })

  it('renders highlighted match marks for the searched term inside product titles', async () => {
    searchProductsMock.mockResolvedValueOnce([buildProduct()])

    render(<SearchResults initialQuery="silver" />)

    // <mark> elements wrap the matching substring inside the title
    const marks = await screen.findAllByText(/silver/i, { selector: 'mark' })
    expect(marks.length).toBeGreaterThan(0)
  })

  it('updates the URL via router.replace when input changes (debounced)', async () => {
    searchProductsMock.mockResolvedValue([])

    render(<SearchResults initialQuery="" />)

    await userEvent.type(screen.getByLabelText(/Search products/i), 'ring')

    await waitFor(
      () => expect(routerReplaceMock).toHaveBeenCalledWith('?q=ring', { scroll: false }),
      { timeout: 2000 },
    )
  })
})
