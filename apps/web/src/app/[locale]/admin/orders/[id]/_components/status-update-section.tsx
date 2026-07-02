'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import type { AdminOrderDetail as AdminOrderDetailType, OrderStatus } from '@/lib/api/orders'
import { ALLOWED_TRANSITIONS } from '../../_lib/order-transitions'
import { OrderStatusBadge } from './order-status-badge'

interface StatusUpdateSectionProps {
  order: AdminOrderDetailType
  onStatusChange: (newStatus: OrderStatus) => void
  isUpdating: boolean
}

export function StatusUpdateSection({
  order,
  onStatusChange,
  isUpdating,
}: StatusUpdateSectionProps) {
  const t = useTranslations('admin')
  const allowedNextStatuses = ALLOWED_TRANSITIONS[order.status] ?? []

  return (
    <section
      aria-labelledby="status-update-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="status-update-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('orderDetailSectionStatus')}
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('orderDetailStatusCurrent')}</span>
          <OrderStatusBadge status={order.status} />
        </div>
        {allowedNextStatuses.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allowedNextStatuses.map((nextStatus) => (
              <Button
                key={nextStatus}
                variant="outline"
                size="sm"
                disabled={isUpdating}
                onClick={() => onStatusChange(nextStatus)}
              >
                {t('ordersStatusChangeTo', {
                  status: t(`ordersStatus${nextStatus}` as Parameters<typeof t>[0]),
                })}
              </Button>
            ))}
          </div>
        )}
        {allowedNextStatuses.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('orderDetailStatusFinal')}</p>
        )}
      </div>
    </section>
  )
}
