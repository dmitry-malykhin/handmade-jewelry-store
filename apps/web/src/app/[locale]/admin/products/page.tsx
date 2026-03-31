import type { Metadata } from 'next'
import { AdminProductsTable } from './_components/admin-products-table'

export const metadata: Metadata = {
  title: 'Products — Admin Panel',
  robots: { index: false, follow: false },
}

export default function AdminProductsPage() {
  return (
    <main>
      <AdminProductsTable />
    </main>
  )
}
