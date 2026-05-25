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
  /** Controls visibility. Parent owns the open/closed state. */
  open: boolean
  /** Fires for backdrop-click, Escape, or Cancel — same channel for all close paths. */
  onClose: () => void
  /** Fires when the primary button is clicked. Parent runs the actual mutation. */
  onConfirm: () => void
  /** Heading at the top of the dialog. */
  title: ReactNode
  /** Optional body text. Renders as DialogDescription for a11y. */
  description?: ReactNode
  /** Custom label for the confirm button. Falls back to a localized "Confirm". */
  confirmLabel?: ReactNode
  /** Custom label for the cancel button. Falls back to a localized "Cancel". */
  cancelLabel?: ReactNode
  /** `destructive` for delete-style actions, `default` for neutral ones (e.g. Mark Shipped). */
  confirmVariant?: 'destructive' | 'default'
  /** Disables both buttons + keeps the dialog open while the mutation is in flight. */
  isPending?: boolean
  /**
   * Independently disable the confirm button (e.g. category has products,
   * so deletion is blocked). Cancel stays enabled so the admin can leave.
   */
  confirmDisabled?: boolean
}

/**
 * One dialog for every "are you sure?" prompt in the admin. Centralising the
 * shape means consistent button order, destructive styling, pending state,
 * and ESC/backdrop dismissal — and removes copy-paste across features.
 */
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
        // Disallow dismissal while the mutation is in flight — closing here
        // would orphan the optimistic UI and confuse the admin.
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
