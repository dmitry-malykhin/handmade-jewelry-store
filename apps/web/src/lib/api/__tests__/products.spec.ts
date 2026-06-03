import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import { fetchAllProducts, PUBLIC_PRODUCTS_MAX_PAGE_SIZE } from '../products'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const API_BASE = 'http://localhost:4000'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('products')
  await $allureSeverity('normal')
})

function buildPage(page: number, totalPages: number, slugs: string[]) {
  return HttpResponse.json({
    data: slugs.map((slug) => ({ slug, updatedAt: '2026-01-01T00:00:00.000Z' })),
    meta: {
      totalCount: totalPages * PUBLIC_PRODUCTS_MAX_PAGE_SIZE,
      totalPages,
      page,
      limit: PUBLIC_PRODUCTS_MAX_PAGE_SIZE,
    },
  })
}

describe('fetchAllProducts — pagination helper for sitemap/feed', () => {
  it('requests limit=100 (API @Max(100) constraint) and not limit=1000 (regression: #288)', async () => {
    const seenLimits: string[] = []
    server.use(
      http.get(`${API_BASE}/api/products`, ({ request }) => {
        seenLimits.push(new URL(request.url).searchParams.get('limit') ?? '')
        return buildPage(1, 1, ['a'])
      }),
    )

    await fetchAllProducts()

    expect(seenLimits).toEqual(['100'])
  })

  it('does only one request when totalPages is 1', async () => {
    let requestCount = 0
    server.use(
      http.get(`${API_BASE}/api/products`, () => {
        requestCount += 1
        return buildPage(1, 1, ['only-product'])
      }),
    )

    const result = await fetchAllProducts()

    expect(requestCount).toBe(1)
    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe('only-product')
  })

  it('fans out N-1 concurrent requests for pages 2..N when totalPages > 1', async () => {
    const seenPages: string[] = []
    server.use(
      http.get(`${API_BASE}/api/products`, ({ request }) => {
        const page = new URL(request.url).searchParams.get('page') ?? '1'
        seenPages.push(page)
        const pageNum = Number(page)
        return buildPage(pageNum, 3, [`p${pageNum}-a`, `p${pageNum}-b`])
      }),
    )

    const result = await fetchAllProducts()

    expect(seenPages.sort()).toEqual(['1', '2', '3'])
    expect(result.map((product) => product.slug).sort()).toEqual([
      'p1-a',
      'p1-b',
      'p2-a',
      'p2-b',
      'p3-a',
      'p3-b',
    ])
  })

  it('propagates the underlying ApiError so callers can log it', async () => {
    server.use(
      http.get(`${API_BASE}/api/products`, () =>
        HttpResponse.json({ message: 'limit must not be greater than 100' }, { status: 400 }),
      ),
    )

    await expect(fetchAllProducts()).rejects.toThrow(/limit must not be greater than 100/)
  })

  it('PUBLIC_PRODUCTS_MAX_PAGE_SIZE matches the API @Max(100) guard', () => {
    expect(PUBLIC_PRODUCTS_MAX_PAGE_SIZE).toBe(100)
  })
})
