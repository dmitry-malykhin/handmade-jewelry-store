'use client'

import { useTranslations } from 'next-intl'
import { Check, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/store'

/**
 * Structural minimum the button needs to read from a product. Both the catalog
 * `Product` type and the wishlist's `WishlistProduct` type satisfy this — keeps
 * the button reusable across surfaces without forcing them to share a type.
 */
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

/**
 * Catalog / wishlist "Add to cart" CTA with a three-state lifecycle:
 *   1. Default       → outline "Add to cart"  (click adds + shows toast)
 *   2. Already in cart → primary "View cart"  (a Link to /cart, NOT a remove toggle)
 *   3. Permanently sold → disabled "Sold out" (ONE_OF_A_KIND with stock=0)
 *
 * UX rationale:
 * - The previous click-to-remove behaviour surprised users who expected a
 *   second click to navigate to the cart (Etsy / Amazon / Sephora pattern).
 * - Removal happens on /cart instead — single source of truth for cart edits.
 * - "View cart" appears on every card, so users browsing the catalog never
 *   need to hunt for the corner cart icon.
 */
export function AddToCartButton({ product, className }: AddToCartButtonProps) {
  const t = useTranslations('cart')
  const addItem = useCartStore((state) => state.addItem)
  const isInCart = useCartStore((state) =>
    state.items.some((cartItem) => cartItem.productId === product.id),
  )

  const isPermanentlySoldOut = product.stockType === 'ONE_OF_A_KIND' && product.stock === 0

  function handleAddToCart() {
    addItem({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      price: parseFloat(product.price),
      image: product.images[0] ?? '',
      productionDays: product.productionDays,
    })
    toast.success(t('addedToast', { title: product.title }))
  }

  if (isPermanentlySoldOut) {
    return (
      <Button variant="outline" size="sm" disabled className={className}>
        {t('soldOut')}
      </Button>
    )
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
