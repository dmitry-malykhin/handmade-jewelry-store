'use client'

import { PaymentRequestButtonElement } from '@stripe/react-stripe-js'
import type { PaymentRequest } from '@stripe/stripe-js'
import { useTranslations } from 'next-intl'

interface CheckoutPaymentRequestButtonProps {
  paymentRequest: PaymentRequest
}

/**
 * Renders the native Apple Pay or Google Pay button via Stripe Payment Request API.
 * Only rendered when usePaymentRequest confirms canMakePayment = true.
 *
 * On iOS Safari: shows black "Pay with Apple Pay" button
 * On Chrome (Android/desktop): shows Google Pay button
 */
export function CheckoutPaymentRequestButton({
  paymentRequest,
}: CheckoutPaymentRequestButtonProps) {
  const t = useTranslations('checkoutPage')

  return (
    <div aria-label={t('paymentTitle')}>
      <PaymentRequestButtonElement
        options={{
          paymentRequest,
          style: {
            paymentRequestButton: {
              type: 'buy',
              theme: 'dark',
              // Tall enough for comfortable tap target — above 48px minimum
              height: '52px',
            },
          },
        }}
      />
    </div>
  )
}
