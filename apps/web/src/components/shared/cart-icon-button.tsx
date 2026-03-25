'use client'

import { ShoppingCart } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { useCartTotalItems } from '@/store'

/**
 * Cart icon button with live item count badge.
 * Subscribes to Zustand cart store — updates automatically when items change.
 * Replaces the static cart button in Header.
 */
export function CartIconButton() {
  const t = useTranslations('header')
  const totalItems = useCartTotalItems()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t('cartItemCount', { count: totalItems })}
      className="relative"
      asChild
    >
      <Link href="/cart">
        <ShoppingCart className="size-5" />
        {totalItems > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
          >
            {totalItems > 99 ? '99+' : totalItems}
          </span>
        )}
      </Link>
    </Button>
  )
}
