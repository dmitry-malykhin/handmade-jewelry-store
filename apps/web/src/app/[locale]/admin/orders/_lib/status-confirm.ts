import type { OrderStatus } from '@/lib/api/orders'

/**
 * Order status transitions that fire customer-visible side effects:
 *   SHIPPED   → shipping confirmation email
 *   DELIVERED → loyalty credit + delivery email
 *   CANCELLED → terminal, no undo through the UI
 *
 * Everything else (PENDING → PAID, PAID → PROCESSING) is silent-to-customer
 * and reversible, so we don't show a confirmation prompt.
 */
const CONFIRM_STATUSES = new Set<OrderStatus>(['SHIPPED', 'DELIVERED', 'CANCELLED'])

export function requiresStatusConfirmation(nextStatus: OrderStatus): boolean {
  return CONFIRM_STATUSES.has(nextStatus)
}

/**
 * The three i18n keys (title, description, action) for a given confirm-worthy
 * status. Caller passes the lookup result into the dialog plus `{ id }` for
 * title interpolation.
 */
export interface StatusConfirmCopy {
  titleKey:
    | 'ordersConfirmShippedTitle'
    | 'ordersConfirmDeliveredTitle'
    | 'ordersConfirmCancelledTitle'
  descriptionKey:
    | 'ordersConfirmShippedDescription'
    | 'ordersConfirmDeliveredDescription'
    | 'ordersConfirmCancelledDescription'
  actionKey:
    | 'ordersConfirmShippedAction'
    | 'ordersConfirmDeliveredAction'
    | 'ordersConfirmCancelledAction'
  /** `destructive` for CANCELLED (terminal), `default` for the others. */
  variant: 'destructive' | 'default'
}

export function getStatusConfirmCopy(nextStatus: OrderStatus): StatusConfirmCopy | null {
  switch (nextStatus) {
    case 'SHIPPED':
      return {
        titleKey: 'ordersConfirmShippedTitle',
        descriptionKey: 'ordersConfirmShippedDescription',
        actionKey: 'ordersConfirmShippedAction',
        variant: 'default',
      }
    case 'DELIVERED':
      return {
        titleKey: 'ordersConfirmDeliveredTitle',
        descriptionKey: 'ordersConfirmDeliveredDescription',
        actionKey: 'ordersConfirmDeliveredAction',
        variant: 'default',
      }
    case 'CANCELLED':
      return {
        titleKey: 'ordersConfirmCancelledTitle',
        descriptionKey: 'ordersConfirmCancelledDescription',
        actionKey: 'ordersConfirmCancelledAction',
        variant: 'destructive',
      }
    default:
      return null
  }
}
