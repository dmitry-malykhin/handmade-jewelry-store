import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import { subscribeToNewsletter } from '../newsletter'
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
  await $allureSeverity('normal')
})

describe('newsletter API', () => {
  it('subscribeToNewsletter POSTs the email and returns queued status', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post(`${API_BASE}/api/newsletter/subscribe`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: 'queued' })
      }),
    )

    const result = await subscribeToNewsletter('a@b.com')

    expect(receivedBody).toEqual({ email: 'a@b.com' })
    expect(result.status).toBe('queued')
  })

  it('returns skipped when server reports already-subscribed', async () => {
    server.use(
      http.post(`${API_BASE}/api/newsletter/subscribe`, () =>
        HttpResponse.json({ status: 'skipped' }),
      ),
    )

    const result = await subscribeToNewsletter('a@b.com')

    expect(result.status).toBe('skipped')
  })
})
