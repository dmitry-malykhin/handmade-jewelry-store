import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import {
  createOrder,
  downloadAdminOrdersCsv,
  fetchAdminOrderById,
  fetchAdminOrders,
  fetchAdminProductionQueue,
  fetchAdminRefunds,
  fetchMyOrders,
  fetchOrderById,
  refundAdminOrder,
  updateAdminOrderProduction,
  updateAdminOrderStatus,
  updateAdminOrderTracking,
  type CreateOrderPayload,
} from '../orders'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const API_BASE = 'http://localhost:4000'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('orders')
  await $allureSeverity('normal')
})

describe('orders API — public', () => {
  it('fetchOrderById hits GET /api/orders/:id and parses the response', async () => {
    server.use(
      http.get(`${API_BASE}/api/orders/order-abc`, () =>
        HttpResponse.json({ id: 'order-abc', status: 'PAID', total: 49.99 }),
      ),
    )

    const order = await fetchOrderById('order-abc')

    expect(order.id).toBe('order-abc')
    expect(order.status).toBe('PAID')
  })

  it('fetchOrderById forwards the order-access token as ?token= (guest confirmation-page path)', async () => {
    let receivedSearch: string | null = null
    server.use(
      http.get(`${API_BASE}/api/orders/order-abc`, ({ request }) => {
        receivedSearch = new URL(request.url).search
        return HttpResponse.json({ id: 'order-abc', status: 'PAID', total: 49.99 })
      }),
    )

    await fetchOrderById('order-abc', { orderAccessToken: 'signed-token' })

    expect(receivedSearch).toBe('?token=signed-token')
  })

  it('fetchOrderById attaches Bearer JWT when a signed-in user provides one', async () => {
    let receivedAuth: string | null = null
    server.use(
      http.get(`${API_BASE}/api/orders/order-abc`, ({ request }) => {
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json({ id: 'order-abc', status: 'PAID', total: 49.99 })
      }),
    )

    await fetchOrderById('order-abc', { jwt: 'user-jwt' })

    expect(receivedAuth).toBe('Bearer user-jwt')
  })

  it('fetchMyOrders sends bearer token in Authorization header', async () => {
    let receivedAuth: string | null = null
    server.use(
      http.get(`${API_BASE}/api/orders/my`, ({ request }) => {
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json([])
      }),
    )

    await fetchMyOrders('access-xyz')

    expect(receivedAuth).toBe('Bearer access-xyz')
  })

  const guestOrderPayload: CreateOrderPayload = {
    guestEmail: 'a@b.com',
    items: [
      {
        productId: 'p1',
        quantity: 2,
        price: 10,
        productSnapshot: { title: 'Ring', slug: 'ring' },
      },
    ],
    shippingAddress: {
      fullName: 'Jane',
      addressLine1: '1 Main',
      city: 'NY',
      postalCode: '10001',
      country: 'US',
    },
    subtotal: 20,
    shippingCost: 5,
    total: 25,
  }

  it('createOrder POSTs the payload without Authorization when the caller is a guest', async () => {
    let receivedBody: unknown = null
    let receivedAuth: string | null = null
    server.use(
      http.post(`${API_BASE}/api/orders`, async ({ request }) => {
        receivedAuth = request.headers.get('authorization')
        receivedBody = await request.json()
        return HttpResponse.json({ id: 'new-order', status: 'PENDING', total: 25 })
      }),
    )

    const result = await createOrder(guestOrderPayload, null)

    expect(receivedAuth).toBeNull()
    expect(receivedBody).toEqual(guestOrderPayload)
    expect(result.id).toBe('new-order')
  })

  it('createOrder sends Authorization: Bearer when the caller is authenticated', async () => {
    let receivedAuth: string | null = null
    server.use(
      http.post(`${API_BASE}/api/orders`, async ({ request }) => {
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json({ id: 'new-order', status: 'PENDING', total: 25 })
      }),
    )

    await createOrder(guestOrderPayload, 'access-xyz')

    expect(receivedAuth).toBe('Bearer access-xyz')
  })
})

describe('orders API — admin list & detail', () => {
  it('fetchAdminOrders builds a query string from defined params and skips undefined/empty', async () => {
    let receivedSearch: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/orders`, ({ request }) => {
        receivedSearch = new URL(request.url).search
        return HttpResponse.json({
          data: [],
          meta: { totalCount: 0, page: 1, limit: 20, totalPages: 0 },
        })
      }),
    )

    await fetchAdminOrders({ page: 2, limit: 50, status: 'PAID', userId: undefined }, 'admin-token')

    expect(receivedSearch).toBe('?page=2&limit=50&status=PAID')
  })

  it('fetchAdminOrders skips the ?-prefix entirely when params are empty', async () => {
    let receivedPath: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/orders`, ({ request }) => {
        receivedPath = new URL(request.url).pathname + new URL(request.url).search
        return HttpResponse.json({
          data: [],
          meta: { totalCount: 0, page: 1, limit: 20, totalPages: 0 },
        })
      }),
    )

    await fetchAdminOrders({}, 'admin-token')

    expect(receivedPath).toBe('/api/admin/orders')
  })

  it('fetchAdminOrderById passes the id in the URL and bearer token', async () => {
    let receivedAuth: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/orders/o-1`, ({ request }) => {
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json({ id: 'o-1', status: 'PAID' })
      }),
    )

    const detail = await fetchAdminOrderById('o-1', 'admin-token')

    expect(receivedAuth).toBe('Bearer admin-token')
    expect(detail.id).toBe('o-1')
  })
})

describe('orders API — admin mutations', () => {
  it('updateAdminOrderStatus PATCHes /status with body and auth', async () => {
    let receivedBody: unknown = null
    server.use(
      http.patch(`${API_BASE}/api/admin/orders/o-1/status`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ id: 'o-1', status: 'SHIPPED' })
      }),
    )

    await updateAdminOrderStatus('o-1', { status: 'SHIPPED', note: 'sent' }, 'admin-token')

    expect(receivedBody).toEqual({ status: 'SHIPPED', note: 'sent' })
  })

  it('updateAdminOrderTracking PATCHes /tracking', async () => {
    let receivedMethod: string | null = null
    server.use(
      http.patch(`${API_BASE}/api/admin/orders/o-1/tracking`, ({ request }) => {
        receivedMethod = request.method
        return HttpResponse.json({ id: 'o-1', trackingNumber: 'TRK1' })
      }),
    )

    await updateAdminOrderTracking(
      'o-1',
      { trackingNumber: 'TRK1', shippingCarrier: 'USPS' },
      'admin-token',
    )

    expect(receivedMethod).toBe('PATCH')
  })

  it('refundAdminOrder POSTs to /refund with reason payload', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post(`${API_BASE}/api/admin/orders/o-1/refund`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ id: 'o-1', status: 'REFUNDED' })
      }),
    )

    await refundAdminOrder(
      'o-1',
      { reason: 'ITEM_DAMAGED', amount: 10, note: 'crack' },
      'admin-token',
    )

    expect(receivedBody).toEqual({ reason: 'ITEM_DAMAGED', amount: 10, note: 'crack' })
  })

  it('updateAdminOrderProduction PATCHes /production', async () => {
    server.use(
      http.patch(`${API_BASE}/api/admin/orders/o-1/production`, () =>
        HttpResponse.json({
          id: 'o-1',
          productionStatus: 'IN_PRODUCTION',
          productionDeadlineAt: '2026-01-01',
          maxProductionDays: 7,
        }),
      ),
    )

    const result = await updateAdminOrderProduction(
      'o-1',
      { productionStatus: 'IN_PRODUCTION', productionNotes: 'started' },
      'admin-token',
    )

    expect(result.productionStatus).toBe('IN_PRODUCTION')
  })
})

describe('orders API — refunds & production', () => {
  it('fetchAdminRefunds passes filters through URLSearchParams', async () => {
    let receivedSearch: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/orders/refunds`, ({ request }) => {
        receivedSearch = new URL(request.url).search
        return HttpResponse.json([])
      }),
    )

    await fetchAdminRefunds(
      { from: '2026-01-01', to: '2026-02-01', reason: 'CUSTOMER_CHANGED_MIND' },
      'admin-token',
    )

    expect(receivedSearch).toContain('from=2026-01-01')
    expect(receivedSearch).toContain('reason=CUSTOMER_CHANGED_MIND')
  })

  it('fetchAdminProductionQueue GETs /production with auth', async () => {
    let receivedAuth: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/orders/production`, ({ request }) => {
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json([])
      }),
    )

    await fetchAdminProductionQueue('admin-token')

    expect(receivedAuth).toBe('Bearer admin-token')
  })

  it('downloadAdminOrdersCsv triggers the download path with the correct query', async () => {
    let receivedPath: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/orders/export`, ({ request }) => {
        const url = new URL(request.url)
        receivedPath = url.pathname + url.search
        return new HttpResponse('id,total\n1,5', {
          headers: { 'content-type': 'text/csv' },
        })
      }),
    )

    // Mock browser-only APIs used by downloadCsv (createObjectURL/revokeObjectURL).
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    URL.createObjectURL = () => 'blob:fake'
    URL.revokeObjectURL = () => {}

    try {
      await downloadAdminOrdersCsv({ status: 'PAID' }, 'admin-token')
    } finally {
      URL.createObjectURL = originalCreate
      URL.revokeObjectURL = originalRevoke
    }

    expect(receivedPath).toBe('/api/admin/orders/export?status=PAID')
  })
})
