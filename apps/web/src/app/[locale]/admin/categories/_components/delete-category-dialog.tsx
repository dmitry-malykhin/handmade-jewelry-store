'use client'

import { useTranslations } from 'next-intl'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import type { CategoryWithCount } from '@jewelry/shared'

interface DeleteCategoryDialogProps {
  category: CategoryWithCount | null
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
}

export function DeleteCategoryDialog({
  category,
  onClose,
  onConfirm,
  isPending,
}: DeleteCategoryDialogProps) {
  const t = useTranslations('admin')
  const hasProducts = (category?._count.products ?? 0) > 0

  return (
    <ConfirmDialog
      open={category !== null}
      onClose={onClose}
      onConfirm={onConfirm}
      isPending={isPending}
      confirmDisabled={hasProducts}
      title={t('categoriesDeleteTitle')}
      description={
        hasProducts
          ? t('categoriesDeleteBlockedMessage', {
              name: category?.name ?? '',
              count: category?._count.products ?? 0,
            })
          : t('categoriesDeleteConfirmMessage', { name: category?.name ?? '' })
      }
      confirmLabel={isPending ? t('categoriesDeleting') : t('categoriesDelete')}
      cancelLabel={t('categoriesCancel')}
    />
  )
}
