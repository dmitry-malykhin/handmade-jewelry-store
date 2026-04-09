'use client'

import Image from 'next/image'
import { Minus, Plus, Trash2 } from 'lucide-react'
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
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const removeItem = useCartStore((state) => state.removeItem)

  const itemTotal = (cartItem.price * cartItem.quantity).toFixed(2)

  function handleDecrement() {
    updateQuantity(cartItem.productId, cartItem.quantity - 1)
  }

  function handleIncrement() {
    updateQuantity(cartItem.productId, cartItem.quantity + 1)
  }

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

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-1" role="group" aria-label={t('quantityLabel')}>
            <Button
              variant="outline"
              size="icon"
              className="size-11"
              aria-label={t('decreaseQuantity')}
              onClick={handleDecrement}
              disabled={cartItem.quantity <= 1}
            >
              <Minus className="size-3" />
            </Button>
            <span className="w-8 text-center text-sm font-medium text-foreground">
              {cartItem.quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-11"
              aria-label={t('increaseQuantity')}
              onClick={handleIncrement}
            >
              <Plus className="size-3" />
            </Button>
          </div>

          <p className="text-sm font-semibold text-foreground">
            <data value={itemTotal}>${itemTotal}</data>
          </p>
        </div>
      </div>
    </li>
  )
}
