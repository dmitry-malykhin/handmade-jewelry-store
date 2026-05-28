'use client'

import { useTranslations } from 'next-intl'
import type { RevenueChartPeriod } from '@/lib/api/admin'

const PERIODS: RevenueChartPeriod[] = ['7d', '30d', '90d', '1y']
const PERIOD_LABEL_KEY = {
  '7d': 'revenueChartPeriod7d',
  '30d': 'revenueChartPeriod30d',
  '90d': 'revenueChartPeriod90d',
  '1y': 'revenueChartPeriod1y',
} as const

interface PeriodSelectorProps {
  selectedPeriod: RevenueChartPeriod
  onPeriodChange: (period: RevenueChartPeriod) => void
  ariaLabel: string
}

export function PeriodSelector({ selectedPeriod, onPeriodChange, ariaLabel }: PeriodSelectorProps) {
  const t = useTranslations('admin')

  return (
    <nav aria-label={ariaLabel} className="flex gap-1">
      {PERIODS.map((period) => (
        <button
          key={period}
          type="button"
          onClick={() => onPeriodChange(period)}
          aria-pressed={selectedPeriod === period}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            selectedPeriod === period
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          {t(PERIOD_LABEL_KEY[period])}
        </button>
      ))}
    </nav>
  )
}
