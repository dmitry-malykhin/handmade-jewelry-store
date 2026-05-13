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

/**
 * Loads PostHog and captures pageviews on route changes.
 * Strict GDPR mode — the SDK is not initialized at all until the user accepts
 * analytics cookies (#107). On revocation we call `opt_out_capturing` + `reset`
 * so further events are dropped and the prior session is detached.
 *
 * Pageviews are sent manually so SPA route changes are captured. Authenticated
 * users are identified by their JWT `sub` claim so post-login events thread
 * to the right person in PostHog.
 *
 * Mirrors GoogleAnalytics component pattern to keep the consent gate, route
 * change tracking, and identification flow consistent across analytics tools.
 */
export function PostHogAnalytics({ apiKey, host }: PostHogAnalyticsProps) {
  const hasAnalyticsConsent = useAnalyticsConsent()
  const accessToken = useAuthStore((state) => state.accessToken)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Tracked via React state (not posthog.__loaded internal flag) so dependent
  // effects re-run when the SDK finishes bootstrapping. Without this, the
  // initial pageview after mid-session consent grant would be lost.
  const [isSdkLoaded, setIsSdkLoaded] = useState(false)

  useEffect(() => {
    if (!hasAnalyticsConsent) {
      if (posthog.__loaded) {
        // Consent revoked after grant — stop further capture and detach the
        // identified profile so the SDK cannot resurface stale identity if
        // consent is later re-granted in the same session.
        posthog.opt_out_capturing()
        posthog.reset()
        setIsSdkLoaded(false)
      }
      return
    }

    if (posthog.__loaded) {
      // Consent re-granted after a prior opt-out — resume capture without
      // reinitializing (init is idempotent but heavier).
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
