'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useAuthStore } from '@/store/auth.store'
import { fetchAdminOrderStatusBreakdown, type RevenueChartPeriod } from '@/lib/api/admin'
import type { OrderStatusForBreakdown } from '@jewelry/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface OrderStatusBreakdownProps {
  period: RevenueChartPeriod
}

// Distinct, theme-friendly palette — chosen so adjacent slices stay readable in
// both light and dark mode. Tailwind's `[hsl(...)]` arbitrary values can't be
// referenced from recharts, so we keep the colors inline.
const STATUS_COLOR: Record<OrderStatusForBreakdown, string> = {
  PENDING: '#9ca3af', // gray-400
  PAID: '#3b82f6', // blue-500
  PROCESSING: '#a855f7', // purple-500
  SHIPPED: '#f59e0b', // amber-500
  DELIVERED: '#22c55e', // green-500
  CANCELLED: '#6b7280', // gray-500
  REFUNDED: '#ef4444', // red-500
  PARTIALLY_REFUNDED: '#f97316', // orange-500
}

const STATUS_LABEL_KEY: Record<
  OrderStatusForBreakdown,
  | 'ordersStatusPENDING'
  | 'ordersStatusPAID'
  | 'ordersStatusPROCESSING'
  | 'ordersStatusSHIPPED'
  | 'ordersStatusDELIVERED'
  | 'ordersStatusCANCELLED'
  | 'ordersStatusREFUNDED'
  | 'ordersStatusPARTIALLY_REFUNDED'
> = {
  PENDING: 'ordersStatusPENDING',
  PAID: 'ordersStatusPAID',
  PROCESSING: 'ordersStatusPROCESSING',
  SHIPPED: 'ordersStatusSHIPPED',
  DELIVERED: 'ordersStatusDELIVERED',
  CANCELLED: 'ordersStatusCANCELLED',
  REFUNDED: 'ordersStatusREFUNDED',
  PARTIALLY_REFUNDED: 'ordersStatusPARTIALLY_REFUNDED',
}

interface DonutTooltipPayloadItem {
  payload: { status: OrderStatusForBreakdown; count: number; label: string }
}

interface DonutTooltipProps {
  active?: boolean
  payload?: DonutTooltipPayloadItem[]
}

function DonutTooltip({ active, payload }: DonutTooltipProps) {
  const firstSlice = payload?.[0]?.payload
  if (!active || !firstSlice) return null
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-md">
      <p className="text-xs text-muted-foreground">{firstSlice.label}</p>
      <p className="text-sm font-semibold text-foreground">{firstSlice.count}</p>
    </div>
  )
}

export function OrderStatusBreakdown({ period }: OrderStatusBreakdownProps) {
  const t = useTranslations('admin')
  const accessToken = useAuthStore((state) => state.accessToken)

  const { data, isPending } = useQuery({
    queryKey: ['admin', 'analytics', 'status-breakdown', period],
    queryFn: () => fetchAdminOrderStatusBreakdown(period, accessToken ?? ''),
    enabled: accessToken !== null,
  })

  // Only non-zero slices show on the donut — zero-count statuses still appear
  // in the legend so the customer can see the full set of buckets.
  const allRows = (data ?? []).map((row) => ({
    ...row,
    label: t(STATUS_LABEL_KEY[row.status]),
  }))
  const nonZeroRows = allRows.filter((row) => row.count > 0)
  const totalCount = allRows.reduce((sum, row) => sum + row.count, 0)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{t('statusBreakdownTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <p className="py-6 text-sm text-muted-foreground" role="status">
            {t('statusBreakdownLoading')}
          </p>
        ) : totalCount === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">{t('statusBreakdownEmpty')}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-[200px_1fr]">
            <div className="flex items-center justify-center">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={nonZeroRows}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    isAnimationActive={false}
                  >
                    {nonZeroRows.map((row) => (
                      <Cell key={row.status} fill={STATUS_COLOR[row.status]} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul role="list" className="grid grid-cols-2 gap-x-4 gap-y-1.5 self-center text-sm">
              {allRows.map((row) => (
                <li key={row.status} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: STATUS_COLOR[row.status] }}
                  />
                  <span className="flex-1 truncate text-muted-foreground">{row.label}</span>
                  <span className="font-semibold tabular-nums text-foreground">{row.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
