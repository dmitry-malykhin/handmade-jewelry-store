import type { ReactNode } from 'react'
import { AdminAuthGuard } from './_components/admin-auth-guard'
import { AdminSidebar } from './_components/admin-sidebar'

interface AdminLayoutProps {
  children: ReactNode
  params: Promise<{ locale: string }>
}

/**
 * Admin section layout — wraps all /admin/* pages.
 * Renders a fixed sidebar + main content area.
 * AdminAuthGuard (client component) enforces ADMIN role on the client;
 * it redirects to / if the user is not authenticated or not an ADMIN.
 */
export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale } = await params

  return (
    <AdminAuthGuard>
      <div className="flex min-h-[calc(100vh-4rem)]">
        <AdminSidebar locale={locale} />
        <main id="admin-main-content" className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </AdminAuthGuard>
  )
}
