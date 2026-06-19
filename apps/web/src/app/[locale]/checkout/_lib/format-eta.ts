import type { CartItem } from '@jewelry/shared'
import { calculateEstimatedDelivery, type EstimatedDelivery } from './calculate-estimated-delivery'
import type { ShippingOption } from './shipping-options'

// Whole-cart bottleneck: an early-ready piece still waits for its slowest
// sibling because we ship the order together.
export function findLongestProductionDays(items: readonly CartItem[]): number {
  return items.reduce((maxDays, item) => Math.max(maxDays, item.productionDays ?? 0), 0)
}

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

// "Arrives by …" copy: pick the LATEST date to under-promise; customers prefer
// surprising-early to apologising-late.
export function formatLatestDeliveryDate(
  productionDays: number,
  shippingOption: ShippingOption,
  fromDate: Date = new Date(),
  locale: string = 'en-US',
): string {
  const delivery = calculateOrderEta(productionDays, shippingOption, fromDate)
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(delivery.latest)
}
