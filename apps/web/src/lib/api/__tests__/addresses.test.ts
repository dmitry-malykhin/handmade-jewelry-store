import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test-utils/msw/server'
import {
  createAddress,
  deleteAddress,
  fetchMyAddresses,
  setDefaultAddress,
  updateAddress,
} from '../addresses'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const API_BASE = 'http://localhost:4000'
const ADDRESS_PAYLOAD = {
  fullName: 'Jane',
  addressLine1: '1 Main',
  city: 'NY',
  postalCode: '10001',
  country: 'US',
}

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('addresses')
  await $allureSeverity('normal')
})

describe('addresses API', () => {
  it('fetchMyAddresses GETs /api/users/me/addresses with bearer auth', async () => {
    let receivedAuth: string | null = null
    server.use(
      http.get(`${API_BASE}/api/users/me/addresses`, ({ request }) => {
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json([])
      }),
    )

    await fetchMyAddresses('token-x')

    expect(receivedAuth).toBe('Bearer token-x')
  })

  it('createAddress POSTs the payload', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post(`${API_BASE}/api/users/me/addresses`, async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ id: 'addr-1', ...ADDRESS_PAYLOAD, isDefault: false })
      }),
    )

    await createAddress('token-x', ADDRESS_PAYLOAD)

    expect(receivedBody).toEqual(ADDRESS_PAYLOAD)
  })

  it('updateAddress PUTs to /:id', async () => {
    let receivedMethod: string | null = null
    server.use(
      http.put(`${API_BASE}/api/users/me/addresses/addr-1`, ({ request }) => {
        receivedMethod = request.method
        return HttpResponse.json({ id: 'addr-1', ...ADDRESS_PAYLOAD, isDefault: false })
      }),
    )

    await updateAddress('token-x', 'addr-1', ADDRESS_PAYLOAD)

    expect(receivedMethod).toBe('PUT')
  })

  it('setDefaultAddress PATCHes /:id/default with no body', async () => {
    let receivedMethod: string | null = null
    server.use(
      http.patch(`${API_BASE}/api/users/me/addresses/addr-1/default`, ({ request }) => {
        receivedMethod = request.method
        return HttpResponse.json({ id: 'addr-1', ...ADDRESS_PAYLOAD, isDefault: true })
      }),
    )

    const result = await setDefaultAddress('token-x', 'addr-1')

    expect(receivedMethod).toBe('PATCH')
    expect(result.isDefault).toBe(true)
  })

  it('deleteAddress DELETEs /:id and resolves on 204', async () => {
    let receivedMethod: string | null = null
    server.use(
      http.delete(`${API_BASE}/api/users/me/addresses/addr-1`, ({ request }) => {
        receivedMethod = request.method
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await expect(deleteAddress('token-x', 'addr-1')).resolves.toBeUndefined()
    expect(receivedMethod).toBe('DELETE')
  })
})
