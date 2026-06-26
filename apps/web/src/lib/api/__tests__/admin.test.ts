import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import {
  fetchAdminKeyMetrics,
  fetchAdminOrderStatusBreakdown,
  fetchAdminRevenueStats,
  fetchAdminStats,
  fetchAdminTopProducts,
} from '../admin'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const API_BASE = 'http://localhost:4000'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('admin')
  await $allureSeverity('normal')
})

describe('admin analytics API', () => {
  it('fetchAdminStats GETs /api/admin/stats with bearer auth', async () => {
    let receivedAuth: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/stats`, ({ request }) => {
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json({ productCount: 10, orderCount: 50, totalRevenueCents: 250000 })
      }),
    )

    const stats = await fetchAdminStats('admin-token')

    expect(receivedAuth).toBe('Bearer admin-token')
    expect(stats.orderCount).toBe(50)
  })

  it('fetchAdminRevenueStats encodes period as query param', async () => {
    let receivedSearch: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/stats/revenue`, ({ request }) => {
        receivedSearch = new URL(request.url).search
        return HttpResponse.json({
          totalRevenueCents: 0,
          orderCount: 0,
          avgOrderValueCents: 0,
          chartData: [],
        })
      }),
    )

    await fetchAdminRevenueStats('30d', 'admin-token')

    expect(receivedSearch).toBe('?period=30d')
  })

  it('fetchAdminTopProducts encodes period + limit', async () => {
    let receivedSearch: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/analytics/products/top`, ({ request }) => {
        receivedSearch = new URL(request.url).search
        return HttpResponse.json([])
      }),
    )

    await fetchAdminTopProducts('7d', 5, 'admin-token')

    expect(receivedSearch).toBe('?period=7d&limit=5')
  })

  it('fetchAdminOrderStatusBreakdown GETs /status-breakdown', async () => {
    server.use(
      http.get(`${API_BASE}/api/admin/analytics/orders/status-breakdown`, () =>
        HttpResponse.json([{ status: 'PAID', count: 12 }]),
      ),
    )

    const breakdown = await fetchAdminOrderStatusBreakdown('30d', 'admin-token')

    expect(breakdown).toEqual([{ status: 'PAID', count: 12 }])
  })

  it('fetchAdminKeyMetrics returns the KeyMetrics shape', async () => {
    server.use(
      http.get(`${API_BASE}/api/admin/analytics/key-metrics`, () =>
        HttpResponse.json({
          newCustomers: 3,
          returningCustomers: 2,
          refundRatePercent: 5,
          avgDaysOrderToDelivery: 4.5,
        }),
      ),
    )

    const metrics = await fetchAdminKeyMetrics('30d', 'admin-token')

    expect(metrics.newCustomers).toBe(3)
    expect(metrics.refundRatePercent).toBe(5)
  })
})
