'use client'

import { useTranslations } from 'next-intl'
import { useCartItems } from '@/store'
import { CartItemRow } from './cart-item-row'
import { CartSummary } from './cart-summary'
import { EmptyCart } from './empty-cart'

export function CartPageContent() {
  const t = useTranslations('cartPage')
  const cartItems = useCartItems()

  if (cartItems.length === 0) {
    return <EmptyCart />
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <ul role="list" aria-label={t('itemsListLabel')} className="mt-4 divide-y divide-border">
          {cartItems.map((cartItem) => (
            <CartItemRow key={cartItem.productId} cartItem={cartItem} />
          ))}
        </ul>
      </div>

      {/* On mobile: full-width below items. On lg+: sticky sidebar column */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <CartSummary />
      </div>
    </div>
  )
}
