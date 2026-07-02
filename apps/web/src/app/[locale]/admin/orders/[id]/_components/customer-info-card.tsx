'use client'

import { useTranslations } from 'next-intl'
import type { AdminOrderDetail as AdminOrderDetailType } from '@/lib/api/orders'

export function CustomerInfoCard({ order }: { order: AdminOrderDetailType }) {
  const t = useTranslations('admin')
  return (
    <section
      aria-labelledby="customer-info-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="customer-info-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('orderDetailSectionCustomer')}
      </h2>
      <dl className="space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="text-muted-foreground">{t('orderDetailFieldEmail')}</dt>
          <dd className="font-medium text-foreground">
            {order.guestEmail ?? t('orderDetailGuestLabel')}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">{t('orderDetailFieldCustomerType')}</dt>
          <dd className="text-foreground">
            {order.guestEmail ? t('orderDetailTypeGuest') : t('orderDetailTypeRegistered')}
          </dd>
        </div>
      </dl>
    </section>
  )
}
