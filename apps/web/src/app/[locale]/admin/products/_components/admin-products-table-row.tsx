'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { Product, ProductStatus } from '@jewelry/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TableCell, TableRow } from '@/components/ui/table'
import type { ProductTableRow } from './useAdminProductsMutations'

const PRODUCT_STATUSES: ProductStatus[] = ['ACTIVE', 'DRAFT', 'ARCHIVED']

function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const variantMap: Record<ProductStatus, 'default' | 'secondary' | 'outline'> = {
    ACTIVE: 'default',
    DRAFT: 'secondary',
    ARCHIVED: 'outline',
  }
  return <Badge variant={variantMap[status]}>{status}</Badge>
}

interface AdminProductsTableRowProps {
  product: Product
  isSelected: boolean
  onToggleSelect: (productId: string) => void
  onStatusChange: (productId: string, newStatus: ProductStatus) => void
  onDeleteClick: (row: ProductTableRow) => void
}

export function AdminProductsTableRow({
  product,
  isSelected,
  onToggleSelect,
  onStatusChange,
  onDeleteClick,
}: AdminProductsTableRowProps) {
  const t = useTranslations('admin')

  return (
    <TableRow data-state={isSelected ? 'selected' : undefined}>
      <TableCell className="w-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(product.id)}
          aria-label={t('productsBulkSelectRowAriaLabel', { title: product.title })}
          className="size-4 cursor-pointer rounded border-border accent-primary"
        />
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium text-foreground">{product.title}</p>
          <p className="text-xs text-muted-foreground">{product.slug}</p>
        </div>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t('productsChangeStatusAriaLabel', { title: product.title })}
              className="cursor-pointer"
            >
              <ProductStatusBadge status={product.status} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {PRODUCT_STATUSES.filter((productStatus) => productStatus !== product.status).map(
              (productStatus) => (
                <DropdownMenuItem
                  key={productStatus}
                  onClick={() => onStatusChange(product.id, productStatus)}
                >
                  {t(`productsStatusChangeTo`, {
                    status: t(`productsStatus${productStatus}`),
                  })}
                </DropdownMenuItem>
              ),
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
      <TableCell>
        <data value={product.price}>${Number(product.price).toFixed(2)}</data>
      </TableCell>
      <TableCell className="text-muted-foreground">{product.stock}</TableCell>
      <TableCell>
        {product.sku ? (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {product.sku}
          </code>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {new Date(product.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link
              href={`/admin/products/${product.slug}/edit`}
              aria-label={t('productsEditAriaLabel', { title: product.title })}
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              onDeleteClick({
                id: product.id,
                slug: product.slug,
                title: product.title,
                status: product.status,
              })
            }
            aria-label={t('productsDeleteAriaLabel', { title: product.title })}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
