'use client'

import { useTranslations } from 'next-intl'
import { useCookieConsentStore } from '@/store/cookie-consent.store'

/**
 * Renders a footer link that resets the cookie consent decision,
 * causing the CookieBanner to re-appear so the user can change preferences.
 * Rendered as a button (not a link) — it triggers a state change, not navigation.
 */
export function CookiePreferencesButton() {
  const t = useTranslations('cookieBanner')

  function handleResetConsent() {
    // Resetting via rejectAll then clearing hasDecided re-shows the banner
    useCookieConsentStore.setState({ hasDecided: false })
  }

  return (
    <button
      type="button"
      onClick={handleResetConsent}
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      {t('changePreferences')}
    </button>
  )
}
