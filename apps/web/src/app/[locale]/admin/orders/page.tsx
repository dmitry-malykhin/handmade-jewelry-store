import type { Metadata } from 'next'
import { AdminOrdersTable } from './_components/admin-orders-table'

export const metadata: Metadata = {
  title: 'Orders — Admin Panel',
  robots: { index: false, follow: false },
}

export default function AdminOrdersPage() {
  return (
    <main>
      <AdminOrdersTable />
    </main>
  )
}
