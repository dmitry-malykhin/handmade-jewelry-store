'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth.store'
import { fetchAdminRevenueStats, type RevenueChartPeriod } from '@/lib/api/admin'

const PERIODS: RevenueChartPeriod[] = ['7d', '30d', '90d', '1y']

function formatRevenue(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatXAxisDate(dateString: string, period: RevenueChartPeriod): string {
  const date = new Date(dateString)
  if (period === '1y') {
    return date.toLocaleDateString('en-US', { month: 'short' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface TooltipPayloadItem {
  value: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
  periodLabel: string
}

function CustomTooltip({ active, payload, label, periodLabel }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-md">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">
        {periodLabel}: {formatRevenue(payload[0].value)}
      </p>
    </div>
  )
}

export function RevenueChart() {
  const t = useTranslations('admin')
  const accessToken = useAuthStore((state) => state.accessToken)
  const [selectedPeriod, setSelectedPeriod] = useState<RevenueChartPeriod>('30d')

  const { data, isPending } = useQuery({
    queryKey: ['admin', 'stats', 'revenue', selectedPeriod],
    queryFn: () => fetchAdminRevenueStats(selectedPeriod, accessToken ?? ''),
    enabled: accessToken !== null,
  })

  const periodLabelKey = {
    '7d': 'revenueChartPeriod7d',
    '30d': 'revenueChartPeriod30d',
    '90d': 'revenueChartPeriod90d',
    '1y': 'revenueChartPeriod1y',
  } as const

  const chartData = data?.chartData.map((point) => ({
    date: formatXAxisDate(point.date, selectedPeriod),
    revenueCents: point.revenueCents,
  }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-base font-semibold">{t('revenueChartTitle')}</CardTitle>

        <nav aria-label="Revenue period selector" className="flex gap-1">
          {PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setSelectedPeriod(period)}
              aria-pressed={selectedPeriod === period}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedPeriod === period
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {t(periodLabelKey[period])}
            </button>
          ))}
        </nav>
      </CardHeader>

      <CardContent>
        {isPending ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">{t('revenueChartLoading')}</p>
          </div>
        ) : (
          <>
            {/* Summary row */}
            <dl className="mb-4 grid grid-cols-3 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">{t('revenueChartTotalRevenue')}</dt>
                <dd className="mt-0.5 text-lg font-semibold text-foreground">
                  <data value={data?.totalRevenueCents ?? 0}>
                    {formatRevenue(data?.totalRevenueCents ?? 0)}
                  </data>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('revenueChartOrderCount')}</dt>
                <dd className="mt-0.5 text-lg font-semibold text-foreground">
                  {data?.orderCount ?? 0}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('revenueChartAvgOrder')}</dt>
                <dd className="mt-0.5 text-lg font-semibold text-foreground">
                  <data value={data?.avgOrderValueCents ?? 0}>
                    {formatRevenue(data?.avgOrderValueCents ?? 0)}
                  </data>
                </dd>
              </div>
            </dl>

            {/* Chart */}
            {chartData?.every((point) => point.revenueCents === 0) ? (
              <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border">
                <p className="text-sm text-muted-foreground">{t('revenueChartEmpty')}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(value: number) => `$${(value / 100).toFixed(0)}`}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                  />
                  <Tooltip
                    content={<CustomTooltip periodLabel={t('revenueChartTooltipRevenue')} />}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenueCents"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
