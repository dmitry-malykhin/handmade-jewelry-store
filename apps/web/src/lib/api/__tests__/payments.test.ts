import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPaymentIntent } from '../payments'
import { ApiError } from '../client'
import * as client from '../client'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

vi.mock('../client', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof client
  return {
    ...actual,
    apiClient: vi.fn(),
  }
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/api')
  await $allureSubSuite('payments')
  await $allureSeverity('normal')
})

describe('createPaymentIntent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls apiClient with POST /api/payments/intent and no auth headers by default', async () => {
    const mockClientSecret = 'pi_test_secret_xyz'
    vi.mocked(client.apiClient).mockResolvedValueOnce({ clientSecret: mockClientSecret })

    const result = await createPaymentIntent({ orderId: 'order_123' })

    expect(client.apiClient).toHaveBeenCalledWith('/api/payments/intent', {
      method: 'POST',
      body: JSON.stringify({ orderId: 'order_123' }),
      headers: {},
    })
    expect(result).toEqual({ clientSecret: mockClientSecret })
  })

  it('forwards Bearer and x-order-access-token headers when provided (#537 IDOR fix)', async () => {
    vi.mocked(client.apiClient).mockResolvedValueOnce({ clientSecret: 's' })

    await createPaymentIntent(
      { orderId: 'order_123' },
      { accessToken: 'user-jwt', orderAccessToken: 'order-tok' },
    )

    expect(client.apiClient).toHaveBeenCalledWith('/api/payments/intent', {
      method: 'POST',
      body: JSON.stringify({ orderId: 'order_123' }),
      headers: {
        Authorization: 'Bearer user-jwt',
        'x-order-access-token': 'order-tok',
      },
    })
  })

  it('propagates ApiError when the request fails', async () => {
    const apiError = new ApiError(404, 'API 404: Not Found — /api/payments/intent')
    vi.mocked(client.apiClient).mockRejectedValueOnce(apiError)

    await expect(createPaymentIntent({ orderId: 'missing_order' })).rejects.toThrow(ApiError)
  })
})
