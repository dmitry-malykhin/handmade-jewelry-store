'use client'

import { useEffect, useRef } from 'react'
import { trackOrderPlaced } from '@/lib/analytics/posthog'

interface OrderPlacedTrackerProps {
  orderId: string
  totalUsd: number
  itemCount: number
  shippingCostUsd: number
}

/**
 * Fires PostHog `order_placed` once when the confirmation page mounts for a
 * successful order. Mirrors ExpressCheckoutCleanup's once-per-mount pattern
 * via a ref guard — React Strict Mode double-invokes effects, so we'd
 * otherwise capture the conversion twice.
 *
 * Server-side `payment_succeeded` (from Stripe webhook) is the
 * source-of-truth revenue event; this client event captures the user-facing
 * funnel completion so we can compare client vs server numbers for sanity.
 */
export function OrderPlacedTracker({
  orderId,
  totalUsd,
  itemCount,
  shippingCostUsd,
}: OrderPlacedTrackerProps) {
  const hasFired = useRef(false)

  useEffect(() => {
    if (hasFired.current) return
    hasFired.current = true
    trackOrderPlaced({ orderId, totalUsd, itemCount, shippingCostUsd })
  }, [orderId, totalUsd, itemCount, shippingCostUsd])

  return null
}
