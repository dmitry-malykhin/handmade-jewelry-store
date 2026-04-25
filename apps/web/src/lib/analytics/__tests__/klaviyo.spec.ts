import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  klaviyoIdentify,
  klaviyoViewedProduct,
  klaviyoAddedToCart,
  klaviyoStartedCheckout,
  klaviyoPlacedOrder,
} from '../klaviyo'

describe('klaviyo analytics helpers', () => {
  let queue: Array<[string, ...unknown[]]>

  beforeEach(() => {
    queue = []
    vi.stubGlobal('window', { _learnq: queue })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('klaviyoIdentify pushes identify with email', () => {
    klaviyoIdentify('jane@example.com', { FirstName: 'Jane' })

    expect(queue).toEqual([['identify', { $email: 'jane@example.com', FirstName: 'Jane' }]])
  })

  it('klaviyoViewedProduct pushes Viewed Product event', () => {
    klaviyoViewedProduct({
      productId: 'prod-1',
      title: 'Beaded Bracelet',
      price: 45,
      image: 'https://cdn.example.com/img.jpg',
      slug: 'beaded-bracelet',
    })

    expect(queue).toEqual([
      [
        'track',
        'Viewed Product',
        {
          ProductID: 'prod-1',
          ProductName: 'Beaded Bracelet',
          Price: 45,
          ImageURL: 'https://cdn.example.com/img.jpg',
          URL: '/shop/beaded-bracelet',
        },
      ],
    ])
  })

  it('klaviyoAddedToCart pushes Added to Cart with item and cart total', () => {
    klaviyoAddedToCart({ productId: 'prod-1', title: 'Bracelet', price: 45, quantity: 2 }, 90)

    expect(queue[0]).toEqual([
      'track',
      'Added to Cart',
      {
        AddedItem: { ProductID: 'prod-1', ProductName: 'Bracelet', Price: 45, Quantity: 2 },
        CartTotal: 90,
      },
    ])
  })

  it('klaviyoStartedCheckout pushes Started Checkout with items', () => {
    klaviyoStartedCheckout([{ productId: 'prod-1', title: 'Bracelet', price: 45, quantity: 2 }], 90)

    expect(queue[0]).toEqual([
      'track',
      'Started Checkout',
      {
        $value: 90,
        ItemCount: 2,
        Items: [{ ProductID: 'prod-1', ProductName: 'Bracelet', Price: 45, Quantity: 2 }],
      },
    ])
  })

  it('klaviyoPlacedOrder pushes Placed Order with order_id', () => {
    klaviyoPlacedOrder({
      orderId: 'order-123',
      total: 90,
      items: [{ productId: 'prod-1', title: 'Bracelet', price: 45, quantity: 2 }],
    })

    expect(queue[0]).toEqual([
      'track',
      'Placed Order',
      {
        $event_id: 'order-123',
        $value: 90,
        OrderId: 'order-123',
        Items: [{ ProductID: 'prod-1', ProductName: 'Bracelet', Price: 45, Quantity: 2 }],
      },
    ])
  })

  it('initialises _learnq if not present', () => {
    vi.stubGlobal('window', {})

    klaviyoIdentify('user@example.com')

    expect((window as Window & { _learnq?: unknown })._learnq).toBeDefined()
  })
})
