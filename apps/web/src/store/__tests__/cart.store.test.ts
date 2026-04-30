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
}

const mockNecklace = {
  productId: 'prod-2',
  slug: 'gold-necklace',
  title: 'Gold Necklace',
  price: 129.99,
  image: '/images/necklace.jpg',
}

// Reset store to empty state before each test — ensures full isolation
beforeEach(() => {
  useCartStore.setState({ items: [], expressItem: null })
})

// ── addItem ────────────────────────────────────────────────────────────────────

describe('addItem()', () => {
  it('adds a new product to the cart with quantity 1 by default', () => {
    useCartStore.getState().addItem(mockRing)

    const { items } = useCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0]?.productId).toBe('prod-1')
    expect(items[0]?.quantity).toBe(1)
  })

  it('adds a new product with a specified quantity', () => {
    useCartStore.getState().addItem(mockRing, 3)

    expect(useCartStore.getState().items[0]?.quantity).toBe(3)
  })

  it('increments quantity when the same product is added twice', () => {
    useCartStore.getState().addItem(mockRing)
    useCartStore.getState().addItem(mockRing)

    const { items } = useCartStore.getState()
    expect(items).toHaveLength(1) // no duplicate entries
    expect(items[0]?.quantity).toBe(2)
  })

  it('increments by the specified quantity on repeated add', () => {
    useCartStore.getState().addItem(mockRing, 2)
    useCartStore.getState().addItem(mockRing, 3)

    expect(useCartStore.getState().items[0]?.quantity).toBe(5)
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
  it('sets an exact quantity for an existing cart item', () => {
    useCartStore.getState().addItem(mockRing)
    useCartStore.getState().updateQuantity('prod-1', 5)

    expect(useCartStore.getState().items[0]?.quantity).toBe(5)
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

  it('sums quantities across all cart items', () => {
    act(() => {
      useCartStore.getState().addItem(mockRing, 2)
      useCartStore.getState().addItem(mockNecklace, 3)
    })

    const { result } = renderHook(() => useCartTotalItems())
    expect(result.current).toBe(5)
  })
})

describe('useCartTotalPrice()', () => {
  it('returns 0 for an empty cart', () => {
    const { result } = renderHook(() => useCartTotalPrice())
    expect(result.current).toBe(0)
  })

  it('calculates total price correctly: (price × quantity) summed', () => {
    act(() => {
      // 49.99 × 2 = 99.98
      useCartStore.getState().addItem(mockRing, 2)
      // 129.99 × 1 = 129.99
      useCartStore.getState().addItem(mockNecklace, 1)
    })

    const { result } = renderHook(() => useCartTotalPrice())
    // 99.98 + 129.99 = 229.97
    expect(result.current).toBeCloseTo(229.97, 2)
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

  it('setExpressItem accepts an explicit quantity', () => {
    useCartStore.getState().setExpressItem(mockRing, 3)

    expect(useCartStore.getState().expressItem?.quantity).toBe(3)
  })

  it('clearExpressItem resets to null', () => {
    useCartStore.getState().setExpressItem(mockRing)
    useCartStore.getState().clearExpressItem()

    expect(useCartStore.getState().expressItem).toBeNull()
  })

  it('setExpressItem does NOT touch the regular cart', () => {
    useCartStore.getState().addItem(mockRing, 2)
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
      useCartStore.getState().addItem(mockRing, 2)
    })

    const { result } = renderHook(() => useCheckoutItems())
    expect(result.current).toHaveLength(1)
    expect(result.current[0]?.productId).toBe('prod-1')
  })

  it('shadows the regular cart with the express item when set', () => {
    act(() => {
      useCartStore.getState().addItem(mockRing, 2)
      useCartStore.getState().setExpressItem(mockNecklace)
    })

    const { result } = renderHook(() => useCheckoutItems())
    expect(result.current).toHaveLength(1)
    expect(result.current[0]?.productId).toBe('prod-2')
  })

  it('switches back to the regular cart after clearExpressItem', () => {
    act(() => {
      useCartStore.getState().addItem(mockRing, 2)
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
      useCartStore.getState().addItem(mockRing, 2) // 49.99 × 2 = 99.98
    })

    const { result } = renderHook(() => useCheckoutTotalPrice())
    expect(result.current).toBeCloseTo(99.98, 2)
  })

  it('uses ONLY the express item when set, ignoring the regular cart', () => {
    act(() => {
      useCartStore.getState().addItem(mockRing, 5) // would be 249.95 if used
      useCartStore.getState().setExpressItem(mockNecklace) // 129.99 × 1
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
