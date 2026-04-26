'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

const ACCOUNT_LINKS = [
  { href: '/account', key: 'overview' },
  { href: '/account/orders', key: 'orders' },
  { href: '/account/addresses', key: 'addresses' },
  { href: '/account/loyalty', key: 'loyalty' },
  { href: '/account/settings', key: 'settings' },
] as const

/**
 * Persistent sidebar navigation for the /account section.
 * Shows on desktop (md+); on mobile a horizontal scrollable tab bar replaces it.
 */
export function AccountNav() {
  const t = useTranslations('account.nav')
  const pathname = usePathname()

  return (
    <nav aria-label={t('label')}>
      {/* Mobile: horizontal scrollable tabs */}
      <ul role="list" className="flex gap-2 overflow-x-auto pb-2 md:hidden">
        {ACCOUNT_LINKS.map(({ href, key }) => {
          const isActive = pathname === href
          return (
            <li key={key} className="shrink-0">
              <Link
                href={href}
                className={cn(
                  'inline-flex items-center rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {t(key)}
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Desktop: vertical sidebar */}
      <ul role="list" className="hidden flex-col gap-1 md:flex">
        {ACCOUNT_LINKS.map(({ href, key }) => {
          const isActive = pathname === href
          return (
            <li key={key}>
              <Link
                href={href}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {t(key)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
