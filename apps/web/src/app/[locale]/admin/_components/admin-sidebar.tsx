'use client'

import { useTranslations } from 'next-intl'
import { LayoutDashboard, Package, ShoppingCart } from 'lucide-react'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

interface AdminSidebarProps {
  locale: string
}

export function AdminSidebar({ locale }: AdminSidebarProps) {
  const t = useTranslations('admin')
  const pathname = usePathname()

  const sidebarLinks = [
    {
      href: `/${locale}/admin`,
      labelKey: 'navDashboard' as const,
      icon: <LayoutDashboard className="size-4" aria-hidden="true" />,
      // Dashboard is active only on exact /admin path, not on sub-pages
      isActive: pathname === '/admin',
    },
    {
      href: `/${locale}/admin/products`,
      labelKey: 'navProducts' as const,
      icon: <Package className="size-4" aria-hidden="true" />,
      isActive: pathname.startsWith('/admin/products'),
    },
    {
      href: `/${locale}/admin/orders`,
      labelKey: 'navOrders' as const,
      icon: <ShoppingCart className="size-4" aria-hidden="true" />,
      isActive: pathname.startsWith('/admin/orders'),
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
                {t(sidebarLink.labelKey)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
