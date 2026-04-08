import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as productsApi from '@/lib/api/products'

vi.mock('@/lib/api/products', () => ({
  fetchProducts: vi.fn(),
  fetchCategories: vi.fn(),
}))

const mockFetchProducts = vi.mocked(productsApi.fetchProducts)
const mockFetchCategories = vi.mocked(productsApi.fetchCategories)

const mockProduct = {
  slug: 'silver-moonstone-ring',
  updatedAt: '2026-04-01T00:00:00.000Z',
}

const mockCategory = { slug: 'rings' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('sitemap', () => {
  it('returns static entries for all locales when API returns empty data', async () => {
    mockFetchProducts.mockResolvedValue({
      data: [],
      meta: { totalCount: 0, totalPages: 1, page: 1, limit: 1000 },
    })
    mockFetchCategories.mockResolvedValue([])

    const { default: sitemap } = await import('../sitemap')
    const result = await sitemap()

    // 3 locales × 2 static pages (home + shop)
    expect(result.length).toBe(6)
  })

  it('includes home and shop entries for each locale', async () => {
    mockFetchProducts.mockResolvedValue({
      data: [],
      meta: { totalCount: 0, totalPages: 1, page: 1, limit: 1000 },
    })
    mockFetchCategories.mockResolvedValue([])

    const { default: sitemap } = await import('../sitemap')
    const result = await sitemap()

    const urls = result.map((entry) => entry.url)
    expect(urls.some((url) => url.includes('/en'))).toBe(true)
    expect(urls.some((url) => url.includes('/ru'))).toBe(true)
    expect(urls.some((url) => url.includes('/es'))).toBe(true)
    expect(urls.some((url) => url.includes('/en/shop'))).toBe(true)
  })

  it('adds product pages for each locale when products are returned', async () => {
    mockFetchProducts.mockResolvedValue({
      data: [
        mockProduct as Parameters<typeof mockFetchProducts>[0] & {
          slug: string
          updatedAt: string
        },
      ],
      meta: { totalCount: 1, totalPages: 1, page: 1, limit: 1000 },
    } as Awaited<ReturnType<typeof productsApi.fetchProducts>>)
    mockFetchCategories.mockResolvedValue([])

    const { default: sitemap } = await import('../sitemap')
    const result = await sitemap()

    const productUrls = result.filter((entry) => entry.url.includes('silver-moonstone-ring'))
    // One entry per locale
    expect(productUrls).toHaveLength(3)
  })

  it('sets lastModified from product updatedAt', async () => {
    mockFetchProducts.mockResolvedValue({
      data: [mockProduct] as Awaited<ReturnType<typeof productsApi.fetchProducts>>['data'],
      meta: { totalCount: 1, totalPages: 1, page: 1, limit: 1000 },
    })
    mockFetchCategories.mockResolvedValue([])

    const { default: sitemap } = await import('../sitemap')
    const result = await sitemap()

    const productEntry = result.find((entry) => entry.url.includes('silver-moonstone-ring'))
    expect(productEntry?.lastModified).toBeInstanceOf(Date)
  })

  it('returns only static pages when API throws', async () => {
    mockFetchProducts.mockRejectedValue(new Error('API unavailable'))
    mockFetchCategories.mockRejectedValue(new Error('API unavailable'))

    const { default: sitemap } = await import('../sitemap')
    const result = await sitemap()

    // Only 3 locales × 2 static pages, no product or category entries
    expect(result.length).toBe(6)
    expect(result.every((entry) => !entry.url.includes('silver-moonstone-ring'))).toBe(true)
  })

  it('adds category filter pages for each locale', async () => {
    mockFetchProducts.mockResolvedValue({
      data: [],
      meta: { totalCount: 0, totalPages: 1, page: 1, limit: 1000 },
    })
    mockFetchCategories.mockResolvedValue([mockCategory] as Awaited<
      ReturnType<typeof productsApi.fetchCategories>
    >)

    const { default: sitemap } = await import('../sitemap')
    const result = await sitemap()

    const categoryUrls = result.filter((entry) => entry.url.includes('categorySlug=rings'))
    expect(categoryUrls).toHaveLength(3)
  })
})
