// Wrappers are no-ops when the SDK isn't initialised (no consent / no env);
// call sites don't need to guard. Event taxonomy: docs/16_USER_ANALYTICS.md §6.

import posthog from 'posthog-js'

type UserRole = 'USER' | 'ADMIN'

interface DecodedAuthUser {
  userId: string
  email: string
  role: UserRole
}

interface JwtPayload {
  sub: string
  email: string
  role: UserRole
}

// Duplicated from auth.store.ts so analytics doesn't import the Zustand store
// just to read the JWT shape.
export function decodeAuthUser(accessToken: string | null): DecodedAuthUser | null {
  if (!accessToken) return null
  try {
    const segment = accessToken.split('.')[1]
    if (!segment) return null
    const base64Payload = segment.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64Payload)) as JwtPayload
    return { userId: payload.sub, email: payload.email, role: payload.role }
  } catch {
    return null
  }
}

function capture(event: string, properties: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  if (!posthog.__loaded) return
  posthog.capture(event, properties)
}

interface ProductViewedProps {
  productId: string
  slug: string
  title: string
  priceUsd: number
  category?: string
  stockType?: string
}

export function trackProductViewed(product: ProductViewedProps): void {
  capture('product_viewed', {
    product_id: product.productId,
    product_slug: product.slug,
    product_title: product.title,
    price_usd: product.priceUsd,
    category: product.category,
    stock_type: product.stockType,
  })
}

interface ProductAddedToCartProps {
  productId: string
  slug: string
  title: string
  priceUsd: number
  quantity: number
}

export function trackProductAddedToCart(product: ProductAddedToCartProps): void {
  capture('product_added_to_cart', {
    product_id: product.productId,
    product_slug: product.slug,
    product_title: product.title,
    price_usd: product.priceUsd,
    quantity: product.quantity,
    line_value_usd: product.priceUsd * product.quantity,
  })
}

interface CheckoutStartedProps {
  cartItemCount: number
  cartTotalUsd: number
}

export function trackCheckoutStarted(checkout: CheckoutStartedProps): void {
  capture('checkout_started', {
    cart_item_count: checkout.cartItemCount,
    cart_total_usd: checkout.cartTotalUsd,
  })
}

interface OrderPlacedProps {
  orderId: string
  totalUsd: number
  itemCount: number
  shippingCostUsd: number
}

export function trackOrderPlaced(order: OrderPlacedProps): void {
  capture('order_placed', {
    order_id: order.orderId,
    total_usd: order.totalUsd,
    item_count: order.itemCount,
    shipping_cost_usd: order.shippingCostUsd,
  })
}
