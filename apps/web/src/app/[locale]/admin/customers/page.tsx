import type { Metadata } from 'next'
import { CustomersTable } from './_components/customers-table'

export const metadata: Metadata = {
  title: 'Customers — Admin Panel',
  robots: { index: false, follow: false },
}

export default function AdminCustomersPage() {
  return (
    <main>
      <CustomersTable />
    </main>
  )
}
