import { describe, it, expect, afterEach, vi } from 'vitest'
import { fetchCategories, fetchProductBySlug, fetchProducts } from '../products'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('products-cache')
  await $allureSeverity('normal')
})

function spyOnFetch(responseBody: unknown) {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  return fetchSpy
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('public product-list reads carry Next 15 cache hints (#502)', () => {
  it('fetchProducts tags the request with the global + per-category key', async () => {
    const fetchSpy = spyOnFetch({
      data: [],
      meta: { totalCount: 0, totalPages: 0, page: 1, limit: 20 },
    })

    await fetchProducts({ page: 1, limit: 20, categorySlug: 'rings' })

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit & {
      next?: { revalidate?: number; tags?: string[] }
    }
    expect(requestInit.next?.revalidate).toBe(3600)
    expect(requestInit.next?.tags).toEqual(expect.arrayContaining(['products', 'products:rings']))
  })

  it('fetchProducts falls back to products:all when no category is filtered', async () => {
    const fetchSpy = spyOnFetch({
      data: [],
      meta: { totalCount: 0, totalPages: 0, page: 1, limit: 20 },
    })

    await fetchProducts()

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit & {
      next?: { tags?: string[] }
    }
    expect(requestInit.next?.tags).toEqual(expect.arrayContaining(['products', 'products:all']))
  })

  it('fetchProductBySlug tags the request with product:<slug>', async () => {
    const fetchSpy = spyOnFetch({ id: 'p1', slug: 'silver-ring' })

    await fetchProductBySlug('silver-ring')

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit & {
      next?: { revalidate?: number; tags?: string[] }
    }
    expect(requestInit.next?.revalidate).toBe(3600)
    expect(requestInit.next?.tags).toEqual(
      expect.arrayContaining(['products', 'product:silver-ring']),
    )
  })

  it('fetchCategories tags the request with the categories key', async () => {
    const fetchSpy = spyOnFetch([{ id: 'c1', slug: 'bracelets', name: 'Bracelets' }])

    await fetchCategories()

    const requestInit = fetchSpy.mock.calls[0]?.[1] as RequestInit & {
      next?: { revalidate?: number; tags?: string[] }
    }
    expect(requestInit.next?.revalidate).toBe(3600)
    expect(requestInit.next?.tags).toEqual(['categories'])
  })
})
