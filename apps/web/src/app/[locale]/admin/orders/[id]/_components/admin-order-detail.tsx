'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ArrowLeft, Package, Truck } from 'lucide-react'
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
import {
  fetchAdminOrderById,
  updateAdminOrderStatus,
  updateAdminOrderTracking,
  type AdminOrderDetail as AdminOrderDetailType,
  type OrderStatus,
  type UpdateOrderTrackingPayload,
} from '@/lib/api/orders'
import { ApiError } from '@/lib/api/client'

interface AdminOrderDetailProps {
  orderId: string
}

// Mirrors the backend state machine whitelist
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

const SHIPPING_CARRIERS = ['USPS', 'FedEx', 'UPS', 'DHL']

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations('admin')
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {t(`ordersStatus${status}` as Parameters<typeof t>[0])}
    </Badge>
  )
}

function OrderSummaryCard({ order }: { order: AdminOrderDetailType }) {
  const t = useTranslations('admin')
  return (
    <section
      aria-labelledby="order-summary-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="order-summary-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('orderDetailSectionSummary')}
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">{t('orderDetailFieldId')}</dt>
          <dd>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {order.id.slice(-8)}
            </code>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('orderDetailFieldCreated')}</dt>
          <dd className="font-medium text-foreground">
            {new Date(order.createdAt).toLocaleDateString()}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('orderDetailFieldSubtotal')}</dt>
          <dd>
            <data value={order.subtotal} className="font-medium text-foreground">
              ${Number(order.subtotal).toFixed(2)}
            </data>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('orderDetailFieldShipping')}</dt>
          <dd>
            <data value={order.shippingCost} className="font-medium text-foreground">
              ${Number(order.shippingCost).toFixed(2)}
            </data>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('orderDetailFieldTotal')}</dt>
          <dd>
            <data value={order.total} className="text-lg font-semibold text-foreground">
              ${Number(order.total).toFixed(2)}
            </data>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('orderDetailFieldSource')}</dt>
          <dd className="capitalize text-foreground">{order.source ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('orderDetailFieldPayment')}</dt>
          <dd>
            {order.payment ? (
              <Badge variant="outline" className="text-xs">
                {order.payment.status}
              </Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  )
}

function CustomerInfoCard({ order }: { order: AdminOrderDetailType }) {
  const t = useTranslations('admin')
  return (
    <section
      aria-labelledby="customer-info-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="customer-info-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('orderDetailSectionCustomer')}
      </h2>
      <dl className="space-y-1 text-sm">
        <div className="flex gap-2">
          <dt className="text-muted-foreground">{t('orderDetailFieldEmail')}</dt>
          <dd className="font-medium text-foreground">
            {order.guestEmail ?? t('orderDetailGuestLabel')}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">{t('orderDetailFieldCustomerType')}</dt>
          <dd className="text-foreground">
            {order.guestEmail ? t('orderDetailTypeGuest') : t('orderDetailTypeRegistered')}
          </dd>
        </div>
      </dl>
    </section>
  )
}

function ShippingAddressCard({ order }: { order: AdminOrderDetailType }) {
  const t = useTranslations('admin')
  const { shippingAddress } = order
  return (
    <section
      aria-labelledby="shipping-address-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="shipping-address-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('orderDetailSectionShipping')}
      </h2>
      <address className="space-y-0.5 text-sm not-italic text-foreground">
        <p className="font-medium">{shippingAddress.fullName}</p>
        <p>{shippingAddress.addressLine1}</p>
        {shippingAddress.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
        <p>
          {shippingAddress.city}
          {shippingAddress.state ? `, ${shippingAddress.state}` : ''} {shippingAddress.postalCode}
        </p>
        <p>{shippingAddress.country}</p>
        {shippingAddress.phone && (
          <p className="pt-1 text-muted-foreground">{shippingAddress.phone}</p>
        )}
      </address>
    </section>
  )
}

function LineItemsTable({ order }: { order: AdminOrderDetailType }) {
  const t = useTranslations('admin')
  return (
    <section aria-labelledby="line-items-heading">
      <h2
        id="line-items-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('orderDetailSectionItems')}
      </h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('orderDetailItemColProduct')}</TableHead>
              <TableHead>{t('orderDetailItemColSku')}</TableHead>
              <TableHead className="text-right">{t('orderDetailItemColQty')}</TableHead>
              <TableHead className="text-right">{t('orderDetailItemColUnitPrice')}</TableHead>
              <TableHead className="text-right">{t('orderDetailItemColLineTotal')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((orderItem) => {
              const snapshot = orderItem.productSnapshot
              const lineTotal = Number(orderItem.price) * orderItem.quantity
              return (
                <TableRow key={orderItem.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {snapshot.image && (
                        <figure className="relative size-10 shrink-0 overflow-hidden rounded border border-border bg-muted">
                          <Image
                            src={snapshot.image}
                            alt={snapshot.title}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </figure>
                      )}
                      <span className="text-sm font-medium text-foreground">{snapshot.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {snapshot.sku ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">{orderItem.quantity}</TableCell>
                  <TableCell className="text-right">
                    <data value={orderItem.price}>${Number(orderItem.price).toFixed(2)}</data>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <data value={lineTotal}>${lineTotal.toFixed(2)}</data>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

interface StatusUpdateSectionProps {
  order: AdminOrderDetailType
  onStatusChange: (newStatus: OrderStatus) => void
  isUpdating: boolean
}

function StatusUpdateSection({ order, onStatusChange, isUpdating }: StatusUpdateSectionProps) {
  const t = useTranslations('admin')
  const allowedNextStatuses = ALLOWED_TRANSITIONS[order.status] ?? []

  return (
    <section
      aria-labelledby="status-update-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="status-update-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('orderDetailSectionStatus')}
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('orderDetailStatusCurrent')}</span>
          <OrderStatusBadge status={order.status} />
        </div>
        {allowedNextStatuses.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allowedNextStatuses.map((nextStatus) => (
              <Button
                key={nextStatus}
                variant="outline"
                size="sm"
                disabled={isUpdating}
                onClick={() => onStatusChange(nextStatus)}
              >
                {t('ordersStatusChangeTo', {
                  status: t(`ordersStatus${nextStatus}` as Parameters<typeof t>[0]),
                })}
              </Button>
            ))}
          </div>
        )}
        {allowedNextStatuses.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('orderDetailStatusFinal')}</p>
        )}
      </div>
    </section>
  )
}

interface TrackingSectionProps {
  order: AdminOrderDetailType
  onTrackingSubmit: (payload: UpdateOrderTrackingPayload) => void
  isUpdating: boolean
}

function TrackingSection({ order, onTrackingSubmit, isUpdating }: TrackingSectionProps) {
  const t = useTranslations('admin')
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? '')
  const [shippingCarrier, setShippingCarrier] = useState(order.shippingCarrier ?? '')

  function handleTrackingFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!trackingNumber.trim() || !shippingCarrier) return
    onTrackingSubmit({ trackingNumber: trackingNumber.trim(), shippingCarrier })
  }

  return (
    <section
      aria-labelledby="tracking-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="tracking-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('orderDetailSectionTracking')}
      </h2>

      {order.trackingNumber && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <Truck className="size-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-muted-foreground">{order.shippingCarrier}</span>
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{order.trackingNumber}</code>
        </div>
      )}

      <form
        onSubmit={handleTrackingFormSubmit}
        className="flex flex-wrap items-end gap-3"
        noValidate
      >
        <div className="space-y-1.5">
          <Label htmlFor="tracking-carrier" className="text-sm">
            {t('orderDetailTrackingCarrier')}
          </Label>
          <Select value={shippingCarrier} onValueChange={setShippingCarrier}>
            <SelectTrigger id="tracking-carrier" className="w-36">
              <SelectValue placeholder={t('orderDetailTrackingCarrierPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {SHIPPING_CARRIERS.map((carrier) => (
                <SelectItem key={carrier} value={carrier}>
                  {carrier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tracking-number" className="text-sm">
            {t('orderDetailTrackingNumber')}
          </Label>
          <Input
            id="tracking-number"
            value={trackingNumber}
            onChange={(event) => setTrackingNumber(event.target.value)}
            placeholder={t('orderDetailTrackingNumberPlaceholder')}
            className="w-64"
          />
        </div>

        <Button
          type="submit"
          size="sm"
          disabled={isUpdating || !trackingNumber.trim() || !shippingCarrier}
        >
          {isUpdating ? t('orderDetailTrackingSaving') : t('orderDetailTrackingSave')}
        </Button>
      </form>
    </section>
  )
}

function StatusTimeline({ order }: { order: AdminOrderDetailType }) {
  const t = useTranslations('admin')
  return (
    <section aria-labelledby="timeline-heading">
      <h2
        id="timeline-heading"
        className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('orderDetailSectionTimeline')}
      </h2>
      <ol className="relative border-l border-border pl-4">
        {order.statusHistory.map((historyEntry, entryIndex) => (
          <li
            key={historyEntry.id}
            className={['pb-4', entryIndex === order.statusHistory.length - 1 ? '' : ''].join(' ')}
          >
            <div className="absolute -left-1.5 mt-1.5 size-3 rounded-full border border-border bg-background" />
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={historyEntry.toStatus} />
              <time dateTime={historyEntry.createdAt} className="text-xs text-muted-foreground">
                {new Date(historyEntry.createdAt).toLocaleString()}
              </time>
            </div>
            {historyEntry.note && (
              <p className="mt-1 text-xs text-muted-foreground">{historyEntry.note}</p>
            )}
            {historyEntry.createdBy && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('orderDetailTimelineBy', { by: historyEntry.createdBy })}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

export function AdminOrderDetail({ orderId }: AdminOrderDetailProps) {
  const t = useTranslations('admin')
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)

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
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t('ordersStatusUpdateError')
      toast.error(message)
    },
  })

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
              onStatusChange={(newStatus) => statusMutation.mutate(newStatus)}
              isUpdating={statusMutation.isPending}
            />
          </div>

          <TrackingSection
            order={order}
            onTrackingSubmit={(payload) => trackingMutation.mutate(payload)}
            isUpdating={trackingMutation.isPending}
          />

          <StatusTimeline order={order} />
        </>
      )}

      {!isOrderLoading && !order && (
        <div className="rounded-lg border border-border bg-card p-8 text-center" role="alert">
          <Package className="mx-auto mb-3 size-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t('orderDetailNotFound')}</p>
        </div>
      )}
    </div>
  )
}
