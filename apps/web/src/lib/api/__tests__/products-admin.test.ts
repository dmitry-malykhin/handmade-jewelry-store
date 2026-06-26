import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import {
  bulkUpdateAdminProducts,
  createAdminProduct,
  deleteAdminProduct,
  fetchAdminInventory,
  fetchAdminProducts,
  fetchCategories,
  fetchLowStockCount,
  fetchProductBySlug,
  searchProducts,
  updateAdminProduct,
  updateAdminProductStock,
  updateProductStatus,
} from '../products'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const API_BASE = 'http://localhost:4000'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('products-admin')
  await $allureSeverity('normal')
})

describe('products API — public', () => {
  it('fetchProductBySlug GETs /api/products/:slug', async () => {
    server.use(
      http.get(`${API_BASE}/api/products/silver-ring`, () =>
        HttpResponse.json({ id: 'p1', slug: 'silver-ring', title: 'Silver Ring' }),
      ),
    )

    const product = await fetchProductBySlug('silver-ring')

    expect(product.slug).toBe('silver-ring')
  })

  it('fetchCategories GETs /api/categories', async () => {
    server.use(
      http.get(`${API_BASE}/api/categories`, () =>
        HttpResponse.json([{ id: 'c1', name: 'Bracelets', slug: 'bracelets' }]),
      ),
    )

    const cats = await fetchCategories()

    expect(cats[0]?.slug).toBe('bracelets')
  })

  it('searchProducts returns [] for empty/whitespace-only query without hitting the API', async () => {
    let requestFired = false
    server.use(
      http.get(`${API_BASE}/api/products/search`, () => {
        requestFired = true
        return HttpResponse.json([])
      }),
    )

    await expect(searchProducts('')).resolves.toEqual([])
    await expect(searchProducts('   ')).resolves.toEqual([])

    expect(requestFired).toBe(false)
  })

  it('searchProducts URL-encodes the query', async () => {
    let receivedSearch: string | null = null
    server.use(
      http.get(`${API_BASE}/api/products/search`, ({ request }) => {
        receivedSearch = new URL(request.url).search
        return HttpResponse.json([])
      }),
    )

    await searchProducts('silver ring')

    expect(receivedSearch).toBe('?q=silver%20ring')
  })
})

describe('products API — admin list & detail', () => {
  it('fetchAdminProducts skips undefined params and sends bearer auth', async () => {
    let receivedSearch: string | null = null
    let receivedAuth: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/products`, ({ request }) => {
        receivedSearch = new URL(request.url).search
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json({
          data: [],
          meta: { totalCount: 0, page: 1, limit: 20, totalPages: 0 },
        })
      }),
    )

    await fetchAdminProducts(
      { page: 1, limit: 10, status: 'ACTIVE', search: undefined },
      'admin-token',
    )

    expect(receivedSearch).toBe('?page=1&limit=10&status=ACTIVE')
    expect(receivedAuth).toBe('Bearer admin-token')
  })

  it('fetchAdminInventory passes threshold and lowStockOnly when provided', async () => {
    let receivedSearch: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/inventory`, ({ request }) => {
        receivedSearch = new URL(request.url).search
        return HttpResponse.json({ threshold: 3, data: [] })
      }),
    )

    await fetchAdminInventory('admin-token', { threshold: 3, lowStockOnly: true })

    expect(receivedSearch).toContain('threshold=3')
    expect(receivedSearch).toContain('lowStockOnly=true')
  })

  it('fetchAdminInventory omits lowStockOnly=false (falsy guard)', async () => {
    let receivedSearch: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/inventory`, ({ request }) => {
        receivedSearch = new URL(request.url).search
        return HttpResponse.json({ threshold: 3, data: [] })
      }),
    )

    await fetchAdminInventory('admin-token', { lowStockOnly: false })

    expect(receivedSearch).toBe('')
  })

  it('fetchLowStockCount appends threshold to the URL', async () => {
    let receivedSearch: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/inventory/low-stock-count`, ({ request }) => {
        receivedSearch = new URL(request.url).search
        return HttpResponse.json({ count: 5 })
      }),
    )

    await fetchLowStockCount('admin-token', 5)

    expect(receivedSearch).toBe('?threshold=5')
  })
})

describe('products API — admin mutations', () => {
  it('createAdminProduct POSTs the payload to /api/products', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post(`${API_BASE}/api/products`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ id: 'p-new', slug: 'new-product' })
      }),
    )

    await createAdminProduct(
      {
        title: 'New',
        description: 'Desc',
        price: 10,
        stock: 1,
        images: ['https://cdn/x.jpg'],
        slug: 'new-product',
        categoryId: 'c1',
      },
      'admin-token',
    )

    expect(receivedBody).toMatchObject({ title: 'New', slug: 'new-product' })
  })

  it('updateAdminProduct PATCHes /api/products/:slug', async () => {
    let receivedMethod: string | null = null
    server.use(
      http.patch(`${API_BASE}/api/products/old-slug`, ({ request }) => {
        receivedMethod = request.method
        return HttpResponse.json({ id: 'p1', slug: 'old-slug' })
      }),
    )

    await updateAdminProduct('old-slug', { title: 'Renamed' }, 'admin-token')

    expect(receivedMethod).toBe('PATCH')
  })

  it('deleteAdminProduct DELETEs /api/products/:slug and resolves on 204', async () => {
    server.use(
      http.delete(
        `${API_BASE}/api/products/old-slug`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    )

    await expect(deleteAdminProduct('old-slug', 'admin-token')).resolves.toBeUndefined()
  })

  it('updateProductStatus PATCHes /:id/status with new status', async () => {
    let receivedBody: unknown = null
    server.use(
      http.patch(`${API_BASE}/api/admin/products/p1/status`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ id: 'p1', slug: 'p', title: 'X', status: 'ARCHIVED' })
      }),
    )

    await updateProductStatus('p1', 'ARCHIVED', 'admin-token')

    expect(receivedBody).toEqual({ status: 'ARCHIVED' })
  })

  it('updateAdminProductStock PATCHes /:id/stock with new stock', async () => {
    let receivedBody: unknown = null
    server.use(
      http.patch(`${API_BASE}/api/admin/products/p1/stock`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({
          id: 'p1',
          slug: 'p',
          title: 'X',
          stock: 0,
          stockType: 'IN_STOCK',
        })
      }),
    )

    await updateAdminProductStock('p1', 0, 'admin-token')

    expect(receivedBody).toEqual({ stock: 0 })
  })

  it('bulkUpdateAdminProducts PATCHes /bulk with ids + action', async () => {
    let receivedBody: unknown = null
    server.use(
      http.patch(`${API_BASE}/api/admin/products/bulk`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ affectedCount: 2 })
      }),
    )

    const result = await bulkUpdateAdminProducts(
      { ids: ['p1', 'p2'], action: 'publish' },
      'admin-token',
    )

    expect(receivedBody).toEqual({ ids: ['p1', 'p2'], action: 'publish' })
    expect(result.affectedCount).toBe(2)
  })
})
