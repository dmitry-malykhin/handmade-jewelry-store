'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { useLocale, useTranslations } from 'next-intl'
import { useCartTotalPrice } from '@/store/cart.store'
import { CheckoutOrderSummary } from './checkout-order-summary'
import { CheckoutSteps } from './checkout-steps'
import { CheckoutStripeForm } from './checkout-stripe-form'
import { useInitiateCheckout } from './hooks/use-initiate-checkout'
import type { ShippingOption } from '../_lib/shipping-options'
import type { CheckoutAddressFormValues } from './checkout-address-schema'

// loadStripe is called outside the component to avoid re-creating the Stripe object on each render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '')

interface CheckoutPaymentFormProps {
  addressValues: CheckoutAddressFormValues
  shippingCost: number
  selectedShippingOption?: ShippingOption
  onBack: () => void
}

export function CheckoutPaymentForm({
  addressValues,
  shippingCost,
  selectedShippingOption,
  onBack,
}: CheckoutPaymentFormProps) {
  const t = useTranslations('checkoutPage')
  const locale = useLocale()
  const cartTotalPrice = useCartTotalPrice()
  const totalInCents = Math.round((cartTotalPrice + shippingCost) * 100)

  const { orderId, clientSecret, isLoading, error } = useInitiateCheckout(
    addressValues,
    shippingCost,
  )

  const [isSubmitting, setIsSubmitting] = useState(false)

  const returnUrl =
    typeof window !== 'undefined' && orderId
      ? `${window.location.origin}/${locale}/checkout/confirmation/${orderId}`
      : ''

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <CheckoutSteps currentStep={3} />

        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-foreground">{t('paymentTitle')}</h2>

          {isLoading && (
            <div className="space-y-4" aria-busy="true" aria-label={t('paymentLoading')}>
              <div className="h-40 animate-pulse rounded-lg bg-muted" />
              <div className="h-10 animate-pulse rounded-md bg-muted" />
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive bg-destructive/10 p-4"
            >
              <p className="text-sm font-medium text-destructive">{t('initiateCheckoutError')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{error.message}</p>
            </div>
          )}

          {clientSecret && orderId && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  // Match our semantic token palette — adapts to light/dark automatically
                  theme: 'stripe',
                },
              }}
            >
              <CheckoutStripeForm
                orderId={orderId}
                totalAmount={totalInCents}
                clientSecret={clientSecret}
                returnUrl={returnUrl}
                isSubmitting={isSubmitting}
                onSubmittingChange={setIsSubmitting}
                onBack={onBack}
              />
            </Elements>
          )}
        </div>
      </div>

      <CheckoutOrderSummary shippingCost={shippingCost} selectedOption={selectedShippingOption} />
    </div>
  )
}
