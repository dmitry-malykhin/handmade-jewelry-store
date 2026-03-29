'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Package, ShoppingCart, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth.store'
import { fetchAdminStats } from '@/lib/api/admin'

export function StatsCards() {
  const t = useTranslations('admin')
  const accessToken = useAuthStore((state) => state.accessToken)

  const { data: adminStats, isPending } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => fetchAdminStats(accessToken ?? ''),
    enabled: accessToken !== null,
  })

  const statsCardConfig = [
    {
      titleKey: 'statsTotalProducts',
      value: adminStats?.productCount ?? 0,
      icon: <Package className="size-4 text-muted-foreground" aria-hidden="true" />,
    },
    {
      titleKey: 'statsTotalOrders',
      value: adminStats?.orderCount ?? 0,
      icon: <ShoppingCart className="size-4 text-muted-foreground" aria-hidden="true" />,
    },
    {
      titleKey: 'statsTotalRevenue',
      value: adminStats ? `$${(adminStats.totalRevenueCents / 100).toFixed(2)}` : '$0.00',
      icon: <DollarSign className="size-4 text-muted-foreground" aria-hidden="true" />,
    },
  ]

  return (
    <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {statsCardConfig.map((statsCard) => (
        <li key={statsCard.titleKey}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t(statsCard.titleKey)}</CardTitle>
              {statsCard.icon}
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {isPending ? '—' : statsCard.value}
              </p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}
