'use client'

import { Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ProductStatus } from '@jewelry/shared'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PRODUCT_STATUSES: ProductStatus[] = ['ACTIVE', 'DRAFT', 'ARCHIVED']

interface AdminProductsToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  statusFilter: ProductStatus | 'ALL'
  onStatusFilterChange: (value: ProductStatus | 'ALL') => void
}

export function AdminProductsToolbar({
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: AdminProductsToolbarProps) {
  const t = useTranslations('admin')

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative flex-1" style={{ minWidth: '200px', maxWidth: '320px' }}>
        <Search
          className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          placeholder={t('productsSearchPlaceholder')}
          value={searchValue}
          onChange={(changeEvent) => onSearchChange(changeEvent.target.value)}
          className="pl-9"
          aria-label={t('productsSearchAriaLabel')}
        />
      </div>

      <Select
        value={statusFilter}
        onValueChange={(value) => onStatusFilterChange(value as ProductStatus | 'ALL')}
      >
        <SelectTrigger className="w-40" aria-label={t('productsStatusFilterAriaLabel')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t('productsStatusAll')}</SelectItem>
          {PRODUCT_STATUSES.map((productStatus) => (
            <SelectItem key={productStatus} value={productStatus}>
              {t(`productsStatus${productStatus}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
