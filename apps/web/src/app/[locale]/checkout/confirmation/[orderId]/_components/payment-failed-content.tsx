import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaymentFailedContentProps {
  orderId: string
  wasCancelled: boolean
}

export function PaymentFailedContent({
  orderId: _orderId,
  wasCancelled,
}: PaymentFailedContentProps) {
  const t = useTranslations('confirmationPage')

  const title = wasCancelled ? t('paymentCancelledTitle') : t('paymentFailedTitle')
  const subtitle = wasCancelled ? t('paymentCancelledSubtitle') : t('paymentFailedSubtitle')

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <XCircle className="size-16 text-destructive" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {!wasCancelled && (
          <Button asChild size="lg">
            {/* Cart is still saved in Zustand — going back to checkout starts a fresh attempt */}
            <Link href="/checkout">{t('paymentFailedTryAgain')}</Link>
          </Button>
        )}
        <Button asChild variant="outline" size="lg">
          <Link href="/cart">{t('paymentFailedBackToCart')}</Link>
        </Button>
      </div>
    </div>
  )
}
