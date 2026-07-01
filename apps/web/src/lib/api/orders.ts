import { apiClient } from './client'
import { downloadCsv } from './csv-download'
import { toQueryString } from './query-string'

export interface ShippingAddress {
  fullName: string
  addressLine1: string
  addressLine2?: string
  city: string
  state?: string
  postalCode: string
  country: string
  phone?: string
}

export interface OrderItemPayload {
  productId: string
  quantity: number
  price: number
  productSnapshot: {
    title: string
    slug: string
    sku?: string
    image?: string
  }
}

export interface CreateOrderPayload {
  userId?: string
  guestEmail?: string
  items: OrderItemPayload[]
  shippingAddress: ShippingAddress
  subtotal: number
  shippingCost: number
  total: number
  // Server clamps to balance + 50% subtotal.
  loyaltyPointsToRedeem?: number
  source?: string
}

export interface CreatedOrder {
  id: string
  status: string
  total: number
}

export interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number
  productSnapshot: {
    title: string
    slug: string
    sku?: string
    image?: string
  }
}

export interface OrderStatusHistoryEntry {
  id: string
  fromStatus: OrderStatus | null
  toStatus: OrderStatus
  note: string | null
  createdBy: string | null
  createdAt: string
}

export interface OrderPaymentInfo {
  id: string
  status: string
  amount: number
  currency: string
  stripePaymentIntentId: string | null
}

export interface OrderDetails {
  id: string
  status: OrderStatus
  subtotal: number
  shippingCost: number
  total: number
  guestEmail: string | null
  shippingAddress: ShippingAddress
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

export interface AdminOrderDetail extends OrderDetails {
  shippingCarrier: string | null
  trackingNumber: string | null
  shippedAt: string | null
  estimatedDeliveryAt: string | null
  deliveredAt: string | null
  cancelReason: string | null
  cancelNote: string | null
  refundedAt: string | null
  refundAmount: number | null
  refundReason: string | null
  refundNote: string | null
  productionStatus: 'QUEUED' | 'IN_PRODUCTION' | 'READY_TO_SHIP'
  productionNotes: string | null
  source: string | null
  statusHistory: OrderStatusHistoryEntry[]
  payment: OrderPaymentInfo | null
  easypostShipmentId: string | null
  easypostTrackerId: string | null
  labelUrl: string | null
  shippingInsuranceCents: number
}

export interface UpdateOrderTrackingPayload {
  trackingNumber: string
  shippingCarrier: string
  note?: string
}

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'

export interface AdminOrdersQueryParams {
  page?: number
  limit?: number
  status?: OrderStatus
  userId?: string
}

export interface AdminOrdersResponse {
  data: OrderDetails[]
  meta: {
    totalCount: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus
  note?: string
  trackingNumber?: string
}

export async function fetchOrderById(orderId: string): Promise<OrderDetails> {
  return apiClient<OrderDetails>(`/api/orders/${orderId}`)
}

export async function fetchMyOrders(accessToken: string): Promise<OrderDetails[]> {
  return apiClient<OrderDetails[]>('/api/orders/my', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreatedOrder> {
  return apiClient<CreatedOrder>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export interface AdminOrdersExportParams {
  status?: OrderStatus
  // ISO 8601, inclusive bounds on `createdAt`.
  from?: string
  to?: string
}

export async function downloadAdminOrdersCsv(
  params: AdminOrdersExportParams,
  accessToken: string,
): Promise<void> {
  await downloadCsv({
    path: `/api/admin/orders/export${toQueryString(params)}`,
    accessToken,
    filename: 'orders-export',
  })
}

export async function fetchAdminOrders(
  params: AdminOrdersQueryParams,
  accessToken: string,
): Promise<AdminOrdersResponse> {
  return apiClient<AdminOrdersResponse>(`/api/admin/orders${toQueryString(params)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function fetchAdminOrderById(
  orderId: string,
  accessToken: string,
): Promise<AdminOrderDetail> {
  return apiClient<AdminOrderDetail>(`/api/admin/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function updateAdminOrderStatus(
  orderId: string,
  payload: UpdateOrderStatusPayload,
  accessToken: string,
): Promise<AdminOrderDetail> {
  return apiClient<AdminOrderDetail>(`/api/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  })
}

export async function updateAdminOrderTracking(
  orderId: string,
  payload: UpdateOrderTrackingPayload,
  accessToken: string,
): Promise<AdminOrderDetail> {
  return apiClient<AdminOrderDetail>(`/api/admin/orders/${orderId}/tracking`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  })
}

export type RefundReason =
  | 'ITEM_DAMAGED'
  | 'ITEM_NOT_AS_DESCRIBED'
  | 'CUSTOMER_CHANGED_MIND'
  | 'DUPLICATE_ORDER'
  | 'OTHER'

export interface RefundOrderPayload {
  // Amount in USD. Omit for full refund of remaining amount.
  amount?: number
  reason: RefundReason
  note?: string
}

export async function refundAdminOrder(
  orderId: string,
  payload: RefundOrderPayload,
  accessToken: string,
): Promise<AdminOrderDetail> {
  return apiClient<AdminOrderDetail>(`/api/admin/orders/${orderId}/refund`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  })
}

export interface AdminRefundsQueryParams {
  // ISO 8601, inclusive bounds on `refundedAt`.
  from?: string
  to?: string
  reason?: RefundReason
  // Substring match against guest email or registered customer email.
  customer?: string
}

export async function fetchAdminRefunds(
  params: AdminRefundsQueryParams,
  accessToken: string,
): Promise<AdminOrderDetail[]> {
  return apiClient<AdminOrderDetail[]>(`/api/admin/orders/refunds${toQueryString(params)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export type ProductionStatus = 'QUEUED' | 'IN_PRODUCTION' | 'READY_TO_SHIP'

export interface ProductionQueueItem extends AdminOrderDetail {
  productionStatus: ProductionStatus
  productionNotes: string | null
  // ISO date = order.createdAt + max(productionDays across MTO items).
  productionDeadlineAt: string
  maxProductionDays: number
}

export interface UpdateProductionPayload {
  productionStatus: ProductionStatus
  productionNotes?: string
}

export async function fetchAdminProductionQueue(
  accessToken: string,
): Promise<ProductionQueueItem[]> {
  return apiClient<ProductionQueueItem[]>('/api/admin/orders/production', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

export async function updateAdminOrderProduction(
  orderId: string,
  payload: UpdateProductionPayload,
  accessToken: string,
): Promise<ProductionQueueItem> {
  return apiClient<ProductionQueueItem>(`/api/admin/orders/${orderId}/production`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  })
}
