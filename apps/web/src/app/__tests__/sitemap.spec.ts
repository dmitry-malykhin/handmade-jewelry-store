import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as productsApi from '@/lib/api/products'
import { logger } from '@/lib/logger'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

vi.mock('@/lib/api/products', () => ({
  fetchAllProducts: vi.fn(),
  fetchCategories: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

const mockFetchAllProducts = vi.mocked(productsApi.fetchAllProducts)
const mockFetchCategories = vi.mocked(productsApi.fetchCategories)
const mockLoggerError = vi.mocked(logger.error)

const mockProduct = {
  slug: 'silver-moonstone-ring',
  updatedAt: '2026-04-01T00:00:00.000Z',
}

const mockCategory = { slug: 'rings' }

beforeEach(() => {
  vi.clearAllMocks()
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/__tests__')
  await $allureSubSuite('sitemap')
  await $allureSeverity('normal')
})

describe('sitemap', () => {
  it('returns static entries for all locales when API returns empty data', async () => {
    mockFetchAllProducts.mockResolvedValue([])
    mockFetchCategories.mockResolvedValue([])

    const { default: sitemap } = await import('../sitemap')
    const result = await sitemap()

    // 3 locales × 5 static pages (home/catalog + ring-size-guide + faq + shipping + care)
    expect(result.length).toBe(15)
  })

  it('includes the locale root (home = catalog) for each locale', async () => {
    mockFetchAllProducts.mockResolvedValue([])
    mockFetchCategories.mockResolvedValue([])

    const { default: sitemap } = await import('../sitemap')
    const result = await sitemap()

    const urls = result.map((entry) => entry.url)
    expect(urls.some((url) => url.endsWith('/en'))).toBe(true)
    expect(urls.some((url) => url.endsWith('/ru'))).toBe(true)
    expect(urls.some((url) => url.endsWith('/es'))).toBe(true)
    expect(urls.some((url) => url.includes('/shop'))).toBe(false)
  })

  it('adds product pages for each locale when products are returned', async () => {
    mockFetchAllProducts.mockResolvedValue([
      mockProduct as Awaited<ReturnType<typeof productsApi.fetchAllProducts>>[number],
    ])
    mockFetchCategories.mockResolvedValue([])

    const { default: sitemap } = await import('../sitemap')
    const result = await sitemap()

    const productUrls = result.filter((entry) => entry.url.includes('silver-moonstone-ring'))
    // One entry per locale
    expect(productUrls).toHaveLength(3)
    // URL uses /products/, not /shop/
    expect(productUrls.every((entry) => entry.url.includes('/products/'))).toBe(true)
  })

  it('sets lastModified from product updatedAt', async () => {
    mockFetchAllProducts.mockResolvedValue([mockProduct] as Awaited<
      ReturnType<typeof productsApi.fetchAllProducts>
    >)
    mockFetchCategories.mockResolvedValue([])

    const { default: sitemap } = await import('../sitemap')
    const result = await sitemap()

    const productEntry = result.find((entry) => entry.url.includes('silver-moonstone-ring'))
    expect(productEntry?.lastModified).toBeInstanceOf(Date)
  })

  it('returns only static pages and logs error when API throws (regression: #288)', async () => {
    const apiFailure = new Error('API 400: limit must not be greater than 100')
    mockFetchAllProducts.mockRejectedValue(apiFailure)
    mockFetchCategories.mockRejectedValue(apiFailure)

    const { default: sitemap } = await import('../sitemap')
    const result = await sitemap()

    expect(result.length).toBe(15)
    expect(result.every((entry) => !entry.url.includes('silver-moonstone-ring'))).toBe(true)

    // Failure must NOT be silent — logger.error tells ops something is wrong
    expect(mockLoggerError).toHaveBeenCalledWith(
      'sitemap.products-fetch.failed',
      expect.objectContaining({ message: expect.stringContaining('API 400') }),
    )
  })

  it('includes ring size guide entry for each locale', async () => {
    mockFetchAllProducts.mockResolvedValue([])
    mockFetchCategories.mockResolvedValue([])

    const { default: sitemap } = await import('../sitemap')
    const result = await sitemap()

    const guideUrls = result.filter((entry) => entry.url.includes('/ring-size-guide'))
    expect(guideUrls).toHaveLength(3)
  })

  it.each(['/faq', '/shipping', '/care'])(
    'includes %s entry for each locale',
    async (trustPath) => {
      mockFetchAllProducts.mockResolvedValue([])
      mockFetchCategories.mockResolvedValue([])

      const { default: sitemap } = await import('../sitemap')
      const result = await sitemap()

      const matched = result.filter((entry) => entry.url.endsWith(trustPath))
      expect(matched).toHaveLength(3)
    },
  )

  it('adds category filter pages for each locale', async () => {
    mockFetchAllProducts.mockResolvedValue([])
    mockFetchCategories.mockResolvedValue([mockCategory] as Awaited<
      ReturnType<typeof productsApi.fetchCategories>
    >)

    const { default: sitemap } = await import('../sitemap')
    const result = await sitemap()

    const categoryUrls = result.filter((entry) => entry.url.includes('categorySlug=rings'))
    expect(categoryUrls).toHaveLength(3)
    // Facet URL uses locale root, not /shop
    expect(categoryUrls.every((entry) => /\/(en|ru|es)\?categorySlug=/.test(entry.url))).toBe(true)
  })
})
