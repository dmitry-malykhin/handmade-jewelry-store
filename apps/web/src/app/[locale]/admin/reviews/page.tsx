import type { Metadata } from 'next'
import { AdminReviewsTable } from './_components/admin-reviews-table'

export const metadata: Metadata = {
  title: 'Reviews — Admin Panel',
  robots: { index: false, follow: false },
}

export default function AdminReviewsPage() {
  return (
    <main>
      <AdminReviewsTable />
    </main>
  )
}
