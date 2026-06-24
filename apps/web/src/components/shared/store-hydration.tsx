'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/store'
import { useAuthStore } from '@/store/auth.store'
import { useCurrencyStore } from '@/store/currency.store'
import { useMeasurementStore } from '@/store/measurement.store'
import { useWishlistStore } from '@/store/wishlist.store'

// Mount once near the client tree root. Stores use skipHydration:true to avoid
// SSR/client mismatch (no localStorage on server); rehydrate() must run in
// useEffect AFTER hydration completes.
export function StoreHydration() {
  useEffect(() => {
    useCartStore.persist.rehydrate()
    useAuthStore.persist.rehydrate()
    useMeasurementStore.persist.rehydrate()
    useCurrencyStore.persist.rehydrate()
    useWishlistStore.persist.rehydrate()
  }, [])

  return null
}
