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

// Empty string is allowed (admin clearing the URL); otherwise must be a valid
// https:// URL. Mirrors the backend ValidateIf behaviour.
const httpsUrlOrBlank = z.union([z.string().url().startsWith('https://'), z.literal('')])

const socialSchema = z.object({
  instagramUrl: httpsUrlOrBlank,
  pinterestUrl: httpsUrlOrBlank,
  facebookUrl: httpsUrlOrBlank,
  tiktokUrl: httpsUrlOrBlank,
})

type SocialFormValues = z.infer<typeof socialSchema>

export function SocialSection({ settings, onSave, isSaving }: SectionProps) {
  const t = useTranslations('admin')

  const form = useForm<SocialFormValues>({
    resolver: zodResolver(socialSchema),
    defaultValues: {
      instagramUrl: settings.instagramUrl ?? '',
      pinterestUrl: settings.pinterestUrl ?? '',
      facebookUrl: settings.facebookUrl ?? '',
      tiktokUrl: settings.tiktokUrl ?? '',
    },
  })

  return (
    <section
      aria-labelledby="settings-social-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2
        id="settings-social-heading"
        className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t('settingsSectionSocial')}
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">{t('settingsSocialHint')}</p>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => onSave(values))}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField
            control={form.control}
            name="instagramUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settingsFieldInstagram')}</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://instagram.com/…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pinterestUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settingsFieldPinterest')}</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://pinterest.com/…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="facebookUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settingsFieldFacebook')}</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://facebook.com/…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tiktokUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settingsFieldTiktok')}</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://tiktok.com/@…" {...field} />
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
