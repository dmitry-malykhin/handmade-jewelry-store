import type { ReactNode } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { AdminHeaderHelp } from '@/components/admin/admin-header-help'
import { SkipToContentLink } from '@/components/shared/skip-to-content-link'
import { AdminAuthGuard } from './_components/admin-auth-guard'
import { AdminSidebar } from './_components/admin-sidebar'

interface AdminLayoutProps {
  children: ReactNode
}

// #500: the public root provider drops `admin`; re-inject it here so admin
// client components still have their translations without inflating every
// public page with ~500 lines of admin copy.
export default async function AdminLayout({ children }: AdminLayoutProps) {
  const messages = await getMessages()
  const adminMessages = { admin: messages.admin }

  return (
    <NextIntlClientProvider messages={adminMessages}>
      <AdminAuthGuard>
        <SkipToContentLink targetId="admin-main-content" />
        <div className="flex min-h-[calc(100vh-4rem)]">
          <AdminSidebar />
          <div id="admin-main-content" className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </div>
        <AdminHeaderHelp />
      </AdminAuthGuard>
    </NextIntlClientProvider>
  )
}
