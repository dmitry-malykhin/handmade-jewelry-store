import type { OrderStatus } from '@/lib/api/orders'

// Mirrors the backend state machine whitelist.
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
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
  ON_HOLD: 'destructive',
}

export const SHIPPING_CARRIERS = ['USPS', 'FedEx', 'UPS', 'DHL'] as const
