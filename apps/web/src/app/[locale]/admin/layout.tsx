import type { ReactNode } from 'react'
import { AdminAuthGuard } from './_components/admin-auth-guard'
import { AdminSidebar } from './_components/admin-sidebar'

interface AdminLayoutProps {
  children: ReactNode
}

/**
 * Admin section layout — wraps all /admin/* pages.
 * Renders a fixed sidebar + main content area.
 * AdminAuthGuard (client component) enforces ADMIN role on the client;
 * it redirects to / if the user is not authenticated or not an ADMIN.
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminAuthGuard>
      <div className="flex min-h-[calc(100vh-4rem)]">
        <AdminSidebar />
        <main id="admin-main-content" className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </AdminAuthGuard>
  )
}
