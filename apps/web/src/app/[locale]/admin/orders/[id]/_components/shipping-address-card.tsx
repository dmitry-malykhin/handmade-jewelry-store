'use client'

import { useTranslations } from 'next-intl'
import type { AdminOrderDetail as AdminOrderDetailType } from '@/lib/api/orders'

export function ShippingAddressCard({ order }: { order: AdminOrderDetailType }) {
  const t = useTranslations('admin')
  const { shippingAddress } = order
  return (
    <section
      aria-labelledby="shipping-address-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="shipping-address-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('orderDetailSectionShipping')}
      </h2>
      <address className="space-y-0.5 text-sm not-italic text-foreground">
        <p className="font-medium">{shippingAddress.fullName}</p>
        <p>{shippingAddress.addressLine1}</p>
        {shippingAddress.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
        <p>
          {shippingAddress.city}
          {shippingAddress.state ? `, ${shippingAddress.state}` : ''} {shippingAddress.postalCode}
        </p>
        <p>{shippingAddress.country}</p>
        {shippingAddress.phone && (
          <p className="pt-1 text-muted-foreground">{shippingAddress.phone}</p>
        )}
      </address>
    </section>
  )
}
