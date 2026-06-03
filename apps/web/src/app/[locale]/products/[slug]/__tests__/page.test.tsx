import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'
import { http, HttpResponse } from 'msw'
import type * as NextNavigation from 'next/navigation'
import { server } from '@/test-utils/msw/server'

import ProductPage, { generateMetadata } from '../page'
import ProductNotFound from '../not-found'
import messagesEn from '../../../../../../messages/en.json'

const API_BASE = 'http://localhost:4000'

// notFound() in production throws NEXT_HTTP_ERROR_FALLBACK;404. We replace it
// with a labelled throw so the test can assert it fires (and the page bails out
// before continuing to fetch translations / render product UI).
const NEXT_NOT_FOUND = Symbol.for('test/NEXT_NOT_FOUND')
vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof NextNavigation>()
  return {
    ...actual,
    notFound: vi.fn(() => {
      throw NEXT_NOT_FOUND
    }),
  }
})

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: async (namespaceOrOptions: string | { namespace: string; locale?: string }) => {
    const namespace =
      typeof namespaceOrOptions === 'string' ? namespaceOrOptions : namespaceOrOptions.namespace
    const ns = (messagesEn as Record<string, Record<string, string>>)[namespace] ?? {}
    return (key: string) => ns[key] ?? key
  },
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

// Heavyweight child components are not what we're testing here — keep them stubbed
vi.mock('../_components/product-detail', () => ({
  ProductDetail: ({ product }: { product: { slug: string } }) => (
    <div data-testid="product-detail">{product.slug}</div>
  ),
}))
vi.mock('../_components/product-view-tracker', () => ({
  ProductViewTracker: () => null,
}))
vi.mock('@/components/features/reviews/reviews-section', () => ({
  ReviewsSection: () => null,
}))

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/[locale]/products/[slug]')
  await $allureSubSuite('page + not-found')
  await $allureSeverity('critical')
})

const sampleProduct = {
  id: 'prod-1',
  slug: 'sterling-silver-moonstone-ring',
  title: 'Sterling Silver Moonstone Ring',
  description: 'A handmade ring with a glowing moonstone centerpiece.',
  price: '89.00',
  stock: 1,
  stockType: 'IN_STOCK',
  status: 'ACTIVE',
  images: ['https://cdn.example.com/ring.jpg'],
  material: 'Sterling Silver 925',
  sku: 'SKU-RING-001',
  avgRating: 0,
  reviewCount: 0,
  category: { name: 'Rings', slug: 'rings' },
}

describe('ProductPage — notFound behaviour (regression: #289)', () => {
  it('throws notFound when fetchProductBySlug returns 404', async () => {
    server.use(
      http.get(`${API_BASE}/api/products/missing-slug`, () =>
        HttpResponse.json({ message: 'Product not found' }, { status: 404 }),
      ),
    )

    await expect(
      ProductPage({ params: Promise.resolve({ locale: 'en', slug: 'missing-slug' }) }),
    ).rejects.toBe(NEXT_NOT_FOUND)
  })

  it('renders ProductDetail when the slug resolves to a real product', async () => {
    server.use(
      http.get(`${API_BASE}/api/products/${sampleProduct.slug}`, () =>
        HttpResponse.json(sampleProduct),
      ),
    )

    const ui = await ProductPage({
      params: Promise.resolve({ locale: 'en', slug: sampleProduct.slug }),
    })
    render(ui)

    expect(screen.getByTestId('product-detail')).toHaveTextContent(sampleProduct.slug)
  })

  it('generateMetadata returns empty metadata on fetch failure (avoids leaking 404 title)', async () => {
    server.use(
      http.get(`${API_BASE}/api/products/missing-slug`, () =>
        HttpResponse.json({ message: 'Product not found' }, { status: 404 }),
      ),
    )

    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en', slug: 'missing-slug' }),
    })

    expect(metadata).toEqual({})
  })

  it('generateMetadata builds canonical /products/<slug> when product exists', async () => {
    server.use(
      http.get(`${API_BASE}/api/products/${sampleProduct.slug}`, () =>
        HttpResponse.json(sampleProduct),
      ),
    )

    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en', slug: sampleProduct.slug }),
    })

    expect(metadata.title).toBe(sampleProduct.title)
    expect(metadata.alternates?.canonical).toBe(`/en/products/${sampleProduct.slug}`)
  })
})

describe('ProductNotFound — 404 UI', () => {
  it('renders the 404 marker, headline, and CTAs back to catalog/search', async () => {
    const ui = await ProductNotFound()
    render(ui)

    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/this piece is gone/i)
    const browseCta = screen.getByRole('link', { name: /browse catalog/i })
    const searchCta = screen.getByRole('link', { name: /search products/i })
    expect(browseCta).toHaveAttribute('href', '/')
    expect(searchCta).toHaveAttribute('href', '/search')
  })
})
