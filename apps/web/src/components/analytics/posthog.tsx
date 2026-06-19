'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import posthog from 'posthog-js'
import { useAnalyticsConsent } from '@/store/cookie-consent.store'
import { useAuthStore } from '@/store/auth.store'
import { decodeAuthUser } from '@/lib/analytics/posthog'

interface PostHogAnalyticsProps {
  apiKey: string
  host?: string
}

// Strict GDPR: SDK is not initialised at all until the user accepts analytics
// cookies. On revocation we opt_out + reset so the prior identified profile
// cannot resurface if consent is later re-granted in the same session.
export function PostHogAnalytics({ apiKey, host }: PostHogAnalyticsProps) {
  const hasAnalyticsConsent = useAnalyticsConsent()
  const accessToken = useAuthStore((state) => state.accessToken)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // React state, not posthog.__loaded — dependent effects must re-run when the
  // SDK finishes bootstrapping, otherwise the first pageview after consent is lost.
  const [isSdkLoaded, setIsSdkLoaded] = useState(false)

  useEffect(() => {
    if (!hasAnalyticsConsent) {
      if (posthog.__loaded) {
        posthog.opt_out_capturing()
        posthog.reset()
        setIsSdkLoaded(false)
      }
      return
    }

    if (posthog.__loaded) {
      posthog.opt_in_capturing()
      setIsSdkLoaded(true)
      return
    }

    posthog.init(apiKey, {
      api_host: host ?? 'https://us.i.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: false,
      session_recording: {
        maskAllInputs: true,
        maskInputOptions: { password: true, email: false },
      },
      persistence: 'localStorage',
      loaded: (ph) => {
        if (process.env.NODE_ENV !== 'production') ph.debug()
        setIsSdkLoaded(true)
      },
    })
  }, [hasAnalyticsConsent, apiKey, host])

  useEffect(() => {
    if (!isSdkLoaded) return
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams, isSdkLoaded])

  useEffect(() => {
    if (!isSdkLoaded) return
    const user = decodeAuthUser(accessToken)
    if (user) {
      posthog.identify(user.userId, { email: user.email, role: user.role })
    } else {
      posthog.reset()
    }
  }, [accessToken, isSdkLoaded])

  return null
}
