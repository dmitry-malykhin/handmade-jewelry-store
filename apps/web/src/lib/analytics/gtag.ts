/**
 * GA4 gtag() wrapper — type-safe event helpers.
 * All functions are no-ops when GA_MEASUREMENT_ID is not set or gtag is unavailable.
 */

type GtagEventParams = Record<string, unknown>

function sendEvent(eventName: string, params: GtagEventParams): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params)
  }
}

// ── E-commerce events (GA4 standard) ─────────────────────────────────────────

interface ProductItem {
  productId: string
  title: string
  price: number
  quantity?: number
}

export function trackViewItem(product: ProductItem): void {
  sendEvent('view_item', {
    currency: 'USD',
    value: product.price,
    items: [{ item_id: product.productId, item_name: product.title, price: product.price }],
  })
}

export function trackAddToCart(product: ProductItem, quantity: number): void {
  sendEvent('add_to_cart', {
    currency: 'USD',
    value: product.price * quantity,
    items: [
      {
        item_id: product.productId,
        item_name: product.title,
        price: product.price,
        quantity,
      },
    ],
  })
}

export function trackRemoveFromCart(product: ProductItem, quantity: number): void {
  sendEvent('remove_from_cart', {
    currency: 'USD',
    value: product.price * quantity,
    items: [
      {
        item_id: product.productId,
        item_name: product.title,
        price: product.price,
        quantity,
      },
    ],
  })
}

interface CheckoutItems {
  productId: string
  title: string
  price: number
  quantity: number
}

export function trackBeginCheckout(cartTotal: number, items: CheckoutItems[]): void {
  sendEvent('begin_checkout', {
    currency: 'USD',
    value: cartTotal,
    items: items.map((item) => ({
      item_id: item.productId,
      item_name: item.title,
      price: item.price,
      quantity: item.quantity,
    })),
  })
}

interface PurchaseData {
  transactionId: string
  total: number
  shippingCost: number
  items: CheckoutItems[]
}

export function trackPurchase(purchase: PurchaseData): void {
  sendEvent('purchase', {
    transaction_id: purchase.transactionId,
    value: purchase.total,
    currency: 'USD',
    shipping: purchase.shippingCost,
    items: purchase.items.map((item) => ({
      item_id: item.productId,
      item_name: item.title,
      price: item.price,
      quantity: item.quantity,
    })),
  })
}

export function trackSignUp(method: string): void {
  sendEvent('sign_up', { method })
}

export function trackPageView(pagePath: string, pageTitle: string): void {
  sendEvent('page_view', { page_path: pagePath, page_title: pageTitle })
}
