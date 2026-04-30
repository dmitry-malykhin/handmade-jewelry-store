import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@jewelry/shared'

interface CartStore {
  items: CartItem[]

  /**
   * Single-product express checkout state. When set, the checkout flow buys ONLY
   * this item and ignores `items`. The regular cart is preserved untouched.
   * Cleared on confirmation success or when the user navigates away from /checkout.
   */
  expressItem: CartItem | null

  /** Add a product to the cart. If it already exists, increments quantity. */
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void

  /** Remove a product from the cart entirely. */
  removeItem: (productId: string) => void

  /** Set an exact quantity. Removes the item if quantity ≤ 0. */
  updateQuantity: (productId: string, quantity: number) => void

  /** Empty the cart (e.g. after successful order). */
  clearCart: () => void

  /** Start an express checkout for a single product (Buy Now flow). */
  setExpressItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void

  /** Discard the express item — call on confirmation success or checkout abandonment. */
  clearExpressItem: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      expressItem: null,

      addItem: (item, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find((cartItem) => cartItem.productId === item.productId)
          if (existingItem) {
            return {
              items: state.items.map((cartItem) =>
                cartItem.productId === item.productId
                  ? { ...cartItem, quantity: cartItem.quantity + quantity }
                  : cartItem,
              ),
            }
          }
          return { items: [...state.items, { ...item, quantity }] }
        })
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((cartItem) => cartItem.productId !== productId),
        }))
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set((state) => ({
          items: state.items.map((cartItem) =>
            cartItem.productId === productId ? { ...cartItem, quantity } : cartItem,
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      setExpressItem: (item, quantity = 1) => {
        set({ expressItem: { ...item, quantity } })
      },

      clearExpressItem: () => set({ expressItem: null }),
    }),
    {
      name: 'jewelry-cart',
      // skipHydration prevents SSR/client mismatch.
      // Call useCartStore.persist.rehydrate() once on the client (StoreHydration).
      skipHydration: true,
    },
  ),
)

// ── Selector hooks ────────────────────────────────────────────────────────────
// Fine-grained selectors prevent unnecessary re-renders — components subscribe
// only to the slice of state they actually need.

export const useCartItems = () => useCartStore((state) => state.items)

export const useCartTotalItems = () =>
  useCartStore((state) => state.items.reduce((sum, cartItem) => sum + cartItem.quantity, 0))

export const useCartTotalPrice = () =>
  useCartStore((state) =>
    state.items.reduce((sum, cartItem) => sum + cartItem.price * cartItem.quantity, 0),
  )

// ── Checkout selectors — switch between regular cart and express item ─────────
// These are the single source of truth for any code under /checkout. When
// `expressItem` is set (Buy Now flow) it shadows the cart; the regular cart
// stays intact and reappears the moment the express flow ends.
//
// Implementation note: each `useCartStore(selector)` call must return a stable
// reference when the underlying state hasn't changed — otherwise Zustand's
// snapshot caching (via React's useSyncExternalStore) falsely detects "change",
// triggering an infinite render loop. We therefore subscribe to the raw
// `items` and `expressItem` separately and derive the result in the hook body,
// where each render naturally creates a fresh array but Zustand never sees it.

export const useCheckoutItems = (): CartItem[] => {
  const items = useCartStore((state) => state.items)
  const expressItem = useCartStore((state) => state.expressItem)
  return expressItem ? [expressItem] : items
}

export const useCheckoutTotalPrice = (): number => {
  const items = useCartStore((state) => state.items)
  const expressItem = useCartStore((state) => state.expressItem)
  const source = expressItem ? [expressItem] : items
  return source.reduce((sum, cartItem) => sum + cartItem.price * cartItem.quantity, 0)
}

export const useIsExpressCheckout = () => useCartStore((state) => state.expressItem !== null)

export const useExpressItem = () => useCartStore((state) => state.expressItem)
