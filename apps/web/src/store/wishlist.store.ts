import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WishlistStore {
  /**
   * Set of product IDs the user has wishlisted. Lookup is O(1) via Set,
   * critical because every ProductCard checks `has()` on render.
   */
  productIds: string[]

  /** Add a product. Idempotent — adding the same id twice is a no-op. */
  add: (productId: string) => void

  /** Remove a product. Idempotent. */
  remove: (productId: string) => void

  /** Replace the whole list — used by the merge-on-login flow once the server returns the canonical list. */
  setAll: (productIds: string[]) => void

  /** Empty the local wishlist. Called after a successful merge to avoid double-counting. */
  clear: () => void
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set) => ({
      productIds: [],

      add: (productId) => {
        set((state) => {
          if (state.productIds.includes(productId)) return state
          return { productIds: [...state.productIds, productId] }
        })
      },

      remove: (productId) => {
        set((state) => ({
          productIds: state.productIds.filter((id) => id !== productId),
        }))
      },

      setAll: (productIds) => set({ productIds }),

      clear: () => set({ productIds: [] }),
    }),
    {
      name: 'jewelry-wishlist',
      // Same SSR-safety pattern as the cart store. Rehydrated once on the client
      // via StoreHydration to keep server-rendered HTML deterministic.
      skipHydration: true,
    },
  ),
)

// ── Selector hooks ────────────────────────────────────────────────────────────

export const useWishlistProductIds = () => useWishlistStore((state) => state.productIds)

export const useIsInWishlist = (productId: string) =>
  useWishlistStore((state) => state.productIds.includes(productId))

export const useWishlistCount = () => useWishlistStore((state) => state.productIds.length)
