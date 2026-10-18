import type { Metadata } from 'next'
import { ProductionTable } from './_components/production-table'

export const metadata: Metadata = {
  title: 'Production · Admin Panel',
  robots: { index: false, follow: false },
}

export default function AdminProductionPage() {
  return (
    <section aria-labelledby="production-heading">
      <ProductionTable />
    </section>
  )
}
