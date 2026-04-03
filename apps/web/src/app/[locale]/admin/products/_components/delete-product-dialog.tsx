'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
    <Dialog open={product !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('productsDeleteTitle')}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {t('productsDeleteConfirmMessage', { title: product?.title ?? '' })}
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t('productsFormCancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? t('productsDeleting') : t('productsDelete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
