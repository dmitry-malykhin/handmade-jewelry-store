'use client'

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
  FormDescription,
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
import { useAuthStore } from '@/store/auth.store'
import {
  createAdminDiscount,
  type CreateDiscountPayload,
  type DiscountType,
} from '@/lib/api/discounts'
import { ApiError } from '@/lib/api/client'

interface CreateDiscountModalProps {
  isOpen: boolean
  onClose: () => void
}

// Reflects the backend regex /^[A-Za-z0-9_-]+$/ so we surface the failure
// in the field-level error rather than after a round-trip 400.
const codeSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[A-Za-z0-9_-]+$/, 'A-Z, 0-9, dash or underscore only')

const createSchema = z
  .object({
    code: codeSchema,
    type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT'] as const),
    value: z.coerce.number().int().min(1),
    minOrderCents: z.coerce.number().int().min(0).optional(),
    maxUsages: z.union([z.coerce.number().int().min(1), z.literal('')]).optional(),
    expiresAt: z.string().optional(),
  })
  .refine((values) => values.type !== 'PERCENTAGE' || values.value <= 100, {
    message: 'Percentage must be ≤ 100',
    path: ['value'],
  })

type CreateDiscountFormValues = z.infer<typeof createSchema>

export function CreateDiscountModal({ isOpen, onClose }: CreateDiscountModalProps) {
  const t = useTranslations('admin')
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()

  const form = useForm<CreateDiscountFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      code: '',
      type: 'PERCENTAGE',
      value: 10,
      minOrderCents: 0,
      maxUsages: '',
      expiresAt: '',
    },
  })

  const typeValue = form.watch('type') as DiscountType

  const createMutation = useMutation({
    mutationFn: (values: CreateDiscountFormValues) => {
      const payload: CreateDiscountPayload = {
        code: values.code,
        type: values.type,
        value: values.value,
        minOrderCents: values.minOrderCents ?? 0,
      }
      if (values.maxUsages !== '' && values.maxUsages !== undefined) {
        payload.maxUsages = values.maxUsages
      }
      if (values.expiresAt) {
        payload.expiresAt = new Date(values.expiresAt).toISOString()
      }
      return createAdminDiscount(payload, accessToken ?? '')
    },
    onSuccess: (created) => {
      toast.success(t('discountsCreateSuccess', { code: created.code }))
      void queryClient.invalidateQueries({ queryKey: ['admin-discounts'] })
      form.reset()
      onClose()
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : t('discountsCreateError')
      toast.error(message)
    },
  })

  function handleClose() {
    if (createMutation.isPending) return
    form.reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('discountsCreateModalTitle')}</DialogTitle>
          <DialogDescription>{t('discountsCreateModalDescription')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('discountsFieldCode')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="WELCOME10" autoComplete="off" />
                  </FormControl>
                  <FormDescription>{t('discountsFieldCodeHint')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('discountsFieldType')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">{t('discountsTypePERCENTAGE')}</SelectItem>
                        <SelectItem value="FIXED_AMOUNT">
                          {t('discountsTypeFIXED_AMOUNT')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('discountsFieldValue')}</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormDescription>
                      {typeValue === 'PERCENTAGE'
                        ? t('discountsFieldValuePercentHint')
                        : t('discountsFieldValueAmountHint')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minOrderCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('discountsFieldMinOrderCents')}</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxUsages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('discountsFieldMaxUsages')}</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormDescription>{t('discountsFieldMaxUsagesHint')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t('discountsFieldExpiresAt')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createMutation.isPending}
              >
                {t('discountsCreateCancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {t('discountsCreateSubmit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
