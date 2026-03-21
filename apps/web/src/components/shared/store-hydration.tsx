'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/store'

/**
 * Triggers Zustand persist rehydration on the client after first render.
 *
 * The cart store uses skipHydration: true to avoid SSR/client mismatches
 * (localStorage doesn't exist on the server). This component calls rehydrate()
 * inside useEffect — which only runs in the browser after hydration is complete.
 *
 * Place this once near the root of the client tree (locale layout).
 */
export function StoreHydration() {
  useEffect(() => {
    useCartStore.persist.rehydrate()
  }, [])

  return null
}
