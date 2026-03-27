import { useTranslations } from 'next-intl'
import type { OrderDetails } from '@/lib/api/orders'

interface ConfirmationOrderSummaryProps {
  order: OrderDetails
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function ConfirmationOrderSummary({ order }: ConfirmationOrderSummaryProps) {
  const t = useTranslations('confirmationPage')
  const { shippingAddress } = order

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {/* Shipping address */}
      <section aria-labelledby="shipping-address-heading">
        <h2
          id="shipping-address-heading"
          className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {t('shippingAddressTitle')}
        </h2>
        <address className="not-italic text-sm text-foreground leading-relaxed">
          <p className="font-medium">{shippingAddress.fullName}</p>
          <p>{shippingAddress.addressLine1}</p>
          {shippingAddress.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
          <p>
            {shippingAddress.city}
            {shippingAddress.state ? `, ${shippingAddress.state}` : ''} {shippingAddress.postalCode}
          </p>
          <p>{shippingAddress.country}</p>
        </address>
      </section>

      {/* Order totals */}
      <section aria-labelledby="order-totals-heading">
        <h2
          id="order-totals-heading"
          className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {t('orderSummaryTitle')}
        </h2>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('subtotal')}</dt>
            <dd className="tabular-nums">{formatUsd(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t('shipping')}</dt>
            <dd className="tabular-nums">
              {order.shippingCost === 0 ? (
                <span className="text-green-600 dark:text-green-400">{t('shippingFree')}</span>
              ) : (
                formatUsd(order.shippingCost)
              )}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-semibold">
            <dt>{t('total')}</dt>
            <dd className="tabular-nums">{formatUsd(order.total)}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
