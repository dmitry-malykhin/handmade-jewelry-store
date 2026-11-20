import type { OrderStatus } from '@/lib/api/orders'

// Transitions with customer-visible side effects (email / loyalty credit) or
// no undo through the UI. Reversible silent transitions skip confirmation.
// #477: SHIPPED is handled by its own tracking-form dialog, not this plain
// confirm dialog — the owner must enter trackingNumber + carrier at the
// same step so the customer's shipping email always carries them.
const CONFIRM_STATUSES = new Set<OrderStatus>(['DELIVERED', 'CANCELLED'])

export function requiresStatusConfirmation(nextStatus: OrderStatus): boolean {
  return CONFIRM_STATUSES.has(nextStatus)
}

export interface StatusConfirmCopy {
  titleKey: 'ordersConfirmDeliveredTitle' | 'ordersConfirmCancelledTitle'
  descriptionKey: 'ordersConfirmDeliveredDescription' | 'ordersConfirmCancelledDescription'
  actionKey: 'ordersConfirmDeliveredAction' | 'ordersConfirmCancelledAction'
  variant: 'destructive' | 'default'
}

export function getStatusConfirmCopy(nextStatus: OrderStatus): StatusConfirmCopy | null {
  switch (nextStatus) {
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
