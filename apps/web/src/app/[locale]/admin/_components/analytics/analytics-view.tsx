'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { RevenueChartPeriod } from '@/lib/api/admin'
import { KeyMetricsCards } from './key-metrics-cards'
import { OrderStatusBreakdown } from './order-status-breakdown'
import { PeriodSelector } from './period-selector'
import { TopProductsTable } from './top-products-table'

export function AnalyticsView() {
  const t = useTranslations('admin')
  const [selectedPeriod, setSelectedPeriod] = useState<RevenueChartPeriod>('30d')

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-foreground">{t('analyticsTitle')}</h1>
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          ariaLabel={t('analyticsPeriodSelectorAriaLabel')}
        />
      </header>

      <KeyMetricsCards period={selectedPeriod} />

      <div className="grid gap-5 lg:grid-cols-2">
        <TopProductsTable period={selectedPeriod} />
        <OrderStatusBreakdown period={selectedPeriod} />
      </div>
    </div>
  )
}
