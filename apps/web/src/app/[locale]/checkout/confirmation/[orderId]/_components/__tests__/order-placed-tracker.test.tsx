import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { OrderPlacedTracker, type OrderPlacedTrackerItem } from '../order-placed-tracker'
import * as posthog from '@/lib/analytics/posthog'
import * as gtag from '@/lib/analytics/gtag'
import * as fbq from '@/lib/analytics/fbq'
import * as klaviyo from '@/lib/analytics/klaviyo'
import * as pintrk from '@/lib/analytics/pintrk'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

vi.mock('@/lib/analytics/posthog', () => ({ trackOrderPlaced: vi.fn() }))
vi.mock('@/lib/analytics/gtag', () => ({ trackPurchase: vi.fn() }))
vi.mock('@/lib/analytics/fbq', () => ({ trackFbPurchase: vi.fn() }))
vi.mock('@/lib/analytics/klaviyo', () => ({ klaviyoPlacedOrder: vi.fn() }))
vi.mock('@/lib/analytics/pintrk', () => ({ trackPinCheckout: vi.fn() }))

const orderItems: OrderPlacedTrackerItem[] = [
  { productId: 'prod-1', title: 'Sterling Silver Ring', price: 49.99, quantity: 2 },
  { productId: 'prod-2', title: 'Moonstone Pendant', price: 79.0, quantity: 1 },
]

const orderProps = {
  orderId: 'order-abc',
  totalUsd: 178.98,
  shippingCostUsd: 5.99,
  items: orderItems,
}

beforeEach(() => {
  vi.clearAllMocks()
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/app/locale')
  await $allureSubSuite('order-placed-tracker')
  await $allureSeverity('critical')
})

describe('OrderPlacedTracker — dispatches conversion to every channel', () => {
  it('fires PostHog order_placed with aggregated item count', () => {
    render(<OrderPlacedTracker {...orderProps} />)

    expect(posthog.trackOrderPlaced).toHaveBeenCalledExactlyOnceWith({
      orderId: 'order-abc',
      totalUsd: 178.98,
      itemCount: 3,
      shippingCostUsd: 5.99,
    })
  })

  it('fires GA4 purchase with transactionId + full items array', () => {
    render(<OrderPlacedTracker {...orderProps} />)

    expect(gtag.trackPurchase).toHaveBeenCalledExactlyOnceWith({
      transactionId: 'order-abc',
      total: 178.98,
      shippingCost: 5.99,
      items: orderItems,
    })
  })

  it('fires FB Pixel Purchase with total + productIds', () => {
    render(<OrderPlacedTracker {...orderProps} />)

    expect(fbq.trackFbPurchase).toHaveBeenCalledExactlyOnceWith({
      total: 178.98,
      productIds: ['prod-1', 'prod-2'],
    })
  })

  it('fires Klaviyo Placed Order with orderId + full items array', () => {
    render(<OrderPlacedTracker {...orderProps} />)

    expect(klaviyo.klaviyoPlacedOrder).toHaveBeenCalledExactlyOnceWith({
      orderId: 'order-abc',
      total: 178.98,
      items: orderItems,
    })
  })

  it('fires Pinterest checkout with orderId for conversion attribution', () => {
    render(<OrderPlacedTracker {...orderProps} />)

    expect(pintrk.trackPinCheckout).toHaveBeenCalledExactlyOnceWith({
      total: 178.98,
      productIds: ['prod-1', 'prod-2'],
      orderId: 'order-abc',
    })
  })

  it('fires each dispatcher only once even when React Strict Mode double-mounts', () => {
    const { rerender } = render(<OrderPlacedTracker {...orderProps} />)
    rerender(<OrderPlacedTracker {...orderProps} />)

    expect(posthog.trackOrderPlaced).toHaveBeenCalledTimes(1)
    expect(gtag.trackPurchase).toHaveBeenCalledTimes(1)
    expect(fbq.trackFbPurchase).toHaveBeenCalledTimes(1)
    expect(klaviyo.klaviyoPlacedOrder).toHaveBeenCalledTimes(1)
    expect(pintrk.trackPinCheckout).toHaveBeenCalledTimes(1)
  })
})
