'use client'

import { ShoppingBag } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'

export function EmptyCart() {
  const t = useTranslations('cartPage')

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
      <ShoppingBag className="size-16 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold text-foreground">{t('emptyTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('emptyDescription')}</p>
      </div>
      <Button asChild>
        <Link href="/">{t('continueShopping')}</Link>
      </Button>
    </div>
  )
}
