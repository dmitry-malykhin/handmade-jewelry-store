'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useCartTotalPrice, useCartTotalItems } from '@/store'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/pricing-constants'

export function CartSummary() {
  const t = useTranslations('cartPage')
  const totalPrice = useCartTotalPrice()
  const totalItems = useCartTotalItems()

  const formattedTotal = totalPrice.toFixed(2)
  const amountUntilFreeShipping = FREE_SHIPPING_THRESHOLD - totalPrice
  const hasFreeShipping = totalPrice >= FREE_SHIPPING_THRESHOLD
  const freeShippingProgress = Math.min((totalPrice / FREE_SHIPPING_THRESHOLD) * 100, 100)

  return (
    <aside aria-label={t('summaryLabel')} className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground">{t('summaryTitle')}</h2>

      {/* Free shipping threshold bar */}
      <div className="mt-4 rounded-md bg-accent p-3">
        {hasFreeShipping ? (
          <p className="text-sm font-medium text-green-600 dark:text-green-400">
            {t('freeShippingUnlocked')}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('freeShippingThreshold', { amount: amountUntilFreeShipping.toFixed(2) })}
          </p>
        )}
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-valuenow={Math.round(freeShippingProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('freeShippingProgressLabel')}
        >
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-300"
            style={{ width: `${freeShippingProgress}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{t('subtotalItems', { count: totalItems })}</span>
          <data value={formattedTotal} className="font-medium text-foreground">
            ${formattedTotal}
          </data>
        </div>

        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{t('shipping')}</span>
          {hasFreeShipping ? (
            <span className="font-medium text-green-600 dark:text-green-400">
              {t('freeShippingLabel')}
            </span>
          ) : (
            <span>{t('shippingCalculated')}</span>
          )}
        </div>

        <Separator />

        <div className="flex justify-between font-semibold text-foreground">
          <span>{t('total')}</span>
          <data value={formattedTotal}>${formattedTotal}</data>
        </div>
      </div>

      <Button className="mt-6 w-full" size="lg" asChild>
        <Link href="/checkout">{t('proceedToCheckout')}</Link>
      </Button>

      <Button variant="ghost" className="mt-2 w-full" size="lg" asChild>
        <Link href="/">{t('continueShopping')}</Link>
      </Button>

      <p className="mt-4 text-center text-xs text-muted-foreground">{t('secureCheckout')}</p>
    </aside>
  )
}
