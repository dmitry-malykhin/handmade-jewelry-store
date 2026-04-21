import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  trackViewItem,
  trackAddToCart,
  trackRemoveFromCart,
  trackBeginCheckout,
  trackPurchase,
  trackSignUp,
  trackPageView,
} from '../gtag'

describe('gtag analytics helpers', () => {
  const mockGtag = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('window', { gtag: mockGtag })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const sampleProduct = {
    productId: 'prod-1',
    title: 'Beaded Bracelet',
    price: 45,
  }

  it('trackViewItem sends view_item event with product data', () => {
    trackViewItem(sampleProduct)

    expect(mockGtag).toHaveBeenCalledWith('event', 'view_item', {
      currency: 'USD',
      value: 45,
      items: [{ item_id: 'prod-1', item_name: 'Beaded Bracelet', price: 45 }],
    })
  })

  it('trackAddToCart sends add_to_cart event with quantity', () => {
    trackAddToCart(sampleProduct, 2)

    expect(mockGtag).toHaveBeenCalledWith('event', 'add_to_cart', {
      currency: 'USD',
      value: 90,
      items: [{ item_id: 'prod-1', item_name: 'Beaded Bracelet', price: 45, quantity: 2 }],
    })
  })

  it('trackRemoveFromCart sends remove_from_cart event', () => {
    trackRemoveFromCart(sampleProduct, 1)

    expect(mockGtag).toHaveBeenCalledWith('event', 'remove_from_cart', {
      currency: 'USD',
      value: 45,
      items: [{ item_id: 'prod-1', item_name: 'Beaded Bracelet', price: 45, quantity: 1 }],
    })
  })

  it('trackBeginCheckout sends begin_checkout with cart items', () => {
    const items = [{ productId: 'prod-1', title: 'Bracelet', price: 45, quantity: 2 }]
    trackBeginCheckout(90, items)

    expect(mockGtag).toHaveBeenCalledWith('event', 'begin_checkout', {
      currency: 'USD',
      value: 90,
      items: [{ item_id: 'prod-1', item_name: 'Bracelet', price: 45, quantity: 2 }],
    })
  })

  it('trackPurchase sends purchase event with transaction data', () => {
    trackPurchase({
      transactionId: 'order-123',
      total: 95,
      shippingCost: 5,
      items: [{ productId: 'prod-1', title: 'Bracelet', price: 45, quantity: 2 }],
    })

    expect(mockGtag).toHaveBeenCalledWith('event', 'purchase', {
      transaction_id: 'order-123',
      value: 95,
      currency: 'USD',
      shipping: 5,
      items: [{ item_id: 'prod-1', item_name: 'Bracelet', price: 45, quantity: 2 }],
    })
  })

  it('trackSignUp sends sign_up event with method', () => {
    trackSignUp('email')

    expect(mockGtag).toHaveBeenCalledWith('event', 'sign_up', { method: 'email' })
  })

  it('trackPageView sends page_view event', () => {
    trackPageView('/en/shop', 'Shop — Senichka')

    expect(mockGtag).toHaveBeenCalledWith('event', 'page_view', {
      page_path: '/en/shop',
      page_title: 'Shop — Senichka',
    })
  })

  it('does not throw when gtag is undefined', () => {
    vi.stubGlobal('window', {})

    expect(() => trackViewItem(sampleProduct)).not.toThrow()
    expect(() => trackAddToCart(sampleProduct, 1)).not.toThrow()
    expect(() =>
      trackPurchase({ transactionId: 'x', total: 0, shippingCost: 0, items: [] }),
    ).not.toThrow()
  })
})
