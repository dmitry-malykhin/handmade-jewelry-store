import type { OrderStatus } from '@/lib/api/orders'

// Mirrors the backend state machine whitelist.
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  CANCELLED: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  REFUNDED: [],
  PARTIALLY_REFUNDED: [],
}

export const STATUS_VARIANT: Record<
  OrderStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  PENDING: 'secondary',
  PAID: 'default',
  PROCESSING: 'default',
  SHIPPED: 'default',
  DELIVERED: 'default',
  CANCELLED: 'destructive',
  REFUNDED: 'outline',
  PARTIALLY_REFUNDED: 'outline',
}

export const SHIPPING_CARRIERS = ['USPS', 'FedEx', 'UPS', 'DHL'] as const
