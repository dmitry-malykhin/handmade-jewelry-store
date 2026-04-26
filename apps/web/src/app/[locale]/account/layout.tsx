import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { AccountAuthGuard } from './_components/account-auth-guard'
import { AccountNav } from './_components/account-nav'

interface AccountLayoutProps {
  children: ReactNode
}

export default async function AccountLayout({ children }: AccountLayoutProps) {
  const t = await getTranslations('account')

  return (
    <AccountAuthGuard>
      <main className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-3xl font-light">{t('title')}</h1>

        <div className="grid gap-8 md:grid-cols-[220px_1fr]">
          <aside>
            <AccountNav />
          </aside>
          <div>{children}</div>
        </div>
      </main>
    </AccountAuthGuard>
  )
}
