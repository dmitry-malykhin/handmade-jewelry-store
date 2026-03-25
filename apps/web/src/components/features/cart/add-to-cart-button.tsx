'use client'

import { useTranslations } from 'next-intl'
import { ShoppingCart, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/store'
import type { Product } from '@jewelry/shared'

interface AddToCartButtonProps {
  product: Product
  className?: string
}

/**
 * Adds a product snapshot to the Zustand cart store.
 * Reflects live cart state — shows "Added" permanently while the product is in the cart.
 * Disabled when the product is out of stock.
 */
export function AddToCartButton({ product, className }: AddToCartButtonProps) {
  const t = useTranslations('cart')
  const addItem = useCartStore((state) => state.addItem)
  const removeItem = useCartStore((state) => state.removeItem)
  const isInCart = useCartStore((state) =>
    state.items.some((cartItem) => cartItem.productId === product.id),
  )

  const isOutOfStock = product.stock === 0

  function handleToggleCart() {
    if (isInCart) {
      removeItem(product.id)
    } else {
      addItem({
        productId: product.id,
        slug: product.slug,
        title: product.title,
        price: parseFloat(product.price),
        image: product.images[0] ?? '',
      })
    }
  }

  if (isOutOfStock) {
    return (
      <Button variant="outline" size="sm" disabled className={className}>
        {t('outOfStock')}
      </Button>
    )
  }

  if (isInCart) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={handleToggleCart}
        aria-label={t('addMore')}
        className={className}
      >
        <Check className="mr-1.5 size-4" />
        {t('added')}
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggleCart}
      aria-label={t('addToCart')}
      className={className}
    >
      <ShoppingCart className="mr-1.5 size-4" />
      {t('addToCart')}
    </Button>
  )
}
