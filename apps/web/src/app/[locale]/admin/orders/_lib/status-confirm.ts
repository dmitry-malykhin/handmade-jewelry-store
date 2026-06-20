import type { OrderStatus } from '@/lib/api/orders'

// Transitions with customer-visible side effects (email / loyalty credit) or
// no undo through the UI. Reversible silent transitions skip confirmation.
const CONFIRM_STATUSES = new Set<OrderStatus>(['SHIPPED', 'DELIVERED', 'CANCELLED'])

export function requiresStatusConfirmation(nextStatus: OrderStatus): boolean {
  return CONFIRM_STATUSES.has(nextStatus)
}

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
