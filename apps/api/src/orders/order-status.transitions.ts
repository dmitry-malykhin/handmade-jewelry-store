import { OrderStatus } from '@prisma/client'

/**
 * Whitelist of allowed order status transitions.
 * Any transition not listed here is forbidden — prevents invalid state jumps
 * (e.g. SHIPPED → PAID) and skips (e.g. PENDING → SHIPPED).
 */
export const ALLOWED_ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID: [OrderStatus.PROCESSING, OrderStatus.CANCELLED, OrderStatus.PARTIALLY_REFUNDED],
  PROCESSING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED, OrderStatus.PARTIALLY_REFUNDED],
  SHIPPED: [OrderStatus.DELIVERED, OrderStatus.PARTIALLY_REFUNDED],
  DELIVERED: [OrderStatus.REFUNDED, OrderStatus.PARTIALLY_REFUNDED],
  CANCELLED: [OrderStatus.REFUNDED, OrderStatus.PARTIALLY_REFUNDED],
  // PARTIALLY_REFUNDED → REFUNDED allowed for follow-up refunds — a top-up
  // refund that brings the cumulative amount to the full total.
  PARTIALLY_REFUNDED: [OrderStatus.REFUNDED],
  REFUNDED: [], // terminal state — no transitions allowed
}

export function isValidOrderStatusTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
): boolean {
  return ALLOWED_ORDER_STATUS_TRANSITIONS[fromStatus].includes(toStatus)
}
