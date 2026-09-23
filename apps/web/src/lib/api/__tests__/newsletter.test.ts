import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import {
  confirmNewsletterSubscription,
  subscribeToNewsletter,
  unsubscribeFromNewsletter,
} from '../newsletter'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const API_BASE = 'http://localhost:4000'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('newsletter')
  await $allureSeverity('critical')
})

describe('newsletter API', () => {
  it('subscribeToNewsletter POSTs email + consent + sourceUrl and returns pending-confirmation', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post(`${API_BASE}/api/newsletter/subscribe`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: 'pending-confirmation' })
      }),
    )

    const result = await subscribeToNewsletter({
      email: 'a@b.com',
      consent: true,
      sourceUrl: '/en/products',
    })

    expect(receivedBody).toEqual({
      email: 'a@b.com',
      consent: true,
      sourceUrl: '/en/products',
    })
    expect(result.status).toBe('pending-confirmation')
  })

  it('confirmNewsletterSubscription POSTs email + token and returns confirmed', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post(`${API_BASE}/api/newsletter/confirm`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: 'confirmed' })
      }),
    )

    const result = await confirmNewsletterSubscription('a@b.com', 'tok-xyz')

    expect(receivedBody).toEqual({ email: 'a@b.com', token: 'tok-xyz' })
    expect(result.status).toBe('confirmed')
  })

  it('returns already-confirmed when the server reports the email is already on the list', async () => {
    server.use(
      http.post(`${API_BASE}/api/newsletter/confirm`, () =>
        HttpResponse.json({ status: 'already-confirmed' }),
      ),
    )

    const result = await confirmNewsletterSubscription('a@b.com', 'tok-xyz')

    expect(result.status).toBe('already-confirmed')
  })

  it('unsubscribeFromNewsletter POSTs email + token and returns unsubscribed', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post(`${API_BASE}/api/newsletter/unsubscribe`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: 'unsubscribed' })
      }),
    )

    const result = await unsubscribeFromNewsletter('a@b.com', 'tok-xyz')

    expect(receivedBody).toEqual({ email: 'a@b.com', token: 'tok-xyz' })
    expect(result.status).toBe('unsubscribed')
  })
})
