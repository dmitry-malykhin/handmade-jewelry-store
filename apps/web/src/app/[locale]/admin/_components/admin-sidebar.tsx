'use client'

import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Boxes,
  Hammer,
  LayoutDashboard,
  Package,
  Percent,
  RotateCcw,
  Settings,
  ShoppingCart,
  Star,
  Tag,
  Users,
} from 'lucide-react'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth.store'
import { fetchLowStockCount } from '@/lib/api/products'

export function AdminSidebar() {
  const t = useTranslations('admin')
  const pathname = usePathname()
  const accessToken = useAuthStore((state) => state.accessToken)

  // Separate count-only endpoint so we don't load the full inventory payload
  // on every admin navigation.
  const { data: lowStockData } = useQuery({
    queryKey: ['admin-low-stock-count'],
    queryFn: () => fetchLowStockCount(accessToken ?? ''),
    enabled: accessToken !== null,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
  const lowStockCount = lowStockData?.count ?? 0

  // Hrefs are locale-agnostic — Link prepends the active locale; including
  // `/${locale}` here would produce `/en/en/admin/...` and 404.
  const sidebarLinks = [
    {
      href: '/admin',
      labelKey: 'navDashboard' as const,
      icon: <LayoutDashboard className="size-4" aria-hidden="true" />,
      isActive: pathname === '/admin',
    },
    {
      href: '/admin/analytics',
      labelKey: 'navAnalytics' as const,
      icon: <BarChart3 className="size-4" aria-hidden="true" />,
      isActive: pathname.startsWith('/admin/analytics'),
    },
    {
      href: '/admin/products',
      labelKey: 'navProducts' as const,
      icon: <Package className="size-4" aria-hidden="true" />,
      isActive: pathname.startsWith('/admin/products'),
    },
    {
      href: '/admin/orders',
      labelKey: 'navOrders' as const,
      icon: <ShoppingCart className="size-4" aria-hidden="true" />,
      // Excluded sub-routes have their own sidebar entries below.
      isActive:
        pathname.startsWith('/admin/orders') &&
        !pathname.startsWith('/admin/orders/refunds') &&
        !pathname.startsWith('/admin/orders/production'),
    },
    {
      href: '/admin/orders/refunds',
      labelKey: 'navRefunds' as const,
      icon: <RotateCcw className="size-4" aria-hidden="true" />,
      isActive: pathname.startsWith('/admin/orders/refunds'),
    },
    {
      href: '/admin/orders/production',
      labelKey: 'navProduction' as const,
      icon: <Hammer className="size-4" aria-hidden="true" />,
      isActive: pathname.startsWith('/admin/orders/production'),
    },
    {
      href: '/admin/inventory',
      labelKey: 'navInventory' as const,
      icon: <Boxes className="size-4" aria-hidden="true" />,
      isActive: pathname.startsWith('/admin/inventory'),
      badgeCount: lowStockCount,
    },
    {
      href: '/admin/customers',
      labelKey: 'navCustomers' as const,
      icon: <Users className="size-4" aria-hidden="true" />,
      isActive: pathname.startsWith('/admin/customers'),
    },
    {
      href: '/admin/reviews',
      labelKey: 'navReviews' as const,
      icon: <Star className="size-4" aria-hidden="true" />,
      isActive: pathname.startsWith('/admin/reviews'),
    },
    {
      href: '/admin/categories',
      labelKey: 'navCategories' as const,
      icon: <Tag className="size-4" aria-hidden="true" />,
      isActive: pathname.startsWith('/admin/categories'),
    },
    {
      href: '/admin/discounts',
      labelKey: 'navDiscounts' as const,
      icon: <Percent className="size-4" aria-hidden="true" />,
      isActive: pathname.startsWith('/admin/discounts'),
    },
    {
      href: '/admin/settings',
      labelKey: 'navSettings' as const,
      icon: <Settings className="size-4" aria-hidden="true" />,
      isActive: pathname.startsWith('/admin/settings'),
    },
  ]

  return (
    <aside className="w-56 shrink-0 border-r bg-card">
      <div className="flex h-16 items-center border-b px-4">
        <span className="text-sm font-semibold text-foreground">{t('panelTitle')}</span>
      </div>

      <nav aria-label={t('sidebarNav')}>
        <ul role="list" className="space-y-1 p-2">
          {sidebarLinks.map((sidebarLink) => (
            <li key={sidebarLink.href}>
              <Link
                href={sidebarLink.href}
                aria-current={sidebarLink.isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  sidebarLink.isActive
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {sidebarLink.icon}
                <span className="flex-1">{t(sidebarLink.labelKey)}</span>
                {'badgeCount' in sidebarLink &&
                  typeof sidebarLink.badgeCount === 'number' &&
                  sidebarLink.badgeCount > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                      {sidebarLink.badgeCount}
                    </Badge>
                  )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
