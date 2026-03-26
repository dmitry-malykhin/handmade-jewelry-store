'use client'

import { useTranslations } from 'next-intl'
import { useCartItems, useCartTotalPrice } from '@/store/cart.store'
import { CHECKOUT_SHIPPING_COST } from '../_lib/build-order-payload'

export function CheckoutOrderSummary() {
  const t = useTranslations('checkoutPage')
  const cartItems = useCartItems()
  const cartSubtotal = useCartTotalPrice()
  const orderTotal = cartSubtotal + CHECKOUT_SHIPPING_COST

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
            <data value={CHECKOUT_SHIPPING_COST}>${CHECKOUT_SHIPPING_COST.toFixed(2)}</data>
          </div>
          <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
            <span>{t('total')}</span>
            <data value={orderTotal}>${orderTotal.toFixed(2)}</data>
          </div>
        </div>
      </div>
    </aside>
  )
}
