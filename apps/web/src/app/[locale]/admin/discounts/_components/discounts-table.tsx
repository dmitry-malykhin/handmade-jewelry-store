'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuthStore } from '@/store/auth.store'
import {
  deleteAdminDiscount,
  fetchAdminDiscounts,
  updateAdminDiscount,
  type Discount,
} from '@/lib/api/discounts'
import { CreateDiscountModal } from './create-discount-modal'

type DiscountStatus = 'active' | 'inactive' | 'expired' | 'exhausted'

function getDiscountStatus(discount: Discount): DiscountStatus {
  if (!discount.isActive) return 'inactive'
  if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) return 'expired'
  if (discount.maxUsages !== null && discount.usageCount >= discount.maxUsages) {
    return 'exhausted'
  }
  return 'active'
}

const STATUS_BADGE_VARIANT: Record<DiscountStatus, 'default' | 'outline' | 'destructive'> = {
  active: 'default',
  inactive: 'outline',
  expired: 'destructive',
  exhausted: 'destructive',
}

function formatDiscountValue(discount: Discount): string {
  if (discount.type === 'PERCENTAGE') return `${discount.value}%`
  return `$${(discount.value / 100).toFixed(2)}`
}

export function DiscountsTable() {
  const t = useTranslations('admin')
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [discountToDelete, setDiscountToDelete] = useState<Discount | null>(null)

  const { data: discounts, isPending } = useQuery({
    queryKey: ['admin-discounts'],
    queryFn: () => fetchAdminDiscounts(accessToken ?? ''),
    enabled: accessToken !== null,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateAdminDiscount(id, { isActive }, accessToken ?? ''),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-discounts'] }),
    onError: () => toast.error(t('discountsUpdateError')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminDiscount(id, accessToken ?? ''),
    onSuccess: (_data, id) => {
      const removed = discounts?.find((discount) => discount.id === id)
      toast.success(t('discountsDeleteSuccess', { code: removed?.code ?? '' }))
      void queryClient.invalidateQueries({ queryKey: ['admin-discounts'] })
    },
    onError: () => toast.error(t('discountsDeleteError')),
  })

  function handleCopyCode(code: string) {
    navigator.clipboard.writeText(code).then(
      () => toast.success(t('discountsCopySuccess', { code })),
      () => {},
    )
  }

  function handleDelete(discount: Discount) {
    setDiscountToDelete(discount)
  }

  function handleDeleteConfirm() {
    if (!discountToDelete) return
    deleteMutation.mutate(discountToDelete.id, {
      onSuccess: () => setDiscountToDelete(null),
      // On error, keep the dialog open so the toast doesn't get lost and the
      // admin can decide to cancel or retry.
    })
  }

  return (
    <section aria-labelledby="discounts-heading" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="discounts-heading" className="text-xl font-semibold text-foreground">
            {t('discountsTitle')}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {t('discountsDescription')}
          </p>
        </div>
        <Button type="button" onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-1 size-4" aria-hidden="true" />
          {t('discountsCreateButton')}
        </Button>
      </div>

      {isPending && (
        <p className="text-sm text-muted-foreground" role="status">
          {t('discountsLoading')}
        </p>
      )}

      {discounts && discounts.length === 0 && (
        <p className="text-sm text-muted-foreground" role="status">
          {t('discountsEmpty')}
        </p>
      )}

      {discounts && discounts.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('discountsColCode')}</TableHead>
              <TableHead>{t('discountsColType')}</TableHead>
              <TableHead className="text-right">{t('discountsColValue')}</TableHead>
              <TableHead>{t('discountsColUsage')}</TableHead>
              <TableHead>{t('discountsColExpires')}</TableHead>
              <TableHead>{t('discountsColStatus')}</TableHead>
              <TableHead>{t('discountsColActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.map((discount) => {
              const status = getDiscountStatus(discount)
              return (
                <TableRow key={discount.id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(discount.code)}
                      className="inline-flex items-center gap-1.5 font-mono text-sm hover:underline"
                      aria-label={t('discountsCopyCode')}
                    >
                      {discount.code}
                      <Copy className="size-3 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t(`discountsType${discount.type}` as Parameters<typeof t>[0])}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatDiscountValue(discount)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {discount.usageCount} / {discount.maxUsages ?? t('discountsUsageUnlimited')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {discount.expiresAt ? new Date(discount.expiresAt).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[status]}>
                      {t(
                        `discountsStatus${status.charAt(0).toUpperCase()}${status.slice(1)}` as Parameters<
                          typeof t
                        >[0],
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={discount.isActive}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: discount.id, isActive: checked })
                        }
                        disabled={toggleMutation.isPending}
                        aria-label={t('discountsToggleAriaLabel', { code: discount.code })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(discount)}
                        disabled={deleteMutation.isPending}
                        aria-label={t('discountsDeleteAriaLabel', { code: discount.code })}
                      >
                        <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <CreateDiscountModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />

      <ConfirmDialog
        open={discountToDelete !== null}
        onClose={() => setDiscountToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isPending={deleteMutation.isPending}
        title={t('discountsDeleteTitle', { code: discountToDelete?.code ?? '' })}
        description={t('discountsDeleteDescription')}
        confirmLabel={t('discountsDeleteAction')}
      />
    </section>
  )
}
