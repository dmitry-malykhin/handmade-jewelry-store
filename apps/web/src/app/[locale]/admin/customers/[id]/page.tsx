import type { Metadata } from 'next'
import { CustomerDetail } from './_components/customer-detail'

export const metadata: Metadata = {
  title: 'Customer — Admin Panel',
  robots: { index: false, follow: false },
}

interface AdminCustomerDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminCustomerDetailPage({ params }: AdminCustomerDetailPageProps) {
  const { id } = await params
  return (
    <main>
      <CustomerDetail userId={id} />
    </main>
  )
}
