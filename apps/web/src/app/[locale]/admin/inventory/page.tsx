import type { Metadata } from 'next'
import { InventoryTable } from './_components/inventory-table'

export const metadata: Metadata = {
  title: 'Inventory · Admin Panel',
  robots: { index: false, follow: false },
}

export default function AdminInventoryPage() {
  return (
    <section aria-labelledby="inventory-heading">
      <InventoryTable />
    </section>
  )
}
