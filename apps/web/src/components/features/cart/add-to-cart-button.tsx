'use client'

import { useTranslations } from 'next-intl'
import { Check, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/store'
import { trackProductAddedToCart } from '@/lib/analytics/posthog'

// Structural minimum — both catalog `Product` and `WishlistProduct` satisfy
// this without forcing them to share a type.
export interface AddToCartProduct {
  id: string
  slug: string
  title: string
  price: string
  stock: number
  stockType: 'IN_STOCK' | 'MADE_TO_ORDER' | 'ONE_OF_A_KIND'
  productionDays: number
  images: string[]
}

interface AddToCartButtonProps {
  product: AddToCartProduct
  className?: string
}

// Two-state CTA: "Add to cart" → after add, becomes "View cart" Link (not a
// remove toggle — Etsy/Amazon pattern). Removal happens on /cart only.
export function AddToCartButton({ product, className }: AddToCartButtonProps) {
  const t = useTranslations('cart')
  const addItem = useCartStore((state) => state.addItem)
  const isInCart = useCartStore((state) =>
    state.items.some((cartItem) => cartItem.productId === product.id),
  )

  function handleAddToCart() {
    addItem({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      price: parseFloat(product.price),
      image: product.images[0] ?? '',
      productionDays: product.productionDays,
    })
    trackProductAddedToCart({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      priceUsd: parseFloat(product.price),
      quantity: 1,
    })
    toast.success(t('addedToast', { title: product.title }))
  }

  if (isInCart) {
    return (
      <Button asChild variant="secondary" size="sm" className={className}>
        <Link href="/cart" aria-label={t('viewCart')}>
          <Check className="mr-1.5 size-4" aria-hidden="true" />
          {t('viewCart')}
        </Link>
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleAddToCart}
      aria-label={t('addToCart')}
      className={className}
    >
      <ShoppingCart className="mr-1.5 size-4" aria-hidden="true" />
      {t('addToCart')}
    </Button>
  )
}
