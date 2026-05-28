'use client'

import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useAuthStore } from '@/store/auth.store'
import { fetchAdminTopProducts, type RevenueChartPeriod } from '@/lib/api/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TopProductsTableProps {
  period: RevenueChartPeriod
  limit?: number
}

function formatRevenue(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function TopProductsTable({ period, limit = 10 }: TopProductsTableProps) {
  const t = useTranslations('admin')
  const accessToken = useAuthStore((state) => state.accessToken)

  const { data, isPending } = useQuery({
    queryKey: ['admin', 'analytics', 'top-products', period, limit],
    queryFn: () => fetchAdminTopProducts(period, limit, accessToken ?? ''),
    enabled: accessToken !== null,
  })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{t('topProductsTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <p className="py-6 text-sm text-muted-foreground" role="status">
            {t('topProductsLoading')}
          </p>
        ) : !data || data.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">{t('topProductsEmpty')}</p>
        ) : (
          <ul role="list" className="divide-y divide-border">
            {data.map((row, index) => (
              <li key={row.productId} className="flex items-center gap-3 py-3">
                <span className="w-6 shrink-0 text-sm tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <div className="relative size-10 shrink-0 overflow-hidden rounded bg-muted">
                  {row.image && (
                    <Image
                      src={row.image}
                      alt={t('topProductsImageAlt', { title: row.title })}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${row.slug}`}
                    className="block truncate text-sm font-medium text-foreground hover:underline"
                  >
                    {row.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {t('topProductsRatingLine', {
                      rating: row.avgRating.toFixed(1),
                      reviewCount: row.reviewCount,
                    })}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-foreground">
                    <data value={row.revenueCents}>{formatRevenue(row.revenueCents)}</data>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('topProductsUnitsSold', { count: row.unitsSold })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
