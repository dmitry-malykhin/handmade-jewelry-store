/**
 * Facebook Pixel fbq() wrapper — type-safe event helpers.
 * All functions are no-ops when FB_PIXEL_ID is not set or fbq is unavailable.
 */

function sendEvent(eventName: string, params: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, params)
  }
}

// ── Standard e-commerce events (Meta Pixel) ──────────────────────────────────

interface ProductItem {
  productId: string
  price: number
}

export function trackFbViewContent(product: ProductItem): void {
  sendEvent('ViewContent', {
    content_ids: [product.productId],
    content_type: 'product',
    value: product.price,
    currency: 'USD',
  })
}

export function trackFbAddToCart(productIds: string[], cartTotal: number): void {
  sendEvent('AddToCart', {
    content_ids: productIds,
    value: cartTotal,
    currency: 'USD',
  })
}

export function trackFbInitiateCheckout(itemCount: number, cartTotal: number): void {
  sendEvent('InitiateCheckout', {
    num_items: itemCount,
    value: cartTotal,
    currency: 'USD',
  })
}

interface PurchaseData {
  total: number
  productIds: string[]
}

export function trackFbPurchase(purchase: PurchaseData): void {
  sendEvent('Purchase', {
    value: purchase.total,
    currency: 'USD',
    content_ids: purchase.productIds,
  })
}
