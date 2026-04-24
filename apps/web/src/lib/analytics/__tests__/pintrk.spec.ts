import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trackPinPageVisit, trackPinAddToCart, trackPinCheckout } from '../pintrk'

describe('pintrk analytics helpers', () => {
  const mockPintrk = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('window', { pintrk: mockPintrk })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('trackPinPageVisit sends pagevisit with product line item', () => {
    trackPinPageVisit({ productId: 'prod-1', price: 45 })

    expect(mockPintrk).toHaveBeenCalledWith('track', 'pagevisit', {
      line_items: [{ product_id: 'prod-1', product_price: 45 }],
    })
  })

  it('trackPinAddToCart sends addtocart with cart total and line items', () => {
    trackPinAddToCart(['prod-1', 'prod-2'], 90)

    expect(mockPintrk).toHaveBeenCalledWith('track', 'addtocart', {
      value: 90,
      order_quantity: 2,
      currency: 'USD',
      line_items: [{ product_id: 'prod-1' }, { product_id: 'prod-2' }],
    })
  })

  it('trackPinCheckout sends checkout with order data', () => {
    trackPinCheckout({ total: 95, productIds: ['prod-1'], orderId: 'order-123' })

    expect(mockPintrk).toHaveBeenCalledWith('track', 'checkout', {
      value: 95,
      order_quantity: 1,
      currency: 'USD',
      order_id: 'order-123',
      line_items: [{ product_id: 'prod-1' }],
    })
  })

  it('does not throw when pintrk is undefined', () => {
    vi.stubGlobal('window', {})

    expect(() => trackPinPageVisit({ productId: 'x', price: 10 })).not.toThrow()
    expect(() => trackPinAddToCart([], 0)).not.toThrow()
    expect(() => trackPinCheckout({ total: 0, productIds: [], orderId: '' })).not.toThrow()
  })
})
