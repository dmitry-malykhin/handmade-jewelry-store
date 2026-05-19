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

const generalSchema = z.object({
  storeName: z.string().min(1).max(120),
  tagline: z.string().max(200),
  contactEmail: z.union([z.string().email(), z.literal('')]),
  supportEmail: z.union([z.string().email(), z.literal('')]),
})

type GeneralFormValues = z.infer<typeof generalSchema>

export function GeneralSection({ settings, onSave, isSaving }: SectionProps) {
  const t = useTranslations('admin')

  const form = useForm<GeneralFormValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      storeName: settings.storeName,
      tagline: settings.tagline,
      contactEmail: settings.contactEmail,
      supportEmail: settings.supportEmail,
    },
  })

  return (
    <section
      aria-labelledby="settings-general-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="settings-general-heading"
        className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('settingsSectionGeneral')}
      </h2>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => onSave(values))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField
            control={form.control}
            name="storeName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settingsFieldStoreName')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tagline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settingsFieldTagline')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settingsFieldContactEmail')}</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="supportEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settingsFieldSupportEmail')}</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
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
