import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import posthog from 'posthog-js'
import {
  decodeAuthUser,
  trackProductViewed,
  trackProductAddedToCart,
  trackCheckoutStarted,
  trackOrderPlaced,
} from '../posthog'
import {
  suite as $allureSuite,
  subSuite as $allureSubSuite,
  severity as $allureSeverity,
} from 'allure-js-commons'

const captureMock = vi.fn()

vi.mock('posthog-js', () => {
  const instance = {
    __loaded: false,
    capture: (...args: unknown[]) => captureMock(...args),
  }
  return { default: instance }
})

beforeEach(async () => {
  if (!process.env.CI) return
  await $allureSuite('web/lib/analytics')
  await $allureSubSuite('posthog')
  await $allureSeverity('normal')
})

describe('decodeAuthUser', () => {
  it('returns null when token is null', () => {
    expect(decodeAuthUser(null)).toBeNull()
  })

  it('returns null when token is malformed', () => {
    expect(decodeAuthUser('not-a-jwt')).toBeNull()
    expect(decodeAuthUser('a.b')).toBeNull()
  })

  it('decodes a valid JWT payload into userId/email/role', () => {
    // header.payload.signature — payload is base64url-encoded JSON
    const payload = { sub: 'user-123', email: 'a@b.com', role: 'USER' as const }
    const encodedPayload = btoa(JSON.stringify(payload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const fakeJwt = `header.${encodedPayload}.signature`

    expect(decodeAuthUser(fakeJwt)).toEqual({
      userId: 'user-123',
      email: 'a@b.com',
      role: 'USER',
    })
  })
})

describe('PostHog event helpers', () => {
  beforeEach(() => {
    captureMock.mockClear()
    // Helpers short-circuit on `__loaded === false`. Flip it on so capture
    // calls reach the mock; reset between tests via the assignment below.
    ;(posthog as unknown as { __loaded: boolean }).__loaded = true
  })

  afterEach(() => {
    ;(posthog as unknown as { __loaded: boolean }).__loaded = false
  })

  it('trackProductViewed forwards a snake_case payload', () => {
    trackProductViewed({
      productId: 'prod-1',
      slug: 'silver-ring',
      title: 'Silver Ring',
      priceUsd: 49.99,
      category: 'rings',
      stockType: 'IN_STOCK',
    })

    expect(captureMock).toHaveBeenCalledWith('product_viewed', {
      product_id: 'prod-1',
      product_slug: 'silver-ring',
      product_title: 'Silver Ring',
      price_usd: 49.99,
      category: 'rings',
      stock_type: 'IN_STOCK',
    })
  })

  it('trackProductAddedToCart computes line_value_usd from price × quantity', () => {
    trackProductAddedToCart({
      productId: 'prod-1',
      slug: 'silver-ring',
      title: 'Silver Ring',
      priceUsd: 30,
      quantity: 2,
    })

    expect(captureMock).toHaveBeenCalledWith(
      'product_added_to_cart',
      expect.objectContaining({ line_value_usd: 60, quantity: 2 }),
    )
  })

  it('trackCheckoutStarted sends cart_item_count and cart_total_usd', () => {
    trackCheckoutStarted({ cartItemCount: 3, cartTotalUsd: 199.5 })

    expect(captureMock).toHaveBeenCalledWith('checkout_started', {
      cart_item_count: 3,
      cart_total_usd: 199.5,
    })
  })

  it('trackOrderPlaced sends order properties', () => {
    trackOrderPlaced({
      orderId: 'order-42',
      totalUsd: 215.0,
      itemCount: 3,
      shippingCostUsd: 15.0,
    })

    expect(captureMock).toHaveBeenCalledWith('order_placed', {
      order_id: 'order-42',
      total_usd: 215.0,
      item_count: 3,
      shipping_cost_usd: 15.0,
    })
  })

  it('does not capture when posthog SDK is not loaded', () => {
    ;(posthog as unknown as { __loaded: boolean }).__loaded = false
    trackProductViewed({
      productId: 'prod-1',
      slug: 'silver-ring',
      title: 'Silver Ring',
      priceUsd: 49.99,
      stockType: 'IN_STOCK',
    })
    expect(captureMock).not.toHaveBeenCalled()
  })
})
