import { Test, TestingModule } from '@nestjs/testing'
import { AnalyticsService } from './analytics.service'

const mockCapture = jest.fn()
const mockShutdown = jest.fn().mockResolvedValue(undefined)

jest.mock('posthog-node', () => ({
  PostHog: jest.fn().mockImplementation(() => ({
    capture: mockCapture,
    shutdown: mockShutdown,
  })),
}))

const originalApiKey = process.env.POSTHOG_API_KEY

async function buildService(): Promise<AnalyticsService> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [AnalyticsService],
  }).compile()
  return moduleRef.get(AnalyticsService)
}

describe('AnalyticsService', () => {
  beforeEach(() => {
    mockCapture.mockClear()
    mockShutdown.mockClear()
  })

  afterEach(() => {
    process.env.POSTHOG_API_KEY = originalApiKey
  })

  describe('when POSTHOG_API_KEY is configured', () => {
    beforeEach(() => {
      process.env.POSTHOG_API_KEY = 'phc_test_key'
    })

    it('captures payment_succeeded with snake_case properties keyed to distinctId', async () => {
      const service = await buildService()

      service.trackPaymentSucceeded('user-1', {
        orderId: 'order-7',
        amountUsd: 149.5,
        paymentMethod: 'card',
      })

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-1',
        event: 'payment_succeeded',
        properties: {
          order_id: 'order-7',
          amount_usd: 149.5,
          payment_method: 'card',
        },
      })
    })

    it('captures order_created with totals and item count', async () => {
      const service = await buildService()

      service.trackOrderCreated('user-2', {
        orderId: 'order-8',
        totalUsd: 215,
        itemCount: 3,
      })

      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-2',
        event: 'order_created',
        properties: {
          order_id: 'order-8',
          total_usd: 215,
          item_count: 3,
        },
      })
    })

    it('flushes the PostHog client on module destroy', async () => {
      const service = await buildService()

      await service.onModuleDestroy()

      expect(mockShutdown).toHaveBeenCalledTimes(1)
    })
  })

  describe('when POSTHOG_API_KEY is missing', () => {
    beforeEach(() => {
      delete process.env.POSTHOG_API_KEY
    })

    it('is a no-op for trackPaymentSucceeded — no client constructed, no events captured', async () => {
      const service = await buildService()

      service.trackPaymentSucceeded('user-1', {
        orderId: 'order-7',
        amountUsd: 149.5,
        paymentMethod: 'card',
      })

      expect(mockCapture).not.toHaveBeenCalled()
    })

    it('does not attempt to shutdown a non-existent client', async () => {
      const service = await buildService()

      await expect(service.onModuleDestroy()).resolves.toBeUndefined()
      expect(mockShutdown).not.toHaveBeenCalled()
    })
  })
})
