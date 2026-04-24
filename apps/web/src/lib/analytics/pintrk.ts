/**
 * Pinterest Tag pintrk() wrapper — type-safe event helpers.
 * All functions are no-ops when PINTEREST_TAG_ID is not set or pintrk is unavailable.
 */

function sendEvent(eventName: string, params: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && window.pintrk) {
    window.pintrk('track', eventName, params)
  }
}

interface ProductItem {
  productId: string
  price: number
}

export function trackPinPageVisit(product: ProductItem): void {
  sendEvent('pagevisit', {
    line_items: [
      {
        product_id: product.productId,
        product_price: product.price,
      },
    ],
  })
}

export function trackPinAddToCart(productIds: string[], cartTotal: number): void {
  sendEvent('addtocart', {
    value: cartTotal,
    order_quantity: productIds.length,
    currency: 'USD',
    line_items: productIds.map((id) => ({ product_id: id })),
  })
}

interface CheckoutData {
  total: number
  productIds: string[]
  orderId: string
}

export function trackPinCheckout(checkout: CheckoutData): void {
  sendEvent('checkout', {
    value: checkout.total,
    order_quantity: checkout.productIds.length,
    currency: 'USD',
    order_id: checkout.orderId,
    line_items: checkout.productIds.map((id) => ({ product_id: id })),
  })
}
