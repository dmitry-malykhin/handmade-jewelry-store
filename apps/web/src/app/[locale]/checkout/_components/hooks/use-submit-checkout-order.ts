'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { createOrder } from '@/lib/api/orders'
import { useCartItems } from '@/store/cart.store'
import { buildOrderPayload, CHECKOUT_SHIPPING_COST } from '../../_lib/build-order-payload'
import type { CheckoutAddressFormValues } from '../checkout-address-schema'

export function useSubmitCheckoutOrder() {
  const router = useRouter()
  const cartItems = useCartItems()

  const mutation = useMutation({
    mutationFn: (formValues: CheckoutAddressFormValues) => {
      const orderPayload = buildOrderPayload(cartItems, formValues, CHECKOUT_SHIPPING_COST)
      return createOrder(orderPayload)
    },
    onSuccess: (createdOrder) => {
      router.push(`/checkout/confirmation/${createdOrder.id}`)
    },
  })

  return {
    submitOrder: mutation.mutate,
    isSubmitting: mutation.isPending,
    submitError: mutation.error,
  }
}
