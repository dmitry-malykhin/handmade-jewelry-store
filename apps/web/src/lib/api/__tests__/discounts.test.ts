import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import {
  createAdminDiscount,
  deleteAdminDiscount,
  fetchAdminDiscounts,
  updateAdminDiscount,
} from '../discounts'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const API_BASE = 'http://localhost:4000'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('discounts')
  await $allureSeverity('normal')
})

describe('discounts API', () => {
  it('fetchAdminDiscounts GETs the admin endpoint with bearer auth', async () => {
    let receivedAuth: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/discounts`, ({ request }) => {
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json([])
      }),
    )

    await fetchAdminDiscounts('admin-token')

    expect(receivedAuth).toBe('Bearer admin-token')
  })

  it('createAdminDiscount POSTs the payload', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post(`${API_BASE}/api/admin/discounts`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ id: 'd1', code: 'SUMMER10' })
      }),
    )

    await createAdminDiscount({ code: 'SUMMER10', type: 'PERCENTAGE', value: 10 }, 'admin-token')

    expect(receivedBody).toEqual({ code: 'SUMMER10', type: 'PERCENTAGE', value: 10 })
  })

  it('updateAdminDiscount PATCHes /:id with partial payload', async () => {
    let receivedBody: unknown = null
    let receivedMethod: string | null = null
    server.use(
      http.patch(`${API_BASE}/api/admin/discounts/d1`, async ({ request }) => {
        receivedMethod = request.method
        receivedBody = await request.json()
        return HttpResponse.json({ id: 'd1', isActive: false })
      }),
    )

    await updateAdminDiscount('d1', { isActive: false }, 'admin-token')

    expect(receivedMethod).toBe('PATCH')
    expect(receivedBody).toEqual({ isActive: false })
  })

  it('deleteAdminDiscount DELETEs /:id and resolves on 204', async () => {
    server.use(
      http.delete(
        `${API_BASE}/api/admin/discounts/d1`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    )

    await expect(deleteAdminDiscount('d1', 'admin-token')).resolves.toBeUndefined()
  })
})
