'use client'

import { useEffect, useRef } from 'react'
import { useCartStore } from '@/store'
import { useAuthStore } from '@/store/auth.store'
import { useWishlistStore } from '@/store/wishlist.store'
import { removeFromWishlist } from '@/lib/api/wishlist'

// Confirmation-page cleanup for the Buy Now flow: drops expressItem from cart
// store and removes the purchased product from the wishlist. ref-guarded to
// avoid double-invocation under React Strict Mode.
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
      // Best-effort sync; local state already reflects the change and the next
      // wishlist load will reconcile. Silent — the user just paid.
      removeFromWishlist(accessToken, productId).catch(() => undefined)
    }
  }, [])

  return null
}
