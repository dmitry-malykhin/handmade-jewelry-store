'use client'

import { useTranslations } from 'next-intl'
import type { Category } from '@jewelry/shared'

interface CategoryFilterProps {
  categories: Category[]
  selectedCategory: string
  onCategoryChange: (categorySlug: string) => void
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  const t = useTranslations('catalog')

  if (categories.length === 0) return null

  return (
    <fieldset className="mb-6">
      <legend className="mb-3 text-sm font-semibold text-foreground">{t('filterCategory')}</legend>
      <ul role="list" className="space-y-2">
        <li>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="radio"
              name="category"
              value=""
              checked={selectedCategory === ''}
              onChange={() => onCategoryChange('')}
              className="accent-primary"
            />
            {t('filterAllCategories')}
          </label>
        </li>
        {categories.map((category) => (
          <li key={category.id}>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="category"
                value={category.slug}
                checked={selectedCategory === category.slug}
                onChange={() => onCategoryChange(category.slug)}
                className="accent-primary"
              />
              {category.name}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}
