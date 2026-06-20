import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import { TopProductsTable } from '../top-products-table'
import * as adminApi from '@/lib/api/admin'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

vi.mock('@/lib/api/admin', () => ({
  fetchAdminTopProducts: vi.fn(),
}))

vi.mock('@/store/auth.store', () => ({
  useAuthStore: (selector: (state: { accessToken: string }) => unknown) =>
    selector({ accessToken: 'mock-token' }),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...props
  }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span data-testid="product-image" aria-label={alt} />,
}))

const mockFetchAdminTopProducts = vi.mocked(adminApi.fetchAdminTopProducts)

beforeEach(() => {
  vi.clearAllMocks()
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('top-products-table')
  await $allureSeverity('normal')
})

describe('TopProductsTable', () => {
  it('renders product rows ordered by revenue', async () => {
    mockFetchAdminTopProducts.mockResolvedValue([
      {
        productId: 'p1',
        slug: 'ring-a',
        title: 'Sterling Ring A',
        image: 'https://cdn.example/a.jpg',
        unitsSold: 4,
        revenueCents: 12000,
        avgRating: 4.5,
        reviewCount: 3,
      },
      {
        productId: 'p2',
        slug: 'ring-b',
        title: 'Sterling Ring B',
        image: null,
        unitsSold: 2,
        revenueCents: 8000,
        avgRating: 5,
        reviewCount: 1,
      },
    ])

    render(<TopProductsTable period="30d" />)

    expect(await screen.findByText('Sterling Ring A')).toBeInTheDocument()
    expect(screen.getByText('Sterling Ring B')).toBeInTheDocument()
    expect(screen.getByText('$120.00')).toBeInTheDocument()
    expect(screen.getByText('$80.00')).toBeInTheDocument()
    expect(screen.getByText('4 units')).toBeInTheDocument()
    expect(screen.getByText('2 units')).toBeInTheDocument()
  })

  it('renders empty state when there are no rows', async () => {
    mockFetchAdminTopProducts.mockResolvedValue([])

    render(<TopProductsTable period="30d" />)

    expect(await screen.findByText('No product sales in this period.')).toBeInTheDocument()
  })

  it('shows loading state until data arrives', () => {
    mockFetchAdminTopProducts.mockImplementation(() => new Promise(() => {}))

    render(<TopProductsTable period="30d" />)

    expect(screen.getByText('Loading top products…')).toBeInTheDocument()
  })

  it('passes period and limit to the API client', async () => {
    mockFetchAdminTopProducts.mockResolvedValue([])

    render(<TopProductsTable period="90d" limit={5} />)

    await screen.findByText('No product sales in this period.')
    expect(mockFetchAdminTopProducts).toHaveBeenCalledWith('90d', 5, 'mock-token')
  })

  it('links product title to the public product page', async () => {
    mockFetchAdminTopProducts.mockResolvedValue([
      {
        productId: 'p1',
        slug: 'ring-a',
        title: 'Sterling Ring A',
        image: null,
        unitsSold: 1,
        revenueCents: 5000,
        avgRating: 4,
        reviewCount: 2,
      },
    ])

    render(<TopProductsTable period="30d" />)

    const link = await screen.findByRole('link', { name: 'Sterling Ring A' })
    expect(link).toHaveAttribute('href', '/products/ring-a')
  })
})
