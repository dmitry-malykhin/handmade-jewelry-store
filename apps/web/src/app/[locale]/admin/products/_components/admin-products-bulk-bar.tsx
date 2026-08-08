'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import type { BulkProductAction } from '@/lib/api/products'

interface AdminProductsBulkBarProps {
  selectedCount: number
  onAction: (action: BulkProductAction) => void
  onClear: () => void
  isPending: boolean
  pendingAction: BulkProductAction | null
  onConfirm: () => void
  onCancelConfirm: () => void
}

export function AdminProductsBulkBar({
  selectedCount,
  onAction,
  onClear,
  isPending,
  pendingAction,
  onConfirm,
  onCancelConfirm,
}: AdminProductsBulkBarProps) {
  const t = useTranslations('admin')

  if (selectedCount === 0) return null

  return (
    <>
      <div
        className="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-border bg-accent/40 px-4 py-2"
        role="region"
        aria-label={t('productsBulkSelectedCount', { count: selectedCount })}
      >
        <span className="text-sm font-medium text-foreground">
          {t('productsBulkSelectedCount', { count: selectedCount })}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => onAction('publish')}
          >
            {t('productsBulkActionPublish')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => onAction('draft')}
          >
            {t('productsBulkActionDraft')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => onAction('delete')}
          >
            {t('productsBulkActionDelete')}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={onClear}>
            {t('productsBulkActionClear')}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingAction !== null}
        onClose={onCancelConfirm}
        onConfirm={onConfirm}
        isPending={isPending}
        confirmVariant={pendingAction === 'delete' ? 'destructive' : 'default'}
        title={
          pendingAction === 'delete'
            ? t('productsBulkDeleteModalTitle', { count: selectedCount })
            : pendingAction === 'publish'
              ? t('productsBulkConfirmPublishTitle', { count: selectedCount })
              : pendingAction === 'draft'
                ? t('productsBulkConfirmDraftTitle', { count: selectedCount })
                : ''
        }
        description={
          pendingAction === 'delete'
            ? t('productsBulkDeleteModalDescription')
            : pendingAction === 'publish'
              ? t('productsBulkConfirmPublishDescription')
              : pendingAction === 'draft'
                ? t('productsBulkConfirmDraftDescription')
                : ''
        }
        confirmLabel={
          pendingAction === 'delete'
            ? t('productsBulkDeleteConfirm')
            : pendingAction === 'publish'
              ? t('productsBulkConfirmPublishAction')
              : pendingAction === 'draft'
                ? t('productsBulkConfirmDraftAction')
                : t('confirmDialogConfirm')
        }
        cancelLabel={t('productsBulkDeleteCancel')}
      />
    </>
  )
}
