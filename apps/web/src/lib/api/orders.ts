import { apiClient } from './client'

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
  source: string | null
  statusHistory: OrderStatusHistoryEntry[]
  payment: OrderPaymentInfo | null
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

export async function fetchAdminOrders(
  params: AdminOrdersQueryParams,
  accessToken: string,
): Promise<AdminOrdersResponse> {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  })
  const queryString = searchParams.toString()
  return apiClient<AdminOrdersResponse>(
    `/api/admin/orders${queryString ? `?${queryString}` : ''}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
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
