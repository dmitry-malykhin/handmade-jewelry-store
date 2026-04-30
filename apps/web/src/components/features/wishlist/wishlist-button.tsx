'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth.store'
import { useWishlistStore } from '@/store/wishlist.store'
import { addToWishlist, removeFromWishlist } from '@/lib/api/wishlist'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface WishlistButtonProps {
  productId: string
  // 'card' = compact 32px button overlay on ProductCard image
  // 'detail' = larger button on product detail page next to "Add to cart"
  variant?: 'card' | 'detail'
}

/**
 * Heart-icon toggle. For guests: stores in localStorage via Zustand.
 * For logged-in users: also POSTs/DELETEs to the backend so the wishlist
 * survives across devices. Optimistic UI: state flips immediately and
 * rolls back if the network call fails.
 */
export function WishlistButton({ productId, variant = 'card' }: WishlistButtonProps) {
  const t = useTranslations('wishlist')
  const accessToken = useAuthStore((state) => state.accessToken)
  const clearTokens = useAuthStore((state) => state.clearTokens)
  const productIds = useWishlistStore((state) => state.productIds)
  const addLocal = useWishlistStore((state) => state.add)
  const removeLocal = useWishlistStore((state) => state.remove)

  // Hydration guard: server-rendered HTML must not depend on Zustand state.
  const [isHydrated, setIsHydrated] = useState(false)
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const isInWishlist = isHydrated && productIds.includes(productId)
  const [isPending, setIsPending] = useState(false)

  async function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (isPending) return

    const wasInWishlist = isInWishlist
    setIsPending(true)

    // Optimistic local update
    if (wasInWishlist) removeLocal(productId)
    else addLocal(productId)

    if (!accessToken) {
      // Guest: localStorage-only is enough.
      setIsPending(false)
      return
    }

    try {
      if (wasInWishlist) {
        await removeFromWishlist(accessToken, productId)
      } else {
        await addToWishlist(accessToken, productId)
      }
    } catch (error) {
      // 401 = token expired. Silently degrade to guest mode: keep the local change
      // (the heart stays toggled) and clear the stale token so future clicks skip
      // the API entirely. No toast — the user's intent succeeded locally.
      if (error instanceof ApiError && error.status === 401) {
        clearTokens()
        return
      }
      // Real failure (5xx, network) — roll the optimistic update back and notify.
      if (wasInWishlist) addLocal(productId)
      else removeLocal(productId)
      const message = error instanceof ApiError ? error.message : t('errorGeneric')
      toast.error(message)
    } finally {
      setIsPending(false)
    }
  }

  const buttonSize = variant === 'card' ? 'size-9' : 'size-10'
  const iconSize = variant === 'card' ? 'size-4' : 'size-5'
  const positioning = variant === 'card' ? 'absolute right-2 top-2 z-10 shadow-sm' : 'relative'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isInWishlist}
      aria-label={isInWishlist ? t('removeFromWishlist') : t('addToWishlist')}
      title={isInWishlist ? t('removeFromWishlist') : t('addToWishlist')}
      className={cn(
        positioning,
        buttonSize,
        'inline-flex items-center justify-center rounded-full border border-border bg-background/90 text-foreground transition-colors',
        'hover:bg-accent hover:text-accent-foreground disabled:opacity-50',
        isInWishlist && 'text-red-500 hover:text-red-600',
      )}
    >
      <Heart className={cn(iconSize, isInWishlist && 'fill-current')} aria-hidden="true" />
    </button>
  )
}
