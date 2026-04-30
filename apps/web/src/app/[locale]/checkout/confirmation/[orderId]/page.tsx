import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { fetchOrderById } from '@/lib/api/orders'
import { ConfirmationNextSteps } from './_components/confirmation-next-steps'
import { ConfirmationOrderItems } from './_components/confirmation-order-items'
import { ConfirmationOrderSummary } from './_components/confirmation-order-summary'
import { ConfirmationSuccessHeader } from './_components/confirmation-success-header'
import { ExpressCheckoutCleanup } from './_components/express-checkout-cleanup'
import { PaymentFailedContent } from './_components/payment-failed-content'

interface ConfirmationPageProps {
  params: Promise<{ locale: string; orderId: string }>
  searchParams: Promise<{ redirect_status?: string }>
}

export async function generateMetadata({
  params,
  searchParams,
}: ConfirmationPageProps): Promise<Metadata> {
  const { locale } = await params
  const { redirect_status } = await searchParams
  const t = await getTranslations({ locale, namespace: 'confirmationPage' })

  const isPaymentFailed =
    redirect_status === 'failed' || redirect_status === 'requires_payment_method'
  const isPaymentCancelled = redirect_status === 'canceled'

  if (isPaymentFailed) {
    return {
      title: t('paymentFailedMetaTitle'),
      description: t('paymentFailedMetaDescription'),
      robots: { index: false, follow: false },
    }
  }

  if (isPaymentCancelled) {
    return {
      title: t('paymentCancelledTitle'),
      description: t('paymentFailedMetaDescription'),
      robots: { index: false, follow: false },
    }
  }

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: false },
  }
}

export default async function ConfirmationPage({ params, searchParams }: ConfirmationPageProps) {
  const { orderId } = await params
  const { redirect_status } = await searchParams

  // Stripe appends redirect_status to return_url after 3DS or redirect-based payment flows.
  // "requires_payment_method" means the PaymentIntent was reset after a failed attempt.
  const isPaymentFailed =
    redirect_status === 'failed' || redirect_status === 'requires_payment_method'
  const isPaymentCancelled = redirect_status === 'canceled'

  if (isPaymentFailed || isPaymentCancelled) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <PaymentFailedContent orderId={orderId} wasCancelled={isPaymentCancelled} />
      </main>
    )
  }

  let order
  try {
    order = await fetchOrderById(orderId)
  } catch {
    notFound()
  }

  const t = await getTranslations('confirmationPage')

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <ExpressCheckoutCleanup />
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
            <Link href="/shop">{t('continueShopping')}</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
