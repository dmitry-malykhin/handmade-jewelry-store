import type { Metadata } from 'next'
import { AdminOrderDetail } from './_components/admin-order-detail'

interface AdminOrderDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: AdminOrderDetailPageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Order #${id.slice(-8)} — Admin Panel`,
    robots: { index: false, follow: false },
  }
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const { id } = await params
  return (
    <main>
      <AdminOrderDetail orderId={id} />
    </main>
  )
}
