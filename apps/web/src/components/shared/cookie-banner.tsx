'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  useCookieConsentStore,
  useHasCookieDecision,
  type CookieConsentPreferences,
} from '@/store/cookie-consent.store'

export function CookieBanner() {
  const t = useTranslations('cookieBanner')

  const hasDecided = useHasCookieDecision()
  const acceptAll = useCookieConsentStore((state) => state.acceptAll)
  const rejectAll = useCookieConsentStore((state) => state.rejectAll)
  const savePreferences = useCookieConsentStore((state) => state.savePreferences)
  const storedPreferences = useCookieConsentStore((state) => state.preferences)

  const [isCustomising, setIsCustomising] = useState(false)
  const [draftPreferences, setDraftPreferences] = useState<CookieConsentPreferences>({
    analytics: false,
    marketing: false,
  })

  // Sync draft with stored preferences when user opens the customise panel
  useEffect(() => {
    if (isCustomising) {
      setDraftPreferences(storedPreferences)
    }
  }, [isCustomising, storedPreferences])

  // Zustand persist with skipHydration requires manual rehydration on mount
  useEffect(() => {
    useCookieConsentStore.persist.rehydrate()
  }, [])

  // Keep banner hidden after SSR until client hydration completes
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted || hasDecided) return null

  function handleToggleAnalytics(checked: boolean) {
    setDraftPreferences((previous) => ({ ...previous, analytics: checked }))
  }

  function handleToggleMarketing(checked: boolean) {
    setDraftPreferences((previous) => ({ ...previous, marketing: checked }))
  }

  function handleSavePreferences() {
    savePreferences(draftPreferences)
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-description"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background p-4 shadow-lg sm:p-6"
    >
      <div className="mx-auto max-w-4xl">
        {!isCustomising ? (
          /* ── Default view ─────────────────────────────────────────── */
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <p id="cookie-banner-title" className="mb-1 font-semibold text-foreground">
                {t('title')}
              </p>
              <p id="cookie-banner-description" className="text-sm text-muted-foreground">
                {t('description')}{' '}
                <Link href="/privacy" className="underline hover:text-foreground">
                  {t('learnMore')}
                </Link>
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 sm:flex-nowrap">
              <Button variant="outline" size="sm" onClick={() => setIsCustomising(true)}>
                {t('customise')}
              </Button>
              <Button variant="outline" size="sm" onClick={rejectAll}>
                {t('rejectAll')}
              </Button>
              <Button size="sm" onClick={acceptAll}>
                {t('acceptAll')}
              </Button>
            </div>
          </div>
        ) : (
          /* ── Customise view ───────────────────────────────────────── */
          <div className="space-y-4">
            <p id="cookie-banner-title" className="font-semibold text-foreground">
              {t('title')}
            </p>

            {/* Strictly necessary — always on, cannot be toggled */}
            <fieldset className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <legend className="float-left font-medium text-foreground">
                  {t('necessaryLabel')}
                </legend>
                <span className="text-xs font-medium text-muted-foreground">
                  {/* Always on — not a real toggle, just an indicator */}
                  Always on
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t('necessaryDescription')}</p>
            </fieldset>

            {/* Analytics */}
            <fieldset className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <legend className="float-left font-medium text-foreground">
                  {t('analyticsLabel')}
                </legend>
                <Switch
                  id="cookie-analytics"
                  checked={draftPreferences.analytics}
                  onCheckedChange={handleToggleAnalytics}
                  aria-label={t('analyticsLabel')}
                />
              </div>
              <Label
                htmlFor="cookie-analytics"
                className="mt-1 block text-sm text-muted-foreground"
              >
                {t('analyticsDescription')}
              </Label>
            </fieldset>

            {/* Marketing */}
            <fieldset className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <legend className="float-left font-medium text-foreground">
                  {t('marketingLabel')}
                </legend>
                <Switch
                  id="cookie-marketing"
                  checked={draftPreferences.marketing}
                  onCheckedChange={handleToggleMarketing}
                  aria-label={t('marketingLabel')}
                />
              </div>
              <Label
                htmlFor="cookie-marketing"
                className="mt-1 block text-sm text-muted-foreground"
              >
                {t('marketingDescription')}
              </Label>
            </fieldset>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsCustomising(false)}>
                Back
              </Button>
              <Button size="sm" onClick={handleSavePreferences}>
                {t('savePreferences')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
