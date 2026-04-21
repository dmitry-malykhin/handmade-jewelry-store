import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  trackFbViewContent,
  trackFbAddToCart,
  trackFbInitiateCheckout,
  trackFbPurchase,
} from '../fbq'

describe('fbq analytics helpers', () => {
  const mockFbq = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('window', { fbq: mockFbq })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('trackFbViewContent sends ViewContent with product data', () => {
    trackFbViewContent({ productId: 'prod-1', price: 45 })

    expect(mockFbq).toHaveBeenCalledWith('track', 'ViewContent', {
      content_ids: ['prod-1'],
      content_type: 'product',
      value: 45,
      currency: 'USD',
    })
  })

  it('trackFbAddToCart sends AddToCart with product IDs and total', () => {
    trackFbAddToCart(['prod-1', 'prod-2'], 90)

    expect(mockFbq).toHaveBeenCalledWith('track', 'AddToCart', {
      content_ids: ['prod-1', 'prod-2'],
      value: 90,
      currency: 'USD',
    })
  })

  it('trackFbInitiateCheckout sends InitiateCheckout with item count and total', () => {
    trackFbInitiateCheckout(3, 135)

    expect(mockFbq).toHaveBeenCalledWith('track', 'InitiateCheckout', {
      num_items: 3,
      value: 135,
      currency: 'USD',
    })
  })

  it('trackFbPurchase sends Purchase with total and product IDs', () => {
    trackFbPurchase({ total: 95, productIds: ['prod-1'] })

    expect(mockFbq).toHaveBeenCalledWith('track', 'Purchase', {
      value: 95,
      currency: 'USD',
      content_ids: ['prod-1'],
    })
  })

  it('does not throw when fbq is undefined', () => {
    vi.stubGlobal('window', {})

    expect(() => trackFbViewContent({ productId: 'x', price: 10 })).not.toThrow()
    expect(() => trackFbAddToCart([], 0)).not.toThrow()
    expect(() => trackFbPurchase({ total: 0, productIds: [] })).not.toThrow()
  })
})
