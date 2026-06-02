'use client'

import { useTranslations } from 'next-intl'
import type { Category } from '@jewelry/shared'
import { useCatalogFilters } from './hooks/use-catalog-filters'
import { CategoryFilter } from './filters/category-filter'
import { PriceFilter } from './filters/price-filter'
import { SortFilter } from './filters/sort-filter'

interface CatalogFiltersProps {
  categories: Category[]
}

export function CatalogFilters({ categories }: CatalogFiltersProps) {
  const t = useTranslations('catalog')
  const {
    selectedCategory,
    minPrice,
    maxPrice,
    sortValue,
    hasActiveFilters,
    isPending,
    updateFilter,
    updateSort,
    clearFilters,
  } = useCatalogFilters()

  return (
    <aside
      aria-label={t('filtersLabel')}
      className={
        isPending ? 'pointer-events-none opacity-50 transition-opacity' : 'transition-opacity'
      }
    >
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={(categorySlug) => updateFilter('categorySlug', categorySlug)}
      />

      <PriceFilter
        minPrice={minPrice}
        maxPrice={maxPrice}
        onMinPriceChange={(value) => updateFilter('minPrice', value)}
        onMaxPriceChange={(value) => updateFilter('maxPrice', value)}
      />

      <SortFilter sortValue={sortValue} onSortChange={updateSort} />

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {t('filterClear')}
        </button>
      )}
    </aside>
  )
}
