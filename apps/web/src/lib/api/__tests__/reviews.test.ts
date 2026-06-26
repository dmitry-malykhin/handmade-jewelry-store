import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import {
  createReview,
  fetchAdminReviews,
  fetchMyReviewForProduct,
  fetchProductReviews,
  fetchReviewEligibility,
  replyToAdminReview,
  updateAdminReviewStatus,
} from '../reviews'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const API_BASE = 'http://localhost:4000'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('reviews')
  await $allureSeverity('normal')
})

describe('reviews API — public', () => {
  it('fetchProductReviews builds the URL with default page=1 and limit=10', async () => {
    let receivedSearch: string | null = null
    server.use(
      http.get(`${API_BASE}/api/products/silver-ring/reviews`, ({ request }) => {
        receivedSearch = new URL(request.url).search
        return HttpResponse.json({
          data: [],
          meta: { totalCount: 0, avgRating: 0, page: 1, limit: 10, totalPages: 0 },
        })
      }),
    )

    await fetchProductReviews('silver-ring')

    expect(receivedSearch).toBe('?page=1&limit=10')
  })

  it('fetchProductReviews honours custom page and limit', async () => {
    let receivedSearch: string | null = null
    server.use(
      http.get(`${API_BASE}/api/products/silver-ring/reviews`, ({ request }) => {
        receivedSearch = new URL(request.url).search
        return HttpResponse.json({
          data: [],
          meta: { totalCount: 0, avgRating: 0, page: 2, limit: 25, totalPages: 0 },
        })
      }),
    )

    await fetchProductReviews('silver-ring', 2, 25)

    expect(receivedSearch).toBe('?page=2&limit=25')
  })

  it('createReview POSTs the payload with bearer token', async () => {
    let receivedBody: unknown = null
    let receivedAuth: string | null = null
    server.use(
      http.post(`${API_BASE}/api/reviews`, async ({ request }) => {
        receivedBody = await request.json()
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json({ id: 'rev-1' })
      }),
    )

    const result = await createReview('token-x', {
      productId: 'p1',
      rating: 5,
      comment: 'Great',
    })

    expect(receivedBody).toEqual({ productId: 'p1', rating: 5, comment: 'Great' })
    expect(receivedAuth).toBe('Bearer token-x')
    expect(result.id).toBe('rev-1')
  })

  it('fetchMyReviewForProduct passes productId as query param', async () => {
    let receivedSearch: string | null = null
    server.use(
      http.get(`${API_BASE}/api/reviews/mine`, ({ request }) => {
        receivedSearch = new URL(request.url).search
        return HttpResponse.json(null)
      }),
    )

    const result = await fetchMyReviewForProduct('token-x', 'p1')

    expect(receivedSearch).toBe('?productId=p1')
    expect(result).toBeNull()
  })

  it('fetchReviewEligibility returns the booleans', async () => {
    server.use(
      http.get(`${API_BASE}/api/reviews/eligibility`, () =>
        HttpResponse.json({ hasPurchased: true, hasReviewed: false, canReview: true }),
      ),
    )

    const result = await fetchReviewEligibility('token-x', 'p1')

    expect(result.canReview).toBe(true)
  })
})

describe('reviews API — admin', () => {
  it('fetchAdminReviews skips undefined params via URLSearchParams pattern', async () => {
    let receivedSearch: string | null = null
    server.use(
      http.get(`${API_BASE}/api/admin/reviews`, ({ request }) => {
        receivedSearch = new URL(request.url).search
        return HttpResponse.json({
          data: [],
          meta: { totalCount: 0, page: 1, limit: 20, totalPages: 0 },
        })
      }),
    )

    await fetchAdminReviews({ status: 'PENDING', rating: 5 }, 'admin-token')

    expect(receivedSearch).toBe('?status=PENDING&rating=5')
  })

  it('updateAdminReviewStatus PATCHes with the status body', async () => {
    let receivedBody: unknown = null
    server.use(
      http.patch(`${API_BASE}/api/admin/reviews/rev-1`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ id: 'rev-1', status: 'APPROVED' })
      }),
    )

    await updateAdminReviewStatus('rev-1', 'APPROVED', 'admin-token')

    expect(receivedBody).toEqual({ status: 'APPROVED' })
  })

  it('replyToAdminReview POSTs to /reply with the reply text', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post(`${API_BASE}/api/admin/reviews/rev-1/reply`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ id: 'rev-1', sellerReply: 'Thanks!' })
      }),
    )

    await replyToAdminReview('rev-1', 'Thanks!', 'admin-token')

    expect(receivedBody).toEqual({ reply: 'Thanks!' })
  })
})
