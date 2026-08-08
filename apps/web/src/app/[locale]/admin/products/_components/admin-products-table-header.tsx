'use client'

import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { TableHead, TableHeader, TableRow } from '@/components/ui/table'

export type SortField = 'createdAt' | 'title' | 'price' | 'stock'
export type SortOrder = 'asc' | 'desc'

interface SortIconProps {
  field: SortField
  currentField: SortField
  currentOrder: SortOrder
}

function SortIcon({ field, currentField, currentOrder }: SortIconProps) {
  if (field !== currentField) return <ChevronsUpDown className="ml-1 inline size-3 opacity-50" />
  return currentOrder === 'asc' ? (
    <ChevronUp className="ml-1 inline size-3" />
  ) : (
    <ChevronDown className="ml-1 inline size-3" />
  )
}

interface AdminProductsTableHeaderProps {
  allOnPageSelected: boolean
  someOnPageSelected: boolean
  onToggleSelectAll: () => void
  sortBy: SortField
  sortOrder: SortOrder
  onSortClick: (field: SortField) => void
}

export function AdminProductsTableHeader({
  allOnPageSelected,
  someOnPageSelected,
  onToggleSelectAll,
  sortBy,
  sortOrder,
  onSortClick,
}: AdminProductsTableHeaderProps) {
  const t = useTranslations('admin')

  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-10">
          <input
            type="checkbox"
            checked={allOnPageSelected}
            ref={(node) => {
              // Indeterminate state can only be set imperatively.
              if (node) node.indeterminate = someOnPageSelected
            }}
            onChange={onToggleSelectAll}
            aria-label={t('productsBulkSelectAllAriaLabel')}
            className="size-4 cursor-pointer rounded border-border accent-primary"
          />
        </TableHead>
        <TableHead>
          <button
            className="flex items-center text-sm font-medium"
            onClick={() => onSortClick('title')}
            type="button"
          >
            {t('productsColTitle')}
            <SortIcon field="title" currentField={sortBy} currentOrder={sortOrder} />
          </button>
        </TableHead>
        <TableHead>{t('productsColStatus')}</TableHead>
        <TableHead>
          <button
            className="flex items-center text-sm font-medium"
            onClick={() => onSortClick('price')}
            type="button"
          >
            {t('productsColPrice')}
            <SortIcon field="price" currentField={sortBy} currentOrder={sortOrder} />
          </button>
        </TableHead>
        <TableHead>
          <button
            className="flex items-center text-sm font-medium"
            onClick={() => onSortClick('stock')}
            type="button"
          >
            {t('productsColStock')}
            <SortIcon field="stock" currentField={sortBy} currentOrder={sortOrder} />
          </button>
        </TableHead>
        <TableHead>{t('productsColSku')}</TableHead>
        <TableHead>
          <button
            className="flex items-center text-sm font-medium"
            onClick={() => onSortClick('createdAt')}
            type="button"
          >
            {t('productsColCreatedAt')}
            <SortIcon field="createdAt" currentField={sortBy} currentOrder={sortOrder} />
          </button>
        </TableHead>
        <TableHead className="w-24 text-right">{t('productsColActions')}</TableHead>
      </TableRow>
    </TableHeader>
  )
}
