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

export interface OrderDetails {
  id: string
  status: string
  subtotal: number
  shippingCost: number
  total: number
  guestEmail: string | null
  shippingAddress: ShippingAddress
  items: OrderItem[]
  createdAt: string
}

export async function fetchOrderById(orderId: string): Promise<OrderDetails> {
  return apiClient<OrderDetails>(`/api/orders/${orderId}`)
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreatedOrder> {
  return apiClient<CreatedOrder>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
