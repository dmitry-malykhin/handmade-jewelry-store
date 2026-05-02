'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { Heart, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AddToCartButton } from '@/components/features/cart/add-to-cart-button'
import { BuyNowButton } from '@/components/features/cart/buy-now-button'
import { useAuthStore } from '@/store/auth.store'
import { useWishlistStore } from '@/store/wishlist.store'
import { fetchMyWishlist, removeFromWishlist, type WishlistProduct } from '@/lib/api/wishlist'
import { ApiError } from '@/lib/api/client'

// Stock at or below this number triggers the "Only N left" scarcity badge.
// Three is the sweet spot for handmade jewellery — most pieces ship in 1–5 unit batches.
const SCARCITY_THRESHOLD = 3

export function WishlistManager() {
  const t = useTranslations('account.wishlist')
  const accessToken = useAuthStore((state) => state.accessToken)
  const clearTokens = useAuthStore((state) => state.clearTokens)
  const removeLocal = useWishlistStore((state) => state.remove)

  const [products, setProducts] = useState<WishlistProduct[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null)

  const loadWishlist = useCallback(() => {
    if (!accessToken) {
      setProducts([])
      return
    }
    fetchMyWishlist(accessToken)
      .then(setProducts)
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) {
          clearTokens()
          setProducts([])
          return
        }
        setLoadError(t('loadError'))
      })
  }, [accessToken, clearTokens, t])

  useEffect(() => {
    loadWishlist()
  }, [loadWishlist])

  async function handleRemove(productId: string) {
    if (!accessToken) return
    setPendingRemovalId(productId)
    try {
      await removeFromWishlist(accessToken, productId)
      removeLocal(productId)
      setProducts((current) => current?.filter((product) => product.id !== productId) ?? null)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearTokens()
        return
      }
      const message = error instanceof ApiError ? error.message : t('errorRemove')
      toast.error(message)
    } finally {
      setPendingRemovalId(null)
    }
  }

  if (loadError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {loadError}
      </p>
    )
  }

  if (products === null) {
    return (
      <ul
        role="list"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-busy="true"
      >
        {[0, 1, 2].map((skeleton) => (
          <li
            key={skeleton}
            className="h-96 animate-pulse rounded-lg border border-border bg-card"
          />
        ))}
      </ul>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-12 text-center">
        <Heart className="size-10 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-base font-medium text-foreground">{t('emptyTitle')}</p>
          <p className="text-sm text-muted-foreground">{t('emptyDescription')}</p>
        </div>
        <Button asChild>
          <Link href="/shop">{t('emptyCta')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <ul role="list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => {
        const formattedPrice = parseFloat(product.price).toFixed(2)
        const primaryImage = product.images[0] ?? '/placeholder-product.jpg'
        // Issue #231 — handmade pieces are always orderable. stock=0 means "the
        // master will craft it after the order is paid", regardless of stockType.
        const isMadeOnDemand = product.stock === 0
        const isLowStock =
          product.stock > 0 && product.stock <= SCARCITY_THRESHOLD && !isMadeOnDemand
        const isMadeToOrder = product.stockType === 'MADE_TO_ORDER'
        const isOneOfAKind = product.stockType === 'ONE_OF_A_KIND' && product.stock > 0

        return (
          <li key={product.id}>
            <article className="relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
              <button
                type="button"
                onClick={() => handleRemove(product.id)}
                disabled={pendingRemovalId === product.id}
                aria-label={t('removeFromWishlist')}
                title={t('removeFromWishlist')}
                className="absolute right-2 top-2 z-10 inline-flex size-8 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                <X className="size-4" aria-hidden="true" />
              </button>

              <Link href={`/shop/${product.slug}`} aria-label={product.title}>
                <figure className="relative aspect-square overflow-hidden bg-accent/10">
                  <Image
                    src={primaryImage}
                    alt={product.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                </figure>
              </Link>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex flex-wrap gap-1">
                  {isMadeToOrder && (
                    <Badge variant="secondary" className="text-xs">
                      {t('badgeMadeToOrder')}
                    </Badge>
                  )}
                  {isOneOfAKind && (
                    <Badge variant="secondary" className="text-xs">
                      {t('badgeOneOfAKind')}
                    </Badge>
                  )}
                  {isMadeOnDemand && (
                    <Badge variant="secondary" className="text-xs">
                      {t('badgeMadeOnDemand', { days: product.productionDays })}
                    </Badge>
                  )}
                  {isLowStock && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/50 bg-amber-50 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
                    >
                      {t('onlyNLeft', { count: product.stock })}
                    </Badge>
                  )}
                </div>

                <Link href={`/shop/${product.slug}`}>
                  <h3 className="line-clamp-2 text-sm font-medium text-foreground hover:text-primary">
                    {product.title}
                  </h3>
                </Link>

                {product.avgRating > 0 && (
                  <p
                    className="text-xs text-muted-foreground"
                    aria-label={t('ratingLabel', {
                      rating: product.avgRating,
                      count: product.reviewCount,
                    })}
                  >
                    {'★'.repeat(Math.round(product.avgRating))}
                    {'☆'.repeat(5 - Math.round(product.avgRating))}
                    <span className="ml-1">({product.reviewCount})</span>
                  </p>
                )}

                {product.material && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">{product.material}</p>
                )}

                <p className="text-base font-semibold text-foreground">
                  <data value={formattedPrice}>${formattedPrice}</data>
                </p>

                <div className="mt-auto flex flex-col gap-2 pt-2">
                  {isMadeOnDemand && (
                    <p className="text-xs text-muted-foreground">
                      {t('shipsAfterCrafting', { days: product.productionDays })}
                    </p>
                  )}
                  <BuyNowButton product={product} className="w-full" />
                  <AddToCartButton product={product} className="w-full" />
                </div>
              </div>
            </article>
          </li>
        )
      })}
    </ul>
  )
}
