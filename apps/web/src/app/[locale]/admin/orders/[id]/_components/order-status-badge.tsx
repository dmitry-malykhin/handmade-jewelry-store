'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import type { OrderStatus } from '@/lib/api/orders'
import { STATUS_VARIANT } from '../../_lib/order-transitions'

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations('admin')
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {t(`ordersStatus${status}` as Parameters<typeof t>[0])}
    </Badge>
  )
}
