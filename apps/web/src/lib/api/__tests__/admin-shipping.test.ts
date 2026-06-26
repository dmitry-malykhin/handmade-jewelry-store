import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import { fetchShippingStatus, purchaseAdminShippingLabel } from '../admin-shipping'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const API_BASE = 'http://localhost:4000'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('admin-shipping')
  await $allureSeverity('normal')
})

describe('admin-shipping API', () => {
  it('fetchShippingStatus GETs /status and returns the isLiveMode flag', async () => {
    server.use(
      http.get(`${API_BASE}/api/admin/shipping/status`, () =>
        HttpResponse.json({ isLiveMode: false }),
      ),
    )

    const status = await fetchShippingStatus('admin-token')

    expect(status.isLiveMode).toBe(false)
  })

  it('purchaseAdminShippingLabel POSTs payload to /orders/:id/label with auth', async () => {
    let receivedBody: unknown = null
    let receivedAuth: string | null = null
    server.use(
      http.post(`${API_BASE}/api/admin/shipping/orders/o-1/label`, async ({ request }) => {
        receivedBody = await request.json()
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json({
          shipmentId: 'shp_1',
          trackerId: 'trk_1',
          trackingNumber: 'TRK1',
          labelUrl: 'https://shipping.example/label.pdf',
          carrier: 'USPS',
          estimatedDeliveryAt: null,
          insuranceCents: 0,
          isLiveMode: false,
        })
      }),
    )

    const result = await purchaseAdminShippingLabel(
      'o-1',
      { carrier: 'USPS', insuranceCents: 500 },
      'admin-token',
    )

    expect(receivedBody).toEqual({ carrier: 'USPS', insuranceCents: 500 })
    expect(receivedAuth).toBe('Bearer admin-token')
    expect(result.trackingNumber).toBe('TRK1')
  })
})
