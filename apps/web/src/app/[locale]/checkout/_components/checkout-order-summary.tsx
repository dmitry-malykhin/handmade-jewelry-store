'use client'

import { useTranslations } from 'next-intl'
import { useCheckoutItems, useCheckoutTotalPrice } from '@/store/cart.store'
import {
  SHIPPING_OPTIONS,
  DEFAULT_SHIPPING_OPTION_ID,
  calculateShippingCost,
  type ShippingOption,
} from '../_lib/shipping-options'
import { formatDeliveryRange } from '../_lib/calculate-estimated-delivery'
import { calculateOrderEta, findLongestProductionDays } from '../_lib/format-eta'

interface CheckoutOrderSummaryProps {
  /** Resolved shipping cost. When omitted, derived from selectedOption + cart subtotal. */
  shippingCost?: number
  /** The shipping option currently selected by the user. Affects delivery date display. */
  selectedOption?: ShippingOption
}

export function CheckoutOrderSummary({ shippingCost, selectedOption }: CheckoutOrderSummaryProps) {
  const t = useTranslations('checkoutPage')
  const cartItems = useCheckoutItems()
  const cartSubtotal = useCheckoutTotalPrice()

  // SHIPPING_OPTIONS always contains 'standard' — defined in the same file
  const defaultOption = SHIPPING_OPTIONS.find((option) => option.id === DEFAULT_SHIPPING_OPTION_ID)
  if (!defaultOption) throw new Error('Default shipping option not found in SHIPPING_OPTIONS')

  // Use the passed option for display; fall back to default when no selection yet (step 1)
  const displayOption: ShippingOption = selectedOption ?? defaultOption

  const resolvedShippingCost = shippingCost ?? calculateShippingCost(displayOption, cartSubtotal)
  const orderTotal = cartSubtotal + resolvedShippingCost

  // Order ETA breakdown — see docs/18_PRODUCTION_VS_SHIPPING_ETA.md.
  // We attribute time to its source so customers can tell which leg ran long
  // when a package is delayed.
  const longestProductionDays = findLongestProductionDays(cartItems)
  const delivery = calculateOrderEta(longestProductionDays, displayOption)
  const estimatedDeliveryRange = formatDeliveryRange(delivery.earliest, delivery.latest)
  const shippingLineKey: 'shippingLineStandard' | 'shippingLineExpress' =
    displayOption.id === 'express' ? 'shippingLineExpress' : 'shippingLineStandard'

  return (
    <aside aria-label={t('orderSummaryLabel')} className="lg:col-span-1">
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">{t('orderSummary')}</h2>

        <ul role="list" className="space-y-3">
          {cartItems.map((cartItem) => (
            <li key={cartItem.productId} className="flex justify-between text-sm">
              <span className="text-foreground">
                {cartItem.title}
                {cartItem.quantity > 1 && (
                  <span className="ml-1 text-muted-foreground">×{cartItem.quantity}</span>
                )}
              </span>
              <data value={cartItem.price * cartItem.quantity} className="text-foreground">
                ${(cartItem.price * cartItem.quantity).toFixed(2)}
              </data>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t('subtotal')}</span>
            <data value={cartSubtotal}>${cartSubtotal.toFixed(2)}</data>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t('shipping')}</span>
            <data value={resolvedShippingCost}>
              {resolvedShippingCost === 0 ? (
                <span className="text-green-600 dark:text-green-400">{t('shippingFree')}</span>
              ) : (
                `$${resolvedShippingCost.toFixed(2)}`
              )}
            </data>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
            <span>{t('total')}</span>
            <data value={orderTotal}>${orderTotal.toFixed(2)}</data>
          </div>
        </div>

        {/* ETA breakdown — production line only when there's anything to craft.
            Customers see which part is the master's commitment vs the carrier's. */}
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          {longestProductionDays > 0 && <p>{t('craftingLine', { days: longestProductionDays })}</p>}
          <p>{t(shippingLineKey)}</p>
          <p className="font-medium text-foreground">
            {t('estimatedDelivery', { date: estimatedDeliveryRange })}
          </p>
        </div>
      </div>
    </aside>
  )
}
