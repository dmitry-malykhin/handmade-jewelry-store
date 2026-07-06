'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { useAdminCsvExport } from '@/hooks/useAdminCsvExport'
import { useAdminListQuery } from '@/hooks/useAdminListQuery'
import { useAuthStore } from '@/store/auth.store'
import {
  downloadAdminOrdersCsv,
  fetchAdminOrders,
  updateAdminOrderStatus,
  type OrderStatus,
} from '@/lib/api/orders'
import { ApiError } from '@/lib/api/client'
import type { AdminOrdersQueryParams } from '@/lib/api/orders'
import { captureAdminError } from '@/lib/sentry/capture-admin-error'
import { getStatusConfirmCopy, requiresStatusConfirmation } from '../_lib/status-confirm'

// Mirrors the backend state machine.
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED', 'ON_HOLD'],
  PAID: ['PROCESSING', 'CANCELLED', 'ON_HOLD'],
  PROCESSING: ['SHIPPED', 'CANCELLED', 'ON_HOLD'],
  SHIPPED: ['DELIVERED', 'ON_HOLD'],
  DELIVERED: ['REFUNDED', 'PARTIALLY_REFUNDED', 'ON_HOLD'],
  CANCELLED: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  REFUNDED: [],
  PARTIALLY_REFUNDED: [],
  ON_HOLD: ['REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED'],
}

const ALL_STATUSES: OrderStatus[] = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'ON_HOLD',
]

const STATUS_VARIANT: Record<OrderStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDING: 'secondary',
  PAID: 'default',
  PROCESSING: 'default',
  SHIPPED: 'default',
  DELIVERED: 'default',
  CANCELLED: 'destructive',
  REFUNDED: 'outline',
  PARTIALLY_REFUNDED: 'outline',
  ON_HOLD: 'destructive',
}

const PAGE_LIMIT = 20

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
}

export function AdminOrdersTable() {
  const t = useTranslations('admin')
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)

  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [pendingTransition, setPendingTransition] = useState<{
    orderId: string
    newStatus: OrderStatus
  } | null>(null)

  const { isExporting, isExportDisabled, handleExport } = useAdminCsvExport({
    download: (token) =>
      downloadAdminOrdersCsv(statusFilter !== 'ALL' ? { status: statusFilter } : {}, token),
  })

  const queryParams: AdminOrdersQueryParams = {
    page: currentPage,
    limit: PAGE_LIMIT,
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
  }

  const { data, isPending: isOrdersLoading } = useAdminListQuery({
    queryKey: ['admin', 'orders'],
    queryParams,
    fetcher: fetchAdminOrders,
  })

  const statusMutation = useMutation({
    mutationFn: ({ orderId, newStatus }: { orderId: string; newStatus: OrderStatus }) =>
      updateAdminOrderStatus(orderId, { status: newStatus }, accessToken ?? ''),
    onSuccess: (updatedOrder) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      toast.success(t('ordersStatusUpdateSuccess', { id: updatedOrder.id.slice(-8) }))
      setPendingTransition(null)
    },
    onError: (error, variables) => {
      captureAdminError(error, {
        action: 'orders.updateStatus',
        orderId: variables.orderId,
        newStatus: variables.newStatus,
      })
      const message = error instanceof ApiError ? error.message : t('ordersStatusUpdateError')
      toast.error(message)
    },
  })

  function handleStatusChange(orderId: string, newStatus: OrderStatus) {
    if (requiresStatusConfirmation(newStatus)) {
      setPendingTransition({ orderId, newStatus })
      return
    }
    statusMutation.mutate({ orderId, newStatus })
  }

  const pendingTransitionCopy = pendingTransition
    ? getStatusConfirmCopy(pendingTransition.newStatus)
    : null

  const totalPages = data?.meta.totalPages ?? 1

  return (
    <section aria-labelledby="orders-heading">
      <div className="mb-6 flex items-center justify-between">
        <h1 id="orders-heading" className="text-2xl font-semibold text-foreground">
          {t('ordersTitle')}
        </h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isExportDisabled}
          onClick={handleExport}
        >
          <Download className="mr-2 size-4" aria-hidden="true" />
          {isExporting ? t('exportCsvInProgress') : t('exportCsvButton')}
        </Button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as OrderStatus | 'ALL')
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="w-48" aria-label={t('ordersStatusFilterAriaLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('ordersStatusAll')}</SelectItem>
            {ALL_STATUSES.map((orderStatus) => (
              <SelectItem key={orderStatus} value={orderStatus}>
                {t(`ordersStatus${orderStatus}` as Parameters<typeof t>[0])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isOrdersLoading ? (
        <p className="text-sm text-muted-foreground">{t('ordersLoading')}</p>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ordersColId')}</TableHead>
                  <TableHead>{t('ordersColCustomer')}</TableHead>
                  <TableHead>{t('ordersColStatus')}</TableHead>
                  <TableHead>{t('ordersColItems')}</TableHead>
                  <TableHead>{t('ordersColTotal')}</TableHead>
                  <TableHead>{t('ordersColDate')}</TableHead>
                  <TableHead className="sr-only">{t('ordersColActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      {t('ordersEmpty')}
                    </TableCell>
                  </TableRow>
                )}
                {data?.data.map((order) => {
                  const allowedNextStatuses = ALLOWED_TRANSITIONS[order.status as OrderStatus] ?? []
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {order.id.slice(-8)}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {order.guestEmail ?? t('ordersGuestLabel')}
                      </TableCell>
                      <TableCell>
                        {allowedNextStatuses.length > 0 ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="cursor-pointer"
                                aria-label={t('ordersChangeStatusAriaLabel', {
                                  id: order.id.slice(-8),
                                })}
                              >
                                <OrderStatusBadge status={order.status as OrderStatus} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              {allowedNextStatuses.map((nextStatus) => (
                                <DropdownMenuItem
                                  key={nextStatus}
                                  onClick={() => handleStatusChange(order.id, nextStatus)}
                                >
                                  {t('ordersStatusChangeTo', {
                                    status: t(
                                      `ordersStatus${nextStatus}` as Parameters<typeof t>[0],
                                    ),
                                  })}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <OrderStatusBadge status={order.status as OrderStatus} />
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{order.items.length}</TableCell>
                      <TableCell>
                        <data value={order.total}>${Number(order.total).toFixed(2)}</data>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-sm text-primary hover:underline"
                          aria-label={t('ordersViewAriaLabel', { id: order.id.slice(-8) })}
                        >
                          {t('ordersViewLink')}
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={data?.meta.totalCount ?? 0}
            onPageChange={setCurrentPage}
            infoKey="ordersPaginationInfo"
            prevLabelKey="ordersPaginationPrev"
            nextLabelKey="ordersPaginationNext"
          />
        </>
      )}

      <ConfirmDialog
        open={pendingTransition !== null && pendingTransitionCopy !== null}
        onClose={() => setPendingTransition(null)}
        onConfirm={() => {
          if (pendingTransition) statusMutation.mutate(pendingTransition)
        }}
        isPending={statusMutation.isPending}
        confirmVariant={pendingTransitionCopy?.variant ?? 'default'}
        title={
          pendingTransitionCopy && pendingTransition
            ? t(pendingTransitionCopy.titleKey, { id: pendingTransition.orderId.slice(-8) })
            : ''
        }
        description={pendingTransitionCopy ? t(pendingTransitionCopy.descriptionKey) : ''}
        confirmLabel={pendingTransitionCopy ? t(pendingTransitionCopy.actionKey) : undefined}
      />
    </section>
  )
}
