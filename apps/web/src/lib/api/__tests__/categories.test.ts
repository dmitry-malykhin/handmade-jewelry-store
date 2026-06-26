import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import { createCategory, deleteCategory, fetchAdminCategories, updateCategory } from '../categories'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const API_BASE = 'http://localhost:4000'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('categories')
  await $allureSeverity('normal')
})

describe('categories API', () => {
  it('fetchAdminCategories GETs /api/admin/categories with bearer auth', async () => {
    let receivedAuth: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/categories`, ({ request }) => {
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json([
          { id: 'c1', name: 'Bracelets', slug: 'bracelets', _count: { products: 5 } },
        ])
      }),
    )

    const cats = await fetchAdminCategories('admin-token')

    expect(receivedAuth).toBe('Bearer admin-token')
    expect(cats[0]?._count.products).toBe(5)
  })

  it('createCategory POSTs name + optional slug', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post(`${API_BASE}/api/admin/categories`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ id: 'c-new', name: 'Rings', slug: 'rings' })
      }),
    )

    await createCategory({ name: 'Rings' }, 'admin-token')

    expect(receivedBody).toEqual({ name: 'Rings' })
  })

  it('updateCategory PATCHes /:id', async () => {
    let receivedMethod: string | null = null
    let receivedBody: unknown = null
    server.use(
      http.patch(`${API_BASE}/api/admin/categories/c1`, async ({ request }) => {
        receivedMethod = request.method
        receivedBody = await request.json()
        return HttpResponse.json({ id: 'c1', name: 'Renamed', slug: 'renamed' })
      }),
    )

    await updateCategory('c1', { name: 'Renamed' }, 'admin-token')

    expect(receivedMethod).toBe('PATCH')
    expect(receivedBody).toEqual({ name: 'Renamed' })
  })

  it('deleteCategory DELETEs /:id', async () => {
    server.use(
      http.delete(
        `${API_BASE}/api/admin/categories/c1`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    )

    await expect(deleteCategory('c1', 'admin-token')).resolves.toBeUndefined()
  })
})
