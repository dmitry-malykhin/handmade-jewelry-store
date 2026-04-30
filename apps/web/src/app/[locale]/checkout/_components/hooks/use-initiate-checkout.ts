'use client'

import { useEffect, useState } from 'react'
import { createOrder } from '@/lib/api/orders'
import { createPaymentIntent } from '@/lib/api/payments'
import { useCheckoutItems } from '@/store/cart.store'
import { buildOrderPayload } from '../../_lib/build-order-payload'
import type { CheckoutAddressFormValues } from '../checkout-address-schema'

interface InitiateCheckoutResult {
  orderId: string | null
  clientSecret: string | null
  isLoading: boolean
  error: Error | null
}

/**
 * Creates an Order and a Stripe PaymentIntent when the payment step mounts.
 * Called once — repeated calls are prevented by the orderId guard.
 */
export function useInitiateCheckout(
  addressValues: CheckoutAddressFormValues,
  shippingCost: number,
): InitiateCheckoutResult {
  const checkoutItems = useCheckoutItems()

  const [orderId, setOrderId] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function initiate() {
      try {
        const orderPayload = buildOrderPayload(checkoutItems, addressValues, shippingCost)
        const createdOrder = await createOrder(orderPayload)

        if (isCancelled) return

        const paymentIntent = await createPaymentIntent({ orderId: createdOrder.id })

        if (isCancelled) return

        setOrderId(createdOrder.id)
        setClientSecret(paymentIntent.clientSecret)
      } catch (caughtError) {
        if (!isCancelled) {
          setError(caughtError instanceof Error ? caughtError : new Error('Checkout init failed'))
        }
      } finally {
        if (!isCancelled) setIsLoading(false)
      }
    }

    initiate()

    return () => {
      isCancelled = true
    }
    // Run once on mount — addressValues and shippingCost are stable when step 3 renders
  }, [])

  return { orderId, clientSecret, isLoading, error }
}
