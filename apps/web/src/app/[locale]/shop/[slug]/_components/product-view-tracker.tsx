'use client'

import { useEffect } from 'react'
import { trackProductViewed } from '@/lib/analytics/posthog'

interface ProductViewTrackerProps {
  productId: string
  slug: string
  title: string
  priceUsd: number
  categorySlug?: string
  stockType: string
}

/**
 * Fires PostHog `product_viewed` once when the product page mounts on the
 * client. Lives in its own Client island so the parent product page can stay
 * a Server Component (ISR-friendly).
 *
 * The slug is included in deps so a soft client-side navigation between two
 * product pages re-fires the event for the new product.
 */
export function ProductViewTracker({
  productId,
  slug,
  title,
  priceUsd,
  categorySlug,
  stockType,
}: ProductViewTrackerProps) {
  useEffect(() => {
    trackProductViewed({
      productId,
      slug,
      title,
      priceUsd,
      category: categorySlug,
      stockType,
    })
  }, [productId, slug, title, priceUsd, categorySlug, stockType])

  return null
}
