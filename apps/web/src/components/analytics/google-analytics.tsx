'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useAnalyticsConsent } from '@/store/cookie-consent.store'

interface GoogleAnalyticsProps {
  measurementId: string
}

/**
 * Loads GA4 script and tracks page views on route changes.
 * Only activates when the user has accepted analytics cookies.
 * send_page_view: false — we send page_view manually to capture SPA navigations.
 */
export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const hasAnalyticsConsent = useAnalyticsConsent()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!hasAnalyticsConsent) return

    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    window.gtag?.('config', measurementId, { page_path: url })
  }, [pathname, searchParams, measurementId, hasAnalyticsConsent])

  if (!hasAnalyticsConsent) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', { send_page_view: false });
        `}
      </Script>
    </>
  )
}
