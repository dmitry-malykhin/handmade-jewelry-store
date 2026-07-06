import { OrderStatus } from '@prisma/client'

/**
 * Whitelist of allowed order status transitions.
 * Any transition not listed here is forbidden — prevents invalid state jumps
 * (e.g. SHIPPED → PAID) and skips (e.g. PENDING → SHIPPED).
 */
export const ALLOWED_ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.PAID, OrderStatus.CANCELLED, OrderStatus.ON_HOLD],
  PAID: [
    OrderStatus.PROCESSING,
    OrderStatus.CANCELLED,
    OrderStatus.PARTIALLY_REFUNDED,
    OrderStatus.ON_HOLD,
  ],
  PROCESSING: [
    OrderStatus.SHIPPED,
    OrderStatus.CANCELLED,
    OrderStatus.PARTIALLY_REFUNDED,
    OrderStatus.ON_HOLD,
  ],
  SHIPPED: [OrderStatus.DELIVERED, OrderStatus.PARTIALLY_REFUNDED, OrderStatus.ON_HOLD],
  DELIVERED: [OrderStatus.REFUNDED, OrderStatus.PARTIALLY_REFUNDED, OrderStatus.ON_HOLD],
  CANCELLED: [OrderStatus.REFUNDED, OrderStatus.PARTIALLY_REFUNDED],
  // PARTIALLY_REFUNDED → REFUNDED allowed for follow-up refunds — a top-up
  // refund that brings the cumulative amount to the full total.
  PARTIALLY_REFUNDED: [OrderStatus.REFUNDED],
  REFUNDED: [], // terminal state — no transitions allowed
  // Admin resolves a disputed order via the admin panel — either refund or
  // cancel; no path back to PROCESSING/SHIPPED once flagged.
  ON_HOLD: [OrderStatus.REFUNDED, OrderStatus.PARTIALLY_REFUNDED, OrderStatus.CANCELLED],
}

export function isValidOrderStatusTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
): boolean {
  return ALLOWED_ORDER_STATUS_TRANSITIONS[fromStatus].includes(toStatus)
}
