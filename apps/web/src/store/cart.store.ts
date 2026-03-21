import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@jewelry/shared'

interface CartStore {
  items: CartItem[]

  /** Add a product to the cart. If it already exists, increments quantity. */
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void

  /** Remove a product from the cart entirely. */
  removeItem: (productId: string) => void

  /** Set an exact quantity. Removes the item if quantity ≤ 0. */
  updateQuantity: (productId: string, quantity: number) => void

  /** Empty the cart (e.g. after successful order). */
  clearCart: () => void
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: i.quantity + quantity } : i,
              ),
            }
          }
          return { items: [...state.items, { ...item, quantity }] }
        })
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }))
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set((state) => ({
          items: state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
        }))
      },

      clearCart: () => set({ items: [] }),
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

export const useCartItems = () => useCartStore((s) => s.items)

export const useCartTotalItems = () =>
  useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))

export const useCartTotalPrice = () =>
  useCartStore((s) => s.items.reduce((sum, i) => sum + i.price * i.quantity, 0))
