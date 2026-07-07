'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import type { AdminOrderDetail as AdminOrderDetailType } from '@/lib/api/orders'

export function OrderSummaryCard({ order }: { order: AdminOrderDetailType }) {
  const t = useTranslations('admin')
  return (
    <section
      aria-labelledby="order-summary-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="order-summary-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('orderDetailSectionSummary')}
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">{t('orderDetailFieldId')}</dt>
          <dd>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {order.id.slice(-8)}
            </code>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('orderDetailFieldCreated')}</dt>
          <dd className="font-medium text-foreground">
            {new Date(order.createdAt).toLocaleDateString()}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('orderDetailFieldSubtotal')}</dt>
          <dd>
            <data value={order.subtotal} className="font-medium text-foreground">
              ${Number(order.subtotal).toFixed(2)}
            </data>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('orderDetailFieldShipping')}</dt>
          <dd>
            <data value={order.shippingCost} className="font-medium text-foreground">
              ${Number(order.shippingCost).toFixed(2)}
            </data>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('orderDetailFieldTotal')}</dt>
          <dd>
            <data value={order.total} className="text-lg font-semibold text-foreground">
              ${Number(order.total).toFixed(2)}
            </data>
          </dd>
        </div>
        {order.discountCode && order.discountAmountCents !== null && (
          <div>
            <dt className="text-muted-foreground">{t('orderDetailFieldDiscount')}</dt>
            <dd className="font-medium text-foreground">
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{order.discountCode}</code>
              <span className="ml-2">
                −
                <data value={order.discountAmountCents / 100}>
                  ${(order.discountAmountCents / 100).toFixed(2)}
                </data>
              </span>
            </dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground">{t('orderDetailFieldSource')}</dt>
          <dd className="capitalize text-foreground">{order.source ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('orderDetailFieldPayment')}</dt>
          <dd>
            {order.payment ? (
              <Badge variant="outline" className="text-xs">
                {order.payment.status}
              </Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  )
}
