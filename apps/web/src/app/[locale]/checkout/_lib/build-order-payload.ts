import type { CartItem } from '@jewelry/shared'
import type { CreateOrderPayload } from '@/lib/api/orders'
import type { CheckoutAddressFormValues } from '../_components/checkout-address-schema'

/**
 * Converts cart items and address form values into the CreateOrderPayload
 * expected by POST /api/orders. Separates email (contact only) from the
 * shipping address snapshot stored on the order.
 */
interface BuildOrderPayloadOptions {
  /** Loyalty points the buyer chose to redeem. Server clamps. */
  loyaltyPointsToRedeem?: number
  /** Discount code the buyer entered. Server re-validates and computes amount. */
  discountCode?: string
}

export function buildOrderPayload(
  cartItems: CartItem[],
  formValues: CheckoutAddressFormValues,
  shippingCost: number,
  options: BuildOrderPayloadOptions = {},
): CreateOrderPayload {
  const { email, ...shippingAddress } = formValues

  const subtotal = cartItems.reduce((sum, cartItem) => sum + cartItem.price * cartItem.quantity, 0)
  const loyaltyDiscountUsd = (options.loyaltyPointsToRedeem ?? 0) / 100
  // Server re-validates against the user's real balance; this is the visible
  // expected total we send up-front for analytics + display consistency.
  const total = Math.max(0, Number((subtotal + shippingCost - loyaltyDiscountUsd).toFixed(2)))

  return {
    guestEmail: email,
    items: cartItems.map((cartItem) => ({
      productId: cartItem.productId,
      quantity: cartItem.quantity,
      price: cartItem.price,
      productSnapshot: {
        title: cartItem.title,
        slug: cartItem.slug,
        image: cartItem.image,
      },
    })),
    shippingAddress,
    subtotal,
    shippingCost,
    total,
    ...(options.loyaltyPointsToRedeem
      ? { loyaltyPointsToRedeem: options.loyaltyPointsToRedeem }
      : {}),
    ...(options.discountCode ? { discountCode: options.discountCode } : {}),
    source: 'web',
  }
}
