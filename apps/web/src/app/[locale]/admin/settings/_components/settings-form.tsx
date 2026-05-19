'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth.store'
import {
  fetchAdminSiteSettings,
  updateAdminSiteSettings,
  type SiteSettings,
  type UpdateSiteSettingsPayload,
} from '@/lib/api/site-settings'
import { GeneralSection } from './general-section'
import { SocialSection } from './social-section'
import { ShippingSection } from './shipping-section'

export function SettingsForm() {
  const t = useTranslations('admin')
  const accessToken = useAuthStore((state) => state.accessToken)
  const queryClient = useQueryClient()

  const { data: settings, isPending } = useQuery({
    queryKey: ['admin-site-settings'],
    queryFn: () => fetchAdminSiteSettings(accessToken ?? ''),
    enabled: accessToken !== null,
  })

  const saveMutation = useMutation({
    mutationFn: (payload: UpdateSiteSettingsPayload) =>
      updateAdminSiteSettings(payload, accessToken ?? ''),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-site-settings'], updated)
      toast.success(t('settingsSaveSuccess'))
    },
    onError: () => {
      toast.error(t('settingsSaveError'))
    },
  })

  function handleSave(payload: UpdateSiteSettingsPayload) {
    saveMutation.mutate(payload)
  }

  return (
    <section aria-labelledby="settings-heading" className="space-y-6">
      <div>
        <h1 id="settings-heading" className="text-xl font-semibold text-foreground">
          {t('settingsTitle')}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t('settingsDescription')}</p>
      </div>

      {isPending && (
        <p className="text-sm text-muted-foreground" role="status">
          {t('settingsLoading')}
        </p>
      )}

      {settings && (
        <div className="space-y-6">
          <GeneralSection
            settings={settings}
            onSave={handleSave}
            isSaving={saveMutation.isPending}
          />
          <SocialSection
            settings={settings}
            onSave={handleSave}
            isSaving={saveMutation.isPending}
          />
          <ShippingSection
            settings={settings}
            onSave={handleSave}
            isSaving={saveMutation.isPending}
          />
        </div>
      )}
    </section>
  )
}

export interface SectionProps {
  settings: SiteSettings
  onSave: (payload: UpdateSiteSettingsPayload) => void
  isSaving: boolean
}
