'use client'

import { useEffect } from 'react'
import { trackProductViewed } from '@/lib/analytics/posthog'
import { trackViewItem } from '@/lib/analytics/gtag'
import { trackFbViewContent } from '@/lib/analytics/fbq'
import { trackPinPageVisit } from '@/lib/analytics/pintrk'
import { klaviyoViewedProduct } from '@/lib/analytics/klaviyo'

interface ProductViewTrackerProps {
  productId: string
  slug: string
  title: string
  priceUsd: number
  categorySlug?: string
  stockType: string
  imageUrl?: string
}

/**
 * Fires the product-viewed event across every consented analytics channel
 * once when the product page mounts. Lives in its own Client island so the
 * parent product page can stay a Server Component (ISR-friendly).
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
  imageUrl,
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
    trackViewItem({ productId, title, price: priceUsd })
    trackFbViewContent({ productId, price: priceUsd })
    trackPinPageVisit({ productId, price: priceUsd })
    klaviyoViewedProduct({ productId, title, price: priceUsd, image: imageUrl, slug })
  }, [productId, slug, title, priceUsd, categorySlug, stockType, imageUrl])

  return null
}
