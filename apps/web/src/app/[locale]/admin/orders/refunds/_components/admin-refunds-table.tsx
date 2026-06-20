'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { fetchAdminRefunds, type AdminOrderDetail, type RefundReason } from '@/lib/api/orders'
import { REFUND_REASONS, useRefundsFilters } from './use-refunds-filters'

const CUSTOMER_DEBOUNCE_MS = 300
const REASON_ALL_SENTINEL = 'ALL'

// Filters live in the URL so refreshing or sharing preserves the view; the
// customer input is debounced before being written so each keystroke isn't a
// new history entry.
export function AdminRefundsTable() {
  const t = useTranslations('admin')
  const accessToken = useAuthStore((state) => state.accessToken)
  const { filters, setFilter, clearFilters, hasActiveFilters } = useRefundsFilters()

  const [customerDraft, setCustomerDraft] = useState(filters.customer ?? '')

  useEffect(() => {
    // Sync when the URL changes externally (e.g. Clear).
    setCustomerDraft(filters.customer ?? '')
  }, [filters.customer])

  useEffect(() => {
    if (customerDraft === (filters.customer ?? '')) return
    const handle = window.setTimeout(() => {
      setFilter('customer', customerDraft)
    }, CUSTOMER_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [customerDraft, filters.customer, setFilter])

  const { data: refunds, isPending } = useQuery<AdminOrderDetail[]>({
    queryKey: ['admin-refunds', filters],
    queryFn: () => fetchAdminRefunds(filters, accessToken ?? ''),
    enabled: accessToken !== null,
  })

  return (
    <section aria-labelledby="refunds-heading" className="space-y-4">
      <h1 id="refunds-heading" className="text-xl font-semibold text-foreground">
        {t('refundsTitle')}
      </h1>

      <fieldset
        aria-label={t('refundsFiltersLegend')}
        className="grid gap-3 rounded-md border border-border bg-card p-4 sm:grid-cols-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="refunds-from" className="text-xs">
            {t('refundsFilterFrom')}
          </Label>
          <Input
            id="refunds-from"
            type="date"
            value={filters.from ?? ''}
            onChange={(event) => setFilter('from', event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="refunds-to" className="text-xs">
            {t('refundsFilterTo')}
          </Label>
          <Input
            id="refunds-to"
            type="date"
            value={filters.to ?? ''}
            onChange={(event) => setFilter('to', event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="refunds-reason" className="text-xs">
            {t('refundsFilterReason')}
          </Label>
          <Select
            value={filters.reason ?? REASON_ALL_SENTINEL}
            onValueChange={(value) =>
              setFilter('reason', value === REASON_ALL_SENTINEL ? '' : value)
            }
          >
            <SelectTrigger id="refunds-reason">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={REASON_ALL_SENTINEL}>{t('refundsFilterReasonAll')}</SelectItem>
              {REFUND_REASONS.map((reason: RefundReason) => (
                <SelectItem key={reason} value={reason}>
                  {t(`refundReason${reason}` as Parameters<typeof t>[0])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="refunds-customer" className="text-xs">
            {t('refundsFilterCustomer')}
          </Label>
          <Input
            id="refunds-customer"
            type="search"
            value={customerDraft}
            onChange={(event) => setCustomerDraft(event.target.value)}
            placeholder={t('refundsFilterCustomerPlaceholder')}
          />
        </div>
        {hasActiveFilters && (
          <div className="sm:col-span-4">
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 size-3" aria-hidden="true" />
              {t('refundsFiltersClear')}
            </Button>
          </div>
        )}
      </fieldset>

      {isPending && (
        <p className="text-sm text-muted-foreground" role="status">
          {t('orderDetailLoading')}
        </p>
      )}

      {refunds && refunds.length === 0 && (
        <div className="rounded-md border border-border bg-card p-6 text-center" role="status">
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters ? t('refundsTableEmptyFiltered') : t('refundsTableEmpty')}
          </p>
          {hasActiveFilters && (
            <Button type="button" variant="link" size="sm" className="mt-2" onClick={clearFilters}>
              {t('refundsFiltersClear')}
            </Button>
          )}
        </div>
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
