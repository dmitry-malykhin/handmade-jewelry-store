'use client'

import { useTranslations } from 'next-intl'
import { Zap } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/store'
import type { AddToCartProduct } from './add-to-cart-button'

interface BuyNowButtonProps {
  product: AddToCartProduct
  className?: string
}

/**
 * Express checkout — sets a single-item express state in the cart store and
 * navigates straight to /checkout. Bypasses the cart page entirely.
 *
 * The regular cart is preserved untouched: when this flow ends (success or
 * abandonment) `clearExpressItem` runs and the cart selectors switch back to
 * the regular `items` array. See `useCheckoutItems` for the read side.
 */
export function BuyNowButton({ product, className }: BuyNowButtonProps) {
  const t = useTranslations('cart')
  const router = useRouter()
  const setExpressItem = useCartStore((state) => state.setExpressItem)

  // Same rule as AddToCartButton: only ONE_OF_A_KIND with stock=0 is truly final.
  // Everything else can be ordered — master makes the piece after the order is paid.
  const isPermanentlySoldOut = product.stockType === 'ONE_OF_A_KIND' && product.stock === 0

  function handleBuyNow() {
    setExpressItem({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      price: parseFloat(product.price),
      image: product.images[0] ?? '',
    })
    router.push('/checkout')
  }

  return (
    <Button
      type="button"
      size="sm"
      onClick={handleBuyNow}
      disabled={isPermanentlySoldOut}
      aria-label={t('buyNow')}
      className={className}
    >
      <Zap className="mr-1.5 size-4" aria-hidden="true" />
      {t('buyNow')}
    </Button>
  )
}
