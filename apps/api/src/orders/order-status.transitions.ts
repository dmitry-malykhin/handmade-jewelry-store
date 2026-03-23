import { OrderStatus } from '@prisma/client'

/**
 * Whitelist of allowed order status transitions.
 * Any transition not listed here is forbidden — prevents invalid state jumps
 * (e.g. SHIPPED → PAID) and skips (e.g. PENDING → SHIPPED).
 */
export const ALLOWED_ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [OrderStatus.REFUNDED, OrderStatus.PARTIALLY_REFUNDED],
  CANCELLED: [OrderStatus.REFUNDED, OrderStatus.PARTIALLY_REFUNDED],
  REFUNDED: [], // terminal state — no transitions allowed
  PARTIALLY_REFUNDED: [], // terminal state — no transitions allowed
}

export function isValidOrderStatusTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
): boolean {
  return ALLOWED_ORDER_STATUS_TRANSITIONS[fromStatus].includes(toStatus)
}
