import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import { fetchAdminCustomerById, fetchAdminCustomers } from '../customers'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const API_BASE = 'http://localhost:4000'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('customers')
  await $allureSeverity('normal')
})

describe('customers API', () => {
  it('fetchAdminCustomers serializes search/page/limit and skips undefined', async () => {
    let receivedSearch: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/customers`, ({ request }) => {
        receivedSearch = new URL(request.url).search
        return HttpResponse.json({
          data: [],
          meta: { totalCount: 0, page: 1, limit: 20, totalPages: 0 },
        })
      }),
    )

    await fetchAdminCustomers({ page: 2, limit: 10, search: 'jane' }, 'admin-token')

    expect(receivedSearch).toBe('?page=2&limit=10&search=jane')
  })

  it('fetchAdminCustomers omits the ?-prefix when params are empty', async () => {
    let receivedPath: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/customers`, ({ request }) => {
        const url = new URL(request.url)
        receivedPath = url.pathname + url.search
        return HttpResponse.json({
          data: [],
          meta: { totalCount: 0, page: 1, limit: 20, totalPages: 0 },
        })
      }),
    )

    await fetchAdminCustomers({}, 'admin-token')

    expect(receivedPath).toBe('/api/admin/customers')
  })

  it('fetchAdminCustomerById GETs /:id with bearer auth', async () => {
    let receivedAuth: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/customers/u-1`, ({ request }) => {
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json({
          id: 'u-1',
          email: 'jane@example.com',
          role: 'USER',
          createdAt: '2026-01-01',
          totalOrders: 0,
          lifetimeValueUsd: 0,
          orders: [],
          addresses: [],
        })
      }),
    )

    const customer = await fetchAdminCustomerById('u-1', 'admin-token')

    expect(receivedAuth).toBe('Bearer admin-token')
    expect(customer.email).toBe('jane@example.com')
  })
})
