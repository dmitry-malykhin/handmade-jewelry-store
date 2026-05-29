'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { FileDown, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ApiError } from '@/lib/api/client'
import {
  fetchShippingStatus,
  purchaseAdminShippingLabel,
  type ShippingCarrier,
} from '@/lib/api/admin-shipping'
import type { AdminOrderDetail } from '@/lib/api/orders'
import { useAuthStore } from '@/store/auth.store'

const CARRIERS: ShippingCarrier[] = ['USPS', 'FedEx', 'UPS', 'DHL']

// Threshold above which insurance is offered — matches docs/08 #4 risk note:
// shipping insurance becomes meaningful for high-value jewelry. We default
// the insurance amount to the full order total.
const INSURANCE_OFFER_THRESHOLD_CENTS = 10_000

interface LabelPurchaseSectionProps {
  order: AdminOrderDetail
}

export function LabelPurchaseSection({ order }: LabelPurchaseSectionProps) {
  const t = useTranslations('admin')
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)

  const [selectedCarrier, setSelectedCarrier] = useState<ShippingCarrier>('USPS')
  const [includeInsurance, setIncludeInsurance] = useState(false)

  const orderTotalCents = Math.round(Number(order.total) * 100)
  const insuranceOffered = orderTotalCents >= INSURANCE_OFFER_THRESHOLD_CENTS
  const canPurchase = order.status === 'PAID' || order.status === 'PROCESSING'
  const alreadyPurchased = order.labelUrl !== null

  const shippingStatusQuery = useQuery({
    queryKey: ['admin', 'shipping', 'status'],
    queryFn: () => fetchShippingStatus(accessToken ?? ''),
    enabled: accessToken !== null,
    staleTime: 5 * 60 * 1000,
  })

  const purchaseMutation = useMutation({
    mutationFn: () =>
      purchaseAdminShippingLabel(
        order.id,
        {
          carrier: selectedCarrier,
          insuranceCents: includeInsurance && insuranceOffered ? orderTotalCents : 0,
        },
        accessToken ?? '',
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders', order.id] })
      toast.success(t('labelPurchaseSuccess'))
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t('labelPurchaseError')
      toast.error(message)
    },
  })

  // Hide the whole panel for terminal/cancelled orders. There's nothing the
  // admin can act on, and the existing tracking section already shows the
  // last known label info on a refunded/delivered order if it exists.
  if (!canPurchase && !alreadyPurchased) return null

  return (
    <section
      aria-labelledby="label-purchase-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          id="label-purchase-heading"
          className="text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {t('labelPurchaseSectionTitle')}
        </h2>
        {shippingStatusQuery.data && (
          <Badge
            variant={shippingStatusQuery.data.isLiveMode ? 'default' : 'outline'}
            className="text-xs"
          >
            {shippingStatusQuery.data.isLiveMode
              ? t('labelPurchaseModeLive')
              : t('labelPurchaseModeDryRun')}
          </Badge>
        )}
      </div>

      {alreadyPurchased ? (
        <div className="space-y-2 text-sm">
          <a
            href={order.labelUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <FileDown className="size-4" aria-hidden="true" />
            {t('labelPurchaseDownloadLabel')}
          </a>
          {order.shippingInsuranceCents > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="size-3.5" aria-hidden="true" />
              {t('labelPurchaseInsuranceAmount', {
                amount: `$${(order.shippingInsuranceCents / 100).toFixed(2)}`,
              })}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{t('labelPurchaseHelp')}</p>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="label-carrier" className="text-sm">
                {t('orderDetailTrackingCarrier')}
              </Label>
              <Select
                value={selectedCarrier}
                onValueChange={(value) => setSelectedCarrier(value as ShippingCarrier)}
              >
                <SelectTrigger id="label-carrier" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARRIERS.map((carrier) => (
                    <SelectItem key={carrier} value={carrier}>
                      {carrier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {insuranceOffered && (
              <div className="flex items-center gap-2 self-center pt-5">
                <Switch
                  id="label-insurance"
                  checked={includeInsurance}
                  onCheckedChange={setIncludeInsurance}
                />
                <Label htmlFor="label-insurance" className="text-sm">
                  {t('labelPurchaseInsuranceToggle', {
                    amount: `$${(orderTotalCents / 100).toFixed(2)}`,
                  })}
                </Label>
              </div>
            )}

            <Button
              type="button"
              size="sm"
              disabled={purchaseMutation.isPending}
              onClick={() => purchaseMutation.mutate()}
            >
              {purchaseMutation.isPending ? t('labelPurchaseSubmitting') : t('labelPurchaseSubmit')}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
