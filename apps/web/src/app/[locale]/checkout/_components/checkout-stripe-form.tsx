'use client'

import { useState } from 'react'
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { acceptOrderTerms } from '@/lib/api/orders'
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_REFUND_POLICY_VERSION,
  CURRENT_TERMS_VERSION,
} from '@/lib/legal/versions'
import { useAuthStore } from '@/store/auth.store'
import { CheckoutPaymentRequestButton } from './checkout-payment-request-button'
import { usePaymentRequest } from './hooks/use-payment-request'

interface CheckoutStripeFormProps {
  orderId: string
  orderAccessToken: string | null
  totalAmount: number
  clientSecret: string
  returnUrl: string
  isSubmitting: boolean
  onSubmittingChange: (isSubmitting: boolean) => void
  onBack: () => void
}

export function CheckoutStripeForm({
  orderId,
  orderAccessToken,
  totalAmount,
  clientSecret,
  returnUrl,
  isSubmitting,
  onSubmittingChange,
  onBack,
}: CheckoutStripeFormProps) {
  const t = useTranslations('checkoutPage')
  const locale = useLocale()
  const stripe = useStripe()
  const elements = useElements()
  const accessToken = useAuthStore((state) => state.accessToken)
  const [stripeError, setStripeError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsError, setTermsError] = useState<string | null>(null)

  const { paymentRequest, canMakePayment, paymentRequestError } = usePaymentRequest({
    totalAmountInCents: totalAmount,
    clientSecret,
    orderId,
    orderAccessToken,
    locale,
  })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!stripe || !elements) return

    setStripeError(null)
    setTermsError(null)

    if (!termsAccepted) {
      setTermsError(t('termsRequiredError'))
      return
    }

    onSubmittingChange(true)

    try {
      await acceptOrderTerms(
        orderId,
        {
          termsVersion: CURRENT_TERMS_VERSION,
          privacyVersion: CURRENT_PRIVACY_VERSION,
          refundPolicyVersion: CURRENT_REFUND_POLICY_VERSION,
        },
        { accessToken, orderAccessToken },
      )
    } catch (termsAcceptanceError) {
      setStripeError(
        termsAcceptanceError instanceof Error
          ? termsAcceptanceError.message
          : t('termsRecordFailedError'),
      )
      onSubmittingChange(false)
      return
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    })

    if (error) {
      setStripeError(error.message ?? t('submitError'))
      onSubmittingChange(false)
    }
  }

  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(totalAmount / 100)

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-6">
        {canMakePayment && paymentRequest && (
          <>
            <CheckoutPaymentRequestButton paymentRequest={paymentRequest} />

            {paymentRequestError && (
              <p role="alert" className="text-sm text-destructive">
                {paymentRequestError}
              </p>
            )}

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground">
                  {t('orPayWithCard')}
                </span>
              </div>
            </div>
          </>
        )}

        <PaymentElement id={`payment-element-${orderId}`} options={{ layout: 'tabs' }} />

        {stripeError && (
          <p role="alert" className="text-sm text-destructive">
            {stripeError}
          </p>
        )}

        <div className="rounded-md border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">{t('acknowledgementTitle')}</p>
          <ul role="list" className="list-disc space-y-1 pl-5">
            <li>{t('acknowledgementTotal', { amount: formattedTotal })}</li>
            <li>{t('acknowledgementDelivery')}</li>
            <li>
              {t.rich('acknowledgementWithdrawal', {
                policy: (chunks) => (
                  <a
                    href={`/${locale}/terms#returns-and-refunds`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </li>
          </ul>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="checkout-terms"
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <input
              id="checkout-terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => {
                setTermsAccepted(event.target.checked)
                if (event.target.checked && termsError) setTermsError(null)
              }}
              required
              aria-required="true"
              aria-invalid={!!termsError}
              aria-describedby={termsError ? 'checkout-terms-error' : undefined}
              className="mt-0.5 size-4 shrink-0 rounded border-input"
            />
            <span>
              {t.rich('termsAcceptance', {
                terms: (chunks) => (
                  <a
                    href={`/${locale}/terms`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {chunks}
                  </a>
                ),
                privacy: (chunks) => (
                  <a
                    href={`/${locale}/privacy`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {chunks}
                  </a>
                ),
                refund: (chunks) => (
                  <a
                    href={`/${locale}/terms#returns-and-refunds`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </span>
          </label>
          {termsError && (
            <p id="checkout-terms-error" role="alert" className="text-sm text-destructive">
              {termsError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            type="submit"
            size="lg"
            className="w-full sm:w-auto sm:min-w-48"
            disabled={!stripe || !elements || isSubmitting}
          >
            {isSubmitting ? t('submitting') : t('placeOrderCta', { amount: formattedTotal })}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full sm:w-auto"
            onClick={onBack}
            disabled={isSubmitting}
          >
            {t('back')}
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span aria-hidden="true">🔒</span>
          <span>{t('securePaymentBadge')}</span>
        </div>
      </div>
    </form>
  )
}
