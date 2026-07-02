'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ArrowLeft, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { Link } from '@/i18n/navigation'
import { useAuthStore } from '@/store/auth.store'
import {
  fetchAdminOrderById,
  updateAdminOrderStatus,
  updateAdminOrderTracking,
  type OrderStatus,
  type UpdateOrderTrackingPayload,
} from '@/lib/api/orders'
import { ApiError } from '@/lib/api/client'
import { getStatusConfirmCopy, requiresStatusConfirmation } from '../../_lib/status-confirm'
import { CustomerInfoCard } from './customer-info-card'
import { LabelPurchaseSection } from './label-purchase-section'
import { LineItemsTable } from './line-items-table'
import { OrderSummaryCard } from './order-summary-card'
import { RefundOrderModal } from './refund-order-modal'
import { ShippingAddressCard } from './shipping-address-card'
import { StatusTimeline } from './status-timeline'
import { StatusUpdateSection } from './status-update-section'
import { TrackingSection } from './tracking-section'

interface AdminOrderDetailProps {
  orderId: string
}

export function AdminOrderDetail({ orderId }: AdminOrderDetailProps) {
  const t = useTranslations('admin')
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null)

  const { data: order, isPending: isOrderLoading } = useQuery({
    queryKey: ['admin', 'orders', orderId],
    queryFn: () => fetchAdminOrderById(orderId, accessToken ?? ''),
    enabled: accessToken !== null,
  })

  const statusMutation = useMutation({
    mutationFn: (newStatus: OrderStatus) =>
      updateAdminOrderStatus(orderId, { status: newStatus }, accessToken ?? ''),
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData(['admin', 'orders', orderId], updatedOrder)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      toast.success(t('ordersStatusUpdateSuccess', { id: orderId.slice(-8) }))
      setPendingStatus(null)
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t('ordersStatusUpdateError')
      toast.error(message)
    },
  })

  function handleStatusChange(newStatus: OrderStatus) {
    if (requiresStatusConfirmation(newStatus)) {
      setPendingStatus(newStatus)
      return
    }
    statusMutation.mutate(newStatus)
  }

  const pendingStatusCopy = pendingStatus ? getStatusConfirmCopy(pendingStatus) : null

  const trackingMutation = useMutation({
    mutationFn: (payload: UpdateOrderTrackingPayload) =>
      updateAdminOrderTracking(orderId, payload, accessToken ?? ''),
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData(['admin', 'orders', orderId], updatedOrder)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      toast.success(t('orderDetailTrackingSaveSuccess'))
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t('orderDetailTrackingSaveError')
      toast.error(message)
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/orders"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          aria-label={t('orderDetailBackAriaLabel')}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t('orderDetailBack')}
        </Link>
        {order && (
          <h1 className="text-xl font-semibold text-foreground">
            {t('orderDetailTitle', { id: order.id.slice(-8) })}
          </h1>
        )}
      </div>

      {isOrderLoading && (
        <p className="text-sm text-muted-foreground" role="status">
          {t('orderDetailLoading')}
        </p>
      )}

      {order && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <OrderSummaryCard order={order} />
            </div>
            <CustomerInfoCard order={order} />
          </div>

          <LineItemsTable order={order} />

          <div className="grid gap-4 lg:grid-cols-2">
            <ShippingAddressCard order={order} />
            <StatusUpdateSection
              order={order}
              onStatusChange={handleStatusChange}
              isUpdating={statusMutation.isPending}
            />
          </div>

          <LabelPurchaseSection order={order} />

          <TrackingSection
            order={order}
            onTrackingSubmit={(payload) => trackingMutation.mutate(payload)}
            isUpdating={trackingMutation.isPending}
          />

          {order.payment &&
            (order.payment.status === 'SUCCEEDED' ||
              order.payment.status === 'PARTIALLY_REFUNDED') && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setIsRefundModalOpen(true)}
                >
                  {t('refundButtonIssue')}
                </Button>
              </div>
            )}

          <StatusTimeline order={order} />

          <RefundOrderModal
            isOpen={isRefundModalOpen}
            onClose={() => setIsRefundModalOpen(false)}
            orderId={order.id}
            orderTotal={Number(order.total)}
            alreadyRefunded={order.refundAmount != null ? Number(order.refundAmount) : 0}
          />
        </>
      )}

      {!isOrderLoading && !order && (
        <div className="rounded-lg border border-border bg-card p-8 text-center" role="alert">
          <Package className="mx-auto mb-3 size-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t('orderDetailNotFound')}</p>
        </div>
      )}

      <ConfirmDialog
        open={pendingStatus !== null && pendingStatusCopy !== null}
        onClose={() => setPendingStatus(null)}
        onConfirm={() => {
          if (pendingStatus) statusMutation.mutate(pendingStatus)
        }}
        isPending={statusMutation.isPending}
        confirmVariant={pendingStatusCopy?.variant ?? 'default'}
        title={pendingStatusCopy ? t(pendingStatusCopy.titleKey, { id: orderId.slice(-8) }) : ''}
        description={pendingStatusCopy ? t(pendingStatusCopy.descriptionKey) : ''}
        confirmLabel={pendingStatusCopy ? t(pendingStatusCopy.actionKey) : undefined}
      />
    </div>
  )
}
