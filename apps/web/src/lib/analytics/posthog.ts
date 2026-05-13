/**
 * PostHog event helpers — type-safe wrappers around posthog.capture(). All
 * functions are no-ops when the SDK is not initialized (consent not granted
 * or env var missing), so call sites never need to guard themselves.
 *
 * Event taxonomy mirrors docs/16_USER_ANALYTICS.md §6. Keep names in
 * snake_case to match the convention used across GA4 / PostHog / FB Pixel.
 */

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

/**
 * Best-effort decode of a JWT access token's payload. Returns null when the
 * token is missing or malformed — callers should treat that as "anonymous".
 * Duplicated from auth.store.ts to avoid the analytics module importing the
 * full Zustand store just to read JWT shape.
 */
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
