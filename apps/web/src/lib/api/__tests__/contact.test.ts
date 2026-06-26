import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import { sendContactMessage } from '../contact'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const API_BASE = 'http://localhost:4000'

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('contact')
  await $allureSeverity('normal')
})

describe('contact API', () => {
  it('sendContactMessage POSTs the form values to /api/contact', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post(`${API_BASE}/api/contact`, async ({ request }) => {
        receivedBody = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await sendContactMessage({
      name: 'Jane',
      email: 'a@b.com',
      subject: 'Hi',
      message: 'Hello',
    })

    expect(receivedBody).toEqual({
      name: 'Jane',
      email: 'a@b.com',
      subject: 'Hi',
      message: 'Hello',
    })
  })

  it('resolves on a 204 No Content response', async () => {
    server.use(http.post(`${API_BASE}/api/contact`, () => new HttpResponse(null, { status: 204 })))

    await expect(
      sendContactMessage({ name: 'X', email: 'x@b.com', subject: 'X', message: 'X' }),
    ).resolves.toBeUndefined()
  })
})
