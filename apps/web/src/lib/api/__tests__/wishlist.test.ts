import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import { addToWishlist, fetchMyWishlist, mergeGuestWishlist, removeFromWishlist } from '../wishlist'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const API_BASE = 'http://localhost:4000'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('wishlist')
  await $allureSeverity('normal')
})

describe('wishlist API', () => {
  it('fetchMyWishlist GETs /api/wishlist with bearer auth', async () => {
    let receivedAuth: string | null = null
    server.use(
      http.get(`${API_BASE}/api/wishlist`, ({ request }) => {
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json([])
      }),
    )

    await fetchMyWishlist('token-x')

    expect(receivedAuth).toBe('Bearer token-x')
  })

  it('addToWishlist POSTs to /:productId', async () => {
    let receivedMethod: string | null = null
    server.use(
      http.post(`${API_BASE}/api/wishlist/prod-1`, ({ request }) => {
        receivedMethod = request.method
        return HttpResponse.json({ added: true })
      }),
    )

    const result = await addToWishlist('token-x', 'prod-1')

    expect(receivedMethod).toBe('POST')
    expect(result.added).toBe(true)
  })

  it('removeFromWishlist DELETEs /:productId', async () => {
    let receivedMethod: string | null = null
    server.use(
      http.delete(`${API_BASE}/api/wishlist/prod-1`, ({ request }) => {
        receivedMethod = request.method
        return HttpResponse.json({ removed: true })
      }),
    )

    const result = await removeFromWishlist('token-x', 'prod-1')

    expect(receivedMethod).toBe('DELETE')
    expect(result.removed).toBe(true)
  })

  it('mergeGuestWishlist POSTs the array of product IDs to /merge', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post(`${API_BASE}/api/wishlist/merge`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json([])
      }),
    )

    await mergeGuestWishlist('token-x', ['p1', 'p2'])

    expect(receivedBody).toEqual({ productIds: ['p1', 'p2'] })
  })
})
