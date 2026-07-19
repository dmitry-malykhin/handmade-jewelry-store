'use client'

import { useEffect, useRef } from 'react'
import { trackOrderPlaced } from '@/lib/analytics/posthog'
import { trackPurchase } from '@/lib/analytics/gtag'
import { trackFbPurchase } from '@/lib/analytics/fbq'
import { klaviyoPlacedOrder } from '@/lib/analytics/klaviyo'
import { trackPinCheckout } from '@/lib/analytics/pintrk'

export interface OrderPlacedTrackerItem {
  productId: string
  title: string
  price: number
  quantity: number
}

interface OrderPlacedTrackerProps {
  orderId: string
  totalUsd: number
  shippingCostUsd: number
  items: OrderPlacedTrackerItem[]
}

/**
 * Fires the order-placed event across every consented analytics channel once
 * when the confirmation page mounts. React Strict Mode double-invokes effects,
 * so the ref guard prevents a duplicate conversion capture.
 *
 * Server-side `payment_succeeded` (from Stripe webhook) is the
 * source-of-truth revenue event; this client event captures the user-facing
 * funnel completion so we can compare client vs server numbers for sanity.
 */
export function OrderPlacedTracker({
  orderId,
  totalUsd,
  shippingCostUsd,
  items,
}: OrderPlacedTrackerProps) {
  const hasFired = useRef(false)

  useEffect(() => {
    if (hasFired.current) return
    hasFired.current = true
    const itemCount = items.reduce((sum, orderItem) => sum + orderItem.quantity, 0)
    const productIds = items.map((orderItem) => orderItem.productId)
    trackOrderPlaced({ orderId, totalUsd, itemCount, shippingCostUsd })
    trackPurchase({
      transactionId: orderId,
      total: totalUsd,
      shippingCost: shippingCostUsd,
      items,
    })
    trackFbPurchase({ total: totalUsd, productIds })
    klaviyoPlacedOrder({ orderId, total: totalUsd, items })
    trackPinCheckout({ total: totalUsd, productIds, orderId })
  }, [orderId, totalUsd, shippingCostUsd, items])

  return null
}
