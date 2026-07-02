'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  AdminOrderDetail as AdminOrderDetailType,
  UpdateOrderTrackingPayload,
} from '@/lib/api/orders'
import { SHIPPING_CARRIERS } from '../../_lib/order-transitions'

interface TrackingSectionProps {
  order: AdminOrderDetailType
  onTrackingSubmit: (payload: UpdateOrderTrackingPayload) => void
  isUpdating: boolean
}

export function TrackingSection({ order, onTrackingSubmit, isUpdating }: TrackingSectionProps) {
  const t = useTranslations('admin')
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? '')
  const [shippingCarrier, setShippingCarrier] = useState(order.shippingCarrier ?? '')

  function handleTrackingFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!trackingNumber.trim() || !shippingCarrier) return
    onTrackingSubmit({ trackingNumber: trackingNumber.trim(), shippingCarrier })
  }

  return (
    <section
      aria-labelledby="tracking-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="tracking-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('orderDetailSectionTracking')}
      </h2>

      {order.trackingNumber && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <Truck className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-muted-foreground">{order.shippingCarrier}</span>
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{order.trackingNumber}</code>
        </div>
      )}

      <form
        onSubmit={handleTrackingFormSubmit}
        className="flex flex-wrap items-end gap-3"
        noValidate
      >
        <div className="space-y-1.5">
          <Label htmlFor="tracking-carrier" className="text-sm">
            {t('orderDetailTrackingCarrier')}
          </Label>
          <Select value={shippingCarrier} onValueChange={setShippingCarrier}>
            <SelectTrigger id="tracking-carrier" className="w-36">
              <SelectValue placeholder={t('orderDetailTrackingCarrierPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {SHIPPING_CARRIERS.map((carrier) => (
                <SelectItem key={carrier} value={carrier}>
                  {carrier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tracking-number" className="text-sm">
            {t('orderDetailTrackingNumber')}
          </Label>
          <Input
            id="tracking-number"
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value)}
            placeholder={t('orderDetailTrackingNumberPlaceholder')}
            className="w-64"
          />
        </div>

        <Button
          type="submit"
          size="sm"
          disabled={isUpdating || !trackingNumber.trim() || !shippingCarrier}
        >
          {isUpdating ? t('orderDetailTrackingSaving') : t('orderDetailTrackingSave')}
        </Button>
      </form>
    </section>
  )
}
