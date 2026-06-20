import type { ReactNode } from 'react'
import { AdminHeaderHelp } from '@/components/admin/admin-header-help'
import { AdminAuthGuard } from './_components/admin-auth-guard'
import { AdminSidebar } from './_components/admin-sidebar'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminAuthGuard>
      <div className="flex min-h-[calc(100vh-4rem)]">
        <AdminSidebar />
        <main id="admin-main-content" className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
      <AdminHeaderHelp />
    </AdminAuthGuard>
  )
}
