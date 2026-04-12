'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { Category } from '@jewelry/shared'
import { CatalogFilters } from './catalog-filters'

interface CatalogFiltersMobileProps {
  categories: Category[]
  activeFiltersCount: number
}

export function CatalogFiltersMobile({
  categories,
  activeFiltersCount,
}: CatalogFiltersMobileProps) {
  const t = useTranslations('catalog')
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2 lg:hidden">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {t('mobileFiltersButton')}
          {activeFiltersCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-80 overflow-y-auto p-0">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{t('mobileFiltersTitle')}</SheetTitle>
        </SheetHeader>
        <div className="px-6 py-4">
          <CatalogFilters categories={categories} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
