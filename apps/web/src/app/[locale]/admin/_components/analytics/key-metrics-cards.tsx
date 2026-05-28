'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/store/auth.store'
import { fetchAdminKeyMetrics, type RevenueChartPeriod } from '@/lib/api/admin'
import { Card, CardContent } from '@/components/ui/card'

interface KeyMetricsCardsProps {
  period: RevenueChartPeriod
}

export function KeyMetricsCards({ period }: KeyMetricsCardsProps) {
  const t = useTranslations('admin')
  const accessToken = useAuthStore((state) => state.accessToken)

  const { data, isPending } = useQuery({
    queryKey: ['admin', 'analytics', 'key-metrics', period],
    queryFn: () => fetchAdminKeyMetrics(period, accessToken ?? ''),
    enabled: accessToken !== null,
  })

  const metrics: Array<{
    labelKey:
      | 'keyMetricsNewCustomers'
      | 'keyMetricsReturningCustomers'
      | 'keyMetricsRefundRate'
      | 'keyMetricsAvgDeliveryDays'
    value: string
    raw: number
  }> = [
    {
      labelKey: 'keyMetricsNewCustomers',
      value: data?.newCustomers.toLocaleString() ?? '0',
      raw: data?.newCustomers ?? 0,
    },
    {
      labelKey: 'keyMetricsReturningCustomers',
      value: data?.returningCustomers.toLocaleString() ?? '0',
      raw: data?.returningCustomers ?? 0,
    },
    {
      labelKey: 'keyMetricsRefundRate',
      value: `${data?.refundRatePercent ?? 0}%`,
      raw: data?.refundRatePercent ?? 0,
    },
    {
      labelKey: 'keyMetricsAvgDeliveryDays',
      value: t('keyMetricsDaysValue', { count: data?.avgDaysOrderToDelivery ?? 0 }),
      raw: data?.avgDaysOrderToDelivery ?? 0,
    },
  ]

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.labelKey}>
          <CardContent className="p-4">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              {t(metric.labelKey)}
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {isPending ? (
                <span className="text-muted-foreground" aria-live="polite">
                  …
                </span>
              ) : (
                <data value={metric.raw}>{metric.value}</data>
              )}
            </dd>
          </CardContent>
        </Card>
      ))}
    </dl>
  )
}
