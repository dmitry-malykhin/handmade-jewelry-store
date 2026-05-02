'use client'

import Image from 'next/image'
import { Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/store'
import type { CartItem } from '@jewelry/shared'

interface CartItemRowProps {
  cartItem: CartItem
}

export function CartItemRow({ cartItem }: CartItemRowProps) {
  const t = useTranslations('cartPage')
  const removeItem = useCartStore((state) => state.removeItem)

  const itemTotal = (cartItem.price * cartItem.quantity).toFixed(2)
  // productionDays is optional on CartItem (carts persisted before #227 lack it).
  const productionDays = cartItem.productionDays ?? 0
  const isMadeOnDemand = productionDays > 0

  function handleRemove() {
    removeItem(cartItem.productId)
  }

  return (
    <li className="flex gap-4 py-4">
      <Link href={`/shop/${cartItem.slug}`} aria-label={cartItem.title} className="shrink-0">
        <figure className="relative size-20 overflow-hidden rounded-md bg-accent/10 sm:size-24">
          <Image
            src={cartItem.image || '/placeholder-product.jpg'}
            alt={`${cartItem.title} — handmade jewelry`}
            fill
            sizes="96px"
            className="object-cover"
          />
        </figure>
      </Link>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/shop/${cartItem.slug}`}>
            <h2 className="text-sm font-medium text-foreground transition-colors hover:text-primary">
              {cartItem.title}
            </h2>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 text-muted-foreground hover:text-destructive"
            aria-label={t('removeItem', { title: cartItem.title })}
            onClick={handleRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>

        {/* Per-item PRODUCTION copy only. Carrier shipping is shown once at
            checkout (depends on user's delivery method choice — not known yet
            in cart). See docs/18_PRODUCTION_VS_SHIPPING_ETA.md §5.3. */}
        <p className="text-xs text-muted-foreground">
          {isMadeOnDemand ? t('masterCraftsLine', { days: productionDays }) : t('readyToShipToday')}
        </p>

        <div className="mt-auto flex items-center justify-between">
          {/* Quantity is hard-capped at 1 by the handmade business model — every
              piece is unique. The +/− controls were removed as part of #227; users
              who want to change quantity simply remove and re-add. */}
          <p className="text-sm text-muted-foreground" aria-label={t('quantityLabel')}>
            {t('quantityValue', { quantity: cartItem.quantity })}
          </p>

          <p className="text-sm font-semibold text-foreground">
            <data value={itemTotal}>${itemTotal}</data>
          </p>
        </div>
      </div>
    </li>
  )
}
