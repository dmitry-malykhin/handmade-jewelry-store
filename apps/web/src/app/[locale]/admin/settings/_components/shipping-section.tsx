'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { SectionProps } from './settings-form'

const shippingSchema = z
  .object({
    returnPolicyDays: z.coerce.number().int().min(0).max(365),
    estimatedDeliveryMinDays: z.coerce.number().int().min(0).max(60),
    estimatedDeliveryMaxDays: z.coerce.number().int().min(0).max(60),
    freeShippingThresholdCents: z.coerce.number().int().min(0),
  })
  .refine((values) => values.estimatedDeliveryMinDays <= values.estimatedDeliveryMaxDays, {
    message: 'min ≤ max',
    path: ['estimatedDeliveryMaxDays'],
  })

// z.coerce.number() makes input and output types diverge — pass both to useForm.
type ShippingFormInput = z.input<typeof shippingSchema>
type ShippingFormValues = z.infer<typeof shippingSchema>

export function ShippingSection({ settings, onSave, isSaving }: SectionProps) {
  const t = useTranslations('admin')

  const form = useForm<ShippingFormInput, unknown, ShippingFormValues>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      returnPolicyDays: settings.returnPolicyDays,
      estimatedDeliveryMinDays: settings.estimatedDeliveryMinDays,
      estimatedDeliveryMaxDays: settings.estimatedDeliveryMaxDays,
      freeShippingThresholdCents: settings.freeShippingThresholdCents,
    },
  })

  return (
    <section
      aria-labelledby="settings-shipping-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="settings-shipping-heading"
        className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('settingsSectionShipping')}
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => onSave(values))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField
            control={form.control}
            name="returnPolicyDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settingsFieldReturnPolicyDays')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    {...field}
                    value={field.value as number | string}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="freeShippingThresholdCents"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settingsFieldFreeShippingThresholdCents')}</FormLabel>
                <FormControl>
                  <Input type="number" min={0} {...field} value={field.value as number | string} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="estimatedDeliveryMinDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settingsFieldEstimatedDeliveryMinDays')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    {...field}
                    value={field.value as number | string}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="estimatedDeliveryMaxDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settingsFieldEstimatedDeliveryMaxDays')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    {...field}
                    value={field.value as number | string}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={isSaving}>
              {t('settingsSave')}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  )
}
