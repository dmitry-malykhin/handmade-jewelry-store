'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import {
  fetchAdminInventory,
  updateAdminProductStock,
  type InventoryItem,
  type StockType,
} from '@/lib/api/products'

const DEFAULT_THRESHOLD = 3

export function InventoryTable() {
  const t = useTranslations('admin')
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()

  const [threshold, setThreshold] = useState<number>(DEFAULT_THRESHOLD)
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false)

  const inventoryQueryKey = useMemo(
    () => ['admin-inventory', { threshold, lowStockOnly }] as const,
    [threshold, lowStockOnly],
  )

  const { data, isPending } = useQuery({
    queryKey: inventoryQueryKey,
    queryFn: () => fetchAdminInventory(accessToken ?? '', { threshold, lowStockOnly }),
    enabled: accessToken !== null,
  })

  const stockMutation = useMutation({
    mutationFn: ({ productId, stock }: { productId: string; stock: number }) =>
      updateAdminProductStock(productId, stock, accessToken ?? ''),
    onSuccess: (updated) => {
      toast.success(t('inventoryStockSaveSuccess', { stock: updated.stock, title: updated.title }))
      // Invalidate both the inventory list and the sidebar badge count
      void queryClient.invalidateQueries({ queryKey: ['admin-inventory'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-low-stock-count'] })
    },
    onError: () => {
      toast.error(t('inventoryStockSaveError'))
    },
  })

  return (
    <section aria-labelledby="inventory-heading" className="space-y-4">
      <div>
        <h1 id="inventory-heading" className="text-xl font-semibold text-foreground">
          {t('inventoryTitle')}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t('inventoryDescription')}</p>
      </div>

      <div className="flex flex-wrap items-end gap-6 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="threshold-input" className="text-xs text-muted-foreground">
            {t('inventoryThresholdLabel')}
          </Label>
          <Input
            id="threshold-input"
            type="number"
            min={0}
            max={100}
            value={threshold}
            onChange={(event) => {
              const nextThreshold = Number(event.target.value)
              if (!Number.isNaN(nextThreshold)) setThreshold(nextThreshold)
            }}
            className="w-24"
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch id="low-stock-toggle" checked={lowStockOnly} onCheckedChange={setLowStockOnly} />
          <Label htmlFor="low-stock-toggle" className="text-sm">
            {t('inventoryLowStockOnlyLabel')}
          </Label>
        </div>
      </div>

      {isPending && (
        <p className="text-sm text-muted-foreground" role="status">
          {t('orderDetailLoading')}
        </p>
      )}

      {data && data.data.length === 0 && (
        <p className="text-sm text-muted-foreground" role="status">
          {t('inventoryEmpty')}
        </p>
      )}

      {data && data.data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">{t('inventoryColImage')}</TableHead>
              <TableHead>{t('inventoryColTitle')}</TableHead>
              <TableHead>{t('inventoryColSku')}</TableHead>
              <TableHead className="text-right">{t('inventoryColStock')}</TableHead>
              <TableHead>{t('inventoryColStockType')}</TableHead>
              <TableHead>{t('inventoryColAlert')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((item) => (
              <InventoryRow
                key={item.id}
                item={item}
                onSaveStock={(nextStock) =>
                  stockMutation.mutate({ productId: item.id, stock: nextStock })
                }
                isSaving={stockMutation.isPending}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}

interface InventoryRowProps {
  item: InventoryItem
  onSaveStock: (nextStock: number) => void
  isSaving: boolean
}

function InventoryRow({ item, onSaveStock, isSaving }: InventoryRowProps) {
  const t = useTranslations('admin')
  const [isEditing, setIsEditing] = useState(false)
  const [draftStock, setDraftStock] = useState(item.stock)

  function commit() {
    setIsEditing(false)
    if (draftStock !== item.stock) onSaveStock(draftStock)
  }

  return (
    <TableRow className={cn(item.isLowStock && 'bg-destructive/5')}>
      <TableCell>
        {item.images?.[0] && (
          <Image
            src={item.images[0]}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded object-cover"
            aria-hidden="true"
          />
        )}
      </TableCell>
      <TableCell className="font-medium text-foreground">{item.title}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{item.sku ?? '—'}</TableCell>
      <TableCell className="text-right">
        {isEditing ? (
          <Input
            type="number"
            min={0}
            max={9999}
            value={draftStock}
            // Admin clicks the cell explicitly to enter edit mode — focus is expected.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            onChange={(event) => setDraftStock(Number(event.target.value))}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit()
              if (event.key === 'Escape') {
                setDraftStock(item.stock)
                setIsEditing(false)
              }
            }}
            disabled={isSaving}
            className="ml-auto w-20 text-right"
            aria-label={t('inventoryStockEditAriaLabel', { title: item.title })}
          />
        ) : (
          <button
            type="button"
            className={cn(
              'inline-block min-w-[2rem] rounded px-2 py-1 text-right tabular-nums hover:bg-accent',
              item.isLowStock && 'font-semibold text-destructive',
            )}
            onClick={() => setIsEditing(true)}
            aria-label={t('inventoryStockEditAriaLabel', { title: item.title })}
          >
            {item.stock}
          </button>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline">{stockTypeLabel(item.stockType, t)}</Badge>
      </TableCell>
      <TableCell>
        {item.isLowStock && <Badge variant="destructive">{t('inventoryBadgeLowStock')}</Badge>}
      </TableCell>
    </TableRow>
  )
}

function stockTypeLabel(
  stockType: StockType,
  t: ReturnType<typeof useTranslations<'admin'>>,
): string {
  switch (stockType) {
    case 'IN_STOCK':
      return t('inventoryBadgeInStock')
    case 'MADE_TO_ORDER':
      return t('inventoryBadgeMadeToOrder')
    case 'ONE_OF_A_KIND':
      return t('inventoryBadgeOneOfAKind')
  }
}
