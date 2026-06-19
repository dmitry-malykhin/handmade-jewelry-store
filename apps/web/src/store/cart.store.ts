import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@jewelry/shared'

interface CartStore {
  items: CartItem[]

  /**
   * Single-product express checkout state. When set, the checkout flow buys
   * only this item and ignores `items`. The regular cart is preserved untouched.
   */
  expressItem: CartItem | null

  /** Idempotent — handmade pieces are unique, quantity is always 1. */
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void

  removeItem: (productId: string) => void

  /** Removes the item if quantity ≤ 0. */
  updateQuantity: (productId: string, quantity: number) => void

  clearCart: () => void

  setExpressItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void

  clearExpressItem: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      expressItem: null,

      addItem: (item, _quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find((cartItem) => cartItem.productId === item.productId)
          if (existingItem) return state
          return { items: [...state.items, { ...item, quantity: 1 }] }
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
        const clampedQuantity = Math.min(quantity, 1)
        set((state) => ({
          items: state.items.map((cartItem) =>
            cartItem.productId === productId
              ? { ...cartItem, quantity: clampedQuantity }
              : cartItem,
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      setExpressItem: (item, _quantity = 1) => {
        set({ expressItem: { ...item, quantity: 1 } })
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

export const useCartItems = () => useCartStore((state) => state.items)

export const useCartTotalItems = () =>
  useCartStore((state) => state.items.reduce((sum, cartItem) => sum + cartItem.quantity, 0))

export const useCartTotalPrice = () =>
  useCartStore((state) =>
    state.items.reduce((sum, cartItem) => sum + cartItem.price * cartItem.quantity, 0),
  )

// Subscribe to `items` and `expressItem` separately and derive in the hook
// body — passing a derived array directly to useCartStore would create a fresh
// reference every render and trigger Zustand's snapshot-caching loop.
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
