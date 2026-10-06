'use client'

import { useTranslations } from 'next-intl'
import { useCookieConsentStore } from '@/store/cookie-consent.store'

export function CookiePreferencesButton() {
  const t = useTranslations('cookieBanner')

  function handleResetConsent() {
    // Re-shows the CookieBanner so the user can change their choice.
    useCookieConsentStore.setState({ hasDecided: false })
  }

  return (
    <button
      type="button"
      onClick={handleResetConsent}
      className="rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {t('changePreferences')}
    </button>
  )
}
