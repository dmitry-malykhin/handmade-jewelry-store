'use client'

import { useEffect } from 'react'
import { useCookieConsentStore } from '@/store/cookie-consent.store'

// Reads navigator.globalPrivacyControl (the browser-level Do-Not-Sell signal
// standardised by the CPRA regulations, §7025) once on mount. When true, we
// mark the user as opted out of "sale/share" without waiting for them to
// interact with the banner, satisfying CPRA §7025(b).
export function GpcHonorer() {
  useEffect(() => {
    const navigatorWithGpc = navigator as Navigator & { globalPrivacyControl?: boolean }
    if (navigatorWithGpc.globalPrivacyControl === true) {
      const store = useCookieConsentStore.getState()
      if (!store.doNotSellOptedOut) {
        store.doNotSellOptOut()
      }
    }
  }, [])

  return null
}
