'use client'

import { useTranslations } from 'next-intl'

interface SortFilterProps {
  sortValue: string
  onSortChange: (value: string) => void
}

export function SortFilter({ sortValue, onSortChange }: SortFilterProps) {
  const t = useTranslations('catalog')

  return (
    <fieldset className="mb-6">
      <legend className="mb-3 text-sm font-semibold text-foreground">{t('filterSort')}</legend>
      <select
        value={sortValue}
        onChange={(e) => onSortChange(e.target.value)}
        aria-label={t('filterSort')}
        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="createdAt_desc">{t('sortNewest')}</option>
        <option value="createdAt_asc">{t('sortOldest')}</option>
        <option value="price_asc">{t('sortPriceLow')}</option>
        <option value="price_desc">{t('sortPriceHigh')}</option>
        <option value="avgRating_desc">{t('sortTopRated')}</option>
      </select>
    </fieldset>
  )
}
