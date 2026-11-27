import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import type { Product } from '@jewelry/shared'
import { PopularProductsRail } from '../popular-products-rail'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => {
    if (key === 'emptyCartPopularHeading') return 'Popular pieces'
    if (key === 'upsellRailHeading') return 'You might also like'
    return key
  }),
}))

vi.mock('@/components/features/catalog/product-card', () => ({
  ProductCard: ({ product }: { product: Product }) => (
    <div data-testid="product-card" data-slug={product.slug}>
      {product.title}
    </div>
  ),
}))

const buildProduct = (slug: string, title: string): Product =>
  ({
    id: `id-${slug}`,
    slug,
    title,
    price: '49.99',
    images: [],
    stock: 1,
    stockType: 'IN_STOCK',
    status: 'ACTIVE',
    avgRating: 5,
    reviewCount: 10,
    category: { id: 'c1', name: 'Rings', slug: 'rings' },
  }) as unknown as Product

beforeEach(async () => {
  vi.clearAllMocks()
  if (!process.env.CI) return
  await $allureSuite('web/cart')
  await $allureSubSuite('popular-products-rail')
  await $allureSeverity('normal')
})

describe('PopularProductsRail (#469)', () => {
  it('renders nothing when products list is empty', async () => {
    const result = await PopularProductsRail({ products: [], headingKey: 'upsellRailHeading' })
    expect(result).toBeNull()
  })

  it('renders upsell heading + one card per product', async () => {
    const result = await PopularProductsRail({
      products: [
        buildProduct('silver-ring', 'Silver Ring'),
        buildProduct('gold-ring', 'Gold Ring'),
      ],
      headingKey: 'upsellRailHeading',
    })
    render(result as React.ReactElement)

    expect(
      screen.getByRole('heading', { level: 2, name: /you might also like/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByTestId('product-card')).toHaveLength(2)
  })

  it('renders empty-cart heading when the corresponding key is passed', async () => {
    const result = await PopularProductsRail({
      products: [buildProduct('silver-ring', 'Silver Ring')],
      headingKey: 'emptyCartPopularHeading',
    })
    render(result as React.ReactElement)

    expect(screen.getByRole('heading', { level: 2, name: /popular pieces/i })).toBeInTheDocument()
  })
})
