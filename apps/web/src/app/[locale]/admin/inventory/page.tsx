import type { Metadata } from 'next'
import { InventoryTable } from './_components/inventory-table'

export const metadata: Metadata = {
  title: 'Inventory — Admin Panel',
  robots: { index: false, follow: false },
}

export default function AdminInventoryPage() {
  return (
    <main>
      <InventoryTable />
    </main>
  )
}
