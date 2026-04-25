'use client'

import Script from 'next/script'
import { useMarketingConsent } from '@/store/cookie-consent.store'

interface KlaviyoProps {
  companyId: string
}

/**
 * Loads Klaviyo onsite tracking script.
 * Only activates when the user has accepted marketing cookies.
 */
export function Klaviyo({ companyId }: KlaviyoProps) {
  const hasMarketingConsent = useMarketingConsent()

  if (!hasMarketingConsent) return null

  return (
    <Script
      id="klaviyo"
      strategy="afterInteractive"
      src={`https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=${companyId}`}
    />
  )
}
