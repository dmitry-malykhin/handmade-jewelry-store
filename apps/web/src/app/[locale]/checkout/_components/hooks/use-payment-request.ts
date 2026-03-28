'use client'

import { useEffect, useState } from 'react'
import { useStripe } from '@stripe/react-stripe-js'
import type { PaymentRequest } from '@stripe/stripe-js'
import { useRouter } from '@/i18n/navigation'

interface UsePaymentRequestParams {
  totalAmountInCents: number
  clientSecret: string
  orderId: string
  locale: string
}

interface UsePaymentRequestResult {
  paymentRequest: PaymentRequest | null
  canMakePayment: boolean
  paymentRequestError: string | null
}

/**
 * Creates a Stripe PaymentRequest object for Apple Pay / Google Pay.
 * Returns null when the browser doesn't support native payment methods.
 *
 * canMakePayment() returns null on:
 * - Non-HTTPS pages (except localhost)
 * - Browsers with no saved payment methods
 * - iOS when domain is not registered with Apple Pay via Stripe
 */
export function usePaymentRequest({
  totalAmountInCents,
  clientSecret,
  orderId,
  locale,
}: UsePaymentRequestParams): UsePaymentRequestResult {
  const stripe = useStripe()
  const router = useRouter()

  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null)
  const [canMakePayment, setCanMakePayment] = useState(false)
  const [paymentRequestError, setPaymentRequestError] = useState<string | null>(null)

  useEffect(() => {
    if (!stripe || !clientSecret) return

    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: {
        label: '✦ Jewelry',
        amount: totalAmountInCents,
      },
      // Request shipping contact so guest email is auto-filled from Apple/Google wallet
      requestPayerName: true,
      requestPayerEmail: true,
    })

    void pr.canMakePayment().then((result) => {
      if (result) {
        setPaymentRequest(pr)
        setCanMakePayment(true)
      }
    })

    pr.on('paymentmethod', async (event) => {
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: event.paymentMethod.id },
        // handleActions: false — we handle 3DS manually below if needed
        { handleActions: false },
      )

      if (confirmError) {
        // Dismiss the native payment sheet with failure status
        event.complete('fail')
        setPaymentRequestError(confirmError.message ?? 'Payment failed. Please try again.')
        return
      }

      // Dismiss native sheet with success
      event.complete('success')

      // Handle 3D Secure if bank requires additional authentication
      if (paymentIntent?.status === 'requires_action') {
        const { error: actionError } = await stripe.confirmCardPayment(clientSecret)
        if (actionError) {
          setPaymentRequestError(actionError.message ?? 'Authentication failed. Please try again.')
          return
        }
      }

      router.push(`/${locale}/checkout/confirmation/${orderId}`)
    })
  }, [stripe, clientSecret, totalAmountInCents, orderId, locale, router])

  return { paymentRequest, canMakePayment, paymentRequestError }
}
