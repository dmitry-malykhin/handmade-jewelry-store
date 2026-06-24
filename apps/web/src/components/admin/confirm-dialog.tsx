'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: ReactNode
  description?: ReactNode
  confirmLabel?: ReactNode
  cancelLabel?: ReactNode
  confirmVariant?: 'destructive' | 'default'
  isPending?: boolean
  // Cancel stays enabled so the admin can leave even when confirm is blocked.
  confirmDisabled?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'destructive',
  isPending = false,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  const t = useTranslations('admin')

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Block dismissal mid-mutation — would orphan the optimistic UI.
        if (isPending) return
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            {cancelLabel ?? t('confirmDialogCancel')}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isPending || confirmDisabled}
          >
            {confirmLabel ?? t('confirmDialogConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
