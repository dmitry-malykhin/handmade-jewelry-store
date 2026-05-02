import type { CartItem } from '@jewelry/shared'
import { calculateEstimatedDelivery, type EstimatedDelivery } from './calculate-estimated-delivery'
import type { ShippingOption } from './shipping-options'

/**
 * Find the slowest item's production time across the cart. The bottleneck item
 * drives the order ETA — we ship the whole order together, so an early-ready
 * piece still waits for its slowest sibling.
 *
 * Treats `productionDays === undefined` as 0 to stay compatible with carts
 * persisted before the field was introduced (see CartItem in @jewelry/shared).
 */
export function findLongestProductionDays(items: readonly CartItem[]): number {
  return items.reduce((maxDays, item) => Math.max(maxDays, item.productionDays ?? 0), 0)
}

/**
 * Order ETA = master's production lead time + carrier transit window.
 * Production is precise (mastered's commitment); shipping is a range.
 * The combined result is what the customer sees as "Estimated delivery".
 */
export function calculateOrderEta(
  productionDays: number,
  shippingOption: ShippingOption,
  fromDate: Date = new Date(),
): EstimatedDelivery {
  return calculateEstimatedDelivery(
    shippingOption.businessDaysMin + productionDays,
    shippingOption.businessDaysMax + productionDays,
    fromDate,
  )
}
