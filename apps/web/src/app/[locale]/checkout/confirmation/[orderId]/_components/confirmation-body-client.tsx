'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { fetchOrderById, type OrderDetails } from '@/lib/api/orders'
import { consumeGuestOrderAccessToken } from '@/lib/checkout/order-access-token'
import { ConfirmationNextSteps } from './confirmation-next-steps'
import { ConfirmationOrderItems } from './confirmation-order-items'
import { ConfirmationOrderSummary } from './confirmation-order-summary'
import { ConfirmationSuccessHeader } from './confirmation-success-header'
import { ExpressCheckoutCleanup } from './express-checkout-cleanup'
import { OrderPlacedTracker } from './order-placed-tracker'

interface ConfirmationBodyClientProps {
  orderId: string
  // Preserved for the email-link flow: a user clicking the "View your order"
  // CTA from a shipping or confirmation email lands with ?token=... and no
  // sessionStorage entry. The server passes that value in so the client fetch
  // can use it before Scrub strips it.
  urlToken: string | null
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; order: OrderDetails }
  | { status: 'not-found' }

export function ConfirmationBodyClient({ orderId, urlToken }: ConfirmationBodyClientProps) {
  const t = useTranslations('confirmationPage')
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    // read + delete the sessionStorage entry atomically so Back navigation
    // cannot re-use the token and so a second checkout in the same tab
    // starts with a clean slot.
    const sessionToken = consumeGuestOrderAccessToken(orderId)
    const token = sessionToken ?? urlToken

    fetchOrderById(orderId, { orderAccessToken: token })
      .then((order) => {
        if (!cancelled) setState({ status: 'ready', order })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'not-found' })
      })

    return () => {
      cancelled = true
    }
  }, [orderId, urlToken])

  if (state.status === 'loading') {
    return (
      <div role="status" aria-live="polite" aria-busy="true" className="space-y-8">
        <div className="h-16 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (state.status === 'not-found') {
    notFound()
    // notFound() throws under Next; this `return` is a belt-and-braces guard
    // for any test harness or future runtime that returns instead of throwing.
    return null
  }

  const { order } = state
  return (
    <>
      <ExpressCheckoutCleanup />
      <OrderPlacedTracker
        orderId={order.id}
        totalUsd={order.total}
        shippingCostUsd={order.shippingCost}
        items={order.items.map((orderItem) => ({
          productId: orderItem.productId,
          title: orderItem.productSnapshot.title,
          price: orderItem.price,
          quantity: orderItem.quantity,
        }))}
      />
      <div className="space-y-8">
        <ConfirmationSuccessHeader orderId={order.id} />

        <Separator />

        <ConfirmationNextSteps />

        <Separator />

        <section aria-label={t('orderSummaryTitle')}>
          <ConfirmationOrderItems items={order.items} />
        </section>

        <Separator />

        <ConfirmationOrderSummary order={order} />

        <div className="flex justify-center pt-2">
          <Button asChild size="lg">
            <Link href="/">{t('continueShopping')}</Link>
          </Button>
        </div>
      </div>
    </>
  )
}
