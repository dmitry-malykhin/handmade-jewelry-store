'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { useAuthStore } from '@/store/auth.store'
import { fetchAdminOrders, updateAdminOrderStatus, type OrderStatus } from '@/lib/api/orders'
import { ApiError } from '@/lib/api/client'
import type { AdminOrdersQueryParams } from '@/lib/api/orders'

// Transitions whitelist mirrors the backend state machine
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  CANCELLED: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  REFUNDED: [],
  PARTIALLY_REFUNDED: [],
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

  const queryParams: AdminOrdersQueryParams = {
    page: currentPage,
    limit: PAGE_LIMIT,
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
  }

  const { data, isPending: isOrdersLoading } = useQuery({
    queryKey: ['admin', 'orders', queryParams],
    queryFn: () => fetchAdminOrders(queryParams, accessToken ?? ''),
    enabled: accessToken !== null,
  })

  const statusMutation = useMutation({
    mutationFn: ({ orderId, newStatus }: { orderId: string; newStatus: OrderStatus }) =>
      updateAdminOrderStatus(orderId, { status: newStatus }, accessToken ?? ''),
    onSuccess: (updatedOrder) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      toast.success(t('ordersStatusUpdateSuccess', { id: updatedOrder.id.slice(-8) }))
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t('ordersStatusUpdateError')
      toast.error(message)
    },
  })

  const totalPages = data?.meta.totalPages ?? 1

  return (
    <section aria-labelledby="orders-heading">
      <div className="mb-6 flex items-center justify-between">
        <h1 id="orders-heading" className="text-2xl font-semibold text-foreground">
          {t('ordersTitle')}
        </h1>
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
                                  onClick={() =>
                                    statusMutation.mutate({
                                      orderId: order.id,
                                      newStatus: nextStatus,
                                    })
                                  }
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
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('ordersPaginationInfo', {
                  page: currentPage,
                  totalPages,
                  totalCount: data?.meta.totalCount ?? 0,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((previousPage) => previousPage - 1)}
                  disabled={currentPage <= 1}
                >
                  {t('ordersPaginationPrev')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((previousPage) => previousPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  {t('ordersPaginationNext')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
