import { describe, it, expect, beforeEach } from 'vitest'
import {
  useCartStore,
  useCartTotalItems,
  useCartTotalPrice,
  useCheckoutItems,
  useCheckoutTotalPrice,
  useExpressItem,
  useIsExpressCheckout,
} from '@/store/cart.store'
import { renderHook, act } from '@testing-library/react'

// Snapshot of product data as it would arrive when adding to cart
const mockRing = {
  productId: 'prod-1',
  slug: 'sterling-silver-ring',
  title: 'Sterling Silver Ring',
  price: 49.99,
  image: '/images/ring.jpg',
  productionDays: 0,
}

const mockNecklace = {
  productId: 'prod-2',
  slug: 'gold-necklace',
  title: 'Gold Necklace',
  price: 129.99,
  image: '/images/necklace.jpg',
  productionDays: 5,
}

// Reset store to empty state before each test — ensures full isolation
beforeEach(() => {
  useCartStore.setState({ items: [], expressItem: null })
})

// ── addItem ────────────────────────────────────────────────────────────────────

describe('addItem()', () => {
  it('adds a new product to the cart with quantity 1', () => {
    useCartStore.getState().addItem(mockRing)

    const { items } = useCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0]?.productId).toBe('prod-1')
    expect(items[0]?.quantity).toBe(1)
  })

  it('ignores the explicit quantity argument and always stores 1 (handmade business rule)', () => {
    useCartStore.getState().addItem(mockRing, 3)

    expect(useCartStore.getState().items[0]?.quantity).toBe(1)
  })

  it('is a no-op when the same product is added twice — never increments past 1', () => {
    useCartStore.getState().addItem(mockRing)
    useCartStore.getState().addItem(mockRing)

    const { items } = useCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0]?.quantity).toBe(1)
  })

  it('keeps multiple different products as separate cart items', () => {
    useCartStore.getState().addItem(mockRing)
    useCartStore.getState().addItem(mockNecklace)

    expect(useCartStore.getState().items).toHaveLength(2)
  })

  it('stores all product snapshot fields in the cart item', () => {
    useCartStore.getState().addItem(mockRing)

    const [cartItem] = useCartStore.getState().items
    expect(cartItem?.slug).toBe('sterling-silver-ring')
    expect(cartItem?.title).toBe('Sterling Silver Ring')
    expect(cartItem?.price).toBe(49.99)
    expect(cartItem?.image).toBe('/images/ring.jpg')
    expect(cartItem?.productionDays).toBe(0)
  })
})

// ── removeItem ─────────────────────────────────────────────────────────────────

describe('removeItem()', () => {
  it('removes the product from the cart', () => {
    useCartStore.getState().addItem(mockRing)
    useCartStore.getState().removeItem('prod-1')

    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('removes only the specified product, leaving others intact', () => {
    useCartStore.getState().addItem(mockRing)
    useCartStore.getState().addItem(mockNecklace)
    useCartStore.getState().removeItem('prod-1')

    const { items } = useCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0]?.productId).toBe('prod-2')
  })

  it('does nothing when removing a product not in the cart', () => {
    useCartStore.getState().addItem(mockRing)
    useCartStore.getState().removeItem('non-existent-id')

    expect(useCartStore.getState().items).toHaveLength(1)
  })
})

// ── updateQuantity ─────────────────────────────────────────────────────────────

describe('updateQuantity()', () => {
  it('clamps any quantity > 1 down to 1', () => {
    useCartStore.getState().addItem(mockRing)
    useCartStore.getState().updateQuantity('prod-1', 5)

    expect(useCartStore.getState().items[0]?.quantity).toBe(1)
  })

  it('removes the item when quantity is set to 0', () => {
    useCartStore.getState().addItem(mockRing)
    useCartStore.getState().updateQuantity('prod-1', 0)

    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('removes the item when quantity is set to a negative number', () => {
    useCartStore.getState().addItem(mockRing)
    useCartStore.getState().updateQuantity('prod-1', -1)

    expect(useCartStore.getState().items).toHaveLength(0)
  })
})

// ── clearCart ──────────────────────────────────────────────────────────────────

describe('clearCart()', () => {
  it('empties the cart', () => {
    useCartStore.getState().addItem(mockRing)
    useCartStore.getState().addItem(mockNecklace)
    useCartStore.getState().clearCart()

    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('does not throw when called on an already empty cart', () => {
    expect(() => useCartStore.getState().clearCart()).not.toThrow()
  })
})

// ── selector hooks ─────────────────────────────────────────────────────────────

describe('useCartTotalItems()', () => {
  it('returns 0 for an empty cart', () => {
    const { result } = renderHook(() => useCartTotalItems())
    expect(result.current).toBe(0)
  })

  it('counts each product as 1 (quantity is hard-capped at 1)', () => {
    act(() => {
      useCartStore.getState().addItem(mockRing)
      useCartStore.getState().addItem(mockNecklace)
    })

    const { result } = renderHook(() => useCartTotalItems())
    expect(result.current).toBe(2)
  })
})

describe('useCartTotalPrice()', () => {
  it('returns 0 for an empty cart', () => {
    const { result } = renderHook(() => useCartTotalPrice())
    expect(result.current).toBe(0)
  })

  it('sums prices across cart items (each item is qty 1)', () => {
    act(() => {
      useCartStore.getState().addItem(mockRing)
      useCartStore.getState().addItem(mockNecklace)
    })

    const { result } = renderHook(() => useCartTotalPrice())
    // 49.99 + 129.99 = 179.98
    expect(result.current).toBeCloseTo(179.98, 2)
  })
})

// ── Express checkout (Buy Now) ────────────────────────────────────────────────

describe('expressItem flow', () => {
  it('starts as null', () => {
    expect(useCartStore.getState().expressItem).toBeNull()
  })

  it('setExpressItem stores a single-item snapshot with quantity 1', () => {
    useCartStore.getState().setExpressItem(mockRing)

    expect(useCartStore.getState().expressItem).toEqual({ ...mockRing, quantity: 1 })
  })

  it('setExpressItem ignores explicit quantity argument and stores 1', () => {
    useCartStore.getState().setExpressItem(mockRing, 3)

    expect(useCartStore.getState().expressItem?.quantity).toBe(1)
  })

  it('clearExpressItem resets to null', () => {
    useCartStore.getState().setExpressItem(mockRing)
    useCartStore.getState().clearExpressItem()

    expect(useCartStore.getState().expressItem).toBeNull()
  })

  it('setExpressItem does NOT touch the regular cart', () => {
    useCartStore.getState().addItem(mockRing)
    useCartStore.getState().setExpressItem(mockNecklace)

    const state = useCartStore.getState()
    expect(state.items).toHaveLength(1)
    expect(state.items[0]?.productId).toBe('prod-1')
    expect(state.expressItem?.productId).toBe('prod-2')
  })
})

describe('useCheckoutItems()', () => {
  it('returns the regular cart when no express item is set', () => {
    act(() => {
      useCartStore.getState().addItem(mockRing)
    })

    const { result } = renderHook(() => useCheckoutItems())
    expect(result.current).toHaveLength(1)
    expect(result.current[0]?.productId).toBe('prod-1')
  })

  it('shadows the regular cart with the express item when set', () => {
    act(() => {
      useCartStore.getState().addItem(mockRing)
      useCartStore.getState().setExpressItem(mockNecklace)
    })

    const { result } = renderHook(() => useCheckoutItems())
    expect(result.current).toHaveLength(1)
    expect(result.current[0]?.productId).toBe('prod-2')
  })

  it('switches back to the regular cart after clearExpressItem', () => {
    act(() => {
      useCartStore.getState().addItem(mockRing)
      useCartStore.getState().setExpressItem(mockNecklace)
    })
    act(() => {
      useCartStore.getState().clearExpressItem()
    })

    const { result } = renderHook(() => useCheckoutItems())
    expect(result.current[0]?.productId).toBe('prod-1')
  })
})

describe('useCheckoutTotalPrice()', () => {
  it('uses the regular cart subtotal when no express item', () => {
    act(() => {
      useCartStore.getState().addItem(mockRing)
    })

    const { result } = renderHook(() => useCheckoutTotalPrice())
    expect(result.current).toBeCloseTo(49.99, 2)
  })

  it('uses ONLY the express item when set, ignoring the regular cart', () => {
    act(() => {
      useCartStore.getState().addItem(mockRing)
      useCartStore.getState().setExpressItem(mockNecklace)
    })

    const { result } = renderHook(() => useCheckoutTotalPrice())
    expect(result.current).toBeCloseTo(129.99, 2)
  })
})

describe('useIsExpressCheckout / useExpressItem', () => {
  it('returns false / null by default', () => {
    const { result: flagResult } = renderHook(() => useIsExpressCheckout())
    const { result: itemResult } = renderHook(() => useExpressItem())
    expect(flagResult.current).toBe(false)
    expect(itemResult.current).toBeNull()
  })

  it('flips to true once setExpressItem fires', () => {
    act(() => {
      useCartStore.getState().setExpressItem(mockRing)
    })

    const { result: flagResult } = renderHook(() => useIsExpressCheckout())
    const { result: itemResult } = renderHook(() => useExpressItem())
    expect(flagResult.current).toBe(true)
    expect(itemResult.current?.productId).toBe('prod-1')
  })
})
