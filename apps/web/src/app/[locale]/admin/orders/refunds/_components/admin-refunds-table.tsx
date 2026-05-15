'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Link } from '@/i18n/navigation'
import { useAuthStore } from '@/store/auth.store'
import { fetchAdminRefunds, type AdminOrderDetail } from '@/lib/api/orders'

/**
 * Read-only ledger of every refund issued through the admin. Backed by a
 * single query that returns orders with REFUNDED or PARTIALLY_REFUNDED
 * status; each row links back to the order detail page where the refund
 * was processed.
 */
export function AdminRefundsTable() {
  const t = useTranslations('admin')
  const accessToken = useAuthStore((state) => state.accessToken)

  const { data: refunds, isPending } = useQuery<AdminOrderDetail[]>({
    queryKey: ['admin-refunds'],
    queryFn: () => fetchAdminRefunds(accessToken ?? ''),
    enabled: accessToken !== null,
  })

  return (
    <section aria-labelledby="refunds-heading" className="space-y-4">
      <h1 id="refunds-heading" className="text-xl font-semibold text-foreground">
        {t('refundsTitle')}
      </h1>

      {isPending && (
        <p className="text-sm text-muted-foreground" role="status">
          {t('orderDetailLoading')}
        </p>
      )}

      {refunds && refunds.length === 0 && (
        <p className="text-sm text-muted-foreground" role="status">
          {t('refundsTableEmpty')}
        </p>
      )}

      {refunds && refunds.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('refundsColOrderId')}</TableHead>
              <TableHead>{t('refundsColCustomer')}</TableHead>
              <TableHead className="text-right">{t('refundsColAmount')}</TableHead>
              <TableHead>{t('refundsColReason')}</TableHead>
              <TableHead>{t('refundsColRefundedAt')}</TableHead>
              <TableHead>{t('refundsColStatus')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refunds.map((refund) => (
              <TableRow key={refund.id}>
                <TableCell>
                  <Link
                    href={`/admin/orders/${refund.id}`}
                    className="font-mono text-sm hover:underline"
                  >
                    {refund.id.slice(-8).toUpperCase()}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-foreground">
                  {refund.guestEmail ?? '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  ${refund.refundAmount != null ? Number(refund.refundAmount).toFixed(2) : '0.00'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {refund.refundReason
                    ? t(`refundReason${refund.refundReason}` as Parameters<typeof t>[0])
                    : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {refund.refundedAt ? new Date(refund.refundedAt).toLocaleDateString() : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {t(`ordersStatus${refund.status}` as Parameters<typeof t>[0])}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
