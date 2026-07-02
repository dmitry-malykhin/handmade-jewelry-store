'use client'

import { useTranslations } from 'next-intl'
import type { AdminOrderDetail as AdminOrderDetailType } from '@/lib/api/orders'
import { OrderStatusBadge } from './order-status-badge'

export function StatusTimeline({ order }: { order: AdminOrderDetailType }) {
  const t = useTranslations('admin')
  return (
    <section aria-labelledby="timeline-heading">
      <h2
        id="timeline-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('orderDetailSectionTimeline')}
      </h2>
      <ol className="relative border-l border-border pl-4">
        {order.statusHistory.map((historyEntry) => (
          <li key={historyEntry.id} className="pb-4">
            <div className="absolute -left-1.5 mt-1.5 size-3 rounded-full border border-border bg-background" />
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={historyEntry.toStatus} />
              <time dateTime={historyEntry.createdAt} className="text-xs text-muted-foreground">
                {new Date(historyEntry.createdAt).toLocaleString()}
              </time>
            </div>
            {historyEntry.note && (
              <p className="mt-1 text-xs text-muted-foreground">{historyEntry.note}</p>
            )}
            {historyEntry.createdBy && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('orderDetailTimelineBy', { by: historyEntry.createdBy })}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
