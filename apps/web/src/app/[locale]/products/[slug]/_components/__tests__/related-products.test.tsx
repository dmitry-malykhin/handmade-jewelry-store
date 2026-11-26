import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import { RelatedProducts } from '../related-products'
import type { Product } from '@jewelry/shared'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string, params?: Record<string, string>) => {
    if (key === 'relatedProductsCategoryHeading') return `More from ${params?.category ?? ''}`
    if (key === 'relatedProductsFallbackHeading') return 'You may also like'
    return key
  }),
}))

vi.mock('@/lib/api/products', () => ({
  fetchProducts: vi.fn(),
}))

vi.mock('@/components/features/catalog/product-card', () => ({
  ProductCard: ({ product }: { product: Product }) => (
    <div data-testid="product-card" data-slug={product.slug}>
      {product.title}
    </div>
  ),
}))

import { fetchProducts } from '@/lib/api/products'

const mockFetchProducts = vi.mocked(fetchProducts)

const buildProduct = (slug: string, title: string): Product =>
  ({
    id: `id-${slug}`,
    slug,
    title,
    price: '49.99',
    description: '',
    images: [],
    stock: 1,
    stockType: 'IN_STOCK',
    productionDays: 0,
    status: 'ACTIVE',
    material: null,
    avgRating: 0,
    reviewCount: 0,
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Rings', slug: 'rings' },
    createdAt: '',
    updatedAt: '',
  }) as unknown as Product

beforeEach(async () => {
  vi.clearAllMocks()
  if (!process.env.CI) return
  await $allureSuite('web/products/related')
  await $allureSubSuite('related-products')
  await $allureSeverity('normal')
})

describe('RelatedProducts (#468)', () => {
  it('renders nothing when the product has no category', async () => {
    const result = await RelatedProducts({ currentSlug: 'moonstone-ring' })
    expect(result).toBeNull()
    expect(mockFetchProducts).not.toHaveBeenCalled()
  })

  it('renders nothing when the only sibling is the current product', async () => {
    mockFetchProducts.mockResolvedValueOnce({
      data: [buildProduct('moonstone-ring', 'Moonstone Ring')],
      meta: { totalCount: 1, totalPages: 1, page: 1, limit: 5 },
    })

    const result = await RelatedProducts({
      currentSlug: 'moonstone-ring',
      categorySlug: 'rings',
      categoryName: 'Rings',
    })
    expect(result).toBeNull()
  })

  it('excludes the current product and caps at 4 siblings with the category heading', async () => {
    mockFetchProducts.mockResolvedValueOnce({
      data: [
        buildProduct('moonstone-ring', 'Moonstone Ring'),
        buildProduct('silver-ring', 'Silver Ring'),
        buildProduct('gold-ring', 'Gold Ring'),
        buildProduct('onyx-ring', 'Onyx Ring'),
        buildProduct('pearl-ring', 'Pearl Ring'),
      ],
      meta: { totalCount: 5, totalPages: 1, page: 1, limit: 5 },
    })

    const result = await RelatedProducts({
      currentSlug: 'moonstone-ring',
      categorySlug: 'rings',
      categoryName: 'Rings',
    })
    render(result as React.ReactElement)

    expect(screen.getByRole('heading', { level: 2, name: /more from rings/i })).toBeInTheDocument()
    const cards = screen.getAllByTestId('product-card')
    expect(cards).toHaveLength(4)
    expect(cards.map((card) => card.dataset.slug)).not.toContain('moonstone-ring')
  })

  it('falls back to generic heading when categoryName is missing', async () => {
    mockFetchProducts.mockResolvedValueOnce({
      data: [buildProduct('silver-ring', 'Silver Ring')],
      meta: { totalCount: 1, totalPages: 1, page: 1, limit: 5 },
    })

    const result = await RelatedProducts({
      currentSlug: 'moonstone-ring',
      categorySlug: 'rings',
    })
    render(result as React.ReactElement)

    expect(
      screen.getByRole('heading', { level: 2, name: /you may also like/i }),
    ).toBeInTheDocument()
  })

  it('returns null if fetchProducts throws (API unavailable, no section)', async () => {
    mockFetchProducts.mockRejectedValueOnce(new Error('API down'))

    const result = await RelatedProducts({
      currentSlug: 'moonstone-ring',
      categorySlug: 'rings',
    })
    expect(result).toBeNull()
  })
})
