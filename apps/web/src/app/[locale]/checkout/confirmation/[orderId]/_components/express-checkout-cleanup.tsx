'use client'

import { useEffect, useRef } from 'react'
import { useCartStore } from '@/store'
import { useAuthStore } from '@/store/auth.store'
import { useWishlistStore } from '@/store/wishlist.store'
import { removeFromWishlist } from '@/lib/api/wishlist'

/**
 * Renders nothing — runs cleanup on mount of the confirmation page.
 *
 * Two responsibilities for the Buy Now flow:
 *  1. Discard the ephemeral `expressItem` from the cart store, so the next
 *     /checkout visit shows the regular cart again.
 *  2. Remove the purchased product from the user's wishlist (server + local
 *     state). The order has materialised — keeping it in the wishlist would
 *     be misleading and inflates the wishlist count.
 *
 * Runs once per mount via a ref guard to avoid double-invocation under React
 * Strict Mode / fast refresh.
 *
 * NOTE: Clearing the regular cart after a non-express order is a separate
 * pre-existing concern (cart persists post-purchase). Out of scope for #225.
 */
export function ExpressCheckoutCleanup() {
  const hasRunRef = useRef(false)

  useEffect(() => {
    if (hasRunRef.current) return
    hasRunRef.current = true

    const expressItem = useCartStore.getState().expressItem
    if (!expressItem) return

    const productId = expressItem.productId
    useCartStore.getState().clearExpressItem()
    useWishlistStore.getState().remove(productId)

    const accessToken = useAuthStore.getState().accessToken
    if (accessToken) {
      // Best-effort server sync. If it fails (network, 401), local state already
      // reflects the change — the next wishlist load will reconcile.
      removeFromWishlist(accessToken, productId).catch(() => {
        // Intentionally silent: confirmation page is a happy-path UI; we don't
        // want to surface a wishlist-cleanup error to a user who just paid.
      })
    }
  }, [])

  return null
}
