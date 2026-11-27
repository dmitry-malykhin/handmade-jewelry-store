'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { useCartItems } from '@/store'
import { CartItemRow } from './cart-item-row'
import { CartSummary } from './cart-summary'
import { EmptyCart } from './empty-cart'

interface CartPageContentProps {
  // Server-rendered rails for upsell (non-empty) + popular (empty). Cart state
  // is client-only, so the server wraps both rails up-front and the client
  // picks the right one per branch (#469).
  emptyCartRail?: ReactNode
  upsellRail?: ReactNode
}

export function CartPageContent({ emptyCartRail, upsellRail }: CartPageContentProps) {
  const t = useTranslations('cartPage')
  const cartItems = useCartItems()

  if (cartItems.length === 0) {
    return <EmptyCart popularRail={emptyCartRail} />
  }

  return (
    <>
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
      {upsellRail}
    </>
  )
}
