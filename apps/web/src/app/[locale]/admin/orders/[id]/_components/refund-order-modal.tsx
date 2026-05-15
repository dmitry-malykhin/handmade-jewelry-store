'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/store/auth.store'
import { refundAdminOrder, type RefundReason } from '@/lib/api/orders'
import { ApiError } from '@/lib/api/client'

interface RefundOrderModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  orderTotal: number
  /** Amount already refunded on this order (0 for first-time refund). */
  alreadyRefunded: number
}

const REFUND_REASONS: RefundReason[] = [
  'ITEM_DAMAGED',
  'ITEM_NOT_AS_DESCRIBED',
  'CUSTOMER_CHANGED_MIND',
  'DUPLICATE_ORDER',
  'OTHER',
]

export function RefundOrderModal({
  isOpen,
  onClose,
  orderId,
  orderTotal,
  alreadyRefunded,
}: RefundOrderModalProps) {
  const t = useTranslations('admin')
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()

  const remainingRefundable = useMemo(
    () => Number((orderTotal - alreadyRefunded).toFixed(2)),
    [orderTotal, alreadyRefunded],
  )
  const remainingFormatted = remainingRefundable.toFixed(2)

  // amount is optional — empty string + transform → undefined means "full refund"
  const refundFormSchema = useMemo(
    () =>
      z.object({
        amount: z
          .union([z.string().length(0), z.coerce.number().positive().max(remainingRefundable)])
          .transform((value) => (value === '' || value === 0 ? undefined : Number(value))),
        reason: z.enum([
          'ITEM_DAMAGED',
          'ITEM_NOT_AS_DESCRIBED',
          'CUSTOMER_CHANGED_MIND',
          'DUPLICATE_ORDER',
          'OTHER',
        ] as const),
        note: z.string().max(500).optional(),
      }),
    [remainingRefundable],
  )

  type RefundFormValues = z.infer<typeof refundFormSchema>

  const form = useForm<RefundFormValues>({
    resolver: zodResolver(refundFormSchema),
    defaultValues: { amount: undefined, reason: 'CUSTOMER_CHANGED_MIND', note: '' },
  })

  const refundMutation = useMutation({
    mutationFn: async (values: RefundFormValues) => {
      if (!accessToken) throw new Error('Not authenticated')
      return refundAdminOrder(
        orderId,
        { amount: values.amount, reason: values.reason, note: values.note || undefined },
        accessToken,
      )
    },
    onSuccess: (_data, values) => {
      const refundedAmount = values.amount ?? remainingRefundable
      toast.success(
        t('refundModalSuccess', {
          orderId: orderId.slice(-8).toUpperCase(),
          amount: refundedAmount.toFixed(2),
        }),
      )
      void queryClient.invalidateQueries({ queryKey: ['admin-order', orderId] })
      void queryClient.invalidateQueries({ queryKey: ['admin-refunds'] })
      form.reset()
      onClose()
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Unknown error'
      toast.error(t('refundModalError', { message }))
    },
  })

  function handleClose() {
    if (refundMutation.isPending) return
    form.reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('refundModalTitle', { orderId: orderId.slice(-8).toUpperCase() })}
          </DialogTitle>
          <DialogDescription>{t('refundModalDescription')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => refundMutation.mutate(values))}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              {t('refundModalRemaining', { remaining: remainingFormatted })}
            </p>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('refundModalAmountLabel', { remaining: remainingFormatted })}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0.01"
                      max={remainingRefundable}
                      placeholder={remainingFormatted}
                      value={field.value ?? ''}
                      onChange={(event) =>
                        field.onChange(event.target.value === '' ? undefined : event.target.value)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('refundModalReasonLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('refundModalReasonPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REFUND_REASONS.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {t(`refundReason${reason}` as Parameters<typeof t>[0])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('refundModalNoteLabel')}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={refundMutation.isPending}
              >
                {t('refundModalCancel')}
              </Button>
              <Button type="submit" disabled={refundMutation.isPending}>
                {t('refundModalSubmit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
