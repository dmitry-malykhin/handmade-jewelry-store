'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { Heart } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'
import { useWishlistStore } from '@/store/wishlist.store'
import { fetchMyWishlist, removeFromWishlist, type WishlistProduct } from '@/lib/api/wishlist'
import { ApiError } from '@/lib/api/client'

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
        // Stale token → clear it and present the empty-state. AccountAuthGuard will
        // route the user to /login on next render.
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
            className="h-72 animate-pulse rounded-lg border border-border bg-card"
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
        const isInStock = product.stock > 0
        return (
          <li key={product.id}>
            <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
              <Link href={`/shop/${product.slug}`} aria-label={product.title}>
                <figure className="relative aspect-square overflow-hidden bg-accent/10">
                  <Image
                    src={primaryImage}
                    alt={product.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                  {!isInStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                      <span className="text-sm font-medium text-muted-foreground">
                        {t('outOfStock')}
                      </span>
                    </div>
                  )}
                </figure>
              </Link>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <Link href={`/shop/${product.slug}`}>
                  <h3 className="line-clamp-2 text-sm font-medium text-foreground hover:text-primary">
                    {product.title}
                  </h3>
                </Link>
                <p className="text-base font-semibold text-foreground">
                  <data value={formattedPrice}>${formattedPrice}</data>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-auto"
                  onClick={() => handleRemove(product.id)}
                  disabled={pendingRemovalId === product.id}
                >
                  {pendingRemovalId === product.id ? t('removing') : t('removeFromWishlist')}
                </Button>
              </div>
            </article>
          </li>
        )
      })}
    </ul>
  )
}
