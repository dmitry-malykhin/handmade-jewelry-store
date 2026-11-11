'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/store'
import { useCurrencyStore } from '@/store/currency.store'
import { useMeasurementStore } from '@/store/measurement.store'
import { useWishlistStore } from '@/store/wishlist.store'

// Mount once near the client tree root. Stores use skipHydration:true to avoid
// SSR/client mismatch (no localStorage on server); rehydrate() must run in
// useEffect AFTER hydration completes.
//
// auth.store is deliberately NOT rehydrated here: accessToken is memory-only
// (#590) and gets refreshed by AuthBootstrap via the HttpOnly cookie.
export function StoreHydration() {
  useEffect(() => {
    useCartStore.persist.rehydrate()
    useMeasurementStore.persist.rehydrate()
    useCurrencyStore.persist.rehydrate()
    useWishlistStore.persist.rehydrate()
  }, [])

  return null
}
