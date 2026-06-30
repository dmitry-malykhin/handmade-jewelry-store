import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import type { Product } from '@jewelry/shared'
import messages from '../../../../../messages/en.json'
import { ProductGrid } from '../product-grid'

vi.mock('next-intl/server', () => ({
  getTranslations: async (namespaceOrOptions: string | { namespace: string; locale?: string }) => {
    const namespace =
      typeof namespaceOrOptions === 'string' ? namespaceOrOptions : namespaceOrOptions.namespace
    const ns = (messages as unknown as Record<string, Record<string, string>>)[namespace] ?? {}
    return (key: string) => ns[key] ?? key
  },
}))

const priorityFlags: boolean[] = []

// Mock as sync so React rendering inside RTL works (real ProductCard is async server component).
vi.mock('../product-card', () => ({
  ProductCard: ({ product, isPriority }: { product: Product; isPriority?: boolean }) => {
    priorityFlags.push(Boolean(isPriority))
    return <div data-testid={`product-card-${product.id}`}>{product.title}</div>
  },
}))

function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    title: 'Silver Ring',
    description: '',
    price: '49.99',
    stock: 1,
    images: ['/img.jpg'],
    slug: 'silver-ring',
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
    category: { name: 'Bracelets', slug: 'bracelets' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(async () => {
  priorityFlags.length = 0
  if (!process.env.CI) return
  await $allureSuite('web/components/features')
  await $allureSubSuite('product-grid')
  await $allureSeverity('normal')
})

describe('ProductGrid', () => {
  it('renders the empty state when products is an empty array', async () => {
    const jsx = await ProductGrid({ products: [] })
    render(jsx)

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('renders one <li> per product wrapped in a <ul role="list">', async () => {
    const products = [
      buildProduct({ id: 'p1', title: 'Ring' }),
      buildProduct({ id: 'p2', title: 'Necklace' }),
      buildProduct({ id: 'p3', title: 'Bracelet' }),
    ]
    const jsx = await ProductGrid({ products })
    const { container } = render(jsx)

    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(container.querySelectorAll('li').length).toBe(3)
    expect(screen.getByTestId('product-card-p1')).toBeInTheDocument()
  })

  it('marks the first 4 cards as priority (LCP optimisation)', async () => {
    const products = Array.from({ length: 6 }, (_, index) =>
      buildProduct({ id: `p${index}`, title: `Product ${index}` }),
    )
    const jsx = await ProductGrid({ products })
    render(jsx)

    expect(priorityFlags.slice(0, 4)).toEqual([true, true, true, true])
    expect(priorityFlags.slice(4)).toEqual([false, false])
  })
})
