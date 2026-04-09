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

interface ConfirmationPageProps {
  params: Promise<{ locale: string; orderId: string }>
}

export async function generateMetadata({ params }: ConfirmationPageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'confirmationPage' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    robots: { index: false, follow: false },
  }
}

export default async function ConfirmationPage({ params }: ConfirmationPageProps) {
  const { orderId } = await params

  let order
  try {
    order = await fetchOrderById(orderId)
  } catch {
    notFound()
  }

  const t = await getTranslations('confirmationPage')

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
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
