import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import {
  fetchAdminSiteSettings,
  fetchSiteSettings,
  updateAdminSiteSettings,
} from '../site-settings'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const API_BASE = 'http://localhost:4000'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('site-settings')
  await $allureSeverity('normal')
})

describe('site-settings API', () => {
  it('fetchSiteSettings GETs the public endpoint without auth', async () => {
    let receivedAuth: string | null = null
    server.use(
      http.get(`${API_BASE}/api/settings`, ({ request }) => {
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json({
          id: 's1',
          storeName: 'Shop',
          tagline: '',
          contactEmail: 'a@b.com',
          supportEmail: 's@b.com',
          instagramUrl: null,
          pinterestUrl: null,
          facebookUrl: null,
          tiktokUrl: null,
          returnPolicyDays: 30,
          estimatedDeliveryMinDays: 3,
          estimatedDeliveryMaxDays: 7,
          freeShippingThresholdCents: 10000,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        })
      }),
    )

    const settings = await fetchSiteSettings()

    expect(receivedAuth).toBeNull()
    expect(settings.returnPolicyDays).toBe(30)
  })

  it('fetchAdminSiteSettings GETs the admin endpoint with bearer auth', async () => {
    let receivedAuth: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/settings`, ({ request }) => {
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json({
          id: 's1',
          storeName: 'Shop',
          tagline: '',
          contactEmail: 'a@b.com',
          supportEmail: 's@b.com',
          instagramUrl: null,
          pinterestUrl: null,
          facebookUrl: null,
          tiktokUrl: null,
          returnPolicyDays: 30,
          estimatedDeliveryMinDays: 3,
          estimatedDeliveryMaxDays: 7,
          freeShippingThresholdCents: 0,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        })
      }),
    )

    await fetchAdminSiteSettings('admin-token')

    expect(receivedAuth).toBe('Bearer admin-token')
  })

  it('updateAdminSiteSettings PATCHes the payload', async () => {
    let receivedMethod: string | null = null
    let receivedBody: unknown = null
    server.use(
      http.patch(`${API_BASE}/api/admin/settings`, async ({ request }) => {
        receivedMethod = request.method
        receivedBody = await request.json()
        return HttpResponse.json({
          id: 's1',
          storeName: 'New',
          tagline: '',
          contactEmail: 'a@b.com',
          supportEmail: 's@b.com',
          instagramUrl: null,
          pinterestUrl: null,
          facebookUrl: null,
          tiktokUrl: null,
          returnPolicyDays: 30,
          estimatedDeliveryMinDays: 3,
          estimatedDeliveryMaxDays: 7,
          freeShippingThresholdCents: 0,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-02',
        })
      }),
    )

    await updateAdminSiteSettings({ storeName: 'New' }, 'admin-token')

    expect(receivedMethod).toBe('PATCH')
    expect(receivedBody).toEqual({ storeName: 'New' })
  })
})
