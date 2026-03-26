import type { CartItem } from '@jewelry/shared'
import type { CreateOrderPayload } from '@/lib/api/orders'
import type { CheckoutAddressFormValues } from '../_components/checkout-address-schema'

// Flat shipping rate for MVP — replaced by Stripe-calculated shipping in #30
export const CHECKOUT_SHIPPING_COST = 9.99

/**
 * Converts cart items and address form values into the CreateOrderPayload
 * expected by POST /api/orders. Separates email (contact only) from the
 * shipping address snapshot stored on the order.
 */
export function buildOrderPayload(
  cartItems: CartItem[],
  formValues: CheckoutAddressFormValues,
  shippingCost: number = CHECKOUT_SHIPPING_COST,
): CreateOrderPayload {
  const { email: _email, ...shippingAddress } = formValues

  const subtotal = cartItems.reduce((sum, cartItem) => sum + cartItem.price * cartItem.quantity, 0)

  return {
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
    total: subtotal + shippingCost,
    source: 'web',
  }
}
