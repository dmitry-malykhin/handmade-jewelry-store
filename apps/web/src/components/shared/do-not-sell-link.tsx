'use client'

import * as Sentry from '@sentry/nextjs'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useCookieConsentStore, useDoNotSellOptedOut } from '@/store/cookie-consent.store'

export function DoNotSellLink() {
  const t = useTranslations('footer')
  const isOptedOut = useDoNotSellOptedOut()

  function handleOptOut() {
    useCookieConsentStore.getState().doNotSellOptOut()
    toast.success(t('doNotSellConfirm'))
  }

  function handleRestore() {
    useCookieConsentStore.getState().restoreMarketingPreferences()
    // #614 audit trail: CPRA §1798.135 asks that opt-outs and opt-ins both be
    // recorded. Sentry breadcrumb is cheap; swap for PostHog capture if a
    // formal DSAR audit table lands.
    Sentry.addBreadcrumb({
      category: 'consent',
      type: 'info',
      level: 'info',
      message: 'cpra.opt-back-in',
    })
    toast.success(t('doNotSellRestoreConfirm'))
  }

  if (isOptedOut) {
    return (
      <button
        type="button"
        onClick={handleRestore}
        className="rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={t('doNotSellRestoreAriaLabel')}
      >
        {t('doNotSellRestore')}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleOptOut}
      className="rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={t('doNotSellAriaLabel')}
    >
      {t('doNotSell')}
    </button>
  )
}
