'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useAuthStore } from '@/store/auth.store'
import { fetchCurrentUser, type AuthenticatedUser } from '@/lib/api/auth'

const SECTIONS = [
  { key: 'orders', href: '/account/orders' },
  { key: 'addresses', href: '/account/addresses' },
  { key: 'loyalty', href: '/account/loyalty' },
  { key: 'settings', href: '/account/settings' },
] as const

/**
 * Account dashboard — welcomes the user and links to all sections.
 * Loads current user details from /api/auth/me to display the email.
 */
export function AccountOverview() {
  const t = useTranslations('account.overview')
  const accessToken = useAuthStore((state) => state.accessToken)
  const [user, setUser] = useState<AuthenticatedUser | null>(null)

  useEffect(() => {
    if (!accessToken) return
    fetchCurrentUser(accessToken)
      .then(setUser)
      .catch(() => setUser(null))
  }, [accessToken])

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-2xl font-light">
          {user ? t('welcome', { email: user.email }) : t('welcomeFallback')}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <ul role="list" className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map(({ key, href }) => (
          <li key={key}>
            <Link
              href={href}
              className="block rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-accent/30"
            >
              <h3 className="text-base font-medium text-foreground">
                {t(`sections.${key}.title`)}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(`sections.${key}.description`)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
