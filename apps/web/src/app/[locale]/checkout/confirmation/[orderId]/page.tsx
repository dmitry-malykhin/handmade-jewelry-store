import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ConfirmationBodyClient } from './_components/confirmation-body-client'
import { PaymentFailedContent } from './_components/payment-failed-content'
import { ScrubTokenFromUrl } from './_components/scrub-token-from-url'

interface ConfirmationPageProps {
  params: Promise<{ locale: string; orderId: string }>
  searchParams: Promise<{ redirect_status?: string; token?: string }>
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
  const { redirect_status, token } = await searchParams

  // Stripe appends redirect_status to return_url after 3DS or redirect-based payment flows.
  // "requires_payment_method" means the PaymentIntent was reset after a failed attempt.
  const isPaymentFailed =
    redirect_status === 'failed' || redirect_status === 'requires_payment_method'
  const isPaymentCancelled = redirect_status === 'canceled'

  if (isPaymentFailed || isPaymentCancelled) {
    return (
      <section
        aria-labelledby="confirmation-heading"
        className="mx-auto max-w-2xl px-4 py-12 sm:px-6"
      >
        <PaymentFailedContent orderId={orderId} wasCancelled={isPaymentCancelled} />
      </section>
    )
  }

  // Order load moved to a client component so the guest access token can be
  // read from sessionStorage instead of the URL (#588). `token` here is the
  // legacy `?token=` fallback for email-link flows (e.g. the "View your order"
  // CTA in a shipping email); ScrubTokenFromUrl strips it after the body
  // mounts so it never persists in history / Referer.
  return (
    <section
      aria-labelledby="confirmation-heading"
      className="mx-auto max-w-2xl px-4 py-12 sm:px-6"
    >
      <ScrubTokenFromUrl />
      <ConfirmationBodyClient orderId={orderId} urlToken={token ?? null} />
    </section>
  )
}
