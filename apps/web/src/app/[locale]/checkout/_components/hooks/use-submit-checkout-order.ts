'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@/i18n/navigation'
import { createOrder } from '@/lib/api/orders'
import { useCheckoutItems } from '@/store/cart.store'
import { buildOrderPayload } from '../../_lib/build-order-payload'
import type { CheckoutAddressFormValues } from '../checkout-address-schema'

interface SubmitCheckoutOrderArgs {
  addressValues: CheckoutAddressFormValues
  shippingCost: number
}

export function useSubmitCheckoutOrder() {
  const router = useRouter()
  const checkoutItems = useCheckoutItems()

  const mutation = useMutation({
    mutationFn: ({ addressValues, shippingCost }: SubmitCheckoutOrderArgs) => {
      const orderPayload = buildOrderPayload(checkoutItems, addressValues, shippingCost)
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
