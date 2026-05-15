import type { Metadata } from 'next'
import { AdminRefundsTable } from './_components/admin-refunds-table'

export const metadata: Metadata = {
  title: 'Refunds — Admin Panel',
  robots: { index: false, follow: false },
}

export default function AdminRefundsPage() {
  return (
    <main>
      <AdminRefundsTable />
    </main>
  )
}
