import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import type { Product } from '@jewelry/shared'
import messages from '../../../../../messages/en.json'
import { ProductCard } from '../product-card'

vi.mock('next-intl/server', () => ({
  getTranslations: async (namespaceOrOptions: string | { namespace: string; locale?: string }) => {
    const namespace =
      typeof namespaceOrOptions === 'string' ? namespaceOrOptions : namespaceOrOptions.namespace
    const ns = (messages as unknown as Record<string, Record<string, string>>)[namespace] ?? {}
    return (key: string, vars?: Record<string, unknown>) => {
      const raw = ns[key] ?? key
      return vars ? raw.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`)) : raw
    }
  },
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/features/cart/add-to-cart-button', () => ({
  AddToCartButton: ({ product }: { product: Product }) => (
    <button type="button" data-testid={`add-to-cart-${product.id}`}>
      Add to cart
    </button>
  ),
}))

vi.mock('@/components/features/wishlist/wishlist-button', () => ({
  WishlistButton: ({ productId }: { productId: string }) => (
    <button type="button" data-testid={`wishlist-${productId}`}>
      Wishlist
    </button>
  ),
}))

vi.mock('@/components/shared/display-price', () => ({
  DisplayPrice: ({ amountUsd }: { amountUsd: number }) => <span>${amountUsd.toFixed(2)}</span>,
}))

function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    title: 'Sterling Silver Ring',
    description: '',
    price: '49.99',
    stock: 1,
    images: ['/images/ring.jpg'],
    slug: 'sterling-silver-ring',
    sku: null,
    weight: null,
    material: null,
    avgRating: 0,
    reviewCount: 0,
    status: 'ACTIVE',
    stockType: 'IN_STOCK',
    productionDays: 0,
    lengthCm: null,
    widthCm: null,
    heightCm: null,
    diameterCm: null,
    weightGrams: null,
    beadSizeMm: null,
    categoryId: 'c1',
    category: { name: 'Rings', slug: 'rings' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/components/features')
  await $allureSubSuite('product-card')
  await $allureSeverity('normal')
})

describe('ProductCard', () => {
  it('renders the title as a link to /products/:slug', async () => {
    const jsx = await ProductCard({ product: buildProduct() })
    render(jsx)

    const titleLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/products/sterling-silver-ring')
    expect(titleLinks.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('heading', { name: /sterling silver ring/i })).toBeInTheDocument()
  })

  it('renders the product image with a descriptive alt', async () => {
    const jsx = await ProductCard({ product: buildProduct() })
    render(jsx)

    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('alt', expect.stringMatching(/sterling silver ring/i))
  })

  it('shows the "made on demand" badge with production days when stock = 0', async () => {
    const jsx = await ProductCard({
      product: buildProduct({ stock: 0, productionDays: 7, stockType: 'MADE_TO_ORDER' }),
    })
    render(jsx)

    expect(screen.getByText(/7/)).toBeInTheDocument()
  })

  it('renders both the wishlist + add-to-cart action buttons', async () => {
    const jsx = await ProductCard({ product: buildProduct({ id: 'p-actions' }) })
    render(jsx)

    expect(screen.getByTestId('wishlist-p-actions')).toBeInTheDocument()
    expect(screen.getByTestId('add-to-cart-p-actions')).toBeInTheDocument()
  })

  it('shows star rating + review count when avgRating > 0', async () => {
    const jsx = await ProductCard({
      product: buildProduct({ avgRating: 4.5, reviewCount: 12 }),
    })
    render(jsx)

    // (12) for review count
    expect(screen.getByText(/\(12\)/)).toBeInTheDocument()
  })

  it('falls back to a placeholder image when product.images is empty', async () => {
    const jsx = await ProductCard({ product: buildProduct({ images: [] }) })
    render(jsx)

    const image = screen.getByRole('img')
    expect(image.getAttribute('src')).toMatch(/placeholder-product\.jpg/)
  })
})
