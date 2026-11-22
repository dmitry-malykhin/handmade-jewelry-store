'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SHIPPING_CARRIERS } from '../_lib/order-transitions'

const DEFAULT_CARRIER: string = SHIPPING_CARRIERS[0]

interface ShipWithTrackingDialogProps {
  open: boolean
  orderIdShort: string | null
  isPending: boolean
  onClose: () => void
  onConfirm: (values: { trackingNumber: string; shippingCarrier: string }) => void
}

// #477: the plain "Mark as SHIPPED" confirm used to fire a shipping email
// without tracking info — the owner then had to open the order detail to
// enter it. This dialog collects both in the same step as the status change.
export function ShipWithTrackingDialog({
  open,
  orderIdShort,
  isPending,
  onClose,
  onConfirm,
}: ShipWithTrackingDialogProps) {
  const t = useTranslations('admin')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [shippingCarrier, setShippingCarrier] = useState<string>(DEFAULT_CARRIER)

  useEffect(() => {
    if (!open) {
      setTrackingNumber('')
      setShippingCarrier(DEFAULT_CARRIER)
    }
  }, [open])

  const trimmedTracking = trackingNumber.trim()
  const canSubmit = trimmedTracking.length > 0 && !isPending

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    onConfirm({ trackingNumber: trimmedTracking, shippingCarrier })
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? null : onClose())}>
      <DialogContent>
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>
              {orderIdShort
                ? t('ordersShipDialogTitle', { id: orderIdShort })
                : t('ordersShipDialogTitleNoId')}
            </DialogTitle>
            <DialogDescription>{t('ordersShipDialogDescription')}</DialogDescription>
          </DialogHeader>

          <div className="my-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ship-carrier">{t('ordersShipDialogCarrierLabel')}</Label>
              <Select value={shippingCarrier} onValueChange={setShippingCarrier}>
                <SelectTrigger id="ship-carrier">
                  <SelectValue />
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ship-tracking">{t('ordersShipDialogTrackingLabel')}</Label>
              <Input
                id="ship-tracking"
                value={trackingNumber}
                onChange={(event) => setTrackingNumber(event.target.value)}
                placeholder={t('ordersShipDialogTrackingPlaceholder')}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {t('ordersShipDialogCancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isPending ? t('ordersShipDialogSubmitting') : t('ordersShipDialogSubmit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
