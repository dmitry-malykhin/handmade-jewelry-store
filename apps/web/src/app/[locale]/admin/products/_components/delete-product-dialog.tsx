'use client'

import { useTranslations } from 'next-intl'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import type { Product } from '@jewelry/shared'

interface DeleteProductDialogProps {
  product: Pick<Product, 'id' | 'slug' | 'title'> | null
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
}

export function DeleteProductDialog({
  product,
  onClose,
  onConfirm,
  isPending,
}: DeleteProductDialogProps) {
  const t = useTranslations('admin')

  return (
    <ConfirmDialog
      open={product !== null}
      onClose={onClose}
      onConfirm={onConfirm}
      isPending={isPending}
      title={t('productsDeleteTitle')}
      description={t('productsDeleteConfirmMessage', { title: product?.title ?? '' })}
      confirmLabel={isPending ? t('productsDeleting') : t('productsDelete')}
      cancelLabel={t('productsFormCancel')}
    />
  )
}
