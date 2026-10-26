import type { Metadata } from 'next'
import { DiscountsTable } from './_components/discounts-table'

export const metadata: Metadata = {
  title: 'Discount codes · Admin Panel',
  robots: { index: false, follow: false },
}

export default function AdminDiscountsPage() {
  return (
    <section aria-labelledby="discounts-heading">
      <DiscountsTable />
    </section>
  )
}
