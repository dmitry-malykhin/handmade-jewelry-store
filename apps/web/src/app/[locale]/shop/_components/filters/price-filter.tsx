'use client'

import { useTranslations } from 'next-intl'

interface PriceFilterProps {
  minPrice: string
  maxPrice: string
  onMinPriceChange: (value: string) => void
  onMaxPriceChange: (value: string) => void
}

export function PriceFilter({
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
}: PriceFilterProps) {
  const t = useTranslations('catalog')

  return (
    <fieldset className="mb-6">
      <legend className="mb-3 text-sm font-semibold text-foreground">{t('filterPrice')}</legend>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="price-min">
          {t('filterPriceMin')}
        </label>
        <input
          id="price-min"
          type="number"
          min={0}
          placeholder={t('filterPriceMin')}
          value={minPrice}
          onChange={(e) => onMinPriceChange(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <span className="shrink-0 text-muted-foreground">—</span>
        <label className="sr-only" htmlFor="price-max">
          {t('filterPriceMax')}
        </label>
        <input
          id="price-max"
          type="number"
          min={0}
          placeholder={t('filterPriceMax')}
          value={maxPrice}
          onChange={(e) => onMaxPriceChange(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </fieldset>
  )
}
