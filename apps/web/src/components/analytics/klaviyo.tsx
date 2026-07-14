'use client'

import Script from 'next/script'
import { useMarketingConsent } from '@/store/cookie-consent.store'

interface KlaviyoProps {
  companyId: string
}

// lazyOnload: onsite tracking (popups, product signals) does not need to run
// before LCP — deferring saves ~30-60 KiB of blocking JS.
export function Klaviyo({ companyId }: KlaviyoProps) {
  const hasMarketingConsent = useMarketingConsent()

  if (!hasMarketingConsent) return null

  return (
    <Script
      id="klaviyo"
      strategy="lazyOnload"
      src={`https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=${companyId}`}
    />
  )
}
